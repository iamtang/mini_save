const { clipboard, app, powerMonitor } = require('electron');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { downloadFile, uploadFile, ossInit, ossUpload, sleep, textUpload } = require('./utils.js')
const { getClipboardContent } = require('./clipboard-macos.js')
const log = require('electron-log/main');

let preContent = null;
let currentContent = null;
// 房间管理对象
global.rooms = new Map();
let socket = null

async function onCopy(server, config){
	log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'main.log');
	log.initialize()
    if(!config.CREDENTIAL) return null
	// 服务端
	if(config.isServer){
		initServerWss(server, config)
	}
	// 客户端
	socket = initClientWss(config)
	preContent = null;
	currentContent = null;

	while(true){
		await sleep(1000)
		try {
			if(config.isStop) continue;

			// 使用 getClipboardContent 获取剪贴板内容
			const { files: fileUrls, text: textContent } = getClipboardContent();
			const contentHash = JSON.stringify({ files: fileUrls, text: textContent });

			// 检查内容是否变化
			if (contentHash === preContent) {
				continue;
			}

			// 优先处理文件复制
			if (fileUrls && fileUrls.length > 0) {
				for (const filePath of fileUrls) {
					try {
						const stats = fs.statSync(filePath);
						if (stats.isFile() && stats.size <= 1024 * 1024 * config.MAX_FILE_SIZE) {
							log.info('检测到文件复制:', filePath);
							const res = await ossUpload(filePath, config);
							socket.send(JSON.stringify({type: res.id ? 'file' : 'oss', data: res.id || res.url}));
						} else if (!stats.isFile()) {
							log.info('不是文件，跳过:', filePath);
						} else {
							log.info('文件过大，跳过:', filePath, '大小:', stats.size);
						}
					} catch (statError) {
						log.info('无法访问文件:', filePath, statError.message);
					}
				}
				preContent = contentHash;
				currentContent = contentHash;
			}
			// 处理文本复制
			else if (textContent && textContent.trim()) {
				log.info('检测到文本复制:', textContent.substring(0, 50));
				await textUpload(textContent, config);
				socket.send(JSON.stringify({type: 'text', data: textContent}));
				preContent = contentHash;
				currentContent = contentHash;
			}
		} catch (error) {
			log.info('onCopy error:', error)
		}
	};
}

function onMessage(msg, config){
    const data = JSON.parse(msg);
    // 口令不一致，无需同步
    if((config.roomID && config.roomID !== config.CREDENTIAL) || config.isStop) return;
    if (data.type === 'text') {
        currentContent = preContent = data.data
        clipboard.writeText(currentContent)
    } else if ((data.type === 'file' || data.type === 'oss') && powerMonitor.getSystemIdleTime() < 300) {
        const downloadUrl = data.type === 'file' ? `${config.url}/api/download/${config.CREDENTIAL}/${data.data}` : data.data;
        downloadFile(downloadUrl, data.type === 'oss')
            .then((res) => {
                currentContent = preContent = `file://${res}`;
                clipboard.writeBuffer('public.file-url', Buffer.from(currentContent, 'utf-8'));
            })
            .catch((error) => {
                log.info('下载文件失败:', downloadUrl, error.message);
            });
    }
}

function initServerWss(server, config) {
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
            if(!rooms.get(config.CREDENTIAL)) return
            // 同步给同口令的设备
            for (const client of rooms.get(config.CREDENTIAL)) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            }
		}
	}
}

function reconnectClientWss(config) {
	setTimeout(() => {
		log.info('正在重连')
		socket = initClientWss(config);
	}, 5000)
}

function initClientWss(config) {
	const host = config.url.replace('https://', 'wss://').replace('http://', 'ws://')
	const socket = new WebSocket(`${host}/${config.CREDENTIAL}`);
	socket.on('open', () => {
		log.info('WebSocket 连接成功');
		socket.on('message', (msg) => onMessage(msg, config));
		setInterval(() => {
			socket.send(JSON.stringify({ type: 'ping' }));
		}, 30000);
	});

	socket.onerror = (error) => {
		socket.close(); // 确保触发 onclose 事件
	};

	socket.onclose = () => {
		reconnectClientWss(config); // 调用重连逻辑
	};

	return socket
}


module.exports = onCopy
