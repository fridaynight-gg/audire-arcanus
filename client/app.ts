// Type declarations for external libraries
declare const io: any;

// Extend Window interface for webkit prefixes
interface Window {
  webkitAudioContext: typeof AudioContext;
}

// Extend AudioContext for setSinkId (newer API not in all TypeScript versions)
interface AudioContext {
  setSinkId(sinkId: string): Promise<void>;
}

// Configuration
const API_BASE: string = 'http://localhost:5551';
const SOCKET_URL: string = 'http://localhost:5551';

// Audio Configuration (must match server)
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const BIT_DEPTH = 16;

// Audio buffering configuration for smooth playback
const BUFFER_SIZE = 0.1; // 100ms of audio per buffer for smooth playback
const SCHEDULE_AHEAD_TIME = 0.05; // Schedule audio 50ms ahead (reduced from 200ms)
const MAX_BUFFER_DURATION = 0.5; // Maximum buffer queue duration (500ms)
const MIN_BUFFER_DURATION = 0.1; // Minimum buffer before playback (100ms)

// Types
interface LobbyData {
  id: string;
  name: string;
  joinCode: string;
}

interface SessionData {
  lobbyId: string;
  username: string;
  joinCode: string;
}

// State
let socket: any = null;
let currentLobby: LobbyData | null = null;
let username: string = '';
let currentJoinCode: string = '';
let reconnectAttempts: number = 0;
let maxReconnectAttempts: number = 5;
let reconnectDelay: number = 1000;
let reconnectTimer: any = null;

// Audio State
let audioContext: AudioContext | null = null;
let audioQueue: AudioBuffer[] = [];
let isPlaying: boolean = false;
let nextPlayTime: number = 0;
let bytesReceived: number = 0;
let gainNode: GainNode | null = null; // For volume control
let currentOutputDeviceId: string = '';
let activeAudioSources: AudioBufferSourceNode[] = []; // Track active BufferSourceNode instances

// DOM Elements
const lobbySelection = document.getElementById(
  'lobby-selection',
) as HTMLDivElement;
const playerView = document.getElementById('player-view') as HTMLDivElement;
const usernameInput = document.getElementById('username') as HTMLInputElement;
const joinCodeInput = document.getElementById('join-code') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const leaveBtn = document.getElementById('leave-btn') as HTMLButtonElement;
const lobbyNameEl = document.getElementById('lobby-name') as HTMLElement;
const bitrateEl = document.getElementById('bitrate') as HTMLElement;
const listenersListEl = document.getElementById(
  'listeners-list',
) as HTMLElement;
const connectionStatusEl = document.getElementById(
  'connection-status',
) as HTMLElement;
const dataReceivedEl = document.getElementById('data-received') as HTMLElement;
const outputDeviceSelect = document.getElementById(
  'output-device',
) as HTMLSelectElement;
const volumeControl = document.getElementById(
  'volume-control',
) as HTMLInputElement;
const volumeValue = document.getElementById('volume-value') as HTMLElement;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check for saved session FIRST before showing anything
  const sessionData = localStorage.getItem('audire_session');
  if (sessionData) {
    // Hide join screen immediately to prevent flash
    lobbySelection.classList.add('hidden');
    // Show player view with a loading state
    playerView.classList.remove('hidden');
    lobbyNameEl.textContent = 'Reconnecting...';
    updateConnectionStatus('connecting');
  }

  initializeSocket();

  joinBtn.addEventListener('click', joinLobbyWithCode);
  leaveBtn.addEventListener('click', leaveLobby);

  // Allow Enter key to join
  joinCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinLobbyWithCode();
    }
  });

  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinCodeInput.focus();
    }
  });

  // Try to restore previous session
  tryRestoreSession();

  // Setup audio controls
  setupAudioControls();
});

