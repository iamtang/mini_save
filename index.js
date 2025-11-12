const { app, Tray, Menu, shell } =  require('electron');
const log = require('electron-log/main');
const path =  require('path');
const fs =  require('fs');
const onCopy =require('./onCopy.js')
const Server =  require('./server.js');
const pkg = require('./package.json')
const { getIPAddress } = require('./utils.js')
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'main.log');
log.initialize()

let server = null
let ip = getIPAddress()

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

function initConfig(){
    const userDataPath = app.getPath('userData'); // 获取 userData 路径
    const targetConfigPath = path.join(userDataPath, 'config.json');
    const sourceConfigPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(targetConfigPath)) {
        // 如果没有，则从当前目录复制 config.json 到 userData 路径
        fs.copyFileSync(sourceConfigPath, targetConfigPath);
    }

    return require(targetConfigPath)
}

// Electron 启动
app.whenReady().then(() => {
  const config = initConfig()
  config.isServer = !config.SERVER_ADDRESS
  config.url = !config.isServer ? `${config.SERVER_ADDRESS}` : `${ip}`
  // 启动服务器
  config.isServer && startServer(config);
  onCopy(server, config)
  // 创建托盘菜单
  const tray = new Tray(path.join(__dirname, 'icons/icon2.png')); // 替换为你的图标路径
  // tray = new Tray(path.join(process.resourcesPath, 'icon.png')); // 替换为你的图标路径
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开网址', click: () => shell.openExternal(config.url) },
    { label: '管理', click: () => shell.openExternal(`file://${app.getPath('userData')}`) },
    { label: `设置`, click: () => {
      const createSettingWindow = require('./page/setting/setting.js'); 
      createSettingWindow()
    } },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('Electron App Running in Background');
  tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', (event) => {
  // 不退出应用，仅退出窗口
  event.preventDefault();
});

// 退出时关闭服务器
app.on('quit', (e) => {
  stopServer();
});