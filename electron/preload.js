const { contextBridge, ipcRenderer } = require('electron');

// Listen for console logs from main process
ipcRenderer.on('console-log', (_, data) => {
  switch (data.type) {
    case 'log':
      console.log('[Main Process]:', data.message);
      break;
    case 'error':
      console.error('[Main Process]:', data.message);
      break;
    case 'warn':
      console.warn('[Main Process]:', data.message);
      break;
  }
});

// Expose API to renderer process
contextBridge.exposeInMainWorld('api', {
  // Server management
  addServer: (gitUrl, customConfig) => ipcRenderer.invoke('add-server', gitUrl, customConfig),
  startServer: (serverId) => ipcRenderer.invoke('start-server', serverId),
  stopServer: (serverId) => ipcRenderer.invoke('stop-server', serverId),
  deleteServer: (serverId) => ipcRenderer.invoke('delete-server', serverId),
  updateConfig: (serverId, config) => ipcRenderer.invoke('update-config', {serverId, config}),
  getServers: () => ipcRenderer.invoke('get-servers'),
  getServerPort: (serverId) => ipcRenderer.invoke('get-server-port', serverId),
  startAllServers: () => ipcRenderer.invoke('start-all-servers'),
  stopAllServers: () => ipcRenderer.invoke('stop-all-servers'),
  rebuildServer: (serverId) => ipcRenderer.invoke('rebuild-server', serverId),
  
  // Process management
  getSystemProcesses: () => ipcRenderer.invoke('get-system-processes'),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  updateServerStatus: (serverId, status) => ipcRenderer.invoke('update-server-status', serverId, status),
  
  // Logs
  getLogs: (serverId) => ipcRenderer.invoke('get-logs', serverId),
  
  // App information
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Event listeners
  onServerLog: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('server-log', listener);
    return () => ipcRenderer.removeListener('server-log', listener);
  },
  onServerStatusChange: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('server-status-change', listener);
    return () => ipcRenderer.removeListener('server-status-change', listener);
  },
  onServerPortDetected: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('server-port-detected', listener);
    return () => ipcRenderer.removeListener('server-port-detected', listener);
  }
});