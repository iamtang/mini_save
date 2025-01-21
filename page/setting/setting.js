const { BrowserWindow, ipcMain, app } =  require('electron');
const path = require('path')
const fs = require('fs')
let settingWindow = null
const userDataPath = app.getPath('userData'); // 获取 userData 路径
const targetConfigPath = path.join(userDataPath, 'config.json');
function createSettingWindow() {
  if (settingWindow) return;
  
  settingWindow = new BrowserWindow({
    width: 600,
    height: 550,
    resizable: false,
    // transparent: true,
    alwaysOnTop: true, // 使窗口总在最前
    // modal: true,
    // show: false,
    // frame: false, // 隐藏窗口标题栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 确保路径正确
      contextIsolation: true, // 必须为 true
      nodeIntegration: false, // 必须为 false，避免安全问题
    },
  });
  settingWindow.loadFile(path.join(__dirname, 'setting.html')); // 加载输入框页面

  // 窗口加载完成后显示
  settingWindow.once('ready-to-show', () => {
    settingWindow.show();
  });

  // 窗口关闭时清理
  settingWindow.on('closed', () => {
    settingWindow = null;
  });
  
}

ipcMain.handle('load-settings', async () => {
  const data = fs.readFileSync(targetConfigPath, 'utf-8');
  return JSON.parse(data);
});

ipcMain.on('save-settings', (event, settings) => {
  fs.writeFileSync(targetConfigPath, JSON.stringify(settings));
  app.relaunch();
  app.exit(0);
  return { success: true };
});

ipcMain.on('hide-settings', () => {
  if (settingWindow) settingWindow.close();
});


module.exports = createSettingWindow