
## Support for PostgreSQL / PostgreSQL 支持

本项目已修改以支持 PostgreSQL 数据存储。
This project has been modified to support PostgreSQL data storage.

### Prerequisites / 前置务件

1. Install **PostgreSQL**.
2. Create a database (e.g., `kityminder`).
3. Ensure you have **Node.js** installed.

### Configuration / 配置

Configure your database connection in `server/db.js` or use environment variables:
在 `server/db.js` 中配置数据库连接，或使用环境变量：

- `DB_USER` (default: postgres)
- `DB_HOST` (default: localhost)
- `DB_NAME` (default: kityminder)
- `DB_PASSWORD` (default: password)
- `DB_PORT` (default: 5432)

### Running / 运行

1. Install server dependencies:
   安装服务端依赖：
   ```bash
   cd server
   npm install
   cd ..
   ```

2. Start the server (serves both static files and API):
   启动服务器（同时提供静态文件和 API 服务）：
   ```bash
   node server/app.js
   ```

3. Open your browser at:
   在浏览器中打开：
   [http://localhost:3000/edit.html](http://localhost:3000/edit.html)

You will see new options in the "Open" and "Save" menus for PostgreSQL.
您将在“打开”和“保存”菜单中看到 PostgreSQL 的新选项。