// Socket.IO Connection
function initializeSocket() {
  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: reconnectDelay,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    reconnectAttempts = 0;

    // If we were in a lobby, rejoin automatically
    if (currentLobby && username) {
      console.log('Reconnecting to lobby:', currentLobby.name);
      updateConnectionStatus('reconnecting');
      rejoinLobby();
    } else if (username && currentJoinCode) {
      // Session restored from localStorage but not yet joined
      console.log('Restoring session - auto-joining lobby');
      updateConnectionStatus('connecting');
      joinLobbyWithCode();
    } else {
      updateConnectionStatus('connected');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    updateConnectionStatus('disconnected');
    stopAudioPlayback();

    // Only attempt manual reconnection for certain disconnect reasons
    if (reason === 'io server disconnect') {
      // Server disconnected us, don't reconnect automatically
      console.warn('Server disconnected client');
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    reconnectAttempts++;

    if (reconnectAttempts >= maxReconnectAttempts) {
      updateConnectionStatus('failed');
      showError('Failed to connect to server. Please refresh the page.');
    } else {
      updateConnectionStatus('reconnecting');
    }
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(
      `Reconnection attempt ${attemptNumber}/${maxReconnectAttempts}`,
    );
    updateConnectionStatus('reconnecting');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber, 'attempts');
    reconnectAttempts = 0;
    updateConnectionStatus('connected');
  });

  socket.on('reconnect_failed', () => {
    console.error('Failed to reconnect after maximum attempts');
    updateConnectionStatus('failed');
    showError('Connection lost. Please refresh the page to reconnect.');
  });

  socket.on('lobbies-updated', (lobbies) => {
    if (currentLobby) {
      const updated = lobbies.find((l) => l.id === currentLobby.id);
      if (updated) {
        updateLobbyInfo(updated);
      }
    }
  });

  socket.on('listener-connected', (data) => {
    // Only show toast if we're in the same lobby
    if (currentLobby && data.lobbyId === currentLobby.id) {
      showToast(`${data.username} joined the lobby`, 'success');
      // Refresh to get updated listener list
      refreshCurrentLobbyInfo();
    }
  });

  socket.on('listener-disconnected', (data) => {
    // Only show toast if we're in the same lobby
    if (currentLobby && data.lobbyId === currentLobby.id) {
      showToast(`${data.username} left the lobby`, 'info');
      // Refresh to get updated listener list
      refreshCurrentLobbyInfo();
    }
  });

  socket.on('lobby-renamed', (data) => {
    // Update lobby name if we're in this lobby
    if (currentLobby && data.lobbyId === currentLobby.id) {
      currentLobby.name = data.newName;
      lobbyNameEl.textContent = data.newName;
      showToast(`Lobby renamed to "${data.newName}"`, 'info');
    }
  });

  socket.on('lobby-closed', (data) => {
    // Show notification if we're in this lobby
    if (currentLobby && data.lobbyId === currentLobby.id) {
      showToast('Host closed the lobby', 'warning');
      lobbyNameEl.textContent = `${data.lobbyName} (Host closed the lobby)`;
      stopAudioPlayback();
      updateConnectionStatus('disconnected');
      // Reset data counter display
      if (dataReceivedEl) {
        dataReceivedEl.textContent = '0 KB';
      }
    }
  });

  socket.on('audio-data', (data) => {
    handleAudioData(data);
  });

  socket.on('stream-started', (data) => {
    console.log('Stream started by host');
    updateConnectionStatus('streaming');
  });

  socket.on('stream-stopped', (data) => {
    console.log('Stream stopped by host');
    updateConnectionStatus('waiting');
    stopAudioPlayback();
    // Reset data received counter
    bytesReceived = 0;
    if (dataReceivedEl) {
      dataReceivedEl.textContent = '0 KB';
    }
  });

  socket.on('stream-error', (data) => {
    console.error('Stream error:', data.error);
    showError('Audio stream error: ' + data.error);
    updateConnectionStatus('disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    showError('Connection error: ' + error.message);
  });
}

