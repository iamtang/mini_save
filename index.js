const { app, Tray, Menu, shell } =  require('electron');
const os =  require('os');
const path =  require('path');
const Server =  require('./server/index.js');
// 创建托盘应用
let tray = null;
let server = null
const PORT = 3000;
let ip = null
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
}

// 启动服务器
function startServer() {
  server = Server(app, PORT)
}

// 停止服务器
function stopServer() {
  if (server) {
    server.close(() => {
      console.log('Server closed.');
    });
  }
}

// Electron 启动
app.on('ready', () => {
  // 启动服务器
  startServer(PORT);

  // 创建托盘菜单
  tray = new Tray('icon.png'); // 替换为你的图标路径
  // tray = new Tray(path.join(process.resourcesPath, 'icon.png')); // 替换为你的图标路径
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开网站', click: () => shell.openExternal(`http://${getIPAddress() || ip}:${PORT}/`) },
    { label: '管理储存', click: () => shell.openExternal(`file://${app.getPath('userData')}`) },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('Electron App Running in Background');
  tray.setContextMenu(contextMenu);

  console.log('Electron App is running in the background...');
});

// 退出时关闭服务器
app.on('quit', () => {
  stopServer();
});