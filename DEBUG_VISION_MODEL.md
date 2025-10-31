# Vision模型调试指南

## 问题现象

AI返回内容："图片描述,工具推荐,技术" （类似标签，不是正常回复）

## 可能原因

1. **Spring AI ChatClient不支持文本中包含图片URL**
   - 当前实现：将图片URL作为文本追加到prompt
   - 可能问题：DashScope Vision需要特殊的API来传递图片

2. **模型选择可能有问题**
   - 需要确认是否真的选择了qwen-vl-plus
   - 检查日志中是否有"选择模型"的信息

## 调试步骤

### 1. 检查模型选择日志

添加以下日志后重新测试：

```java
log.info("选择的ChatClient模型: {}", modelSelector.selectModel(imageList));
log.info("图片URL列表: {}", imageList);
log.info("最终发送给AI的prompt: {}", finalQuery);
```

### 2. 验证前端是否传递了图片URL

检查浏览器Network面板，查看请求URL：
```
/api/aiChat/simple/streamChat?query=...&imageUrl=http://...
```

### 3. 测试图片URL是否可访问

直接在浏览器访问图片URL：
```
http://localhost:18080/api/images/2025/10/27/uuid.png
```

应该能直接看到图片（无需token）

## 可能的解决方案

### 方案1: 使用ChatClient的mimeType或media API

Spring AI可能支持通过UserMessage的Content传递Media：

```java
// 伪代码 - 需要实际测试
UserMessage message = new UserMessage(
    query,
    List.of(new Media(MimeType.IMAGE_JPEG, imageUrl))
);
```

### 方案2: 直接调用DashScope API

如果Spring AI不支持，可能需要直接调用DashScope API：

```java
// 使用阿里云SDK直接调用
DashScopeChatClient client = new DashScopeChatClient(...);
client.streamChat(UserMessage.of(query, Media.of(imageUrl)));
```

### 方案3: 修改prompt格式

尝试不同的prompt格式：

```java
// 格式1: 只有URL
promptBuilder.append("\n").append(imageUrl);

// 格式2: markdown格式
promptBuilder.append("\n![图片](").append(imageUrl).append(")");

// 格式3: 自定义格式
promptBuilder.append("\nIMAGE_URL: ").append(imageUrl);
```

## 测试用例

### 测试1: 纯文本聊天
```
query=你好
imageUrl=无
预期: 使用qwen-turbo，正常回复
```

### 测试2: 带图片聊天
```
query=这是什么图片
imageUrl=http://localhost:18080/api/images/2025/10/27/uuid.png
预期: 使用qwen-vl-plus，分析图片内容
```

## 日志分析

关键日志：
- "选择模型: XXX" - 确认选择的模型
- "检测到X张图片" - 确认检测到图片
- "添加图片URL到prompt" - 确认URL被添加
- "最终发送给AI的prompt" - 查看完整prompt

## 下一步

1. 先运行带日志的版本，查看输出
2. 确认是否选择了Vision模型
3. 如果选择了Vision模型但返回异常，考虑：
   - 检查DashScope API文档
   - 查看Spring AI DashScope的示例代码
   - 可能需要在ChatClient配置中设置特殊参数






