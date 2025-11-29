# Changelog

All notable changes to Audire Arcanus will be documented in this file.

## [0.1.0-alpha.1] - Alpha Release

### Added

- Cross-platform audio capture (macOS, Windows, Linux)
- Bundled ffmpeg (no external dependencies)
- NestJS backend with 4 modules
- WebSocket-based audio streaming
- Browser client with Web Audio API
- **NEW**: Desktop GUI (replaced TUI)
- Electron desktop packaging
- Multi-lobby support
- Real-time statistics
- Join codes for easy lobby access
- Event logging with listener tracking
- Context-aware keyboard shortcuts
- Production-ready build system

### Fixed

- Audio source selection parameter mismatch
- TypeScript build errors with release/ directory
- Streaming stats display (endpoint, duration, bitrate)
- Stream status when rejoining lobbies
- Audio continues after leaving lobby
- Event log not showing client join/leave
- ffmpeg binary execution from asar archive
- Verbose logging cleanup

### Changed

- Migrated from TUI to modern GUI interface
- Improved error handling and user feedback
- Enhanced build configuration for production
- Clean, professional console output

---

## Version History

- **0.1.0-alpha.1**: Alpha release with GUI and production fixes
- **0.0.1**: Initial implementation with TUI and core streaming features

## Versioning Scheme

Audire Arcanus follows [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

**Pre-release identifiers:**

- `alpha`: Early development, features may change
- `beta`: Feature-complete, testing phase
- `rc`: Release candidate, final testing
- (no suffix): Stable release

**Example versions:**

- `0.1.0-alpha.1` - First alpha of version 0.1.0
- `0.1.0-beta.1` - First beta of version 0.1.0
- `0.1.0-rc.1` - First release candidate of version 0.1.0
- `0.1.0` - Stable release of version 0.1.0
