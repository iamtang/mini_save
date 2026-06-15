/**
 * 发布新版本到 GitHub Releases
 *
 * 用法：
 * node scripts/release.js [version]
 * node scripts/release.js 1.3.0
 *
 * 会自动：
 * 1. 上传 app.asar 文件
 * 2. 生成 version.json
 * 3. 创建 GitHub Release
 * 4. 上传更新包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

// 从 package.json 读取发布配置
function getPublishConfig() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const publish = pkg.build?.publish || {};
  const owner = publish.owner || pkg.author;
  const repo = publish.repo || pkg.name;

  return {
    GITHUB_API: 'https://api.github.com',
    REPO_OWNER: owner,
    REPO_NAME: repo
  };
}

const { GITHUB_API, REPO_OWNER, REPO_NAME } = getPublishConfig();

// 创建 axios 实例
const githubApi = axios.create({
  baseURL: GITHUB_API,
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'mini-save-release'
  }
});

// 从参数或 package.json 获取版本
function getVersion() {
  const args = process.argv.slice(2);
  if (args[0]) {
    return args[0];
  }

  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}

// 确保版本号格式正确
function validateVersion(version) {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
  if (!semverRegex.test(version)) {
    console.error(`❌ 无效的版本号格式: ${version}`);
    console.log('请使用语义化版本号，如: 1.0.0, 1.2.3-beta');
    process.exit(1);
  }
  return version;
}

// 获取 app.asar 文件路径
function getAppAsarPath() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const build = pkg.build || {};
  const productName = build.productName || pkg.name;
  const outputDir = build.directories?.output || 'build-output';

  // 获取当前平台
  const platform = process.platform;
  const arch = process.arch;

  let platformDir;
  if (platform === 'darwin') {
    platformDir = arch === 'arm64' ? 'mac-arm64' : 'mac';
  } else if (platform === 'win32') {
    platformDir = 'win-unpacked';
  } else {
    platformDir = 'linux-unpacked';
  }

  const asarPath = path.join(__dirname, '..', outputDir, platformDir, `${productName}.app`, 'Contents', 'Resources', 'app.asar');

  if (!fs.existsSync(asarPath)) {
    console.error(`❌ app.asar 文件不存在: ${asarPath}`);
    console.log('请先构建应用：npm run package');
    process.exit(1);
  }

  return asarPath;
}

// 直接使用 app.asar 文件
function prepareAsarFile(version) {
  console.log('📦 准备 app.asar 文件...');

  const asarPath = getAppAsarPath();
  const asarSize = fs.statSync(asarPath).size;
  console.log(`✅ app.asar 文件: ${(asarSize / 1024 / 1024).toFixed(2)} MB`);
  return asarPath;
}

// 生成 version.json（本地备份，可选）
function createVersionJson(version, asarSize) {
  console.log('📝 生成本地版本备份...');

  const versionInfo = {
    version,
    releaseDate: new Date().toISOString(),
    files: {
      appAsar: {
        url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}/app.asar`,
        size: asarSize,
        contentType: 'application/octet-stream'
      }
    }
  };

  // 只保存到 release/ 目录作为本地备份
  const releaseDir = path.join(__dirname, '..', 'release');
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }
  const localPath = path.join(releaseDir, 'version.json');
  fs.writeFileSync(localPath, JSON.stringify(versionInfo, null, 2));

  console.log(`✅ 本地备份已生成: ${localPath}`);
  return versionInfo;
}

// 获取 GitHub Token
function getGitHubToken() {
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

  console.error('❌ 未找到 GitHub Token');
  console.log('请设置 GITHUB_TOKEN 环境变量:');
  console.log('  export GITHUB_TOKEN=your_token_here');
  console.log('或者在 git config 中设置:');
  console.log('  git config --global github.token your_token_here');
  process.exit(1);
}

// 检查 Release 是否已存在
async function checkReleaseExists(tag, token) {
  try {
    await githubApi.get(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`, {
      headers: {
        'Authorization': `token ${token}`
      }
    });
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

// 创建 GitHub Release
async function createRelease(version, versionInfo, token) {
  const tag = `v${version}`;
  const exists = await checkReleaseExists(tag, token);

  if (exists) {
    console.log(`⚠️  Release ${tag} 已存在，跳过创建`);
    return { exists: true };
  }

  console.log('🚀 创建 GitHub Release...');

  const releaseData = {
    tag_name: tag,
    name: `版本 ${version}`,
    body: generateReleaseNotes(version),
    draft: false,
    prerelease: version.includes('-') // 带 - 的版本视为预发布版本
  };

  try {
    const response = await githubApi.post(`/repos/${REPO_OWNER}/${REPO_NAME}/releases`, releaseData, {
      headers: {
        'Authorization': `token ${token}`
      }
    });

    console.log(`✅ Release 创建成功: ${response.data.html_url}`);
    return { exists: false, uploadUrl: response.data.upload_url, release: response.data };
  } catch (error) {
    throw new Error(`创建 Release 失败: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
  }
}

// 上传文件到 Release
async function uploadToRelease(uploadUrl, filePath, token) {
  console.log(`📤 上传文件: ${path.basename(filePath)}...`);

  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);

  // 解析 upload_url，去掉 {？name} 参数
  const uploadApiUrl = uploadUrl.replace('{?name,label}', `?name=${fileName}`);

  try {
    await axios.put(uploadApiUrl, fileContent, {
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/octet-stream'
      }
    });
    console.log(`✅ 上传成功`);
  } catch (error) {
    throw new Error(`上传失败: ${error.response?.status} - ${error.response?.data || error.message}`);
  }
}

// 生成 Release Notes
function generateReleaseNotes(version) {
  return `# 迷你保存 v${version}

## 更新内容
- 更新 app.asar 文件

## 下载
- [app.asar](https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}/app.asar)

## 安装
应用会在启动时自动检查更新，或等待下次自动更新检查。
`;
}

// 主流程
async function main() {
  try {
    console.log('================================================');
    console.log('       迷你保存 - 版本发布工具');
    console.log('================================================\n');

    // 1. 获取并验证版本号
    const version = validateVersion(getVersion());
    console.log(`📌 版本: ${version}\n`);

    // 2. 准备 app.asar 文件
    const asarPath = prepareAsarFile(version);
    const asarSize = fs.statSync(asarPath).size;
    console.log(`   文件大小: ${(asarSize / 1024 / 1024).toFixed(2)} MB\n`);

    // 3. 生成版本信息
    const versionInfo = createVersionJson(version, asarSize);

    // 4. 获取 Token
    const token = getGitHubToken();

    // 5. 创建 Release
    const releaseResult = await createRelease(version, versionInfo, token);

    if (!releaseResult.exists) {
      // 6. 上传文件
      await uploadToRelease(releaseResult.uploadUrl, asarPath, token);

      console.log('\n================================================');
      console.log('✅ 发布完成!');
      console.log(`   版本: ${version}`);
      console.log(`   地址: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/v${version}`);
      console.log('================================================');
    } else {
      console.log('\n⚠️  Release 已存在，如需重新上传请先删除旧版本');
    }

  } catch (error) {
    console.error('\n❌ 发布失败:', error.message);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { prepareAsarFile, createVersionJson };
