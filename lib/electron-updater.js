/**
 * GitHub 自动更新模块
 *
 * 提供版本发布和自动更新功能，支持在任何 Electron 项目中使用
 *
 * @example
 * const { Release, Updater } = require('./lib/electron-updater');
 *
 * // 发布新版本
 * const release = new Release({
 *   owner: 'your-username',
 *   repo: 'your-repo'
 * });
 * await release.publish('1.0.0');
 *
 * // 在 Electron 应用中检查更新
 * const updater = new Updater({
 *   owner: 'your-username',
 *   repo: 'your-repo'
 * });
 * const updateInfo = await updater.checkForUpdates();
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 基础配置类 - 处理 GitHub 仓库配置
 */
class GitHubConfig {
  constructor(options = {}) {
    this.options = {
      owner: options.owner,
      repo: options.repo,
      githubApi: options.githubApi || 'https://api.github.com',
      githubRaw: options.githubRaw || 'https://raw.githubusercontent.com',
      ...options
    };
  }

  /**
   * 从 package.json 读取发布配置
   */
  static fromPackageJson(pkgPath = null) {
    const pkgPathResolved = pkgPath || path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPathResolved, 'utf-8'));

    const publish = pkg.build?.publish || {};
    const owner = publish.owner || pkg.author;
    const repo = publish.repo || pkg.name;

    return new GitHubConfig({ owner, repo });
  }

  /**
   * 获取 GitHub Token
   */
  getGitHubToken() {
    if (this.options.token) {
      return this.options.token;
    }

    // 从环境变量读取
    if (process.env.GITHUB_TOKEN) {
      return process.env.GITHUB_TOKEN;
    }

    // 尝试从 git config 读取
    try {
      const token = execSync('git config --get github.token', { encoding: 'utf-8' }).trim();
      if (token) return token;
    } catch (e) {
      // 忽略错误
    }

    throw new Error('未找到 GitHub Token。请设置 GITHUB_TOKEN 环境变量或在配置中传入 token');
  }

  /**
   * 获取当前应用版本
   */
  getCurrentVersion(pkgPath = null) {
    try {
      const pkgPathResolved = pkgPath || path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPathResolved, 'utf-8'));
      return pkg.version;
    } catch (e) {
      console.warn('读取当前版本失败:', e);
      return '0.0.0';
    }
  }

  /**
   * 创建 axios 实例用于 GitHub API
   */
  createApiInstance(token = null) {
    if (this.options.token) {
      return this.options.token;
    }

    // 从环境变量读取
    if (process.env.GITHUB_TOKEN) {
      return process.env.GITHUB_TOKEN;
    }

    // 尝试从 git config 读取
    try {
      const token = execSync('git config --get github.token', { encoding: 'utf-8' }).trim();
      if (token) return token;
    } catch (e) {
      // 忽略错误
    }

    throw new Error('未找到 GitHub Token。请设置 GITHUB_TOKEN 环境变量或在配置中传入 token');
  }

  /**
   * 创建 axios 实例用于 GitHub API
   */
  createApiInstance(token = null) {
    const authToken = token || this.getGitHubToken();

    return axios.create({
      baseURL: this.options.githubApi,
      timeout: 30000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${authToken}`
      }
    });
  }
}

/**
 * 版本发布类 - 用于发布新版本到 GitHub Releases
 */
class Release extends GitHubConfig {
  constructor(options = {}) {
    super(options);
    this.log = options.log || console;
  }

  /**
   * 从 package.json 读取发布配置
   */
  static fromPackageJson(pkgPath = null) {
    const pkgPathResolved = pkgPath || path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPathResolved, 'utf-8'));

    const publish = pkg.build?.publish || {};
    const owner = publish.owner || pkg.author;
    const repo = publish.repo || pkg.name;

    return new Release({ owner, repo });
  }

  /**
   * 验证版本号格式
   */
  validateVersion(version) {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    if (!semverRegex.test(version)) {
      throw new Error(`无效的版本号格式: ${version}。请使用语义化版本号，如: 1.0.0, 1.2.3-beta`);
    }
    return version;
  }

  /**
   * 获取 app.asar 文件路径
   */
  getAppAsarPath(outputOptions = {}) {
    const {
      productName: inputProductName,
      outputDir = 'build-output',
      platform = process.platform,
      arch = process.arch
    } = outputOptions;

    // 如果没有传入 productName，从 package.json 读取
    let productName = inputProductName;
    if (!productName) {
      try {
        const pkgPath = path.join(process.cwd(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        productName = pkg.build?.productName || pkg.name;
      } catch (e) {
        // 忽略错误，使用默认值
      }
    }

    let platformDir;
    if (platform === 'darwin') {
      platformDir = arch === 'arm64' ? 'mac-arm64' : 'mac';
    } else if (platform === 'win32') {
      platformDir = 'win-unpacked';
    } else {
      platformDir = 'linux-unpacked';
    }

    const appPath = productName ? `${productName}.app` : 'app';
    const asarPath = path.join(outputDir, platformDir, appPath, 'Contents', 'Resources', 'app.asar');

    if (!fs.existsSync(asarPath)) {
      throw new Error(`app.asar 文件不存在: ${asarPath}`);
    }

    return asarPath;
  }

  /**
   * 生成 version.json
   */
  createVersionJson(version, asarSize, releaseDir = null) {
    const versionInfo = {
      version,
      releaseDate: new Date().toISOString(),
      files: {
        appAsar: {
          url: `https://github.com/${this.options.owner}/${this.options.repo}/releases/download/v${version}/app.asar`,
          size: asarSize,
          contentType: 'application/octet-stream'
        }
      }
    };

    if (releaseDir) {
      if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir, { recursive: true });
      }
      const localPath = path.join(releaseDir, 'version.json');
      fs.writeFileSync(localPath, JSON.stringify(versionInfo, null, 2));
      this.log.info(`本地备份已生成: ${localPath}`);
    }

    return versionInfo;
  }

  /**
   * 检查 Release 是否已存在
   */
  async checkReleaseExists(tag) {
    const api = this.createApiInstance();

    try {
      await api.get(`/repos/${this.options.owner}/${this.options.repo}/releases/tags/${tag}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 创建 GitHub Release
   */
  async createRelease(version, releaseNotes = null) {
    const tag = `v${version}`;
    const exists = await this.checkReleaseExists(tag);

    if (exists) {
      this.log.warn(`Release ${tag} 已存在`);
      return { exists: true };
    }

    this.log.info('创建 GitHub Release...');

    const releaseData = {
      tag_name: tag,
      name: `版本 ${version}`,
      body: releaseNotes || this.generateReleaseNotes(version),
      draft: false,
      prerelease: version.includes('-')
    };

    const api = this.createApiInstance();
    const response = await api.post(`/repos/${this.options.owner}/${this.options.repo}/releases`, releaseData);

    this.log.info(`Release 创建成功: ${response.data.html_url}`);
    return { exists: false, uploadUrl: response.data.upload_url, release: response.data };
  }

  /**
   * 上传文件到 Release
   */
  async uploadFile(uploadUrl, filePath) {
    this.log.info(`上传文件: ${path.basename(filePath)}...`);

    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    const uploadApiUrl = uploadUrl.replace('{?name,label}', `?name=${fileName}`);

    const token = this.getGitHubToken();
    await axios.put(uploadApiUrl, fileContent, {
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/octet-stream'
      }
    });

    this.log.info('上传成功');
  }

  /**
   * 生成默认 Release Notes
   */
  generateReleaseNotes(version) {
    return `# v${version}

## 更新内容
- 更新 app.asar 文件

## 下载
- [app.asar](https://github.com/${this.options.owner}/${this.options.repo}/releases/download/v${version}/app.asar)
`;
  }

  /**
   * 发布完整流程
   */
  async publish(version, options = {}) {
    const {
      asarPath = null,
      outputOptions = {},
      releaseDir = null,
      releaseNotes = null
    } = options;

    try {
      // 1. 验证版本号
      const validVersion = this.validateVersion(version);
      this.log.info(`📌 版本: ${validVersion}`);

      // 2. 获取 app.asar 文件
      let finalAsarPath = asarPath;
      if (!finalAsarPath) {
        finalAsarPath = this.getAppAsarPath(outputOptions);
      }

      const asarSize = fs.statSync(finalAsarPath).size;
      this.log.info(`app.asar 文件: ${(asarSize / 1024 / 1024).toFixed(2)} MB`);

      // 3. 生成版本信息
      const versionInfo = this.createVersionJson(validVersion, asarSize, releaseDir);

      // 4. 创建 Release
      const releaseResult = await this.createRelease(validVersion, releaseNotes);

      if (!releaseResult.exists) {
        // 5. 上传文件
        await this.uploadFile(releaseResult.uploadUrl, finalAsarPath);

        this.log.info('发布完成!');
        return {
          success: true,
          version: validVersion,
          url: `https://github.com/${this.options.owner}/${this.options.repo}/releases/tag/v${validVersion}`
        };
      }

      return {
        success: false,
        exists: true,
        version: validVersion
      };

    } catch (error) {
      this.log.error('发布失败:', error.message);
      throw error;
    }
  }
}

