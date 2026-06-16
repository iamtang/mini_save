# GitHub 自动更新模块

一个通用的 GitHub Releases 发布和自动更新模块，适用于任何 Electron 项目。

## 功能

- 📦 **发布管理**: 自动发布新版本到 GitHub Releases
- 🔄 **自动更新**: 在 Electron 应用中检查和应用更新
- ⚙️ **灵活配置**: 支持自定义配置或从 package.json 读取
- 🎯 **简单易用**: 清晰的 API 设计，易于集成

## 安装

将 `electron-updater.js` 复制到你的项目 `lib/` 目录中。

确保已安装依赖：

```bash
npm install axios
```

## 配置

在 `package.json` 中添加发布配置：

```json
{
  "name": "your-app",
  "version": "1.0.0",
  "author": "your-username",
  "build": {
    "publish": {
      "owner": "your-username",
      "repo": "your-repo-name"
    },
    "productName": "YourApp",
    "directories": {
      "output": "build-output"
    }
  }
}
```

## 使用方法

### 1. 发布新版本

#### 方式一：命令行

```bash
node lib/electron-updater.js publish 1.0.0
```

#### 方式二：代码调用

```javascript
const { Release } = require('./lib/electron-updater');

const release = new Release({
  owner: 'your-username',
  repo: 'your-repo-name'
});

// 发布新版本
await release.publish('1.0.0');
```

### 2. 在 Electron 应用中集成更新功能

```javascript
const { app } = require('electron');
const { Updater } = require('./lib/electron-updater');
const log = require('electron-log');

// 创建更新实例
const updater = new Updater({
  owner: 'your-username',
  repo: 'your-repo-name',
  app: app,
  log: log
});

// 启动自动更新（启动后 10 秒检查一次）
updater.startAutoUpdate(10000);

// 或者手动检查更新
const updateInfo = await updater.checkForUpdates();
if (updateInfo.hasUpdates) {
  console.log(`发现新版本: ${updateInfo.latestVersion}`);

  // 应用更新
  const result = await updater.applyUpdate({
    onProgress: (progress) => {
      console.log(`${progress.stage}: ${progress.progress}%`);
    }
  });

  if (result.success) {
    console.log('更新完成，即将重启应用');
  }
}
```

### 3. 仅检查更新

```javascript
const { Updater } = require('./lib/electron-updater');

const updater = new Updater({
  owner: 'your-username',
  repo: 'your-repo-name'
});

// 检查更新
const updateInfo = await updater.checkForUpdates();

if (updateInfo.hasUpdates) {
  console.log('有新版本可用:', updateInfo.latestVersion);
  console.log('下载地址:', updateInfo.downloadUrl);
} else {
  console.log('当前版本已是最新');
}
```

## API 文档

### Release 类

#### 构造函数

```javascript
new Release(options)
```

**参数:**
- `options.owner` (string) - GitHub 仓库所有者
- `options.repo` (string) - GitHub 仓库名称
- `options.githubApi` (string) - GitHub API 地址（默认: `https://api.github.com`）
- `options.token` (string) - GitHub Token（可选，也可通过环境变量 `GITHUB_TOKEN` 设置）
- `options.log` (object) - 日志对象（默认: `console`）

#### 方法

##### `validateVersion(version)`

验证版本号格式。

##### `getAppAsarPath(outputOptions)`

获取 app.asar 文件路径。

**参数:**
- `outputOptions.productName` (string) - 应用名称
- `outputOptions.outputDir` (string) - 输出目录
- `outputOptions.platform` (string) - 平台（默认: `process.platform`）
- `outputOptions.arch` (string) - 架构（默认: `process.arch`）

##### `createRelease(version, releaseNotes)`

创建 GitHub Release。

##### `uploadFile(uploadUrl, filePath)`

上传文件到 Release。

##### `publish(version, options)`

执行完整的发布流程。

**参数:**
- `version` (string) - 版本号
- `options.asarPath` (string) - app.asar 文件路径（可选）
- `options.outputOptions` (object) - 输出配置（可选）
- `options.releaseDir` (string) - 本地备份目录（可选）
- `options.releaseNotes` (string) - 发布说明（可选）

**返回:**
```javascript
{
  success: boolean,
  version: string,
  url: string  // Release 页面 URL
}
```

### Updater 类

#### 构造函数

```javascript
new Updater(options)
```

**参数:**
- `options.owner` (string) - GitHub 仓库所有者
- `options.repo` (string) - GitHub 仓库名称
- `options.app` (object) - Electron app 实例（可选）
- `options.log` (object) - 日志对象（可选）
- `options.updateDir` (string) - 更新文件下载目录（可选）

#### 方法

##### `checkForUpdates(options)`

检查是否有可用更新。

**参数:**
- `options.includePrerelease` (boolean) - 是否包含预发布版本
- `options.currentVersion` (string) - 当前版本（可选）

**返回:**
```javascript
{
  hasUpdates: boolean,
  currentVersion: string,
  latestVersion: string,
  downloadUrl: string,
  size: number
}
```

##### `downloadUpdate(downloadUrl, onProgress)`

下载更新包。

**参数:**
- `downloadUrl` (string) - 下载地址
- `onProgress` (function) - 进度回调 `(downloaded, total) => {}`

##### `applyUpdate(options)`

应用更新（检查 → 下载 → 替换）。

**参数:**
- `options.onProgress` (function) - 进度回调
- `options.silent` (boolean) - 是否静默模式

**返回:**
```javascript
{
  success: boolean,
  version: string,
  previousVersion: string
}
```

##### `performUpdate(options)`

执行完整的自动更新流程（包含应用重启）。

##### `startAutoUpdate(delayMs)`

启动自动更新（延时检查）。

**参数:**
- `delayMs` (number) - 延时毫秒数（默认: 10000）

## 环境变量

- `GITHUB_TOKEN` - GitHub 访问令牌（用于发布功能）
  - 获取方式: GitHub Settings → Developer settings → Personal access tokens
  - 需要权限: `repo` (完整仓库访问权限)

## 迁移指南

### 从独立的 release.js / update.js 迁移

**旧代码 (release.js):**
```javascript
const { prepareAsarFile, createVersionJson } = require('./scripts/release');
```

**新代码:**
```javascript
const { Release } = require('./lib/electron-updater');
const release = new Release({ owner: 'user', repo: 'repo' });
await release.publish('1.0.0');
```

**旧代码 (update.js):**
```javascript
const { checkForUpdates, applyUpdate } = require('./update');
```

**新代码:**
```javascript
const { Updater } = require('./lib/electron-updater');
const updater = new Updater({ owner: 'user', repo: 'repo', app, log });
await updater.checkForUpdates();
await updater.applyUpdate();
```

## 许可

MIT
