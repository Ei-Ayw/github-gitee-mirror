<p align="center">
  <img src="assets/logo.png" width="120" alt="SyncPulse Logo" />
</p>

<h1 align="center">SyncPulse</h1>

<p align="center">
  <strong>一键将 GitHub 仓库镜像同步至 Gitee | Mirror GitHub Repositories to Gitee with One Click</strong>
</p>

<p align="center">
  <a href="https://github.com/Ei-Ayw/SyncPulse/stargazers"><img src="https://img.shields.io/github/stars/Ei-Ayw/SyncPulse?style=for-the-badge&color=yellow" alt="stars" /></a>
  <a href="https://github.com/Ei-Ayw/SyncPulse/network/members"><img src="https://img.shields.io/github/forks/Ei-Ayw/SyncPulse?style=for-the-badge&color=blue" alt="forks" /></a>
  <a href="https://github.com/Ei-Ayw/SyncPulse/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Ei-Ayw/SyncPulse?style=for-the-badge&color=green" alt="license" /></a>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs welcome" />
</p>

<p align="center">
  <img src="assets/demo.gif" width="800" alt="SyncPulse Demo" />
</p>

---

## 📖 简介 / Introduction

**SyncPulse** 是一款专为开发者设计的自动化仓库同步平台。它致力于解决 GitHub 访问不稳定或需要国内备份的痛点，通过优雅的 UI 和强大的异步任务流，让您的代码在 GitHub 与 Gitee 之间自由流动。

**SyncPulse** is an automated repository synchronization platform designed for developers. It addresses the pain points of unstable GitHub access or the need for domestic backups. With an elegant UI and robust asynchronous task flows, it keeps your code flowing seamlessly between GitHub and Gitee.

---

## ✨ 主要功能 / Key Features

- 🔄 **智能镜像同步 (Smart Mirror Sync)**: 优先 `git push --mirror` 完整同步；遇到隐藏引用被拒绝时，自动回退至 `--all + --tags` 模式，确保同步成功。
- 🚀 **一键搬家 (Bulk Sync)**: 一键将你所有 GitHub 仓库批量同步至 Gitee，告别逐个手动操作。
- 🔑 **OAuth 2.0 联动**: 支持 GitHub 和 Gitee 的标准 OAuth 登录，安全高效地管理您的仓库权限。
- 🏗️ **自动初始化仓库**: 如果 Gitee 目标仓库不存在，SyncPulse 将利用 API 为您自动创建并配置。
- 📊 **实时监控面板**: 暗黑系 Glassmorphism UI 设计，集成 GitHub 风格的同步活跃度热力图和完整的同步历史日志。
- ⚡ **高性能异步处理**: 基于 Celery + Redis，处理大规模仓库搬家时不会阻塞页面。
- ⏰ **定时自动同步 (Cron Jobs)**: 通过 Celery Beat 配置每日自动同步全部仓库，无需人工干预。
- 🪝 **Webhook 触发同步**: 配置 GitHub Webhook 后，每次 `push` 事件自动触发对应仓库的同步。
- 🔁 **GitHub Actions CI/CD 同步**: 通过 GitHub Actions 定时或 push 触发自动同步，支持单仓库和批量同步模式。

---

## 🛠️ 技术栈 / Tech Stack

| 库/框架 Library/Framework | 用途 Usage |
| :--- | :--- |
| **FastAPI** | 高性能异步后端 API |
| **React (Vite)** | 现代前端工程化方案 |
| **Tailwind CSS** | 响应式精致样式设计 |
| **Framer Motion** | 流畅的微交互动画 |
| **Celery & Redis** | 分布式异步任务队列 |
| **MySQL & SQLAlchemy** | 数据持久化与 ORM |

---

## 🚀 快速开始 / Quick Start

### 1. 环境准备 / Prerequisites
确保您的机器上已安装：
- **Python** 3.9+
- **Node.js** 18+
- **MySQL** 8.0+
- **Redis**

### 2. 配置环境变量 / Configuration
在 `backend/` 目录下根据 `.env.example` 创建 `.env` 文件，并填写您的 OAuth 密钥。
Create a `.env` file in the `backend/` directory based on `.env.example` and fill in your OAuth credentials.

### 3. 启动项目 / Run Locally

> ⚠️ **Windows 用户注意**: Celery Worker 和 Beat 必须在**不同的终端窗口**中分别启动，不能合并为一条命令。

**后端 / Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

**启动任务工人 / Worker (终端 2):**
```bash
cd backend
python -m celery -A app.worker.celery_app worker --loglevel=info --pool=solo
```

**启动定时任务 / Beat Scheduler (终端 3):**
```bash
cd backend
python -m celery -A app.worker.celery_app beat --loglevel=info
```

**前端 / Frontend (终端 4):**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔄 GitHub Actions CI/CD 同步 / CI/CD Sync

SyncPulse 支持通过 GitHub Actions 自动化同步仓库到 Gitee。项目提供了现成的 workflow 模板文件 `.github/workflows/sync-to-gitee.yml`。

### 配置步骤 / Setup Steps

1. 在 SyncPulse 设置页面绑定 GitHub 和 Gitee 账号
2. 点击 **Generate Sync Token** 生成 CI/CD 认证 token
3. 复制 Sync Token、API URL 和 User ID
4. 在你的 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加：
   - `SYNCPULSE_API_TOKEN` — SyncPulse 生成的同步 token
   - `SYNCPULSE_API_URL` — SyncPulse 服务地址（如 `https://your-server.com`）
   - `SYNCPULSE_USER_ID` — SyncPulse 用户 ID

5. 将 `.github/workflows/sync-to-gitee.yml` 添加到你的仓库
6. workflow 支持三种触发方式：
   - **Push 触发**: 任何分支的 push 事件自动触发同步
   - **定时触发**: 每天凌晨 2:00 UTC 自动同步
   - **手动触发**: 在 GitHub Actions 页面点击 Run workflow

---

## 🗺️ 路线图 / Roadmap

- [x] 支持同步全量 Repositories (一键搬家)
- [x] 定时自动同步任务 (Cron Jobs / Celery Beat)
- [x] Webhook 触发同步
- [x] 智能推送回退 (`--mirror` → `--all`)
- [x] 同步历史日志 (Sync History)
- [x] GitHub Actions CI/CD 同步
- [ ] Webhook 签名验证 (Signature Verification)
- [ ] 飞书/钉钉 同步成功通知
- [ ] 支持更多的 Git 平台 (GitLab, Bitbucket)
- [ ] 用户级别的定时同步配置

---

## 🤝 参与贡献 / Contributing

我们非常欢迎各种形式的贡献！无论是提交 Bug 反馈、功能建议还是 Pull Request。
We welcome all forms of contribution! Whether it's bug reports, feature suggestions, or pull requests.

1. Fork 本项目
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

---

## 📜 开源协议 / License

本项目采用 [MIT License](LICENSE) 开源。

## ⭐️ 感谢支持 / Support

如果这个项目对你有帮助，请给一个 **Star** 吧！这对我们意义重大。
If this project helps you, please give it a **Star**! It means a lot to us.
