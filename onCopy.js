const { clipboard, app } = require('electron');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { downloadFile } = require('./utils.js')
let preContent = null;
let currentContent = null;
let socket = null


function onCopy(server, {url, credential, isServer}){
    if(!credential) return null
    socket = isServer ? initServerWss(server, {url, credential}) : initClientWss({url, credential})
    currentContent = clipboard.read('public.file-url') || clipboard.readText();
    setInterval(async () => {
        currentContent = clipboard.read('public.file-url') || clipboard.readText();
        if(currentContent === preContent) return null;
		if(clipboard.read('public.file-url')){
			const form = new FormData();
			form.append('file', fs.createReadStream(decodeURIComponent(currentContent.replace('file://',''))));
			const res = await axios.post(`http://${url}/api/upload/${credential}`, form, {headers: form.getHeaders() })
			socket.send(JSON.stringify({type: 'file', data: res.data.id}))
			console.log('===文件===')
		}else{
			let currentContent = clipboard.readText();
			await axios.post(`http://${url}/api/text/${credential}`, {text: currentContent})
			socket.send(JSON.stringify({type: 'text', data: currentContent}))
			console.log('===文本===')
		}
		preContent = currentContent
    }, 1000);
}

function initServerWss(server, { url, credential }) {
	const wss = new WebSocket.Server({ noServer: true });
	// 处理 WebSocket 连接
	wss.on('connection', (ws) => {
		console.log('客户端连接成功');
		// 监听客户端发送的消息
		ws.on('message', (msg) => {
			const data = JSON.parse(msg);
			data.type !== 'ping' && console.log(data, '=======')
			if (data.type === 'text') {
				currentContent = preContent = data.data
				clipboard.writeText(currentContent)
			} else if (data.type === 'file') {
				downloadFile(`http://${url}/api/download/${credential}/${data.data}`).then(res => {
					currentContent = preContent = `file://${res}`
					clipboard.writeBuffer('public.file-url', Buffer.from(currentContent, 'utf-8'));
				})
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
		send(data) {
			wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(data)
				}
			})
		}
	}
}

function reConnentClientWss({ url, credential }) {
	setTimeout(() => {
		console.log('正在重连')
		socket = initClientWss({ url, credential });
	}, 5000)
}

function initClientWss({ url, credential }) {
	const socket = new WebSocket(`ws://${url}`);
	socket.on('open', () => {
		console.log('WebSocket 连接成功');
		socket.on('message', (msg) => {
			const data = JSON.parse(msg);
			if (data.type === 'text') {
				currentContent = preContent = data.data
				clipboard.writeText(currentContent)
			} else if (data.type === 'file') {
				downloadFile(`http://${url}/api/download/${credential}/${data.data}`).then(res => {
					currentContent = preContent = res
					clipboard.writeBuffer('public.file-url', Buffer.from(currentContent, 'utf-8'));
				})
			}
			console.log(`收到消息: ${msg}`);
		});
		setInterval(() => {
			socket.send(JSON.stringify({ type: 'ping' }));
		}, 30000);
	});

	socket.onerror = (error) => {
		socket.close(); // 确保触发 onclose 事件
	};

	socket.onclose = () => {
		reConnentClientWss({ url, credential }); // 调用重连逻辑
	};

	return socket
}


module.exports = onCopy