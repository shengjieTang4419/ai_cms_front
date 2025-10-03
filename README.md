# AI聊天助手前端

基于Vue3 + Element-Plus的类似ChatGPT的聊天界面，支持用户登录注册和流式AI对话。

## 功能特性

- 🔐 用户登录注册系统
- 💬 类似ChatGPT的聊天界面
- ⚡ 基于SSE的流式打字机效果
- 🎨 现代化的UI设计
- 📱 响应式布局
- 🔄 实时消息流

## 技术栈

- **前端框架**: Vue 3
- **UI组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **构建工具**: Vite
- **HTTP客户端**: Axios
- **实时通信**: EventSource (SSE)

## 项目结构

```
src/
├── api/                 # API接口
│   ├── auth.js         # 认证相关API
│   └── chat.js         # 聊天相关API
├── components/          # 组件
├── router/             # 路由配置
│   └── index.js
├── stores/             # 状态管理
│   └── user.js         # 用户状态
├── views/              # 页面组件
│   ├── Login.vue       # 登录页面
│   ├── Register.vue    # 注册页面
│   └── Chat.vue        # 聊天页面
├── App.vue             # 根组件
└── main.js             # 入口文件
```

## 安装和运行

1. 安装依赖
```bash
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

3. 构建生产版本
```bash
npm run build
```

## API接口说明

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/user` - 获取用户信息

### 聊天接口
- `GET /api/simple/streamChat?message={message}` - 流式聊天接口（SSE）

## 环境配置

项目使用Vite代理配置，将`/api`请求代理到后端服务器`http://localhost:8080`。

如需修改后端地址，请编辑`vite.config.js`中的proxy配置。

## 使用说明

1. 访问应用后会自动跳转到登录页面
2. 新用户需要先注册账户
3. 登录成功后进入聊天界面
4. 在输入框中输入问题，按回车或点击发送按钮
5. AI会以流式方式回复，实现打字机效果

## 注意事项

- 确保后端服务已启动并运行在8080端口
- 后端需要支持CORS跨域请求
- SSE接口需要返回正确的Content-Type头
- 建议在生产环境中配置HTTPS以支持SSE
