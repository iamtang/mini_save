const { app } =  require('electron');
const axios =  require('axios');
const OSS =  require('ali-oss');
const fs = require('fs');
const path = require('path');
const os =  require('os');
const crypto = require('crypto');
const FormData = require('form-data');

const key = Buffer.from('7483c8494ebee272085a833dd83a7651e18aa2936529ed3146fe9ac0ea0439e1', 'hex'); // 256-bit 密钥
const iv = Buffer.from('69a117444dda7e183100876d7558ea37', 'hex');;  // 初始向量
const hexPath = path.join(app.getPath('userData'), 'hex');
if (!fs.existsSync(hexPath)) {
  fs.mkdirSync(hexPath, { recursive: true });
}

async function ossInit(){
  try {
      const ossConfig = require('./.oss.json')
      const oss = new OSS(ossConfig);
      await oss.list({ "max-keys": 5 });
      console.log('oss 服务正常')
      return oss
  } catch (error) {
      return null
  }
}

async function ossUpload(oss, filePath){
  const filename = path.basename(filePath)
  const hexFile = await encryptFile(filePath)
  const result = await oss.put(`test/${filename}`, hexFile);
  return {url: result.url}
}

// 获取本机 IP 地址
function getIPAddress() {
    const interfaces = os.networkInterfaces();
    for (let dev in interfaces) {
      for (let details of interfaces[dev]) {
        if (details.family === 'IPv4' && !details.internal) {
          if(details.address.includes('192.168')){
              return details.address;
          }
          ip = details.address
        }
        
      }
    }
    return ip
}

function rmFolder(folderPath) {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    // 获取文件夹中的所有内容
    const files = fs.readdirSync(folderPath);
  
    // 遍历每个文件/子文件夹
    files.forEach(file => {
        const currentPath = path.join(folderPath, file);
    
        // 获取文件/目录的状态
        const stats = fs.statSync(currentPath);
    
        if (stats.isDirectory()) {
            // 如果是目录，递归删除其中的文件
            clearFolderContents(currentPath);
    
            // 删除空目录
            fs.rmdirSync(currentPath);
        } else {
            // 如果是文件，删除文件
            fs.unlinkSync(currentPath);
        }
    });
}

// AES 256 CBC 加密文件
function encryptFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  
  // 保存临时加密文件
  const encryptedPath = path.join(hexPath, path.basename(filePath));
  fs.writeFileSync(encryptedPath, encrypted);

  return encryptedPath;
}

async function uploadFile(filePath, config){
  const form = new FormData();
  // form.append('file', fs.createReadStream(encryptFile(filePath)));
  form.append('file', fs.createReadStream(filePath));
  const res = await axios.post(`http://${config.url}/api/upload/${config.CREDENTIAL}`, form, {headers: form.getHeaders() })
  return res.data
}

// 解密
function decryptFile(encryptedBuffer) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted;
}

async function downloadFile(url){
    const savePath = path.join(app.getPath('userData'), 'downloads');
    // fs.rmdirSync(savePath);
    rmFolder(savePath)
    const response = await axios({method: 'get', url, responseType: 'arraybuffer'})
    const disposition = response.headers['content-disposition'];
    let fileName = 'default-file';  // 默认文件名

    // 解析 Content-Disposition 获取文件名
    if (disposition && disposition.indexOf('attachment') !== -1) {
      try {
        // 尝试解析文件名，并解码
        const fileNameMatch = disposition.match(/filename\*?=UTF-8''(.+)/);
        if (fileNameMatch && fileNameMatch[1]) {
          // 解码文件名，URL 解码
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      } catch (err) {
        console.error('解码文件名时发生错误:', err);
        fileName = 'default-file';  // 出现错误时使用默认文件名
      }
    }

    // 文件保存路径
    const saveFilePath = path.join(savePath, fileName);

    // ✅ 转为 Uint8Array 确保是纯字节流
    const encryptedBuffer = Buffer.from(new Uint8Array(response.data));
    // const decrypted = encryptedBuffer;
    const decrypted = decryptFile(encryptedBuffer);
    fs.writeFileSync(saveFilePath, decrypted);

    return saveFilePath;
}


module.exports = {
    getIPAddress,
    rmFolder,
    downloadFile,
    uploadFile,
    encryptFile,
    decryptFile,
    ossInit,
    ossUpload
}