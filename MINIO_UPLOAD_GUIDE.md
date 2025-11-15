# MinIO图片存储方案

## 概述

使用MinIO对象存储来替代本地文件系统存储图片，解决431错误并提供更好的扩展性。

## MinIO简介

MinIO是一个高性能的对象存储服务器，兼容Amazon S3 API：
- **分布式存储**：支持多节点集群
- **高性能**：专为低延迟、高吞吐量设计
- **开源免费**：MIT许可证
- **兼容性好**：兼容AWS S3接口
- **易于管理**：提供Web控制台

## Docker部署

### 1. 更新docker-compose.yml

已在 `cms/init/docker/docker-compose.yml` 中添加MinIO服务：

```yaml
cloud-minio:
  image: minio/minio:latest
  container_name: cloud-minio
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin123
    TZ: Asia/Shanghai
  volumes:
    - ./minio/data:/data
    - ./minio/config:/root/.minio
  ports:
    - "9000:9000"  # API端口
    - "9001:9001"  # Console端口
  command: server /data --console-address ":9001"
  networks:
    - cloud-network
```

### 2. 启动MinIO

```bash
cd cms/init/docker
docker-compose up -d cloud-minio
```

### 3. 访问MinIO控制台

- URL: http://localhost:9001
- 用户名: minioadmin
- 密码: minioadmin123

### 4. 创建Bucket

登录控制台后，创建名为 `images` 的Bucket（或修改配置使用其他名称）

## 配置说明

### application.yml

```yaml
# MinIO对象存储配置
minio:
  endpoint: http://localhost:9000
  access-key: minioadmin
  secret-key: minioadmin123
  bucket-name: images

# 图片访问配置
app:
  base-url: http://localhost:18080
```

## 实现细节

### 1. MinIO配置类

`MinioConfig.java` - 创建MinioClient Bean

```java
@Bean
public MinioClient minioClient() {
    return MinioClient.builder()
            .endpoint(endpoint)
            .credentials(accessKey, secretKey)
            .build();
}
```

### 2. 图片上传流程

```
前端上传图片(base64)
    ↓
ImageService.uploadImageFromBase64()
    ↓
保存到MinIO (自动创建bucket)
    ↓
保存元数据到MongoDB
    ↓
返回图片URL (http://localhost:18080/api/images/2025/01/27/uuid.png)
```

### 3. 图片访问流程

```
前端请求图片URL
    ↓
ImageController.getImage()
    ↓
从MinIO获取文件
    ↓
返回图片数据流
```

## API接口

### 上传图片

```bash
POST /api/images/upload/base64
Content-Type: multipart/form-data

Parameters:
- base64: "data:image/png;base64,..."
- contentType: "image/png"
- userId: 1

Response:
{
  "success": true,
  "fileUrl": "http://localhost:18080/api/images/2025/01/27/uuid.png",
  "imageId": "uuid"
}
```

### 访问图片

```bash
GET /api/images/2025/01/27/uuid.png

Response:
Content-Type: image/png
[图片二进制数据]
```

## 文件结构

### MinIO存储

```
images/ (Bucket)
  ├── 2025/
  │   ├── 01/
  │   │   ├── 27/
  │   │   │   ├── uuid1.png
  │   │   │   └── uuid2.jpg
```

### MongoDB存储

```json
{
  "_id": "uuid",
  "file_name": "screenshot.png",
  "file_path": "2025/01/27/uuid.png",
  "file_url": "http://localhost:18080/api/images/2025/01/27/uuid.png",
  "file_size": 123456,
  "content_type": "image/png",
  "user_id": 1,
  "created_at": "2025-01-27T10:00:00"
}
```

## 优势对比

### vs 本地文件系统

| 特性 | 本地文件系统 | MinIO |
|------|------------|-------|
| 扩展性 | 差 | 优秀 |
| 分布式 | 不支持 | 支持 |
| 高可用 | 单点故障 | 多副本 |
| 性能 | 一般 | 优秀 |
| 管理 | 手动 | Web控制台 |
| 备份 | 手动 | 自动 |

### vs MongoDB GridFS

| 特性 | GridFS | MinIO |
|------|--------|-------|
| 专一性 | 文件功能 | 对象存储专一 |
| 查询 | 慢 | 快 |
| 管理 | 命令行 | Web控制台 |
| 兼容性 | MongoDB | S3标准 |

## 开发建议

### 1. 本地开发

使用Docker Compose一键启动所有服务

### 2. 生产环境

- 使用集群部署提高可用性
- 配置SSL/TLS加密
- 设置合理的Bucket策略
- 定期备份数据

### 3. 访问控制

当前实现图片是公开访问的，如需权限控制：

```java
// 添加认证校验
@GetMapping("/**")
public ResponseEntity<byte[]> getImage(HttpServletRequest request) {
    // 检查用户权限
    String token = request.getHeader("Authorization");
    if (!validateToken(token)) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    // ...
}
```

## 测试步骤

1. 启动MinIO服务
   ```bash
   docker-compose up -d cloud-minio
   ```

2. 访问控制台确认Bucket存在
   - http://localhost:9001

3. 启动后端服务
   ```bash
   mvn spring-boot:run
   ```

4. 前端测试
   - 粘贴图片
   - 发送消息
   - 检查图片是否正常显示

5. 验证存储
   - 在MinIO控制台查看文件
   - 在MongoDB查看元数据

## 故障排查

### 问题1: MinIO连接失败

```
MinIO连接失败: Connection refused
```

**解决**：
- 检查MinIO是否启动：`docker ps | grep minio`
- 检查端口是否被占用：`netstat -an | grep 9000`
- 检查防火墙设置

### 问题2: Bucket不存在

```
Bucket不存在或没有权限
```

**解决**：
- 在MinIO控制台创建Bucket
- 或者修改代码自动创建Bucket（已实现）

### 问题3: 图片无法访问

```
404 Not Found
```

**解决**：
- 检查ImageController路径映射
- 检查MinIO文件是否存在
- 查看日志确认错误原因

## 监控和运维

### MinIO监控

```bash
# 查看存储使用情况
mc admin info local

# 查看服务状态
docker exec cloud-minio minio server info
```

### 性能优化

1. **使用CDN**：在MinIO前加CDN加速
2. **缓存策略**：配置图片缓存头
3. **压缩存储**：启用MinIO压缩
4. **负载均衡**：多MinIO节点负载均衡

## 参考资料

- [MinIO官方文档](https://min.io/docs/)
- [MinIO Java客户端](https://min.io/docs/minio/container/developers/java/API.html)
- [Spring集成MinIO示例](https://min.io/docs/minio/container/integrations/springboot.html)









