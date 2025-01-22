const { clipboard, app } = require('electron');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { downloadFile } = require('./utils.js')
const log = require('electron-log/main');

log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'main.log');
log.initialize()
let preContent = null;
let currentContent = null;
let socket = null

function onCopy(server, {isServer, url, CREDENTIAL, MAX_FILE_SIZE = 50}){
    if(!CREDENTIAL) return null
    socket = isServer ? initServerWss(server, {url, CREDENTIAL}) : initClientWss({url, CREDENTIAL})
    currentContent = clipboard.read('public.file-url') || clipboard.readText();
    setInterval(async () => {
        currentContent = clipboard.read('public.file-url') || clipboard.readText();
        if(currentContent === preContent) return null;
		if(clipboard.read('public.file-url')){
            const filePath = decodeURIComponent(currentContent.replace('file://',''));
            const stats = fs.statSync(filePath);
            if(stats.size > 1024 * 1024 * MAX_FILE_SIZE){
                return null
            }
			const form = new FormData();
			form.append('file', fs.createReadStream(decodeURIComponent(currentContent.replace('file://',''))));
			const res = await axios.post(`http://${url}/api/upload/${CREDENTIAL}`, form, {headers: form.getHeaders() })
			socket.send(JSON.stringify({type: 'file', data: res.data.id}))
			// console.log('===文件===')
		}else if(currentContent){
			let currentContent = clipboard.readText();
			await axios.post(`http://${url}/api/text/${CREDENTIAL}`, {text: currentContent})
			socket.send(JSON.stringify({type: 'text', data: currentContent}))
			// log.info('===文本===')
		}
		preContent = currentContent
    }, 1000);
}

function onMessage(msg, { url, CREDENTIAL }){
    const data = JSON.parse(msg);
    // data.type !== 'ping' && log.info(data, '=======')
    if (data.type === 'text') {
        currentContent = preContent = data.data
        clipboard.writeText(currentContent)
    } else if (data.type === 'file') {
        downloadFile(`http://${url}/api/download/${CREDENTIAL}/${data.data}`).then(res => {
            currentContent = preContent = `file://${res}`
            clipboard.writeBuffer('public.file-url', Buffer.from(currentContent, 'utf-8'));
        })
    }
}

function initServerWss(server, { url, CREDENTIAL }) {
	const wss = new WebSocket.Server({ noServer: true });
	// 处理 WebSocket 连接
	wss.on('connection', (ws) => {
		log.info('客户端连接成功');
		// 监听客户端发送的消息
		ws.on('message', (msg) => onMessage(msg, { url, CREDENTIAL }));
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

function reConnentClientWss({ url, CREDENTIAL }) {
	setTimeout(() => {
		log.info('正在重连')
		socket = initClientWss({ url, CREDENTIAL });
	}, 5000)
}

function initClientWss({ url, CREDENTIAL }) {
	const socket = new WebSocket(`ws://${url}`);
	socket.on('open', () => {
		log.info('WebSocket 连接成功');
		socket.on('message', (msg) => onMessage(msg, { url, CREDENTIAL }));
		setInterval(() => {
			socket.send(JSON.stringify({ type: 'ping' }));
		}, 30000);
	});

	socket.onerror = (error) => {
		socket.close(); // 确保触发 onclose 事件
	};

	socket.onclose = () => {
		reConnentClientWss({ url, CREDENTIAL }); // 调用重连逻辑
	};

	return socket
}


module.exports = onCopy