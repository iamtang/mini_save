const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readLogs: (options) => ipcRenderer.invoke('read-logs', options),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  hideLogs: () => ipcRenderer.send('hide-logs'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
});
