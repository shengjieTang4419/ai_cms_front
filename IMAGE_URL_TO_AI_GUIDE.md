# 图片URL传递给AI模型的实现说明

## 问题背景

将图片上传到MinIO后获得URL，需要将URL传递给阿里云DashScope的Qwen-VL-Plus模型进行处理。

参考：[阿里云官方文档](https://bailian.console.aliyun.com/?spm=a2c4g.11186623.0.0.3d97657bdOzrjJ&tab=model#/model-market/detail/qwen-vl-plus)

## 关键问题

### 1. 图片访问必须公开（无需认证）

**原因**：AI模型会直接从URL获取图片，无法提供我们的认证token。

**解决方案**：在`SecurityConfig`中添加图片访问白名单

```java
.requestMatchers("/api/images/**").permitAll()  // 图片访问无需认证
```

### 2. 图片URL传递方式

#### 前端流程

```javascript
// 1. 用户粘贴图片 -> base64
const base64Image = "data:image/png;base64,..."

// 2. 上传图片到MinIO
const imageUrls = await chatService.uploadImages([base64Image])
// 返回: ["http://localhost:18080/api/images/2025/10/27/uuid.png"]

// 3. 发送消息时传递URL
chatService.streamChat(messageText, imageUrls, ...)
```

#### 后端流程

```java
// Controller接收图片URL列表
@RequestParam(value = "imageUrl", required = false) List<String> imageUrlList

// Service处理图片URL
if (imageList != null && !imageList.isEmpty()) {
    // 将图片URL添加到prompt中
    for (String imageUrl : imageList) {
        promptBuilder.append("\n[图片: ").append(imageUrl).append("]");
    }
}
```

## 数据流

```
用户粘贴图片
    ↓
转换为base64（仅用于前端预览）
    ↓
上传到MinIO → 返回图片URL
    ↓
图片URL传递给后端AI接口
    ↓
后端将URL添加到prompt中
    ↓
AI模型（qwen-vl-plus）从URL读取图片
    ↓
返回AI分析结果
```

## MongoDB存储结构

```json
{
  "_id": "68ff33ab66332a7f2f8d6032",
  "file_name": "dog_and_girl.jpeg",
  "file_path": "2025/10/27/8e4929ac-5be6-4304-8038-13a4076cd203.jpeg",
  "file_url": "http://localhost:18080/api/images/2025/10/27/8e4929ac-5be6-4304-8038-13a4076cd203.jpeg",
  "parent_path": "2025/10/27",
  "file_size": 496395,
  "content_type": "image/jpeg",
  "user_id": 1,
  "created_at": "2025-10-27 08:56:11.137"
}
```

## 实现要点

### 1. file_url字段

- **当前用途**：作为图片的公开访问URL
- **格式**：`http://localhost:18080/api/images/{parent_path}/{file_name}`
- **访问方式**：通过`ImageController.getImage()`从MinIO读取

### 2. file_path字段

- **用途**：MinIO中的对象路径
- **格式**：`2025/10/27/uuid.png`
- **用于**：从MinIO读取文件时作为object name

### 3. 安全考虑

#### 图片必须公开访问

- AI模型无法提供认证token
- 图片URL通过`/api/images/**`访问，已配置为无需认证

#### 潜在风险

- 任何知道URL的人都可以访问图片
- 建议：使用长随机UUID作为文件名
- 建议：定期清理过期图片

#### 替代方案（未来考虑）

1. **预签名URL**：MinIO支持临时访问URL
2. **图片代理**：后端先下载图片再传给AI
3. **Base64内联**：对于小图片，直接转换为base64传给AI

## 测试步骤

### 1. 上传图片

```bash
curl -X POST http://localhost:18080/api/images/upload/base64 \
  -F "base64=data:image/png;base64,..." \
  -F "contentType=image/png"
```

### 2. 访问图片（无需token）

```bash
curl http://localhost:18080/api/images/2025/10/27/uuid.png
```

### 3. 发送带图片的聊天

```bash
curl "http://localhost:18080/api/aiChat/simple/streamChat?query=这是什么图片&sessionId=test&imageUrl=http://localhost:18080/api/images/2025/10/27/uuid.png"
```

## 前端代码示例

```javascript
// chat.js
export class ChatService {
    // 上传图片
    async uploadImages(base64ImageList) {
        const uploadPromises = base64ImageList.map(base64Data => {
            const contentType = base64Data.match(/^data:([^;]+);base64,(.+)$/)[1]
            return this.uploadImage(base64Data, contentType)
        })
        return await Promise.all(uploadPromises)
    }
    
    // 发送消息
    streamChat(message, imageUrls, onMessage, onError, onComplete, sessionId) {
        const encodedQuery = encodeURIComponent(message)
        const encodedSessionId = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''
        
        // 添加图片URL参数
        let imageParams = ''
        if (imageUrls && imageUrls.length > 0) {
            imageParams = imageUrls.map(url => `&imageUrl=${encodeURIComponent(url)}`).join('')
        }
        
        const url = `/api/aiChat/simple/streamChat?query=${encodedQuery}${encodedSessionId}${imageParams}`
        this.fetchStreamResponse(url, onMessage, onError, onComplete)
    }
}
```

## 常见问题

### Q1: 为什么图片必须公开访问？

A: DashScope AI模型会直接从URL获取图片，无法提供我们的认证token。如果图片需要认证，AI模型无法访问。

### Q2: 图片URL格式是什么？

A: `http://localhost:18080/api/images/{年}/{月}/{日}/{uuid}.{扩展名}`

例如：`http://localhost:18080/api/images/2025/10/27/8e4929ac-5be6-4304-8038-13a4076cd203.jpeg`

### Q3: file_url字段和file_path字段的区别？

A: 
- `file_path`: MinIO中的存储路径（用于读取）
- `file_url`: 完整的HTTP访问URL（用于前端显示和AI模型访问）

### Q4: 如何确保图片URL的安全性？

A: 
1. 使用UUID作为文件名，避免可预测的URL
2. 定期清理过期图片
3. 考虑实现预签名URL（临时访问）
4. 监控异常访问模式

## 参考资料

- [阿里云DashScope文档](https://bailian.console.aliyun.com/)
- [MinIO Java客户端](https://min.io/docs/minio/container/developers/java/API.html)
- [Spring AI DashScope](https://spring.io/projects/spring-ai)





