const { BrowserWindow, ipcMain } =  require('electron');
const path = require('path')
let alertWindow = null

function createAlertWindow() {
  if (alertWindow) return;
  alertWindow = new BrowserWindow({
    width: 210,
    height: 30,
    resizable: false,
    transparent: true,
    alwaysOnTop: true, // 使窗口总在最前
    modal: true,
    show: false,
    frame: false, // 隐藏窗口标题栏
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  alertWindow.loadFile(path.join(__dirname, 'alert.html')); // 加载输入框页面

  // 窗口加载完成后显示
  alertWindow.once('ready-to-show', () => {
    alertWindow.show();
  });

  // 窗口关闭时清理
  alertWindow.on('closed', () => {
    alertWindow = null;
  });
}

// 处理用户输入内容
ipcMain.on('submit-input', (event, inputValue) => {
  console.log(`用户输入了：${inputValue}`);
  if (alertWindow) alertWindow.close();
});

// 处理取消操作
ipcMain.on('cancel-input', () => {
  if (alertWindow) alertWindow.close();
});


module.exports = createAlertWindow