// Web Audio API Setup
function initializeAudioContext() {
  if (audioContext) return;

  try {
    // Create AudioContext (will be resumed on user interaction)
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
      latencyHint: 'playback', // Use 'playback' for better quality, less underruns
    });

    // Create gain node for volume control
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);

    // Set initial volume from slider
    if (volumeControl) {
      gainNode.gain.value = parseInt(volumeControl.value) / 100;
    } else {
      gainNode.gain.value = 0.5; // 50% volume
    }

    // Set output device if one was selected
    if (currentOutputDeviceId && audioContext.setSinkId) {
      audioContext.setSinkId(currentOutputDeviceId).catch((error) => {
        console.error('Failed to set output device:', error);
      });
    }

    nextPlayTime = audioContext.currentTime;

    console.log('Audio Context initialized', {
      sampleRate: audioContext.sampleRate,
      expectedSampleRate: SAMPLE_RATE,
      sampleRateMatch: audioContext.sampleRate === SAMPLE_RATE,
      state: audioContext.state,
      outputDevice: currentOutputDeviceId || 'Default',
    });

    // Warn if sample rate doesn't match
    if (audioContext.sampleRate !== SAMPLE_RATE) {
      console.warn(
        `[AUDIO WARNING] Sample rate mismatch! Expected ${SAMPLE_RATE}Hz but got ${audioContext.sampleRate}Hz. Audio will be resampled and may sound distorted.`,
      );
    }

    // Resume if suspended (Chrome autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('Audio Context resumed');
      });
    }
  } catch (error) {
    console.error('Failed to initialize Audio Context:', error);
  }
}

// Diagnostic counters
let audioPacketCount = 0;
let totalBytesReceived = 0;
let lastDiagnosticTime = 0;

// Handle incoming audio data
function handleAudioData(data) {
  // Ignore audio data if we're not in a lobby
  if (!currentLobby) {
    console.debug('Ignoring audio data - not in a lobby');
    return;
  }

  // Diagnostic logging (every 100 packets)
  audioPacketCount++;
  const byteCount =
    data.length ||
    data.byteLength ||
    (data.buffer ? data.buffer.byteLength : 0);
  totalBytesReceived += byteCount;

  if (audioPacketCount % 100 === 0) {
    const now = Date.now();
    const elapsed = (now - lastDiagnosticTime) / 1000;
    const kbps = (totalBytesReceived * 8) / elapsed / 1000;
    console.log(
      `[AUDIO DIAG] Packets: ${audioPacketCount}, Size: ${byteCount} bytes, Bitrate: ${kbps.toFixed(0)} kbps`,
    );
    lastDiagnosticTime = now;
    totalBytesReceived = 0;
  }

  if (!audioContext) {
    try {
      initializeAudioContext();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return;
    }
  }

  if (!audioContext || audioContext.state === 'closed') {
    console.warn('Audio context not available');
    return;
  }

  // Resume audio context if suspended (Chrome autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch((error) => {
      console.error('Failed to resume audio context:', error);
    });
  }

  // Count bytes received (already calculated above)
  bytesReceived += byteCount;

  // Log first few packets to diagnose chunk size
  if (audioPacketCount <= 5) {
    console.log(
      `[AUDIO] Packet #${audioPacketCount}: ${byteCount} bytes, type: ${data.constructor.name}`,
    );
  }

  try {
    // Convert Buffer/ArrayBuffer to Int16Array
    let audioData;
    if (data instanceof ArrayBuffer) {
      audioData = new Int16Array(data);
    } else if (data.buffer) {
      audioData = new Int16Array(data.buffer);
    } else if (Array.isArray(data)) {
      audioData = new Int16Array(data);
    } else {
      console.warn('Unknown audio data format:', typeof data);
      return;
    }

    // Validate audio data
    if (audioData.length === 0) {
      console.warn('Received empty audio data');
      return;
    }

    // Convert Int16 PCM to Float32 for Web Audio API
    const float32Data = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      float32Data[i] = audioData[i] / 32768.0; // Convert to -1.0 to 1.0
    }

    // Create audio buffer
    const samplesPerChannel = float32Data.length / CHANNELS;

    if (samplesPerChannel < 1) {
      console.warn('Invalid audio data: not enough samples');
      return;
    }

    // CRITICAL: Create buffer at SOURCE sample rate (48kHz), not context sample rate!
    // The Web Audio API will automatically resample to the context's sample rate during playback
    // If we use the wrong sample rate here, audio will be time-stretched = robotic sound
    const audioBuffer = audioContext.createBuffer(
      CHANNELS,
      samplesPerChannel,
      SAMPLE_RATE, // Use 48kHz (source rate), NOT audioContext.sampleRate
    );

    // Log buffer creation for first few packets
    if (audioPacketCount <= 3) {
      console.log(
        `[AUDIO] Created buffer: ${samplesPerChannel} samples/channel, ${audioBuffer.duration.toFixed(3)}s duration, ${CHANNELS} channels, ${audioBuffer.sampleRate}Hz`,
      );
    }

    // Fill channels (deinterleave stereo: L R L R -> L L L... R R R...)
    for (let channel = 0; channel < CHANNELS; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < samplesPerChannel; i++) {
        channelData[i] = float32Data[i * CHANNELS + channel];
      }
    }

    // Queue for playback
    queueAudioBuffer(audioBuffer);
  } catch (error) {
    console.error('Error processing audio data:', error);
    showError('Audio processing error. Stream may be interrupted.');
  }
}

