# 📋 Mini Save - 多端剪贴板同步工具

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/iamtang/mini_save?style=social)
![GitHub forks](https://img.shields.io/github/forks/iamtang/mini_save?style=social)
![GitHub issues](https://img.shields.io/github/issues/iamtang/mini_save)
![GitHub license](https://img.shields.io/github/license/iamtang/mini_save)
![npm version](https://img.shields.io/npm/v/electron)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Node](https://img.shields.io/badge/node-%3E=20.0.0-brightgreen)

**一款轻量级、高安全性的剪贴板同步工具**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用说明](#-使用说明) • [部署指南](#-部署指南) • [常见问题](#-常见问题)

[English](./README_EN.md) | 简体中文

</div>

---

## 📖 项目简介

**Mini Save** 是一款跨平台的剪贴板同步工具，支持文本、图片、文件在多设备间实时同步。采用端到端加密技术，确保你的数据安全无忧。

> **核心优势：** 开源免费 | 端到端加密 | 多端同步 | 自建部署 | 隐私安全

**适用场景：** 多设备协作 | 文件传输 | 代码片段共享 | 团队协同 | 隐私文件传输

---

## ✨ 功能特性

### 🔄 多端实时同步
- **支持平台：** Windows / macOS / Linux / Web(H5) / 移动端
- **同步内容：** 文本、图片、任意文件
- **通信方式：** WebSocket 低延迟实时推送
- **自动重连：** 掉线后秒级恢复连接

### 🔐 安全加密
- **端到端加密：** AES-256-CBC 对称加密
- **零知识存储：** 服务端不解密，仅中转加密数据
- **密钥管理：** 每个分组独立密钥，互不干扰
- **安全传输：** HTTPS + 签名验证

### 📁 文件管理
- **文件上传：** 支持任意格式文件，自动加密
- **OSS 直传：** 支持阿里云 OSS 断点续传
- **历史记录：** 自动保存最近剪贴板历史
- **收藏功能：** 重要内容一键收藏

### 🎯 便捷操作
- **口令机制：** 输入相同口令即可加入共享空间
- **分组隔离：** 不同分组互不干扰
- **Web 界面：** 无需安装，浏览器直接使用
- **系统托盘：** 后台运行，随时唤起

### 🛠️ 高级功能
- **日志查看：** 实时查看系统运行日志
- **设置管理：** 灵活配置各项参数
- **自建部署：** 完全掌控数据隐私
- **API 接口：** 开放 API 便于集成

---

## 🚀 快速开始

### 环境要求

- **Node.js:** >= 20.0.0
- **npm:** >= 9.0.0
- **系统：** Windows / macOS / Linux

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/iamtang/mini_save.git
cd mini_save

# 安装依赖
npm install

# 构建前端
cd client
npm install
npm run build
cd ..

# 启动服务
npm run dev

# 打包应用（可选）
npm run package
```

### 快速使用

1. **启动应用** 后，系统托盘会出现图标
2. **打开网址** 或 Web 界面
3. **输入口令**（6 位字符）
4. **开始同步** - 在任意设备复制内容，其他设备立即可用

---

## 📖 使用说明

### 桌面端（Electron）

**系统托盘功能：**
- 🔴 **启动/停止** - 控制同步服务
- 🌐 **打开网址** - 快速访问 Web 界面
- ⚙️ **设置** - 配置服务参数
- 📋 **日志** - 查看运行日志
- ❌ **退出** - 完全退出应用

**快捷键：**
- `Ctrl/Cmd + Shift + V` - 打开剪贴板历史
- `ESC` - 关闭窗口

### Web 界面

**主要功能：**
- 📝 **查看历史** - 浏览所有同步记录
- 📋 **一键复制** - 点击文本立即复制
- 📥 **文件下载** - 点击文件立即下载
- ⭐ **内容收藏** - 标记重要内容
- 🗑️ **删除记录** - 清理不需要的内容
- 📤 **上传内容** - 直接上传文件或输入文本

### 口令机制

- **口令格式：** 6 位字符（数字或字母）
- **分组原理：** 相同口令 = 同一共享空间
- **安全性：** 口令不存储，仅用于分组标识
- **建议：** 定期更换口令保证安全

---

## 🌐 部署指南

### 本地开发

```bash
# 开发模式启动
npm run dev

# 服务运行在 http://localhost:3000
```

### 生产部署

```bash
# 构建 React 前端
cd client
npm run build

# 打包 Electron 应用
cd ..
npm run package

# 生成的安装包位于 dist/ 目录
```

### 服务器部署

**配置文件 (`config.json`)：**
```json
{
  "PORT": 3000,
  "SERVER_ADDRESS": "",
  "CREDENTIAL": "",
  "MAX_TEXT_NUMBER": 20,
  "MAX_FILE_NUMBER": 10,
  "MAX_FILE_SIZE": 10
}
```

**环境变量：**
```bash
# 服务端口
PORT=3000

# 服务端地址（客户端模式下配置）
SERVER_ADDRESS=https://your-server.com

# 默认口令（可选）
CREDENTIAL=123456

# 最大文本数量
MAX_TEXT_NUMBER=20

# 最大文件数量
MAX_FILE_NUMBER=10

# 最大文件大小（MB）
MAX_FILE_SIZE=10
```

### OSS 配置（可选）

如需使用阿里云 OSS 直传，创建 `.oss.json`：

```json
{
  "region": "oss-cn-hangzhou",
  "accessKeyId": "your-access-key-id",
  "accessKeySecret": "your-access-key-secret",
  "bucket": "your-bucket-name",
  "roleArn": "acs:ram::your-account-id:role/your-role-name",
  "secure": true
}
```

---

## 🔧 技术栈

### 前端
- **框架：** React 18
- **构建：** Vite
- **桌面：** Electron
- **通信：** WebSocket Client
- **加密：** Web Crypto API

### 后端
- **运行时：** Node.js
- **框架：** Express
- **通信：** WebSocket (ws)
- **存储：** 文件系统 / 阿里云 OSS
- **日志：** electron-log

### 安全
- **加密算法：** AES-256-CBC
- **密钥管理：** 本地存储，永不传输
- **传输安全：** HTTPS/WSS
- **文件加密：** 端侧加密，服务端零解密

---

## 📸 界面预览

### Web 界面
- 简洁现代的 UI 设计
- 响应式布局，支持移动端
- 实时更新，无需刷新
- 深色模式支持

### 桌面应用
- 系统托盘集成
- 后台静默运行
- 开机自启动（可选）
- 跨平台支持

---

## 🏗️ 项目结构

```
mini_save/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── utils/         # 工具函数
│   │   ├── App.jsx        # 主应用
│   │   └── main.jsx       # 入口文件
│   ├── index.css
│   └── package.json
├── page/                   # Electron 页面
│   ├── setting/           # 设置页面
│   └── logs/              # 日志页面
├── server.js               # Express 服务
├── index.js                # Electron 主进程
├── onCopy.js              # 剪贴板监听
├── utils.js               # 工具函数
├── clipboard.js     # macOS 剪贴板
├── .oss.json             # OSS 配置（可选）
├── config.json           # 应用配置
└── package.json
```

---

## ❓ 常见问题

### Q: 数据存储在哪里？
A: 
- **文本数据：** 本地 JSON 文件
- **文件数据：** 本地文件系统或 OSS
- **日志文件：** userData 目录

### Q: 安全性如何保障？
A:
- 端到端 AES 加密
- 服务端不解密
- 口令不存储
- HTTPS 传输

### Q: 支持哪些平台？
A:
- Windows 10/11
- macOS 10.15+
- Linux (主流发行版)
- Web 浏览器（现代浏览器）
- 移动端浏览器

### Q: 可以自建服务器吗？
A: 完全支持，项目完全开源，可自由部署到私有服务器。

### Q: 同步速度如何？
A: 采用 WebSocket 长连接，延迟通常在 100ms 以内，取决于网络状况。

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 开源协议

本项目基于 [MIT](LICENSE) 协议开源。

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=iamtang/mini_save&type=Date)](https://star-history.com/#iamtang/mini_save&Date)

---

## 🔗 相关链接

- [更新日志](CHANGELOG.md)
- [问题反馈](https://github.com/iamtang/mini_save/issues)
- [功能建议](https://github.com/iamtang/mini_save/discussions)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by [iamtang](https://github.com/iamtang)

</div>
