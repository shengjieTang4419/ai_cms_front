# Location 定位服务重构说明

## 改造内容

### 1. **使用统一 request 实例**
- 替换 `fetch` 为 `request`，自动注入 token
- 所有后端调用统一走 axios 拦截器

### 2. **集成高德地图 JS SDK**
- 替代浏览器原生 `navigator.geolocation`
- 精度更高（高德定位比浏览器精度高几百米）
- 一次性返回经纬度 + 详细地址，无需额外调用后端逆地理编码

### 3. **API Key 安全方案**
前端不暴露高德 API Key，通过后端代理获取：
```
前端 -> GET /api/location/amap-config -> { key, securityJsCode }
前端 -> 动态加载高德 SDK
```

### 4. **AI 智能判断位置需求**
废弃前端关键词匹配 `isLocationRelatedQuery`，改为后端 AI 判断：
```javascript
// 旧方案：前端关键词匹配（误判率高）
const keywords = ['位置', '附近', '周边', ...]
return keywords.some(k => message.includes(k))

// 新方案：后端 AI 智能判断（更准确）
const result = await request.post('/location/check-location-need', { message })
return result.needLocation
```

---

## 后端需要实现的接口

### 1. **获取高德地图配置**
```java
@GetMapping("/api/location/amap-config")
public ResponseEntity<Map<String, String>> getAmapConfig() {
    return ResponseEntity.ok(Map.of(
        "key", amapApiKey,  // 从环境变量读取
        "securityJsCode", amapSecurityJsCode  // 高德安全密钥
    ));
}
```

**说明**：
- `key`：高德 Web 服务 Key（JS API Key）
- `securityJsCode`：高德安全密钥（可选，用于防止盗用）
- 这个接口需要鉴权，避免 Key 泄露

### 2. **AI 判断是否需要位置信息**
```java
@PostMapping("/api/location/check-location-need")
public ResponseEntity<Map<String, Boolean>> checkLocationNeed(@RequestBody Map<String, String> request) {
    String message = request.get("message");
    
    // 使用 AI 判断消息是否涉及位置需求
    // 例如：通过 GPT 或 本地模型 分析语义
    boolean needLocation = aiService.checkIfNeedLocation(message);
    
    return ResponseEntity.ok(Map.of("needLocation", needLocation));
}
```

**AI 判断示例 Prompt**：
```
判断用户消息是否需要地理位置信息来回答。
只返回 true 或 false。

示例：
"附近有什么好吃的" -> true
"我现在在哪里" -> true
"今天天气怎么样" -> false（虽然天气和位置相关，但用户没明确要求当前位置）
"从北京到上海怎么走" -> false（已明确地点，不需要当前位置）

用户消息：{message}
```

### 3. **逆地理编码接口（已存在）**
```java
@GetMapping("/api/location/coordinates")
public ResponseEntity<?> getAddressByCoordinates(
    @RequestParam String longitude, 
    @RequestParam String latitude
) {
    // 调用高德 API 逆地理编码
    // 返回详细地址信息
}
```

---

## 定位时机建议

### **推荐：每轮对话时获取**

```javascript
// Chat.vue 发送消息时
async function sendMessage() {
    let locationInfo = null
    
    // 1. 快速判断是否需要定位（AI 判断）
    const needLocation = await isLocationRelatedQuery(message)
    
    if (needLocation) {
        // 2. 只在需要时才真正定位（避免不必要的权限请求）
        try {
            locationInfo = await getCurrentLocationWithAddress()
        } catch (error) {
            console.warn('定位失败，继续发送消息:', error)
        }
    }
    
    // 3. 发送消息（带上位置信息）
    chatService.streamChat({
        message,
        location: locationInfo,
        ...
    })
}
```

**优点**：
- 实时性强（用户可能在移动中）
- 按需定位（减少不必要的权限请求）
- 移动端友好（APP 可以在每次对话时调用系统 GPS）

---

## 使用示例

### 前端调用
```javascript
import { getCurrentLocationWithAddress, isLocationRelatedQuery } from '@/api/location'

// 1. 判断是否需要定位
const needLocation = await isLocationRelatedQuery('附近有什么好吃的')
// -> true

// 2. 获取定位和地址
const location = await getCurrentLocationWithAddress()
// -> {
//   success: true,
//   longitude: "113.12345",
//   latitude: "23.12345",
//   accuracy: 20,
//   address: "广东省深圳市南山区科技园",
//   addressComponent: { ... }
// }
```

---

## 注意事项

1. **高德 API Key 类型**
   - Web 端使用"Web服务 Key"（JS API Key）
   - 不要用"Web服务 API Key"（那是服务端 HTTP API 用的）

2. **安全密钥**
   - 高德控制台开启"安全密钥"后，需要配置 `_AMapSecurityConfig.securityJsCode`
   - 前端已自动处理，后端只需返回即可

3. **CORS 和 HTTPS**
   - 高德定位在 HTTPS 下精度更高
   - 本地开发可以用 HTTP（浏览器允许 localhost）

4. **权限引导**
   - 用户首次使用会弹出定位权限请求
   - 如果拒绝，需要友好提示并引导用户在浏览器设置中开启

---

## 测试清单

- [ ] 后端实现 `/api/location/amap-config` 接口
- [ ] 后端实现 `/api/location/check-location-need` 接口（AI 判断）
- [ ] 前端测试高德定位是否成功
- [ ] 对比高德定位和浏览器定位的精度差异
- [ ] 测试 AI 判断位置需求的准确性
- [ ] 测试定位失败时的降级处理
