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
  -d, --debug    Enable debug mode (console output with detailed Bluetooth logs)
  -h, --help     Show this help message

Environment variables:
  EMBER_MOCK=true    Run in mock mode (simulates mug for testing)
`);
  process.exit(0);
}

// Debug mode: run without Ink UI, just console output
async function runDebugMode() {
  const { setDebugMode } = await import("./lib/debug.js");
  setDebugMode(true);

  console.log("Starting ember-mug in debug mode...\n");

  const { getBluetoothManager, isMockMode, setBluetoothManager } = await import("./lib/bluetooth.js");

  // Initialize mock manager if in mock mode
  if (isMockMode()) {
    console.log("Running in MOCK mode\n");
    const { getMockBluetoothManager } = await import("./lib/mock-bluetooth.js");
    const { BluetoothManager } = await import("./lib/bluetooth.js");
    setBluetoothManager(
      getMockBluetoothManager() as unknown as typeof BluetoothManager.prototype,
    );
  }

  const manager = getBluetoothManager();

  // Listen to all events and log them
  manager.on('scanning', (isScanning: boolean) => {
    console.log(`[EVENT] Scanning: ${isScanning}`);
  });

  manager.on('mugFound', (name: string) => {
    console.log(`[EVENT] Mug found: ${name}`);
  });

  manager.on('connected', () => {
    console.log(`[EVENT] Connected!`);
  });

  manager.on('disconnected', () => {
    console.log(`[EVENT] Disconnected`);
  });

  manager.on('error', (error: Error) => {
    console.error(`[EVENT] Error: ${error.message}`);
  });

  manager.on('stateChange', (state: Record<string, unknown>) => {
    console.log(`[EVENT] State changed:`, JSON.stringify(state, null, 2));
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    manager.disconnect();
    process.exit(0);
  });

  // Start scanning
  console.log("Starting Bluetooth scan...\n");
  try {
    await manager.startScanning();
  } catch (error) {
    console.error("Failed to start scanning:", error);
    process.exit(1);
  }

  // Keep the process running
  await new Promise(() => {});
}

// Normal mode: run with Ink UI
async function runNormalMode() {
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

  try {
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
  } catch (error) {
    process.stdout.write(showCursor + exitAltScreen);
    console.error("Failed to start:", error);
    process.exit(1);
  }
}

// Run appropriate mode
if (debugMode) {
  runDebugMode().catch((error) => {
    console.error("Failed to start:", error);
    process.exit(1);
  });
} else {
  runNormalMode();
}
