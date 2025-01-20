const { clipboard } =  require('electron');
const axios =  require('axios');
const FormData = require('form-data');
const fs = require('fs');
const WebSocket = require('ws');

function onCopy(server, {url, credential, isServer}){
    if(!credential) return null
    isServer ? initServerWss(server) : initClientWss(url)
    let preContent = null;
    let currentContent = clipboard.read('public.file-url') || clipboard.readText();
    setInterval(async () => {
      currentContent = clipboard.read('public.file-url') || clipboard.readText();
      if(currentContent === preContent) return null;
      
      if(clipboard.read('public.file-url')){
        const form = new FormData();
        form.append('file', fs.createReadStream(currentContent.replace('file://','')));
        await axios.post(`http://${url}api/upload/${credential}`, form, {headers: form.getHeaders() })
        preContent = currentContent
      }else{
        let currentContent = clipboard.readText();
        await axios.post(`http://${url}api/text/${credential}`, {text: currentContent})
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
      ws.on('message', (message) => {
        console.log(`收到消息: ${message}`);
        // 回复客户端消息
        ws.send(`服务器收到: ${message}`);
      });
    
      // 发送消息给客户端
      ws.send('欢迎连接到 WebSocket 服务器');
    });
    
    // 在 HTTP 服务器上升级到 WebSocket
    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
}

function initClientWss(url){
    const socket = new WebSocket(`ws://${url}`);

    socket.on('open', () => {
      console.log('WebSocket 连接成功');
      // 发送消息到 WebSocket 服务器
      socket.send('message', 'hello world');
    });
}


module.exports = onCopy