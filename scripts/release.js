/**
 * 发布新版本到 GitHub Releases
 *
 * 用法：
 * node scripts/release.js [version]
 * node scripts/release.js 1.3.0
 *
 * 会自动：
 * 1. 打包 dist 和 page 目录为 zip
 * 2. 生成 version.json
 * 3. 创建 GitHub Release
 * 4. 上传更新包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'iamtang';
const REPO_NAME = 'mini_save';

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

// 打包目录为 zip
function createZip(version) {
  console.log('📦 打包更新文件...');

  const outputDir = path.join(__dirname, '..', 'release');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zipFileName = `update-${version}.zip`;
  const zipPath = path.join(outputDir, zipFileName);

  // 检查是否安装了 zip 命令（macOS/Linux）
  try {
    // 使用 zip 命令打包
    const sourceDir = path.join(__dirname, '..');
    execSync(
      `cd "${sourceDir}" && zip -r "${zipPath}" dist/ page/ -x "*.DS_Store" "*.git*"`,
      { stdio: 'inherit' }
    );
  } catch (error) {
    console.error('❌ 打包失败，请确保系统已安装 zip 命令');
    process.exit(1);
  }

  console.log(`✅ 打包完成: ${zipPath}`);
  return zipPath;
}

// 生成 version.json（本地备份，可选）
function createVersionJson(version, zipSize) {
  console.log('📝 生成本地版本备份...');

  const versionInfo = {
    version,
    releaseDate: new Date().toISOString(),
    files: {
      updateZip: {
        url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}/update-${version}.zip`,
        size: zipSize,
        contentType: 'application/zip'
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
  return new Promise((resolve, reject) => {
    const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`;

    https.get(url, {
      headers: {
        'User-Agent': 'mini-save-release',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (response) => {
      resolve(response.statusCode === 200);
    }).on('error', reject);
  });
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

  return new Promise((resolve, reject) => {
    const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/releases`;

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'mini-save-release',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 201) {
          const result = JSON.parse(data);
          console.log(`✅ Release 创建成功: ${result.html_url}`);
          resolve({ exists: false, uploadUrl: result.upload_url, release: result });
        } else {
          reject(new Error(`创建 Release 失败: ${response.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(releaseData));
    req.end();
  });
}

// 上传文件到 Release
async function uploadToRelease(uploadUrl, filePath, token) {
  console.log(`📤 上传文件: ${path.basename(filePath)}...`);

  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);

  // 解析 upload_url，去掉 {？name} 参数
  const uploadApiUrl = uploadUrl.replace('{?name,label}', `?name=${fileName}`);

  return new Promise((resolve, reject) => {
    const req = https.request(uploadApiUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'mini-save-release',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/zip',
        'Content-Length': fileContent.length
      }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 201) {
          console.log(`✅ 上传成功`);
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`上传失败: ${response.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(fileContent);
    req.end();
  });
}

// 生成 Release Notes
function generateReleaseNotes(version) {
  return `# 迷你保存 v${version}

## 更新内容
- 更新 dist 和 page 文件

## 下载
- [update-${version}.zip](https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}/update-${version}.zip)

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

    // 2. 打包
    const zipPath = createZip(version);
    const zipSize = fs.statSync(zipPath).size;
    console.log(`   文件大小: ${(zipSize / 1024 / 1024).toFixed(2)} MB\n`);

    // 3. 生成版本信息
    const versionInfo = createVersionJson(version, zipSize);

    // 4. 获取 Token
    const token = getGitHubToken();

    // 5. 创建 Release
    const releaseResult = await createRelease(version, versionInfo, token);

    if (!releaseResult.exists) {
      // 6. 上传文件
      await uploadToRelease(releaseResult.uploadUrl, zipPath, token);

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

module.exports = { createZip, createVersionJson };
