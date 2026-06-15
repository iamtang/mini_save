# 迷你保存 - 自动更新系统使用指南

## 概述

本项目的自动更新系统通过 GitHub Releases 实现版本管理和自动更新功能。

**版本获取方式**：客户端从 GitHub Raw 读取 `package.json` 获取远程版本号，与本地版本比较。

## 开发者 - 发布新版本

### 1. 准备工作

配置 GitHub Token（首次使用）：

```bash
export GITHUB_TOKEN=your_token_here
```

> 获取 Token：GitHub Settings → Developer settings → Personal access tokens

### 2. 发布流程

```bash
# 1. 修改 package.json 版本号（如 1.3.0）

# 2. 发布
npm run release
```

### 3. 自动完成

执行 `npm run release` 会自动：

1. 📦 打包 `dist/` 和 `page/` 目录为 `update-{version}.zip`
2. 🚀 在 GitHub 创建 Release
3. 📤 上传更新包到 Release

### 4. 版本号规范

- `1.0.0` - 正式版本
- `1.0.1` - 补丁版本（bug 修复）
- `1.1.0` - 次版本（新功能）
- `2.0.0` - 主版本（破坏性变更）
- `1.3.0-beta` - 预发布版本

## 用户 - 自动更新

### 更新检查时机

1. **启动检查**：应用启动后延迟 10 秒检查一次
2. **定期检查**：默认每 30 分钟检查一次（可在 `index.js` 调整）
3. **手动检查**：通过 UI 或代码触发

### 更新流程

```
1. 读取 GitHub Raw: package.json 版本号
   ↓
2. 与本地版本比较
   ↓
3. 有新版本则提示用户
   ↓
4. 下载 zip 更新包
   ↓
5. 解压到应用目录
   ↓
6. 提示用户重启应用
```

### 代码示例

```javascript
const { checkForUpdates, performUpdate, startAutoUpdate } = require('./update');

// 检查更新（静默）
const updateInfo = await checkForUpdates({ silent: true });
if (updateInfo.hasUpdates) {
  console.log('发现新版本:', updateInfo.latestVersion);
}

// 完整更新流程（带 UI）
await performUpdate();

// 启动自动更新检查
startAutoUpdate(30); // 每 30 分钟
```

## 文件结构

```
mini_save/
├── dist/              # 前端构建文件（会被打包）
├── page/              # 页面文件（会被打包）
├── release/           # 发布输出
│   └── update-1.3.0.zip
├── scripts/
│   └── release.js     # 发布脚本
├── update.js          # 更新模块
└── package.json       # 版本号（客户端从此获取远程版本）
```

## 常见问题

### Q: 如何只更新部分文件？

修改 `scripts/release.js` 中的打包命令：

```javascript
// 只更新 page 目录
execSync(`zip -r "${zipPath}" page/ -x "*.DS_Store"`, { stdio: 'inherit' });
```

### Q: 更新失败怎么办？

1. 检查网络连接
2. 确认 GitHub Token 有效
3. 确认系统已安装 `unzip` 命令

### Q: 预发布版本如何测试？

在 `checkForUpdates()` 添加 `includePrerelease: true`。

## 技术细节

### 版本比较

```javascript
// 从 GitHub Raw 获取
https://raw.githubusercontent.com/iamtang/mini_save/refs/heads/main/package.json

// 提取 version 字段与本地比较
compareVersions(remoteVersion, localVersion)
```

### 更新包下载

```javascript
// 构造下载 URL
`https://github.com/iamtang/mini_save/releases/download/v${version}/update-${version}.zip`
```

### 备用方案

如果 GitHub Raw 访问失败，会自动回退到 GitHub API：
```
https://api.github.com/repos/iamtang/mini_save/releases/latest
```
