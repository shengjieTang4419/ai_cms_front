# 最终解决方案：使用DashScope MultiModal API

## 问题根源

Spring AI的ChatClient **不支持**直接将图片URL传递给DashScope Vision模型。即使选择了`qwen-vl-plus`模型，ChatClient也只是把URL当作文本发送，导致AI无法识别图片。

## 解决方案

### 1. 添加DashScope SDK依赖

在`pom.xml`中添加：
```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>dashscope-sdk-java</artifactId>
    <version>2.14.1</version>
</dependency>
```

### 2. 创建DashScopeMultiModalService

使用官方SDK的`MultiModalConversation` API，按照官方文档的方式传递图片：

```java
// 构建多模态消息
List<Map<String, String>> content = new ArrayList<>();
content.add(Collections.singletonMap("image", imageUrl));  // 图片
content.add(Collections.singletonMap("text", query));      // 文本

MultiModalMessage userMessage = MultiModalMessage.builder()
    .role(Role.USER.getValue())
    .content(content)
    .build();
```

### 3. 修改AIChatService

在`AIChatService`中：
- 有图片时：使用`DashScopeMultiModalService`
- 无图片时：使用普通的`ChatClient`

## 使用步骤

### 1. 重新编译项目

```bash
cd cms
mvn clean install
```

或者重启IDE让其重新加载Maven依赖。

### 2. 测试

1. 重启后端服务
2. 发送带图片的消息
3. 查看日志，应该看到：
   ```
   使用DashScope MultiModal API，查询: xxx, 图片数量: 1
   添加图片URL: http://localhost:18080/api/images/...
   DashScope返回: [正确的图片描述]
   ```

## 关键文件

- `DashScopeMultiModalService.java` - 新增的多模态服务
- `AIChatService.java` - 修改为使用多模态服务
- `pom.xml` - 添加DashScope SDK依赖

## 优势

1. **官方支持**：使用DashScope官方SDK，完全符合API规范
2. **正确识别**：图片会被正确识别并处理
3. **代码清晰**：将多模态逻辑独立出来，便于维护

## 测试确认

重启服务后，如果你看到类似的日志：
```
使用DashScope MultiModal API，查询: 向我描述这张图片, 图片数量: 1
添加图片URL: http://localhost:18080/api/images/2025/10/27/xxx.jpg
DashScope返回: 这张图片展示了...
```

就说明成功了！






