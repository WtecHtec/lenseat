# Aether Cinema 3D — 在线选座与沉浸式观影剧场

支持平面精准选座、丝滑镜头的 3D 空间飞入转场、第一人称 360° 视角旋转与实时银幕光影的沉浸式在线电影院选票与观影系统。

---

## 🛠️ 技术栈

- **前端：** React 19, Three.js, Tailwind CSS v4, Motion, Lucide Icons, Vite
- **后端：** Node.js / Express, HLS 流媒体代理 (`/api/hls-proxy`) 与 IPTV 播放列表代理 (`/api/iptv-playlist`)
- **跨域与架构：** 全量 CORS 跨域支持，支持前后端分离独立启动或整合运行

---

## 🚀 快速启动

### 方式一：前后端独立运行（推荐）

适合前后端分离开发与独立部署调试。

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **终端 1：启动独立后端服务**：
   ```bash
   npm run dev:server
   # 服务将运行于 http://localhost:3000（纯 API 模式，已启用全域 CORS 跨域与 HLS 代理）
   ```

3. **终端 2：启动独立前端开发服务器**：
   ```bash
   npm run dev:client
   # 前端将运行于 http://localhost:5173
   ```

4. **配置后端 API 地址**：
   - 打开前端页面（`http://localhost:5173`）。
   - 点击右上角导航栏中的 **服务器图标（API 配置）**。
   - 输入后端服务地址（如 `http://localhost:3000`）并点击「测试服务端连通性」，测试通过后点击「保存配置」即可。
   - 亦可在前端根目录创建 `.env.local` 写入：
     ```env
     VITE_API_BASE_URL=http://localhost:3000
     ```

---

### 方式二：整合一键运行

在同一进程中由 Express 同时驱动后端 API 并通过 Vite 中间件承载前端：

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 📜 常用脚本

| 脚本命令 | 说明 |
| :--- | :--- |
| `npm run dev:client` | 单独启动前端 Vite 开发服务（默认端口 5173） |
| `npm run dev:server` | 单独启动后端 Express API 服务（包含 CORS，默认端口 3000） |
| `npm run dev` | 整合启动（前端与后端同端口 3000） |
| `npm run build` | 构建前端生产资源包至 `dist/` |
| `npm run start` | 生产模式启动后端服务 |
| `npm run lint` | TypeScript 类型校验 |

---

## 🌐 API 接口说明

- `GET /api/health`：服务健康检查接口，返回当前运行状态与运行时间。
- `GET /api/iptv-playlist?url=<m3u_url>`：服务器端 IPTV 播放列表抓取，解决前端 Mixed-Content 与第三方源跨域问题。
- `GET /api/hls-proxy?url=<target_url>`：高性能 HLS 切片与流媒体代理，自动重写 m3u8 清单中的二级分片与密钥。
