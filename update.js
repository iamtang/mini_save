/**
 * 自动更新模块 - 从 GitHub Releases 下载更新包
 *
 * 功能：
 * 1. 检查 GitHub Releases 最新版本
 * 2. 下载 app.asar 文件
 * 3. 替换本地 app.asar 文件
 * 4. 提示用户重启应用
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { app } = require('electron');
const log = require('electron-log');

// 从 package.json 读取发布配置
function getPublishConfig() {
  const pkgPath = path.join(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const publish = pkg.build?.publish || {};
  const owner = publish.owner || pkg.author;
  const repo = publish.repo || pkg.name;

  return {
    GITHUB_RAW: 'https://raw.githubusercontent.com',
    REPO_OWNER: owner,
    REPO_NAME: repo
  };
}

const { GITHUB_RAW, REPO_OWNER, REPO_NAME } = getPublishConfig();

// 更新包下载位置
const UPDATE_DIR = path.join(app.getPath('userData'), 'updates');

// 配置 axios
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'mini-save-app',
    'Accept': 'application/vnd.github.v3+json'
  }
});

/**
 * 获取当前应用版本
 */
function getCurrentVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch (e) {
    log.error('读取当前版本失败:', e);
    return '0.0.0';
  }
}

async function moveFileWithMv(sourcePath, destPath) {
  try {
    // 基本移动
    await execSync(`mv "${sourcePath}" "${destPath}"`);
    log.info(`文件移动成功: mv "${sourcePath}" "${destPath}"`);
    return true;
  } catch (error) {
    log.error(`文件移动失败: ${error.message}`);
    return false;
  }
}

/**
 * 从 GitHub Raw 读取 package.json 获取最新版本
 */
async function getLatestRelease(retries = 3) {
  const packageJsonUrl = `${GITHUB_RAW}/${REPO_OWNER}/${REPO_NAME}/refs/heads/main/package.json`;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axiosInstance.get(packageJsonUrl, {
        timeout: 15000
      });

      if (response.status === 200) {
        const pkg = response.data;
        const version = pkg.version;

        if (!version) {
          log.warn('package.json 中未找到版本号');
          return null;
        }

        return {
          version,
          tagName: `v${version}`,
          name: `版本 ${version}`,
          downloadUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}/app.asar`,
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
        log.warn('获取版本失败:', error.message);
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
function compareVersions(v1, v2) {
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
async function checkForUpdates(options = {}) {
  const { silent = false, includePrerelease = false } = options;

  try {
    log.info('检查更新...');

    const currentVersion = getCurrentVersion();
    const release = await getLatestRelease();

    if (!release) {
      log.info('未找到发布版本');
      return { hasUpdates: false, message: '未找到发布版本' };
    }

    // 检查是否是预发布版本
    if (release.isPrerelease && !includePrerelease) {
      log.info('最新版本是预发布版本，跳过');
      return { hasUpdates: false, message: '最新版本是预发布版本' };
    }

    // 比较版本
    if (compareVersions(release.version, currentVersion) <= 0) {
      log.info(`当前版本 ${currentVersion} 已是最新`);
      return {
        hasUpdates: false,
        currentVersion,
        latestVersion: release.version,
        message: '当前版本已是最新'
      };
    }

    // 有新版本
    const updateInfo = {
      hasUpdates: true,
      currentVersion,
      latestVersion: release.version,
      downloadUrl: release.downloadUrl,
      size: release.size
    };

    log.info(`发现新版本: ${release.version} (当前: ${currentVersion})`);

    return updateInfo;

  } catch (error) {
    const errorMsg = error.response
      ? `GitHub API error: ${error.response.status}`
      : error.message;

    log.error('检查更新失败:', errorMsg);
    return { hasUpdates: false, error: errorMsg };
  }
}

/**
 * 下载更新包 (app.asar)
 */
async function downloadUpdate(downloadUrl, onProgress) {
  // 确保更新目录存在
  if (!fs.existsSync(UPDATE_DIR)) {
    fs.mkdirSync(UPDATE_DIR, { recursive: true });
  }

  const asarPath = path.join(UPDATE_DIR, 'app.asar');
  const tempPath = asarPath + '.tmp';

  log.info('开始下载 app.asar...');

  try {
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'mini-save-app'
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
        log.info('下载完成');
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
 * 获取当前 app.asar 的路径
 */
function getCurrentAppAsarPath() {
  // 在打包后的应用中，process.resourcesPath 指向 Resources 目录
  if (process.resourcesPath) {
    return path.join(process.resourcesPath, 'app.asar');
  }

  // 开发环境中没有 app.asar，返回 null
  log.warn('当前是开发环境，没有 app.asar 文件');
  return null;
}

/**
 * 替换 app.asar 文件
 */
async function replaceAppAsar(downloadedAsarPath) {
  const currentAsarPath = getCurrentAppAsarPath();
  log.info('开始替换app.asar', downloadedAsarPath, currentAsarPath)
  await moveFileWithMv(downloadedAsarPath, currentAsarPath)
  log.info('替换app.asar成功')
}

/**
 * 应用更新
 */
async function applyUpdate(options = {}) {
  const { onProgress, silent = false } = options;

  try {
    log.info('开始应用更新...');

    // 1. 检查更新
    const updateInfo = await checkForUpdates({ silent });

    if (!updateInfo.hasUpdates) {
      return { success: false, message: updateInfo.message || '没有可用更新' };
    }

    // 2. 下载 app.asar
    const asarPath = await downloadUpdate(updateInfo.downloadUrl, (downloaded, total) => {
      const progress = Math.round((downloaded / total) * 100);
      log.info(`下载进度: ${progress}%`);
      if (onProgress) {
        onProgress({ stage: 'downloading', progress, downloaded, total });
      }
    });

    // 3. 替换 app.asar
    if (onProgress) {
      onProgress({ stage: 'replacing', progress: 0 });
    }
    
    await replaceAppAsar(asarPath);

    log.info('更新完成');

    if (onProgress) {
      onProgress({ stage: 'completed', progress: 100 });
    }

    return {
      success: true,
      version: updateInfo.latestVersion,
      previousVersion: updateInfo.currentVersion
    };

  } catch (error) {
    log.error('应用更新失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 执行自动更新流程
 */
async function performUpdate() {
  try {
    const updateInfo = await checkForUpdates();

    if (!updateInfo.hasUpdates) {
      return { success: false, message: '当前版本已是最新' };
    }

    log.info(`发现新版本 ${updateInfo.latestVersion}，开始自动更新...`);

    const result = await applyUpdate({
      onProgress: (progress) => {
        if (progress.stage === 'downloading') {
          log.info(`下载 app.asar: ${progress.progress}%`);
        } else if (progress.stage === 'replacing') {
          log.info('替换 app.asar...');
        }
      }
    });

    if (result.success) {
      log.info('更新完成，准备重启应用...');
      app.relaunch();
      app.exit();
    }

    return result;

  } catch (error) {
    log.error('自动更新失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 启动时检查一次更新
 */
function startAutoUpdate() {
  log.info('启动时检查更新...');

  setTimeout(async () => {
    try {
      const updateInfo = await checkForUpdates({ silent: true });
      if (updateInfo.hasUpdates) {
        log.info('发现新版本，开始自动更新...');
        await performUpdate();
      }
    } catch (error) {
      log.warn('检查更新失败:', error.message);
    }
  }, 10000);
}

// 导出
module.exports = {
  checkForUpdates,
  applyUpdate,
  performUpdate,
  startAutoUpdate,
  getCurrentVersion
};