/**
 * 版本更新类 - 用于在 Electron 应用中检查和应用更新
 */
class Updater extends GitHubConfig {
  constructor(options = {}) {
    super(options);

    // Electron 相关
    this.app = options.app;
    this.log = options.log;

    // 更新目录
    if (this.app) {
      this.updateDir = path.join(this.app.getPath('userData'), 'updates');
    } else {
      this.updateDir = options.updateDir || path.join(process.cwd(), 'updates');
    }
  }

  /**
   * 从 package.json 读取发布配置
   */
  static fromPackageJson(pkgPath = null) {
    const pkgPathResolved = pkgPath || path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPathResolved, 'utf-8'));

    const publish = pkg.build?.publish || {};
    const owner = publish.owner || pkg.author;
    const repo = publish.repo || pkg.name;

    return new Updater({ owner, repo });
  }

  /**
   * 创建 axios 实例（无需认证）
   */
  createClient() {
    return axios.create({
      timeout: 30000,
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
  }

  /**
   * 获取最新版本信息
   */
  async getLatestRelease(retries = 3) {
    const client = this.createClient();
    const packageJsonUrl = `${this.options.githubRaw}/${this.options.owner}/${this.options.repo}/refs/heads/main/package.json`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await client.get(packageJsonUrl, { timeout: 15000 });

        if (response.status === 200) {
          const pkg = response.data;
          const version = pkg.version;

          if (!version) {
            this.log?.warn('package.json 中未找到版本号');
            return null;
          }

          return {
            version,
            tagName: `v${version}`,
            name: `版本 ${version}`,
            downloadUrl: `https://github.com/${this.options.owner}/${this.options.repo}/releases/download/v${version}/app.asar`,
            size: 0,
            isPrerelease: version.includes('-')
          };
        }
      } catch (error) {
        const isLastAttempt = i === retries - 1;
        const isRetryable = ['ECONNABORTED', 'ECONNREFUSED', 'ENOTFOUND'].includes(error.code) ||
                           !error.response || error.response?.status >= 500;

        if (isRetryable && !isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        if (isLastAttempt) {
          this.log?.warn('获取版本失败:', error.message);
          return null;
        }
      }
    }

    return null;
  }

  /**
   * 比较版本号
   * 返回: 1 (v1 > v2), -1 (v1 < v2), 0 (v1 == v2)
   */
  compareVersions(v1, v2) {
    const parts1 = v1.replace(/^v/, '').split('-')[0].split('.').map(Number);
    const parts2 = v2.replace(/^v/, '').split('-')[0].split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

  /**
   * 检查是否有可用更新
   */
  async checkForUpdates(options = {}) {
    const { includePrerelease = false, currentVersion: inputVersion } = options;

    try {
      this.log?.info('检查更新...');

      const currentVersion = inputVersion || this.getCurrentVersion();
      const release = await this.getLatestRelease();

      if (!release) {
        return { hasUpdates: false, message: '未找到发布版本' };
      }

      // 检查是否是预发布版本
      if (release.isPrerelease && !includePrerelease) {
        return { hasUpdates: false, message: '最新版本是预发布版本' };
      }

      // 比较版本
      if (this.compareVersions(release.version, currentVersion) <= 0) {
        return {
          hasUpdates: false,
          currentVersion,
          latestVersion: release.version,
          message: '当前版本已是最新'
        };
      }

      // 有新版本
      return {
        hasUpdates: true,
        currentVersion,
        latestVersion: release.version,
        downloadUrl: release.downloadUrl,
        size: release.size
      };

    } catch (error) {
      const errorMsg = error.response
        ? `GitHub API error: ${error.response.status}`
        : error.message;

      this.log?.error('检查更新失败:', errorMsg);
      return { hasUpdates: false, error: errorMsg };
    }
  }

  /**
   * 下载更新包
   */
  async downloadUpdate(downloadUrl, onProgress) {
    // 确保更新目录存在
    if (!fs.existsSync(this.updateDir)) {
      fs.mkdirSync(this.updateDir, { recursive: true });
    }

    const asarPath = path.join(this.updateDir, 'app.asar');
    const tempPath = asarPath + '.tmp';

    this.log?.info('开始下载 app.asar...');

    try {
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 60000,
        headers: {
        },
        onDownloadProgress: (progressEvent) => {
          const downloaded = progressEvent.loaded;
          const total = progressEvent.total;
          if (onProgress && total) {
            onProgress(downloaded, total);
          }
        }
      });

      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          writer.close();
          fs.renameSync(tempPath, asarPath);
          this.log?.info('下载完成');
          resolve(asarPath);
        });

        writer.on('error', (error) => {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {}
          reject(error);
        });
      });

    } catch (error) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {}

      if (error.code === 'ECONNABORTED') {
        throw new Error('下载超时，请检查网络连接');
      }
      throw error;
    }
  }

  /**
   * 移动文件（跨平台）
   */
  async moveFile(sourcePath, destPath) {
    const command = process.platform === 'win32' ? 'move' : 'mv';
    execSync(`${command} "${sourcePath}" "${destPath}"`, { stdio: 'ignore' });
    this.log?.info(`文件移动成功: ${sourcePath} -> ${destPath}`);
  }

  /**
   * 获取当前 app.asar 路径
   */
  getCurrentAppAsarPath() {
    if (process.resourcesPath) {
      return path.join(process.resourcesPath, 'app.asar');
    }
    throw new Error('当前是开发环境，没有 app.asar 文件');
  }

  /**
   * 替换 app.asar 文件
   */
  async replaceAppAsar(downloadedAsarPath) {
    const currentAsarPath = this.getCurrentAppAsarPath();
    this.log?.info('开始替换 app.asar');
    await this.moveFile(downloadedAsarPath, currentAsarPath);
    this.log?.info('替换 app.asar 成功');
  }

  /**
   * 应用更新
   */
  async applyUpdate(options = {}) {
    const { onProgress, silent = false, updateInfo: providedUpdateInfo } = options;

    try {
      this.log?.info('开始应用更新...');

      // 1. 检查更新（如果没有提供 updateInfo）
      const updateInfo = providedUpdateInfo || await this.checkForUpdates({ silent });

      if (!updateInfo.hasUpdates) {
        return { success: false, message: updateInfo.message || '没有可用更新' };
      }

      // 2. 下载 app.asar
      const asarPath = await this.downloadUpdate(updateInfo.downloadUrl, (downloaded, total) => {
        const progress = Math.round((downloaded / total) * 100);
        if (onProgress) {
          onProgress({ stage: 'downloading', progress, downloaded, total });
        }
      });

      // 3. 替换 app.asar
      if (onProgress) {
        onProgress({ stage: 'replacing', progress: 0 });
      }

      await this.replaceAppAsar(asarPath);

      this.log?.info('更新完成');

      if (onProgress) {
        onProgress({ stage: 'completed', progress: 100 });
      }

      return {
        success: true,
        version: updateInfo.latestVersion,
        previousVersion: updateInfo.currentVersion
      };

    } catch (error) {
      this.log?.error('应用更新失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行完整的自动更新流程
   */
  async performUpdate(options = {}) {
    try {
      const updateInfo = await this.checkForUpdates();

      if (!updateInfo.hasUpdates) {
        return { success: false, message: '当前版本已是最新' };
      }

      this.log?.info(`发现新版本 ${updateInfo.latestVersion}，开始自动更新...`);

      const result = await this.applyUpdate({
        updateInfo,  // 传递 updateInfo 避免重复检查
        onProgress: (progress) => {
          if (progress.stage === 'downloading') {
            this.log?.info(`下载 app.asar: ${progress.progress}%`);
          } else if (progress.stage === 'replacing') {
            this.log?.info('替换 app.asar...');
          }
          options.onProgress?.(progress);
        }
      });

      if (result.success && this.app) {
        this.log?.info('更新完成，准备重启应用...');
        this.app.relaunch();
        this.app.exit();
      }

      return result;

    } catch (error) {
      this.log?.error('自动更新失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 启动自动更新（延时执行）
   */
  startAutoUpdate(delayMs = 10000) {
    this.log?.info('启动自动更新...');

    setTimeout(async () => {
      await this.performUpdate();
    }, delayMs);
  }
}

/**
 * 命令行工具 - 用于独立运行发布脚本
 */
async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0];
  let version = args[1];

  try {
    const release = Release.fromPackageJson();

    if (command === 'publish' || command === 'release') {
      // 如果未指定版本号，从 package.json 读取
      if (!version) {
        version = release.getCurrentVersion();
      }
      const result = await release.publish(version);
      console.log(result);
    } else if (command === 'check') {
      const updater = new Updater(release.options);
      const updateInfo = await updater.checkForUpdates();
      console.log(updateInfo);
    } else {
      console.log(`
用法:
  node electron-updater.js publish [version]  发布新版本（不指定版本则使用 package.json 中的版本）
  node electron-updater.js check              检查更新
      `);
    }
  } catch (error) {
    console.error('执行失败:', error.message);
    process.exit(1);
  }
}

// 导出
module.exports = {
  GitHubConfig,
  Release,
  Updater,
  runCli
};

// 命令行运行
if (require.main === module) {
  runCli();
}
