# Audire Arcanus

> High-fidelity audio streaming from desktop to browser listeners

**Audire Arcanus** is an Electron desktop application that captures audio from your system and streams it to multiple browser-based listeners with exceptional quality. Perfect for shared listening sessions, remote audio monitoring, or collaborative music experiences.

![Version](https://img.shields.io/badge/version-0.1.0--alpha.1-orange.svg)
![Status](https://img.shields.io/badge/status-alpha-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- **High-Fidelity Streaming** - 48kHz/16-bit PCM audio over WebSockets
- **Cross-Platform** - macOS (ARM64 & Intel), Windows, and Linux support (planned)
- **Zero Dependencies** - Bundled ffmpeg, no external installation required
- **Desktop GUI** - Clean Electron interface for stream management
- **Browser Clients** - Listeners join via simple web interface
- **Multi-Lobby Support** - Create and manage multiple streaming rooms
- **Real-Time Stats** - Monitor bitrate, listeners, data transfer, and stream duration
- **Join Codes** - Easy 6-character codes for quick lobby access
- **Event Logging** - Track listener activity in real-time

## Quick Start

### For Users (Prebuilt App)

1. Download the latest alpha release for your platform:
   - macOS (Apple Silicon): `Audire Arcanus-0.1.0-alpha.1-arm64.dmg`
   - macOS (Intel): `Audire Arcanus-0.1.0-alpha.1.dmg`
   - Windows: `Audire Arcanus Setup 0.1.0-alpha.1.exe`

2. Install and launch the application

3. Select an audio source and create a lobby

4. Share the join code with listeners who can access at `http://your-ip:5551`

### For Developers

```bash
# Clone the repository
git clone <repository-url>
cd audire_arcanus

# Install dependencies
npm install

# Run in development mode
npm run dev
```

The server will start at `http://localhost:5551`

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              Electron Desktop App                     │
│  ┌──────────────┐         ┌─────────────────────┐   │
│  │  Desktop GUI │◄────────┤   NestJS Backend    │   │
│  │  (Renderer)  │   IPC   │   • Audio Capture   │   │
│  └──────────────┘         │   • WebSocket Server│   │
│                            │   • Static Files    │   │
│                            └─────────────────────┘   │
└────────────────────────────────┬─────────────────────┘
                                 │ WebSocket
                                 ▼
                    ┌─────────────────────────┐
                    │   Browser Clients       │
                    │   • Socket.IO           │
                    │   • Web Audio API       │
                    └─────────────────────────┘
```

## Tech Stack

**Backend:**

- NestJS - Modular backend framework
- Socket.IO - WebSocket communication
- ffmpeg - Audio capture (bundled via @ffmpeg-installer/ffmpeg)

**Desktop:**

- Electron - Cross-platform desktop framework
- Custom GUI built with HTML/CSS/JS

**Client:**

- Vanilla JavaScript
- Web Audio API for playback
- Socket.IO client for streaming

## Project Structure

```
audire_arcanus/
├── src/                      # NestJS backend
│   ├── audio/               # Audio capture & source management
│   ├── lobby/               # Lobby & listener management
│   ├── streaming/           # WebSocket audio streaming
│   ├── stats/               # Statistics & monitoring
│   └── main.ts              # NestJS bootstrap
├── electron/                # Electron main process
│   ├── gui/                 # Desktop GUI (HTML/CSS/JS)
│   ├── main.ts             # Electron entry point
│   ├── nest-bootstrap.ts   # NestJS initialization
│   └── ipc-handlers.ts     # IPC communication
├── client/                  # Browser listener client
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── test/                    # Tests
```

## Development

### Available Scripts

**Development:**

```bash
npm run start:dev          # NestJS backend only (watch mode)
npm run dev                # Build & run Electron app
npm run electron:dev       # Same as dev
```

**Building:**

```bash
npm run build              # Build NestJS backend
npm run build:electron     # Build Electron code
npm run build:all          # Build both
```

**Packaging:**

```bash
npm run electron:build     # Build for current platform
npm run electron:build:win # Build Windows .exe
```

**Code Quality:**

```bash
npm run lint               # ESLint (auto-fix)
npm run format             # Prettier formatting
npm test                   # Run unit tests
npm run test:e2e           # Run e2e tests
npm run test:cov           # Test coverage
```

### Desktop GUI Controls

**Navigation:**

- `Tab` - Switch between panels
- `↑/↓` - Navigate lists

**Audio Sources:**

- `Space` - Select audio source

**Lobbies:**

- `n` - Create new lobby
- `r` - Rename selected lobby
- `y` - Copy join code
- `s` - Start/stop streaming
- `c` - Close lobby

**Listeners:**

- `k` - Kick selected listener

**Global:**

- `Cmd/Ctrl+Shift+I` - Toggle DevTools
- `q` - Quit

## API Reference

### REST Endpoints

**Audio:**

- `GET /audio/sources` - List available audio input devices
- `GET /audio/active` - Get currently active audio source
- `POST /audio/select` - Select audio source `{ sourceId: string }`
- `POST /audio/stop` - Stop audio capture

**Lobbies:**

- `GET /lobby` - List all lobbies
- `GET /lobby/:id` - Get lobby details
- `GET /lobby/:id/listeners` - Get lobby listeners
- `POST /lobby` - Create new lobby `{ name: string }`
- `PATCH /lobby/:id` - Update lobby `{ name: string }`
- `DELETE /lobby/:id` - Close lobby

**Statistics:**

- `GET /stats/lobbies` - Get streaming statistics for all lobbies

### WebSocket Events

**Client → Server:**

- `join-lobby` - Join a lobby `{ lobbyId: string, username: string }`
- `leave-lobby` - Leave current lobby

**Server → Client:**

- `audio-data` - Audio stream chunk `{ data: ArrayBuffer, format: AudioFormat }`
- `lobbies-updated` - Lobby list changed
- `lobby-closed` - Current lobby was closed
- `stream-started` - Host started streaming
- `stream-stopped` - Host stopped streaming
- `listener-connected` - New listener joined
- `listener-disconnected` - Listener left
- `kicked` - You were kicked from lobby

## Audio Format

Current streaming format (uncompressed PCM):

```typescript
{
  format: 'PCM',
  sampleRate: 48000,  // 48kHz
  bitDepth: 16,       // 16-bit signed
  channels: 2,        // Stereo
  encoding: 'S16_LE'  // Little-endian
}
```

**Bitrate:** ~1.5 Mbps (192 KB/s per listener)

> **Note:** Opus compression is planned for future releases to reduce bandwidth by ~80%

## Platform-Specific Notes

### macOS

**Audio Sources:**

- Built-in microphone, external audio interfaces work out-of-the-box
- For system audio capture, install [BlackHole](https://github.com/ExistentialAudio/BlackHole):

  ```bash
  brew install blackhole-2ch
  ```

  Then create a Multi-Output Device in Audio MIDI Setup

**Permissions:**

- Grant microphone access when prompted on first launch

### Windows

**Audio Sources:**

- Microphone and line-in devices work by default
- For system audio capture, enable "Stereo Mix" in Sound settings:
  1. Right-click speaker icon → Sounds
  2. Recording tab → Right-click → Show Disabled Devices
  3. Enable "Stereo Mix"

### Linux

**Audio Sources:**

- PulseAudio/PipeWire required (usually pre-installed)
- List sources: `pactl list sources`

## Building for Distribution

The build system uses `electron-builder` to create platform-specific installers.

**Build Configuration:**

- macOS: Universal binary (ARM64 + Intel) packaged as `.dmg`
- Windows: NSIS installer (`.exe`)
- Linux: AppImage (planned)

**Output Directory:**

```
release/
├── Audire Arcanus-0.1.0-alpha.1-arm64.dmg        # macOS Apple Silicon
├── Audire Arcanus-0.1.0-alpha.1.dmg              # macOS Intel
└── Audire Arcanus Setup 0.1.0-alpha.1.exe        # Windows
```

release/
├── Audire Arcanus-0.0.1-arm64.dmg # macOS Apple Silicon
├── Audire Arcanus-0.0.1.dmg # macOS Intel
└── Audire Arcanus Setup 0.0.1.exe # Windows

```

**Bundled Resources:**

- ffmpeg binaries for all platforms
- Client static files (HTML/CSS/JS)

## Contributing

### Code Style

Follow the guidelines in `AGENTS.md`:

- **Imports:** NestJS decorators → third-party → local
- **Formatting:** Prettier (single quotes, trailing commas)
- **Naming:** camelCase (variables/methods), PascalCase (classes), kebab-case (files)
- **TypeScript:** Explicit types preferred, strict null checks enabled

### Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm test`
5. Submit a pull request

## Roadmap

**Current (v0.1.0-alpha.1):**

- ✅ Cross-platform audio capture
- ✅ WebSocket streaming
- ✅ Desktop GUI (replaced TUI)
- ✅ Browser client with Web Audio API
- ✅ Multi-lobby support
- ✅ Real-time statistics

**Planned:**

- [ ] Opus audio compression (80% bandwidth reduction)
- [ ] Linux AppImage release
- [ ] Audio effects (EQ, compressor, limiter)
- [ ] HTTPS/WSS support
- [ ] Mobile-responsive client

## Troubleshooting

**No audio sources detected:**

- macOS: Check System Settings → Privacy & Security → Microphone
- Windows: Check Sound settings → Recording devices
- All: Restart the application

**Listeners can't connect:**

- Check firewall settings (allow port 5551)
- Ensure host and listeners are on the same network or port is properly forwarded

**Audio crackling/stuttering:**

- Close bandwidth-intensive applications
- Reduce number of concurrent listeners
- Check CPU usage in Activity Monitor/Task Manager

## License

MIT License - see [LICENSE](LICENSE) file for details

This means you're free to:
- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Use privately
- ✅ Create derivative works

No warranty is provided.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.
```
