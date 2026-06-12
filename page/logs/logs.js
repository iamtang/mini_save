const { BrowserWindow, ipcMain, app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let logsWindow = null;
const userDataPath = app.getPath('userData');
const logFilePath = path.join(userDataPath, 'main.log');

function createLogsWindow() {
  if (logsWindow) {
    logsWindow.focus();
    return;
  }

  logsWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: true,
    devTools: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'logs-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  logsWindow.loadFile(path.join(__dirname, 'logs.html'));

  logsWindow.once('ready-to-show', () => {
    logsWindow.show();
  });

  logsWindow.on('closed', () => {
    logsWindow = null;
  });
}

// 读取日志
ipcMain.handle('read-logs', async (event, options = {}) => {
  try {
    const { lines = 100 } = options;

    // 检查文件是否存在
    if (!fs.existsSync(logFilePath)) {
      return { logs: [], message: '日志文件不存在' };
    }

    const content = fs.readFileSync(logFilePath, 'utf-8');
    const logLines = content.split('\n').filter(line => line.trim());

    // 返回最后 N 行
    const requestedLines = parseInt(lines) || 100;
    const linesToReturn = lines > 0 ? logLines.slice(-requestedLines) : logLines;

    return {
      logs: linesToReturn,
      total: logLines.length,
      showing: linesToReturn.length
    };
  } catch (error) {
    console.error('读取日志失败:', error);
    return { error: '读取日志失败: ' + error.message };
  }
});

// 清空日志
ipcMain.handle('clear-logs', async () => {
  try {
    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['取消', '确认清空'],
      defaultId: 0,
      title: '确认清空',
      message: '确定要清空所有日志吗？此操作不可恢复。',
      detail: '这将删除 main.log 文件中的所有内容'
    });

    if (result.response === 1) {
      fs.writeFileSync(logFilePath, '');
      return { success: true };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('清空日志失败:', error);
    return { error: '清空日志失败: ' + error.message };
  }
});

// 关闭窗口
ipcMain.on('hide-logs', () => {
  if (logsWindow) logsWindow.close();
});

module.exports = createLogsWindow;
