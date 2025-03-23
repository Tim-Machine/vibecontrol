const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const DatabaseStorage = require('./storage/database');
const ServerManager = require('./server-manager/manager');

// Redirect console logs to stdout
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  originalConsoleLog(...args);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('console-log', { type: 'log', message: args.join(' ') });
  }
};

console.error = (...args) => {
  originalConsoleError(...args);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('console-log', { type: 'error', message: args.join(' ') });
  }
};

console.warn = (...args) => {
  originalConsoleWarn(...args);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('console-log', { type: 'warn', message: args.join(' ') });
  }
};

let mainWindow;
let serverManager;
let storage;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false, // Don't show the window until it's ready
    backgroundColor: '#1a0f1f', // Dark purple background (matches our theme)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true
    }
  });

  // Wait for the content to be ready before showing the window
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // In development, load from Vite dev server
  // In production, load from static build
  const url = app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : 'http://localhost:5173';
  
  console.log('Loading URL:', url);
  mainWindow.loadURL(url);
  
  // Always open DevTools during development
  // mainWindow.webContents.openDevTools();
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window finished loading');
  });
}

app.whenReady().then(() => {
  // Log important paths
  console.log('App paths:');
  console.log('- User data:', app.getPath('userData'));
  console.log('- App path:', app.getAppPath());
  console.log('- Executable path:', app.getPath('exe'));
  console.log('- Current working directory:', process.cwd());
  
  // Initialize database storage
  storage = new DatabaseStorage(app.getPath('userData'));
  
  // Initialize server manager with storage
  const baseDir = os.homedir(); // Default to user's home directory
  console.log('Base directory for servers:', baseDir);
  
  serverManager = new ServerManager(storage, {
    baseDir: baseDir
  });
  
  // Setup IPC handlers
  setupIPC();
  
  createWindow();
  
  // Auto-restart servers that were previously running
  serverManager.restartRunningServers();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean shutdown of all servers and database on app exit
app.on('before-quit', async (event) => {
  if (serverManager) {
    event.preventDefault();
    try {
      // Stop all servers
      await serverManager.stopAllServers();
      
      // Close database connection
      if (storage && typeof storage.close === 'function') {
        storage.close();
      }
      
      app.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      app.exit(1);
    }
  }
});

// IPC Setup for communication between renderer and main process
function setupIPC() {
  // Server management
  ipcMain.handle('add-server', async (_, gitUrl, customConfig = {}) => {
    console.log('Adding server with config:', customConfig);
    return await serverManager.addServer(gitUrl, customConfig);
  });
  
  ipcMain.handle('start-server', async (_, serverId) => {
    return await serverManager.startServer(serverId);
  });
  
  ipcMain.handle('stop-server', async (_, serverId) => {
    return await serverManager.stopServer(serverId);
  });
  
  ipcMain.handle('delete-server', async (_, serverId) => {
    return await serverManager.deleteServer(serverId);
  });
  
  ipcMain.handle('update-config', async (_, {serverId, config}) => {
    return await serverManager.updateServerConfig(serverId, config);
  });
  
  ipcMain.handle('get-servers', async () => {
    return serverManager.getServers();
  });
  
  ipcMain.handle('get-server-port', async (_, serverId) => {
    return serverManager.getServerPort(serverId);
  });
  
  ipcMain.handle('start-all-servers', async () => {
    return await serverManager.startAllServers();
  });
  
  ipcMain.handle('stop-all-servers', async () => {
    return await serverManager.stopAllServers();
  });
  
  ipcMain.handle('rebuild-server', async (_, serverId) => {
    return await serverManager.rebuildServer(serverId);
  });
  
  // Log handling
  ipcMain.handle('get-logs', async (_, serverId) => {
    return serverManager.getLogs(serverId);
  });
  
  // Server logs via IPC
  serverManager.on('log', (serverId, log) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server-log', { serverId, log });
    }
  });
  
  // Server status changes
  serverManager.on('status-change', (serverId, status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server-status-change', { serverId, status });
    }
  });
  
  // Port detection events
  serverManager.on('port-detected', (serverId, port) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server-port-detected', { serverId, port });
    }
  });
  
  // App information
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch
    };
  });

  // Process management
  ipcMain.handle('get-system-processes', async () => {
    return await serverManager.getSystemProcesses();
  });

  ipcMain.handle('kill-process', async (_, pid) => {
    return await serverManager.killProcess(pid);
  });
  
  ipcMain.handle('update-server-status', async (_, serverId, status) => {
    return await serverManager.updateServerStatus(serverId, status);
  });
}