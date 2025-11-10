const { app } =  require('electron');
const axios =  require('axios');
const fs = require('fs');
const path = require('path');
const os =  require('os');
const hexPath = path.join(app.getPath('userData'), 'hex');
if (!fs.existsSync(hexPath)) {
  fs.mkdirSync(hexPath, { recursive: true });
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
    fs.writeFileSync(saveFilePath, Buffer.from(response.data))
    return saveFilePath
}


module.exports = {
    getIPAddress,
    rmFolder,
    downloadFile
}