const WebSocket = require('ws');

let socket = null
// 房间管理对象
const rooms = new Map(); // 使用 Map 存储房间和客户端连接

function onCopy(server, { url, CREDENTIAL}){
    if(!CREDENTIAL) return null
    socket = initServerWss(server, {url, CREDENTIAL})
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
		console.log('客户端连接成功', roomID);
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


module.exports = onCopy