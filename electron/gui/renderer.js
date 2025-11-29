// State Management
let audioSources = [];
let lobbies = [];
let listeners = [];
let stats = [];
let selectedAudioIndex = -1;
let selectedLobbyIndex = -1;
let focusedPanel = 'audio'; // 'audio' or 'lobbies'
let activeAudioSourceId = null;

// DOM Elements
const audioSourcesList = document.getElementById('audio-sources-list');
const lobbiesList = document.getElementById('lobbies-list');
const statsContent = document.getElementById('stats-content');
const listenersContent = document.getElementById('listeners-content');
const logContent = document.getElementById('log-content');
const audioCount = document.getElementById('audio-count');
const lobbyCount = document.getElementById('lobby-count');
const listenerCount = document.getElementById('listener-count');
const audioSourcesPanel = document.getElementById('audio-sources-panel');
const lobbiesPanel = document.getElementById('lobbies-panel');
const commandsContent = document.getElementById('commands-content');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalOk = document.getElementById('modal-ok');
const modalCancel = document.getElementById('modal-cancel');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  log('🎵 Audire Arcanus initialized', 'info');
  log('📡 Connecting to backend...', 'info');

  // Check if backend is running
  try {
    const response = await fetch('http://localhost:5551/audio/platform');
    if (response.ok) {
      const data = await response.json();
      log(
        `✓ Backend connected: ${data.platform}, Node ${data.nodejs}`,
        'success',
      );
    } else {
      log(`⚠ Backend responded with status: ${response.status}`, 'warning');
    }
  } catch (error) {
    log(`✗ Backend not reachable: ${error.message}`, 'error');
    log('⚠ Please wait a few seconds for the backend to start...', 'warning');
  }

  // Set initial focus
  audioSourcesPanel.focus();
  updatePanelFocus();

  // Load initial data
  refreshAll();

  // Start periodic refresh
  setInterval(refreshAll, 2000);

  // Setup event listeners
  setupEventListeners();
  setupKeyboardShortcuts();
  setupMouseHandlers();
});

// Logging
function log(message, type = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContent.appendChild(line);
  logContent.scrollTop = logContent.scrollHeight;

  // Keep only last 100 log lines
  while (logContent.children.length > 100) {
    logContent.removeChild(logContent.firstChild);
  }
}

// Refresh all data
async function refreshAll() {
  try {
    await Promise.all([
      refreshAudioSources(),
      refreshLobbies(),
      refreshStats(),
      refreshListeners(),
    ]);
  } catch (error) {
    console.error('Error refreshing data:', error);
  }
}

// Refresh Audio Sources
async function refreshAudioSources() {
  try {
    audioSources = await window.api.getAudioSources();
    audioCount.textContent = audioSources.length;

    if (audioSources.length === 0) {
      audioSourcesList.innerHTML =
        '<li class="list-item-empty">No audio sources detected</li>';
      return;
    }

    audioSourcesList.innerHTML = '';
    audioSources.forEach((source, index) => {
      const li = document.createElement('li');
      li.className = 'list-item';
      if (source.isActive) {
        li.classList.add('active');
        activeAudioSourceId = source.id;
      }
      if (index === selectedAudioIndex && focusedPanel === 'audio') {
        li.classList.add('selected');
      }
      li.textContent = `${source.name} (${source.type})`;
      li.dataset.index = index;
      audioSourcesList.appendChild(li);
    });
  } catch (error) {
    console.error('Error fetching audio sources:', error);
    log(`✗ Failed to fetch audio sources: ${error.message}`, 'error');
  }
}

// Refresh Lobbies
async function refreshLobbies() {
  try {
    lobbies = await window.api.getLobbies();
    lobbyCount.textContent = lobbies.length;

    if (lobbies.length === 0) {
      lobbiesList.innerHTML =
        '<li class="list-item-empty">No lobbies created</li>';
      return;
    }

    lobbiesList.innerHTML = '';
    lobbies.forEach((lobby, index) => {
      const li = document.createElement('li');
      li.className = 'list-item';
      if (index === selectedLobbyIndex && focusedPanel === 'lobbies') {
        li.classList.add('selected');
      }

      const nameSpan = document.createElement('span');
      nameSpan.textContent = `${lobby.name}`;

      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'list-item-badge';
      badgeSpan.textContent = `[${lobby.joinCode}] ${lobby.listenerCount} listeners`;

      li.appendChild(nameSpan);
      li.appendChild(badgeSpan);
      li.dataset.index = index;
      lobbiesList.appendChild(li);
    });

    // Update commands display in case selection state changed
    updateCommandsDisplay();
  } catch (error) {
    console.error('Error fetching lobbies:', error);
  }
}