// Queue audio buffer for playback with improved scheduling
function queueAudioBuffer(audioBuffer) {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Connect through gain node for volume control
  if (gainNode) {
    source.connect(gainNode);
  } else {
    source.connect(audioContext.destination);
  }

  // Schedule playback with proper buffering
  const currentTime = audioContext.currentTime;

  // Initialize nextPlayTime if not set
  if (nextPlayTime === 0) {
    // Start playing with minimal latency
    nextPlayTime = currentTime + SCHEDULE_AHEAD_TIME;
  }

  // If we've fallen behind, adjust forward but minimize gaps
  if (nextPlayTime < currentTime) {
    // Only skip ahead by a small amount to minimize audio glitches
    nextPlayTime = currentTime + SCHEDULE_AHEAD_TIME;
    console.warn('Audio buffer underrun detected, recovering...');
  }

  // Prevent buffer queue from growing too large (causes increasing latency)
  const bufferQueueDuration = nextPlayTime - currentTime;
  if (bufferQueueDuration > MAX_BUFFER_DURATION) {
    // Reset to prevent excessive latency buildup
    nextPlayTime = currentTime + SCHEDULE_AHEAD_TIME;
    console.warn('Buffer queue too large, resetting to reduce latency');
  }

  // Schedule this buffer to play at the next available time
  source.start(nextPlayTime);
  nextPlayTime += audioBuffer.duration;

  // Track this source so we can stop it later
  activeAudioSources.push(source);

  // Remove from tracking when it ends naturally
  source.onended = () => {
    const index = activeAudioSources.indexOf(source);
    if (index > -1) {
      activeAudioSources.splice(index, 1);
    }
  };

  if (!isPlaying) {
    isPlaying = true;
    updateConnectionStatus('streaming');
  }
}

// Stop audio playback
function stopAudioPlayback() {
  // Stop all scheduled audio sources immediately
  activeAudioSources.forEach((source) => {
    try {
      source.stop(0); // Stop immediately
      source.disconnect();
    } catch (error) {
      // Source may have already stopped naturally or not started yet
    }
  });
  activeAudioSources = [];

  // Disconnect and close the audio context completely to stop all audio
  if (audioContext && audioContext.state !== 'closed') {
    // Disconnect gain node first to stop all audio immediately
    if (gainNode) {
      try {
        gainNode.disconnect();
      } catch (error) {
        // Ignore disconnection errors
      }
      gainNode = null;
    }

    // Close the audio context asynchronously but set to null immediately
    const contextToClose = audioContext;
    audioContext = null; // Set to null immediately to prevent new audio

    contextToClose.close().catch((error) => {
      console.error('Error closing audio context:', error);
    });
  }

  // Reset all audio state
  isPlaying = false;
  nextPlayTime = 0;
  audioQueue = [];
  bytesReceived = 0;
}

// Save session to localStorage
function saveSession() {
  if (currentLobby && username && currentJoinCode) {
    localStorage.setItem(
      'audire_session',
      JSON.stringify({
        username,
        joinCode: currentJoinCode,
        lobbyId: currentLobby.id,
      }),
    );
  }
}

// Clear session from localStorage
function clearSession() {
  localStorage.removeItem('audire_session');
}

// Try to restore previous session
function tryRestoreSession() {
  const sessionData = localStorage.getItem('audire_session');
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      username = session.username;
      currentJoinCode = session.joinCode;
      usernameInput.value = username;
      joinCodeInput.value = currentJoinCode;
      // Auto-join on next socket connection
    } catch (error) {
      console.error('Failed to restore session:', error);
      clearSession();
    }
  }
}

