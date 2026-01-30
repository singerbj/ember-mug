#!/usr/bin/env node

// Parse command line arguments BEFORE importing modules that initialize Bluetooth
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const debugMode = args.includes('--debug') || args.includes('-d');

if (showHelp) {
  console.log(`
ember-mug - CLI for controlling Ember mugs via Bluetooth

Usage:
  ember-mug [options]

Options:
  -d, --debug    Enable debug mode (outputs detailed Bluetooth logs)
  -h, --help     Show this help message

Environment variables:
  EMBER_MOCK=true    Run in mock mode (simulates mug for testing)
`);
  process.exit(0);
}

// ANSI escape codes for alternate screen buffer
const enterAltScreen = "\x1b[?1049h";
const exitAltScreen = "\x1b[?1049l";
const hideCursor = "\x1b[?25l";
const showCursor = "\x1b[?25h";
const clearScreen = "\x1b[2J\x1b[H";

// Enter alternate screen buffer and hide cursor
process.stdout.write(enterAltScreen + hideCursor + clearScreen);

// Handle graceful shutdown - restore terminal state
const cleanup = () => {
  process.stdout.write(showCursor + exitAltScreen);
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => {
  process.stdout.write(showCursor + exitAltScreen);
});

// Handle terminal resize - clear screen to prevent artifacts
process.stdout.on("resize", () => {
  process.stdout.write(clearScreen);
});

async function main() {
  // Dynamic imports to avoid initializing Bluetooth for --help
  const { setDebugMode } = await import("./lib/debug.js");

  // Enable debug mode if flag is set
  if (debugMode) {
    setDebugMode(true);
  }

  const React = await import("react");
  const { render } = await import("ink");
  const { App } = await import("./components/App.js");
  const { isMockMode, setBluetoothManager } = await import("./lib/bluetooth.js");

  // Initialize mock manager if in mock mode (set via EMBER_MOCK env var)
  if (isMockMode()) {
    const { getMockBluetoothManager } = await import("./lib/mock-bluetooth.js");
    const { BluetoothManager } = await import("./lib/bluetooth.js");
    setBluetoothManager(
      getMockBluetoothManager() as unknown as typeof BluetoothManager.prototype,
    );
  }

  // Render the app
  const app = render(React.createElement(App));
  await app.waitUntilExit();
  process.exit(0);
}

main().catch((error) => {
  process.stdout.write(showCursor + exitAltScreen);
  console.error("Failed to start:", error);
  process.exit(1);
});
