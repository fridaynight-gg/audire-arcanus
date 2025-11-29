import { ipcMain } from 'electron';
import axios from 'axios';
import clipboardy from 'clipboardy';

const API_BASE = 'http://localhost:5551';

export function setupIPCHandlers() {
  // Audio Sources
  ipcMain.handle('get-audio-sources', async () => {
    try {
      const response = await axios.get(`${API_BASE}/audio/sources`);
      return response.data;
    } catch (error) {
      console.error('Error getting audio sources:', error);
      return [];
    }
  });

  ipcMain.handle('select-audio-source', async (_event, id: string) => {
    try {
      const response = await axios.post(`${API_BASE}/audio/select`, {
        sourceId: id,
      });
      return response.data;
    } catch (error) {
      console.error('Error selecting audio source:', error);
      return { success: false };
    }
  });

  // Lobbies
  ipcMain.handle('get-lobbies', async () => {
    try {
      const response = await axios.get(`${API_BASE}/lobby`);
      return response.data;
    } catch (error) {
      console.error('Error getting lobbies:', error);
      return [];
    }
  });

  ipcMain.handle(
    'create-lobby',
    async (_event, name: string, bitrate?: number) => {
      try {
        const response = await axios.post(`${API_BASE}/lobby`, {
          name,
          bitrate,
        });
        return response.data;
      } catch (error) {
        console.error('Error creating lobby:', error);
        throw error;
      }
    },
  );

  ipcMain.handle('rename-lobby', async (_event, id: string, name: string) => {
    try {
      const response = await axios.patch(`${API_BASE}/lobby/${id}/rename`, {
        name,
      });
      return response.data;
    } catch (error) {
      console.error('Error renaming lobby:', error);
      return { success: false };
    }
  });

  ipcMain.handle('close-lobby', async (_event, id: string) => {
    try {
      const response = await axios.delete(`${API_BASE}/lobby/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error closing lobby:', error);
      return { success: false };
    }
  });

  ipcMain.handle('get-listeners', async (_event, lobbyId: string) => {
    try {
      const response = await axios.get(
        `${API_BASE}/lobby/${lobbyId}/listeners`,
      );
      return response.data;
    } catch (error) {
      console.error('Error getting listeners:', error);
      return [];
    }
  });

  // Streaming
  ipcMain.handle('start-streaming', async (_event, lobbyId: string) => {
    try {
      const response = await axios.post(`${API_BASE}/streaming/start`, {
        lobbyId,
      });
      return response.data;
    } catch (error) {
      console.error('Error starting stream:', error);
      return { success: false };
    }
  });

  ipcMain.handle('stop-streaming', async (_event, lobbyId: string) => {
    try {
      const response = await axios.post(`${API_BASE}/streaming/stop`, {
        lobbyId,
      });
      return response.data;
    } catch (error) {
      console.error('Error stopping stream:', error);
      return { success: false };
    }
  });

  ipcMain.handle('get-streaming-status', async (_event, lobbyId: string) => {
    try {
      const response = await axios.get(
        `${API_BASE}/streaming/status/${lobbyId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error getting streaming status:', error);
      return { isStreaming: false };
    }
  });

  // Stats
  ipcMain.handle('get-stats', async () => {
    try {
      const response = await axios.get(`${API_BASE}/stats/lobbies`);
      // Add duration calculation and convert units for each lobby stat
      const lobbies = response.data.map((stat: any) => {
        // Convert duration from milliseconds to seconds
        const duration = stat.startTime
          ? Math.floor((Date.now() - new Date(stat.startTime).getTime()) / 1000)
          : 0;
        // Convert bitrate from bps to kbps
        const bitrate = Math.floor(stat.bitrate / 1000);
        return { ...stat, duration, bitrate };
      });
      return lobbies;
    } catch (error) {
      console.error('Error getting stats:', error);
      return [];
    }
  });

  // System
  ipcMain.handle('copy-to-clipboard', async (_event, text: string) => {
    try {
      await clipboardy.write(text);
      return { success: true };
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      throw error;
    }
  });

  ipcMain.on('quit-app', () => {
    console.log('Quit requested from renderer');
    process.exit(0);
  });
}
