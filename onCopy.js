const { clipboard, app, powerMonitor } = require('electron');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const crypto = require('crypto');
const { downloadFile } = require('./utils.js')
const log = require('electron-log/main');
const hexPath = path.join(app.getPath('userData'), 'hex');
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'main.log');
log.initialize()
let preContent = null;
let currentContent = null;
// 房间管理对象
global.rooms = new Map(); // 使用 Map 存储房间和客户端连接
const key = Buffer.from('7483c8494ebee272085a833dd83a7651e18aa2936529ed3146fe9ac0ea0439e1', 'hex'); // 256-bit 密钥
const iv = Buffer.from('69a117444dda7e183100876d7558ea37', 'hex');;  // 初始向量
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

// AES 256 CBC 加密文件
async function encryptFile(inputPath) {
  
  const outputPath = path.join(hexPath, path.basename(inputPath))
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    input.pipe(cipher).pipe(output);
    output.on('finish', () => resolve(outputPath));
    output.on('error', reject);
  });
}

// 解密
async function decryptFile(inputPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(inputPath).pipe(decipher).pipe(fs.createWriteStream(inputPath));
    fs.createReadStream(inputPath).on('end', resolve);
    fs.createReadStream(inputPath).on('error', reject);
  });
}

async function uploadFile(filePath){
	const form = new FormData();
	form.append('file', fs.createReadStream(filePath));
	const res = await axios.post(`http://${url}/api/upload/${CREDENTIAL}`, form, {headers: form.getHeaders() })
	return res.data
}
function onCopy(server, {isServer, url, CREDENTIAL, MAX_FILE_SIZE = 3}){
    if(!CREDENTIAL) return null
	// 服务端
	if(isServer){
		initServerWss(server, {url, CREDENTIAL})
	}

	// 客户端
	const socket = initClientWss({url, CREDENTIAL})
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
			const hexPath = await encryptFile(filePath)
			const res = await uploadFile(hexPath)
			socket.send(JSON.stringify({type: 'file', data: res.id}))
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

function onMessage(msg, { url, CREDENTIAL, roomID }){
    const data = JSON.parse(msg);
    // 口令不一致，无需同步
    if(roomID !== CREDENTIAL && roomID) return;
    // data.type !== 'ping' && log.info(data, '=======')
    if (data.type === 'text') {
        currentContent = preContent = data.data
        clipboard.writeText(currentContent)
    } else if (data.type === 'file' && powerMonitor.getSystemIdleTime() < 300) {
        downloadFile(`http://${url}/api/download/${CREDENTIAL}/${data.data}`).then(res => {
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