// Join a lobby with join code
async function joinLobbyWithCode() {
  username = usernameInput.value.trim();
  const joinCode = joinCodeInput.value.trim();

  if (!username) {
    showError('Please enter your name');
    usernameInput.focus();
    return;
  }

  if (!joinCode || joinCode.length !== 6 || !/^\d{6}$/.test(joinCode)) {
    showError('Please enter a valid 6-digit join code');
    joinCodeInput.focus();
    return;
  }

  // Initialize audio context on user interaction
  try {
    initializeAudioContext();
  } catch (error) {
    showError('Failed to initialize audio: ' + error.message);
    return;
  }

  updateConnectionStatus('connecting');

  socket.emit(
    'join-lobby',
    {
      joinCode: joinCode,
      username: username,
    },
    (response) => {
      if (response && response.success) {
        currentLobby = response.lobby;
        currentJoinCode = joinCode; // Store join code for reconnection
        saveSession(); // Save to localStorage
        showPlayerView();
        updateLobbyInfo(response.lobby);

        // Set status based on whether stream is already active
        if (response.isStreaming) {
          updateConnectionStatus('streaming');
          console.log('Joined lobby - stream is already active');
        } else {
          updateConnectionStatus('waiting');
          console.log('Joined lobby - waiting for host to start streaming');
        }
      } else {
        updateConnectionStatus('disconnected');
        showError(
          'Failed to join lobby: ' + (response?.error || 'Unknown error'),
        );
        // Show join screen on failure
        showLobbySelection();
      }
    },
  );
}

// Rejoin lobby after reconnection
function rejoinLobby() {
  if (!currentLobby || !username || !currentJoinCode) return;

  socket.emit(
    'join-lobby',
    {
      joinCode: currentJoinCode,
      username: username,
    },
    (response) => {
      if (response && response.success) {
        console.log('Rejoined lobby successfully');

        // Set status based on whether stream is already active
        if (response.isStreaming) {
          updateConnectionStatus('streaming');
          console.log('Rejoined lobby - stream is already active');
        } else {
          updateConnectionStatus('waiting');
          console.log('Rejoined lobby - waiting for host to start streaming');
        }
      } else {
        console.error('Failed to rejoin lobby');
        showError('Failed to rejoin lobby. Please select it again.');
        leaveLobby();
      }
    },
  );
}

// Leave current lobby
function leaveLobby() {
  if (!currentLobby) return;

  socket.emit('leave-lobby');
  // DO NOT emit 'stop-stream' - clients leaving should not stop the host's stream!

  stopAudioPlayback();
  currentLobby = null;
  currentJoinCode = '';
  clearSession(); // Clear saved session

  showLobbySelection();
}

// Update lobby information
function updateLobbyInfo(lobby) {
  lobbyNameEl.textContent = lobby.name;
  bitrateEl.textContent = `${lobby.bitrate} kbps`;

  // Also update stored lobby
  if (currentLobby && currentLobby.id === lobby.id) {
    currentLobby = lobby;
  }

  // Refresh listeners list
  refreshCurrentLobbyInfo();
}

// Update listeners list
function updateListenersList(listeners) {
  if (!listeners || listeners.length === 0) {
    listenersListEl.innerHTML =
      '<span style="color: #666;">No listeners</span>';
    return;
  }

  // Create a list of listener names
  const listHTML = listeners
    .map(
      (l) =>
        `<div style="padding: 0.25rem 0; color: #000;">${l.username}</div>`,
    )
    .join('');
  listenersListEl.innerHTML = listHTML;
}

// Update connection status
function updateConnectionStatus(status) {
  const statusMap = {
    connected: 'Waiting for host',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting...',
    failed: 'Connection Failed',
    streaming: 'Streaming ▶',
    waiting: 'Waiting for host',
  };

  connectionStatusEl.textContent = statusMap[status] || status;

  // Use 'connected' class for both 'connected' and 'streaming' to show green
  // Use 'streaming' class for streaming to potentially style differently
  if (status === 'streaming') {
    connectionStatusEl.className = 'status connected streaming';
  } else if (status === 'connected' || status === 'waiting') {
    connectionStatusEl.className = 'status connected';
  } else {
    connectionStatusEl.className = `status ${status}`;
  }
}

// Show error message
function showError(message) {
  showToast(message, 'error');
}

