const { clipboard, app, powerMonitor } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { downloadFile, uploadFile, ossInit, ossUpload, sleep } = require('./utils.js')
const log = require('electron-log/main');
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'main.log');
log.initialize()
let preContent = null;
let currentContent = null;
// 房间管理对象
global.rooms = new Map(); // 使用 Map 存储房间和客户端连接




async function onCopy(server, config){
    if(!config.CREDENTIAL) return null
	// 服务端
	if(config.isServer){
		initServerWss(server, config)
	}
	const oss = await ossInit(config)
	// 客户端
	const socket = initClientWss(config)
	currentContent = clipboard.read('public.file-url') || clipboard.readText();
	while(true){
		await sleep(1000)
		currentContent = clipboard.read('public.file-url') || clipboard.readText();
		if(currentContent === preContent) continue;
		if(clipboard.read('public.file-url')){
			const filePath = decodeURIComponent(currentContent.replace('file://',''));
			const stats = fs.statSync(filePath);
			if(stats.size > 1024 * 1024 * config.MAX_FILE_SIZE){
				continue
			}
			const res = oss ? await ossUpload(oss, filePath) : await uploadFile(filePath, config)
			socket.send(JSON.stringify({type: res.id ? 'file' : 'oss', data: res.id || res.url}))
			// console.log('===文件===')
		}else if(currentContent){
			let currentContent = clipboard.readText();
			await axios.post(`http://${config.url}/api/text/${config.CREDENTIAL}`, {text: currentContent})
			socket.send(JSON.stringify({type: 'text', data: currentContent}))
			// log.info('===文本===')
		}
		preContent = currentContent
	};
}

function onMessage(msg, { url, CREDENTIAL, roomID }){
    const data = JSON.parse(msg);
    // 口令不一致，无需同步
    if(roomID !== CREDENTIAL && roomID) return;
    // data.type !== 'ping' && log.info(data, '=======')
    if (data.type === 'text') {
        currentContent = preContent = data.data
        clipboard.writeText(currentContent)
    } else if ((data.type === 'file' || data.type === 'oss') && powerMonitor.getSystemIdleTime() < 300) {
        downloadFile(data.type === 'file' ? `http://${url}/api/download/${CREDENTIAL}/${data.data}` : data.data, data.type === 'oss').then(async (res) => {
            currentContent = preContent = `file://${res}`
            clipboard.writeBuffer('public.file-url', Buffer.from(currentContent, 'utf-8'));
        })
    }
}

function initServerWss(server, { url, CREDENTIAL }) {
	const wss = new WebSocket.Server({ noServer: true });
	// 处理 WebSocket 连接
	wss.on('connection', (ws, req) => {
        const roomID = req.url.slice(1); // 获取路径部分去掉 "/"
        if (!rooms.has(roomID)) {
            rooms.set(roomID, new Set()); // 如果房间不存在，创建房间
        }
        // 将客户端加入房间
        rooms.get(roomID).add(ws);
		log.info('客户端连接成功', roomID);
		// 监听客户端发送的消息
		ws.on('message', (msg) => {
            // onMessage(msg, { url, CREDENTIAL, roomID })
            // 同步给同口令的设备
            for (const client of rooms.get(roomID)) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(msg);
                }
            }
        });
        ws.on('close', () => {
            rooms.get(roomID).delete(ws);
        })
	});

	// 在 HTTP 服务器上升级到 WebSocket
	server.on('upgrade', (request, socket, head) => {
		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit('connection', ws, request);
		});
	});
	return {
		send(data) {
            if(!rooms.get(CREDENTIAL)) return
            // 同步给同口令的设备
            for (const client of rooms.get(CREDENTIAL)) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            }
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
	const socket = new WebSocket(`ws://${url}/${CREDENTIAL}`);
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