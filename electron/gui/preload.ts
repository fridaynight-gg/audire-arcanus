import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Audio Sources
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  selectAudioSource: (id: string) =>
    ipcRenderer.invoke('select-audio-source', id),

  // Lobbies
  getLobbies: () => ipcRenderer.invoke('get-lobbies'),
  createLobby: (name: string, bitrate?: number) =>
    ipcRenderer.invoke('create-lobby', name, bitrate),
  renameLobby: (id: string, name: string) =>
    ipcRenderer.invoke('rename-lobby', id, name),
  closeLobby: (id: string) => ipcRenderer.invoke('close-lobby', id),
  getListeners: (lobbyId: string) =>
    ipcRenderer.invoke('get-listeners', lobbyId),

  // Streaming
  startStreaming: (lobbyId: string) =>
    ipcRenderer.invoke('start-streaming', lobbyId),
  stopStreaming: (lobbyId: string) =>
    ipcRenderer.invoke('stop-streaming', lobbyId),
  getStreamingStatus: (lobbyId: string) =>
    ipcRenderer.invoke('get-streaming-status', lobbyId),

  // Stats
  getStats: () => ipcRenderer.invoke('get-stats'),

  // System
  copyToClipboard: (text: string) =>
    ipcRenderer.invoke('copy-to-clipboard', text),
  quit: () => ipcRenderer.send('quit-app'),

  // Event Listeners
  onLobbyUpdate: (callback: (...args: any[]) => void) => {
    ipcRenderer.on('lobby-update', (_event, ...args) => callback(...args));
  },
  onListenerUpdate: (callback: (...args: any[]) => void) => {
    ipcRenderer.on('listener-update', (_event, ...args) => callback(...args));
  },
  onStatsUpdate: (callback: (...args: any[]) => void) => {
    ipcRenderer.on('stats-update', (_event, ...args) => callback(...args));
  },
  onAudioSourceUpdate: (callback: (...args: any[]) => void) => {
    ipcRenderer.on('audio-source-update', (_event, ...args) =>
      callback(...args),
    );
  },
  onListenerConnected: (callback: (data: any) => void) => {
    ipcRenderer.on('listener-connected', (_event, data) => callback(data));
  },
  onListenerDisconnected: (callback: (data: any) => void) => {
    ipcRenderer.on('listener-disconnected', (_event, data) => callback(data));
  },
});