// Refresh Stats
async function refreshStats() {
  try {
    stats = await window.api.getStats();

    if (stats.length === 0) {
      statsContent.innerHTML =
        '<div class="stats-empty">No active streams</div>';
      return;
    }

    statsContent.innerHTML = '';
    stats.forEach((stat) => {
      const div = document.createElement('div');
      div.className = stat.isStreaming ? 'stats-item' : 'stats-item stopped';

      const lobbyName = document.createElement('div');
      lobbyName.className = 'stats-lobby-name';
      lobbyName.textContent = `${stat.lobbyName} - ${stat.listenerCount} listeners`;

      const status = document.createElement('div');
      status.className = 'stats-row';
      status.innerHTML = `<span class="stats-label">Status:</span><span class="${stat.isStreaming ? 'stats-status-streaming' : 'stats-status-stopped'}">${stat.isStreaming ? 'Streaming ▶' : 'Stopped'}</span>`;

      const bitrate = document.createElement('div');
      bitrate.className = 'stats-row';
      bitrate.innerHTML = `<span class="stats-label">Bitrate:</span><span class="stats-value">${stat.bitrate} kbps</span>`;

      const bytes = document.createElement('div');
      bytes.className = 'stats-row';
      const mb = (stat.bytesTransferred / 1024 / 1024).toFixed(2);
      bytes.innerHTML = `<span class="stats-label">Data:</span><span class="stats-value">${mb} MB</span>`;

      const duration = document.createElement('div');
      duration.className = 'stats-row';
      duration.innerHTML = `<span class="stats-label">Duration:</span><span class="stats-value">${formatDuration(stat.duration)}</span>`;

      div.appendChild(lobbyName);
      div.appendChild(status);
      div.appendChild(bitrate);
      div.appendChild(bytes);
      div.appendChild(duration);

      statsContent.appendChild(div);
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Refresh Listeners
async function refreshListeners() {
  try {
    // Get listeners from all lobbies
    const allListeners = [];
    for (const lobby of lobbies) {
      const lobbyListeners = await window.api.getListeners(lobby.id);
      allListeners.push(
        ...lobbyListeners.map((l) => ({ ...l, lobbyName: lobby.name })),
      );
    }

    listeners = allListeners;
    listenerCount.textContent = listeners.length;

    if (listeners.length === 0) {
      listenersContent.innerHTML =
        '<div class="listeners-empty">No listeners connected</div>';
      return;
    }

    listenersContent.innerHTML = '';
    listeners.forEach((listener) => {
      const card = document.createElement('div');
      card.className = 'listener-card';

      const name = document.createElement('div');
      name.className = 'listener-name';
      name.textContent = listener.username;

      const info = document.createElement('div');
      info.className = 'listener-info';
      const connectedTime = new Date(listener.connectedAt).toLocaleTimeString();
      info.textContent = `${listener.ipAddress || 'Unknown IP'} • Connected ${connectedTime}`;

      const lobby = document.createElement('div');
      lobby.className = 'listener-lobby';
      lobby.textContent = `📡 ${listener.lobbyName}`;

      card.appendChild(name);
      card.appendChild(info);
      card.appendChild(lobby);

      listenersContent.appendChild(card);
    });
  } catch (error) {
    console.error('Error fetching listeners:', error);
  }
}

// Format duration in seconds to readable format
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

// Update panel focus styling
function updatePanelFocus() {
  audioSourcesPanel.classList.toggle('focused', focusedPanel === 'audio');
  lobbiesPanel.classList.toggle('focused', focusedPanel === 'lobbies');
  updateCommandsDisplay();
}

// Update commands display based on focused panel and context
function updateCommandsDisplay() {
  let commands = [];

  if (focusedPanel === 'audio') {
    // Audio Sources Panel Commands
    commands = [
      { key: 'Space', label: 'Select Source' },
      { key: 'Tab', label: 'Switch to Lobbies' },
      { key: 'q', label: 'Quit' },
    ];
  } else if (focusedPanel === 'lobbies') {
    // Lobbies Panel Commands
    const hasSelection =
      selectedLobbyIndex >= 0 && selectedLobbyIndex < lobbies.length;

    commands = [
      { key: 'n', label: 'New Lobby' },
      { key: 'Tab', label: 'Switch to Audio' },
    ];

    if (hasSelection) {
      commands.splice(
        1,
        0,
        { key: 'r', label: 'Rename' },
        { key: 'c', label: 'Close' },
        { key: 's', label: 'Start/Stop Stream' },
        { key: 'y', label: 'Copy Code' },
      );
    }

    commands.push({ key: 'q', label: 'Quit' });
  }

  // Render commands
  commandsContent.innerHTML = commands
    .map(
      (cmd) =>
        `<span class="command"><kbd>${cmd.key}</kbd> ${cmd.label}</span>`,
    )
    .join('');
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', async (e) => {
    // Ignore if modal is open
    if (modal.classList.contains('active')) return;

    switch (e.key.toLowerCase()) {
      case 'tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab - previous panel
          focusedPanel = focusedPanel === 'audio' ? 'lobbies' : 'audio';
        } else {
          // Tab - next panel
          focusedPanel = focusedPanel === 'audio' ? 'lobbies' : 'audio';
        }
        updatePanelFocus();
        if (focusedPanel === 'audio') {
          audioSourcesPanel.focus();
        } else {
          lobbiesPanel.focus();
        }
        await refreshAudioSources();
        await refreshLobbies();
        break;

      case ' ':
        e.preventDefault();
        if (focusedPanel === 'audio') {
          await selectAudioSource();
        }
        break;

      case 'n':
        e.preventDefault();
        await createLobby();
        break;

      case 'r':
        e.preventDefault();
        if (focusedPanel === 'lobbies') {
          await renameLobby();
        }
        break;

      case 'c':
        e.preventDefault();
        if (focusedPanel === 'lobbies') {
          await closeLobby();
        }
        break;

      case 's':
        e.preventDefault();
        if (focusedPanel === 'lobbies') {
          await toggleStreaming();
        }
        break;

      case 'y':
        e.preventDefault();
        if (focusedPanel === 'lobbies') {
          await copyJoinCode();
        }
        break;

      case 'q':
        e.preventDefault();
        await window.api.quit();
        break;

      case 'arrowup':
        e.preventDefault();
        if (focusedPanel === 'audio') {
          selectedAudioIndex = Math.max(0, selectedAudioIndex - 1);
          await refreshAudioSources();
        } else if (focusedPanel === 'lobbies') {
          selectedLobbyIndex = Math.max(0, selectedLobbyIndex - 1);
          await refreshLobbies();
        }
        break;

      case 'arrowdown':
        e.preventDefault();
        if (focusedPanel === 'audio') {
          selectedAudioIndex = Math.min(
            audioSources.length - 1,
            selectedAudioIndex + 1,
          );
          await refreshAudioSources();
        } else if (focusedPanel === 'lobbies') {
          selectedLobbyIndex = Math.min(
            lobbies.length - 1,
            selectedLobbyIndex + 1,
          );
          await refreshLobbies();
        }
        break;
    }
  });
}

// Mouse Handlers
function setupMouseHandlers() {
  audioSourcesList.addEventListener('click', (e) => {
    const li = e.target.closest('.list-item');
    if (li && li.dataset.index !== undefined) {
      selectedAudioIndex = parseInt(li.dataset.index);
      focusedPanel = 'audio';
      audioSourcesPanel.focus();
      updatePanelFocus();
      refreshAudioSources();
    }
  });

  lobbiesList.addEventListener('click', (e) => {
    const li = e.target.closest('.list-item');
    if (li && li.dataset.index !== undefined) {
      selectedLobbyIndex = parseInt(li.dataset.index);
      focusedPanel = 'lobbies';
      lobbiesPanel.focus();
      updatePanelFocus();
      refreshLobbies();
    }
  });

  audioSourcesList.addEventListener('dblclick', async () => {
    await selectAudioSource();
  });

  lobbiesList.addEventListener('dblclick', async () => {
    // Could trigger some action
  });
}

// Event Listeners
function setupEventListeners() {
  window.api.onLobbyUpdate(() => {
    refreshLobbies();
  });

  window.api.onListenerUpdate(() => {
    refreshListeners();
  });

  window.api.onStatsUpdate(() => {
    refreshStats();
  });

  window.api.onAudioSourceUpdate(() => {
    refreshAudioSources();
  });

  // Listen for listener connected/disconnected events
  window.api.onListenerConnected((data) => {
    log(
      `👤 ${data.username} joined ${data.lobbyName} [${data.joinCode}]`,
      'success',
    );
    refreshListeners();
  });

  window.api.onListenerDisconnected((data) => {
    log(`👋 ${data.username} left ${data.lobbyName}`, 'info');
    refreshListeners();
  });
}

// Actions
async function selectAudioSource() {
  if (selectedAudioIndex < 0 || selectedAudioIndex >= audioSources.length) {
    log('⚠️ Please select an audio source', 'warning');
    return;
  }

  const source = audioSources[selectedAudioIndex];
  log(`Selecting audio source: ${source.name}...`, 'info');

  try {
    const result = await window.api.selectAudioSource(source.id);
    if (result && result.success) {
      log(`✓ Audio source "${source.name}" selected successfully`, 'success');
      log(`Ready to stream audio from ${source.name}`, 'info');
      await refreshAudioSources();
    } else {
      log(`✗ Failed to select audio source "${source.name}"`, 'error');
    }
  } catch (error) {
    log(`✗ Error selecting audio source: ${error.message}`, 'error');
  }
}

async function createLobby() {
  const name = await showPrompt('Create New Lobby', 'Enter lobby name:');
  if (!name) return;

  log(`Creating new lobby "${name}"...`, 'info');

  try {
    const lobby = await window.api.createLobby(name, 320);
    if (lobby) {
      log(`✓ Created lobby: ${lobby.name} [${lobby.joinCode}]`, 'success');
      await refreshLobbies();

      // Switch to lobbies panel and select new lobby
      focusedPanel = 'lobbies';
      selectedLobbyIndex = lobbies.length - 1;
      lobbiesPanel.focus();
      updatePanelFocus();
      await refreshLobbies();
    }
  } catch (error) {
    log(`✗ Failed to create lobby: ${error.message}`, 'error');
  }
}

async function renameLobby() {
  if (selectedLobbyIndex < 0 || selectedLobbyIndex >= lobbies.length) {
    log('⚠️ Please select a lobby to rename', 'warning');
    return;
  }

  const lobby = lobbies[selectedLobbyIndex];
  const newName = await showPrompt('Rename Lobby', 'Enter new lobby name:');
  if (!newName) return;

  log(`Renaming lobby "${lobby.name}" to "${newName}"...`, 'info');

  try {
    const result = await window.api.renameLobby(lobby.id, newName);
    if (result && result.success) {
      log(`✓ Lobby renamed to "${newName}" successfully`, 'success');
      await refreshLobbies();
    } else {
      log(`✗ Failed to rename lobby`, 'error');
    }
  } catch (error) {
    log(`✗ Error renaming lobby: ${error.message}`, 'error');
  }
}

async function closeLobby() {
  if (selectedLobbyIndex < 0 || selectedLobbyIndex >= lobbies.length) {
    log('⚠️ Please select a lobby to close', 'warning');
    return;
  }

  const lobby = lobbies[selectedLobbyIndex];
  log(`Closing lobby: ${lobby.name}...`, 'info');

  try {
    await window.api.closeLobby(lobby.id);
    log(`✓ Lobby "${lobby.name}" closed successfully`, 'success');
    selectedLobbyIndex = Math.max(0, selectedLobbyIndex - 1);
    await refreshLobbies();
  } catch (error) {
    log(`✗ Error closing lobby: ${error.message}`, 'error');
  }
}

async function toggleStreaming() {
  if (selectedLobbyIndex < 0 || selectedLobbyIndex >= lobbies.length) {
    log('⚠️ Please select a lobby to start/stop streaming', 'warning');
    return;
  }

  const lobby = lobbies[selectedLobbyIndex];

  // Check if audio source is selected
  if (!activeAudioSourceId) {
    log('⚠️ Please select an audio source first', 'warning');
    return;
  }

  try {
    const status = await window.api.getStreamingStatus(lobby.id);

    if (status && status.isStreaming) {
      // Stop streaming
      log(`Stopping stream for lobby: ${lobby.name}...`, 'info');
      const result = await window.api.stopStreaming(lobby.id);

      if (result && result.success) {
        log(`✓ Stream stopped for ${lobby.name}`, 'success');
      } else {
        log(`✗ Failed to stop stream`, 'error');
      }
    } else {
      // Start streaming
      log(`Starting stream for lobby: ${lobby.name}...`, 'info');
      const result = await window.api.startStreaming(lobby.id);

      if (result && result.success) {
        log(`✓ Stream started for ${lobby.name}`, 'success');
      } else {
        log(`✗ Failed to start stream`, 'error');
      }
    }

    await refreshStats();
  } catch (error) {
    log(`✗ Error toggling stream: ${error.message}`, 'error');
  }
}

async function copyJoinCode() {
  if (selectedLobbyIndex < 0 || selectedLobbyIndex >= lobbies.length) {
    log('⚠️ Please select a lobby to copy join code', 'warning');
    return;
  }

  const lobby = lobbies[selectedLobbyIndex];

  try {
    await window.api.copyToClipboard(lobby.joinCode);
    log(`✓ Join code ${lobby.joinCode} copied to clipboard!`, 'success');
  } catch (error) {
    log(`✗ Failed to copy to clipboard: ${error.message}`, 'error');
  }
}

// Modal Prompt
function showPrompt(title, placeholder) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalInput.placeholder = placeholder;
    modalInput.value = '';
    modal.classList.add('active');
    modalInput.focus();

    const handleOk = () => {
      const value = modalInput.value.trim();
      cleanup();
      resolve(value);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleOk();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    const cleanup = () => {
      modal.classList.remove('active');
      modalOk.removeEventListener('click', handleOk);
      modalCancel.removeEventListener('click', handleCancel);
      modalInput.removeEventListener('keydown', handleKeyDown);
    };

    modalOk.addEventListener('click', handleOk);
    modalCancel.addEventListener('click', handleCancel);
    modalInput.addEventListener('keydown', handleKeyDown);
  });
}
