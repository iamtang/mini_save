const express = require('express');
const WebSocket = require('ws');

// 创建 Express 应用
const app = express();

// 创建 WebSocket 服务器
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

// 在 Express 中集成 WebSocket
app.server = app.listen(3000, () => {
  console.log('Express 服务已启动，监听端口 3000');
});

// 在 HTTP 服务器上升级到 WebSocket
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});