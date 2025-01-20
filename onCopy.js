const { clipboard, app } =  require('electron');
const axios =  require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
let preContent = null;
let socket = null


function onCopy(server, {url, credential, isServer}){
    if(!credential) return null
    socket = isServer ? initServerWss(server) : initClientWss({url, credential})
    let currentContent = clipboard.read('public.file-url') || clipboard.readText();
    setInterval(async () => {
        currentContent = clipboard.read('public.file-url') || clipboard.readText();
        if(currentContent === preContent || preContent && preContent.includes(app.getPath('userData')) || socket.readyState !== WebSocket.OPEN) return null;
        if(clipboard.read('public.file-url')){
            const form = new FormData();
            form.append('file', fs.createReadStream(decodeURIComponent(currentContent.replace('file://',''))));
            const res = await axios.post(`http://${url}api/upload/${credential}`, form, {headers: form.getHeaders() })
            socket.send(JSON.stringify({type: 'file', data: res.data.id}))
            console.log('===文件===')
            preContent = currentContent
        }else{
            let currentContent = clipboard.readText();
            await axios.post(`http://${url}api/text/${credential}`, {text: currentContent})
            socket.send(JSON.stringify({type: 'text', data: currentContent}))
            console.log('===文本===')
            preContent = currentContent
        }
    }, 1000);
}

function initServerWss(server){
    const wss = new WebSocket.Server({ noServer: true });
    // 处理 WebSocket 连接
    wss.on('connection', (ws) => {
      console.log('客户端连接成功');
      // 监听客户端发送的消息
      ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        console.log(data, '=======')
        if(data.type === 'text'){
          preContent = data.data
          clipboard.writeText(data.data)
        }
      });
    });
    
    // 在 HTTP 服务器上升级到 WebSocket
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
    return {
      send(data){
        wss.clients.forEach((client) => {
          if(client.readyState === WebSocket.OPEN){
            client.send(data)
          }
        })
    }}
}

function clearFolderContents(folderPath) {
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
    clearFolderContents(savePath)
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

    // 确保目标文件夹存在
    const downloadDir = path.dirname(saveFilePath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    fs.writeFileSync(saveFilePath, Buffer.from(response.data))
    return saveFilePath
}

function reConnentClientWss({url, credential}){
    setTimeout(() => {
        console.log('正在重连')
        socket = initClientWss({url, credential});
    }, 5000)
}

function initClientWss({url, credential}){
    socket = new WebSocket(`ws://${url}`);
    socket.on('open', () => {
        console.log('WebSocket 连接成功');
        socket.on('message', (msg) => {
            const data = JSON.parse(msg);
            if(data.type === 'text'){
                preContent = data.data
                clipboard.writeText(data.data)
            }else if(data.type === 'file'){
                downloadFile(`http://${url}api/download/${credential}/${data.data}`).then(res => {
                    preContent = res
                    clipboard.writeBuffer('public.file-url', Buffer.from(`file://${res}`, 'utf-8'));

                })
            }
            console.log(`收到消息: ${msg}`);
        });
        setInterval(() => {
            socket.send(JSON.stringify({type: 'ping'}));
        }, 30000);
    });

    socket.onerror = (error) => {
        socket.close(); // 确保触发 onclose 事件
    };
  
    socket.onclose = () => {
        reConnentClientWss({url, credential}); // 调用重连逻辑
    };

    return socket
}


module.exports = onCopy