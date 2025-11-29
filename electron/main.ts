import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { startNestApp } from './nest-bootstrap';
import { setupIPCHandlers } from './ipc-handlers';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

let nestApp: INestApplication | null = null;
let mainWindow: BrowserWindow | null = null;
let socket: Socket | null = null;

async function initialize() {
  // Start NestJS backend first
  console.log('Starting NestJS backend...');
  nestApp = await startNestApp();
  console.log('NestJS backend started on http://localhost:5551');

  // Setup IPC handlers
  setupIPCHandlers();

  // Create main window with GUI
  createWindow();

  // Connect to Socket.IO for real-time events
  setupSocketConnection();
}

function setupSocketConnection() {
  socket = io('http://localhost:5551');

  socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
  });

  socket.on('listener-connected', (data) => {
    console.log('Listener connected:', data);
    if (mainWindow) {
      mainWindow.webContents.send('listener-connected', data);
    }
  });

  socket.on('listener-disconnected', (data) => {
    console.log('Listener disconnected:', data);
    if (mainWindow) {
      mainWindow.webContents.send('listener-disconnected', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO server');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#1a1b26',
    title: 'Audire Arcanus',
    webPreferences: {
      preload: join(__dirname, 'gui', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the GUI
  mainWindow.loadFile(join(__dirname, 'gui', 'index.html'));

  // Open DevTools (always enabled for debugging)
  // Press Cmd+Option+I to toggle
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('GUI loaded successfully');
  });

  // Enable keyboard shortcut to open DevTools in production
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'i' &&
      input.meta &&
      input.alt &&
      input.type === 'keyDown'
    ) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('GUI window created');
}

void app.whenReady().then(() => {
  void initialize();
});

app.on('window-all-closed', () => {
  // Quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('Shutting down...');

  // Disconnect socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Close NestJS backend
  if (nestApp) {
    void nestApp.close();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
