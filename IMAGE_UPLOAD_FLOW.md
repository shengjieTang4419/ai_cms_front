# 图片上传流程说明

## 问题背景

之前的实现将图片的base64数据直接放在URL查询参数中，导致URL过长，出现 **431 Request Header Fields Too Large** 错误。

## 解决方案

### 架构设计

```
前端粘贴图片
    ↓
转换为base64（仅用于预览）
    ↓
上传到服务器 → 获得图片URL
    ↓
发送消息时传递图片URL（而不是base64）
    ↓
后端通过URL访问图片进行处理
```

### 关键改动

#### 1. 后端 - 图片上传服务

**新增文件：**
- `Image.java` - 图片实体类（MongoDB）
- `ImageRepository.java` - 图片数据访问层
- `ImageService.java` - 图片服务（处理上传、存储）
- `ImageController.java` - 图片上传API控制器
- `WebMvcConfig.java` - 静态资源访问配置

**API端点：**
- `POST /api/images/upload/base64` - 上传base64图片
- `POST /api/images/upload` - 上传文件
- `POST /api/images/upload/batch` - 批量上传

**存储位置：**
- 文件系统：`./uploads/images/YYYY/MM/DD/`
- 数据库：MongoDB `images` 集合

#### 2. 前端 - 修改发送流程

**修改文件：**
- `chat.js` - 添加图片上传方法
- `Chat.vue` - 发送前先上传图片

**新的流程：**
```javascript
// 1. 用户粘贴图片，转换为base64（仅用于预览）
const base64Image = "data:image/png;base64,..."

// 2. 发送消息时，先上传图片
const imageUrls = await chatService.uploadImages([base64Image])
// 返回: ["http://localhost:18080/api/images/2025/01/27/uuid.png"]

// 3. 发送消息时传递URL而不是base64
chatService.streamChat(message, imageUrls, ...)
```

#### 3. 后端 - 修改聊天接口

**修改文件：**
- `AiChatController.java` - 接收 `imageUrl` 参数
- `AIChatService.java` - 处理图片URL

**参数变化：**
```java
// ❌ 之前
@RequestParam(value = "imageBase64", required = false) List<String> imageBase64List

// ✅ 现在
@RequestParam(value = "imageUrl", required = false) List<String> imageUrlList
```

## 使用示例

### 前端

```javascript
// InputArea.vue - 粘贴图片处理
const handlePaste = async (event) => {
  const items = event.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault()
      const blob = item.getAsFile()
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target.result
        images.value.push(base64)  // 用于预览
        emit('images-update', images.value)
      }
      reader.readAsDataURL(blob)
    }
  }
}

// Chat.vue - 发送消息
const handleSend = async (messageText, useKnowledgeSearch = false, imageList = []) => {
  // 先上传图片获得URL
  let imageUrls = []
  if (imageList && imageList.length > 0) {
    imageUrls = await chatService.uploadImages(imageList)
  }
  
  // 发送消息时传递URL
  chatService.streamChat(messageText, imageUrls, ...)
}
```

### 后端

```java
// ImageController.java
@PostMapping("/upload/base64")
public ResponseEntity<Map<String, Object>> uploadImageFromBase64(
        @RequestParam("base64") String base64Data,
        @RequestParam(value = "contentType", defaultValue = "image/png") String contentType,
        @RequestParam(value = "userId", defaultValue = "1") Long userId) {
    
    ImageService.ImageUploadResult result = imageService.uploadImageFromBase64(base64Data, contentType, userId);
    
    Map<String, Object> response = new HashMap<>();
    if (result.isSuccess()) {
        response.put("success", true);
        response.put("fileUrl", result.getFileUrl());
        return ResponseEntity.ok(response);
    }
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
}
```

## 配置

### application.yml

```yaml
# 图片上传配置
app:
  upload:
    dir: ./uploads/images        # 图片存储目录
  base-url: http://localhost:18080  # 基础URL
```

### 静态资源访问

通过 `WebMvcConfig` 配置，访问路径：
```
/api/images/2025/01/27/uuid.png
```

## 数据库存储

### MongoDB - images 集合

```json
{
  "_id": "uuid",
  "file_name": "screenshot.png",
  "file_path": "./uploads/images/2025/01/27/uuid.png",
  "file_url": "http://localhost:18080/api/images/2025/01/27/uuid.png",
  "file_size": 123456,
  "content_type": "image/png",
  "user_id": 1,
  "created_at": "2025-01-27T10:00:00",
  "expires_at": null
}
```

## 优势

1. **避免URL过长** - 不再将base64放在URL中
2. **图片可复用** - 上传后获得固定URL，可重复使用
3. **存储可控** - 可以设置过期时间、访问权限等
4. **性能优化** - 图片可以缓存、CDN加速等
5. **便于管理** - 可以查看上传历史、统计等

## 注意事项

1. **文件系统权限** - 确保应用有写入权限
2. **磁盘空间** - 定期清理过期图片
3. **安全考虑** - 限制文件大小、类型等
4. **网络访问** - 确保图片URL可公开访问（或配置认证）

## 测试步骤

1. 启动后端服务
2. 打开前端页面
3. 粘贴一张图片到输入框
4. 点击发送
5. 检查浏览器Network面板：
   - 看到 `POST /api/images/upload/base64` 请求
   - 看到 `GET /api/aiChat/simple/streamChat?imageUrl=...` 请求
6. 检查图片是否正确显示和处理







