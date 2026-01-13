# KityMinder - 私有化部署版

> 本项目基于 [KityMinder](https://github.com/fex-team/kityminder) 二次开发，增加了 PostgreSQL 数据库存储、用户鉴权系统以及 Docker 容器化支持。

## 主要特性

*   **数据持久化**：使用 PostgreSQL 替代原有的本地存储/百度网盘，支持私有化部署。
*   **用户系统**：
    *   支持用户名/密码注册与登录。
    *   **数据隔离**：每个用户仅能访问自己的脑图文件。
    *   **邀请机制**：支持开启“仅邀请注册”模式。
*   **Docker 支持**：提供 Dockerfile 及 GitHub Actions 自动构建流程，支持多架构（amd64/arm64）。

## 快速开始 (Docker)

推荐使用 Docker 进行部署。

```bash
# 拉取镜像 (请替换为您构建的镜像地址，或本地构建)
docker pull ghcr.io/starhes/kityminder:latest

# 运行 (需要先准备好 PostgreSQL 数据库)
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  -e DB_NAME=kityminder \
  -e ENABLE_REGISTRATION=true \
  --name kityminder \
  ghcr.io/starhes/kityminder:latest
```

## 本地开发与运行

### 1. 环境准备

*   Node.js (v14+)
*   PostgreSQL 数据库

### 2. 初始化

```bash
# 克隆仓库
git clone https://github.com/Starhes/kityminder.git
cd kityminder

# 安装服务端依赖
cd server
npm install
cd ..
```

### 3. 配置与运行

确保 PostgreSQL 数据库已启动。该项目会自动在数据库中创建所需的 `users`, `maps`, `invites` 表。

你可以在 `server/db.js` 中修改数据库配置，或者使用环境变量：

*   `DB_HOST`: 数据库地址 (默认 localhost)
*   `DB_PORT`: 端口 (默认 5432)
*   `DB_USER`: 用户名 (默认 postgres)
*   `DB_PASSWORD`: 密码 (默认 password)
*   `DB_NAME`: 数据库名 (默认 kityminder)
*   `JWT_SECRET`: JWT 签名密钥 (生产环境请务必修改)
*   `ENABLE_REGISTRATION`: 是否开放注册 (`true`/`false`，默认 false)
*   `ENABLE_INVITE_ONLY`: 是否仅允许邀请码注册 (`true`/`false`，默认 false)

**启动服务：**

```bash
# 开启注册功能启动（首次运行建议开启）
# Linux/Mac
export ENABLE_REGISTRATION=true
node server/app.js

# Windows PowerShell
$env:ENABLE_REGISTRATION="true"
node server/app.js
```

访问浏览器：[http://localhost:3000](http://localhost:3000)

## API 说明

*   `POST /api/auth/login`: 登录
*   `POST /api/auth/register`: 注册
*   `POST /api/auth/invite`: 生成邀请码 (简易实现)
*   `GET /api/maps`: 获取当前用户的脑图列表
*   `GET /api/maps/:id`: 获取指定脑图详情
*   `POST /api/maps`: 创建或更新脑图
*   `DELETE /api/maps/:id`: 删除脑图

## 版权说明

本项目原始代码版权归 [Baidu FEX](http://fex.baidu.com) 所有。
二次开发部分遵循 MIT 协议。
