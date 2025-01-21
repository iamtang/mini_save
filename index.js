const { app, Tray, Menu, shell } =  require('electron');
const log = require('electron-log/main');
const path =  require('path');
const onCopy =require('./onCopy.js')
const Server =  require('./server/index.js');
const pkg = require('./package.json')
const { getIPAddress } = require('./utils.js')
const config = require('./config.json')
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'main.log');
log.initialize()
// 创建托盘应用

let server = null
let ip = getIPAddress()
config.isServer = !config.SERVER_ADDRESS
config.url = !config.isServer ? `${config.SERVER_ADDRESS}:${config.PORT}` : `${ip}:${config.PORT}`

// 启动服务器
function startServer(config) {
  server = Server(app, config)
}

// 停止服务器
function stopServer() {
  if (server) {
    server.close(() => {
      log.info('Server closed.');
    });
  }
}

// Electron 启动
app.whenReady().then(() => {
  // 启动服务器
  config.isServer && startServer(config);
  onCopy(server, config)
  // 创建托盘菜单
  const tray = new Tray(path.join(__dirname, 'icons/icon2.png')); // 替换为你的图标路径
  // tray = new Tray(path.join(process.resourcesPath, 'icon.png')); // 替换为你的图标路径
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开网站', click: () => shell.openExternal(`http://${config.url}`) },
    { label: '管理储存', click: () => shell.openExternal(`file://${app.getPath('userData')}`) },
    { label: `版本:${pkg.version}`, enabled: false},
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('Electron App Running in Background');
  tray.setContextMenu(contextMenu);
  log.info('Electron App is running in the background...');
});

app.on('window-all-closed', (event) => {
  // 不退出应用，仅退出窗口
  event.preventDefault();
});

// 退出时关闭服务器
app.on('quit', (e) => {
  stopServer();
});