// Show toast notification
function showToast(message, type = 'info') {
  const colors = {
    error: '#dc3545',
    success: '#28a745',
    info: '#17a2b8',
    warning: '#ffc107',
  };

  const toastDiv = document.createElement('div');
  toastDiv.className = 'toast-notification';
  toastDiv.textContent = message;
  toastDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 80%;
        text-align: center;
    `;

  document.body.appendChild(toastDiv);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toastDiv.style.opacity = '0';
    toastDiv.style.transition = 'opacity 0.3s';
    setTimeout(() => toastDiv.remove(), 300);
  }, 4000);
}

// Refresh current lobby information
async function refreshCurrentLobbyInfo() {
  if (!currentLobby) return;

  try {
    const response = await fetch(`${API_BASE}/lobby/${currentLobby.id}`);
    if (response.ok) {
      const lobby = await response.json();
      updateLobbyInfo(lobby);

      // Get listener details
      const listenersResponse = await fetch(
        `${API_BASE}/lobby/${currentLobby.id}/listeners`,
      );
      if (listenersResponse.ok) {
        const listeners = await listenersResponse.json();
        updateListenersList(listeners);
      }
    }
  } catch (error) {
    console.error('Failed to refresh lobby info:', error);
  }
}

// UI State Management
function showPlayerView() {
  lobbySelection.classList.add('hidden');
  playerView.classList.remove('hidden');
}

function showLobbySelection() {
  playerView.classList.add('hidden');
  lobbySelection.classList.remove('hidden');
}

// Display audio statistics (for debugging)
setInterval(() => {
  if (isPlaying && audioContext) {
    console.log('Audio Stats:', {
      state: audioContext.state,
      currentTime: audioContext.currentTime.toFixed(2),
      nextPlayTime: nextPlayTime.toFixed(2),
      bytesReceived: (bytesReceived / 1024).toFixed(2) + ' KB',
      isPlaying: isPlaying,
    });
  }

  // Update UI with data received (always update, even if 0)
  if (dataReceivedEl) {
    const kb = bytesReceived / 1024;
    const mb = kb / 1024;
    if (mb > 1) {
      dataReceivedEl.textContent = mb.toFixed(2) + ' MB';
    } else {
      dataReceivedEl.textContent = kb.toFixed(2) + ' KB';
    }
  }
}, 1000);

// Setup audio output device selector and volume control
function setupAudioControls() {
  // Load available audio output devices
  loadOutputDevices();

  // Volume control
  if (volumeControl && volumeValue) {
    volumeControl.addEventListener('input', (e) => {
      const volume = parseInt((e.target as HTMLInputElement).value);
      volumeValue.textContent = volume + '%';
      if (gainNode) {
        gainNode.gain.value = volume / 100;
      }
    });
  }

  // Output device selector
  if (outputDeviceSelect) {
    outputDeviceSelect.addEventListener('change', async (e) => {
      currentOutputDeviceId = (e.target as HTMLSelectElement).value;
      console.log(
        'Output device changed to:',
        currentOutputDeviceId || 'Default',
      );

      // If audio context exists, we need to recreate it with the new output device
      if (audioContext) {
        try {
          await audioContext.setSinkId(currentOutputDeviceId);
          console.log('Audio output device updated successfully');
        } catch (error) {
          console.error('Failed to change output device:', error);
          showToast('Failed to change output device', 'error');
        }
      }
    });
  }
}

// Load available audio output devices
async function loadOutputDevices() {
  if (!outputDeviceSelect) return;

  try {
    // Request permission to enumerate devices
    await navigator.mediaDevices.getUserMedia({ audio: true });

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(
      (device) => device.kind === 'audiooutput',
    );

    // Clear existing options except default
    outputDeviceSelect.innerHTML = '<option value="">Default</option>';

    // Add available output devices
    audioOutputs.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent =
        device.label || `Speaker ${audioOutputs.indexOf(device) + 1}`;
      outputDeviceSelect.appendChild(option);
    });

    console.log(`Found ${audioOutputs.length} audio output devices`);
  } catch (error) {
    console.error('Failed to load output devices:', error);
    // Hide the output device selector if not supported
    if (outputDeviceSelect && outputDeviceSelect.parentElement) {
      outputDeviceSelect.parentElement.style.display = 'none';
    }
  }
}
