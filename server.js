#!/usr/bin/env node

// Direct Node.js entry point for running backend only
// This runs outside of Electron for headless server mode

require('./dist-electron/electron/nest-bootstrap')
  .startNestApp()
  .then((app) => {
    console.log('✓ Audire Arcanus backend started');
    console.log('📡 Server running on http://localhost:5551');
    console.log('🎵 Open browser to connect web clients');
    console.log('');
    console.log('Press Ctrl+C to stop');
  })
  .catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
