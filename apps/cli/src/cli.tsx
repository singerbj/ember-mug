#!/usr/bin/env node

// Helper function for liquid state names
function getLiquidStateName(state: number): string {
  const states: Record<number, string> = {
    1: 'Empty',
    2: 'Filling',
    4: 'Cooling',
    5: 'Heating',
    6: 'Stable Temperature',
  };
  return states[state] || 'Unknown';
}

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

  let previousState: Record<string, unknown> | null = null;

  manager.on('stateChange', (state: Record<string, unknown>) => {
    // Check if any values have changed
    const hasChanges = !previousState || Object.keys(state).some(key => {
      const currentVal = state[key];
      const prevVal = previousState![key];

      // Handle nested objects (like color)
      if (typeof currentVal === 'object' && typeof prevVal === 'object' && currentVal !== null && prevVal !== null) {
        return Object.keys(currentVal as Record<string, unknown>).some(
          subKey => (currentVal as Record<string, unknown>)[subKey] !== (prevVal as Record<string, unknown>)[subKey]
        );
      }

      return currentVal !== prevVal;
    });

    if (hasChanges) {
      console.log(`[EVENT] State changed:`, JSON.stringify(state, null, 2));
      previousState = state;
    }
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

  // Keep the process running and allow interactive commands
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n--- Debug Commands ---");
  console.log("  temp <value>[C|F] - Set target temperature (50-63°C or 122-145°F)");
  console.log("                       Default unit: uses mug's current setting");
  console.log("                       Examples: temp 55C, temp 122F, temp 55");
  console.log("  color <r> <g> <b> [a]  - Set LED color (0-255)");
  console.log("  status        - Show current status");
  console.log("  readall       - Read all characteristic values");
  console.log("  quit / Ctrl+C - Exit\n");

  const handleCommand = async (line: string) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    try {
      if (cmd === 'temp' && parts[1]) {
        const temp = parseFloat(parts[1]);
        const state = manager.getState();

        // Check if user specified unit (e.g., "50C" or "122F")
        const unit = parts[1].toUpperCase().endsWith('F') ? 'F' :
                     parts[1].toUpperCase().endsWith('C') ? 'C' : null;

        let tempCelsius: number;
        let displayUnit: string;

        if (unit === 'F') {
          // User specified Fahrenheit
          tempCelsius = (temp - 32) * 5 / 9;
          displayUnit = 'F';
        } else if (unit === 'C') {
          // User specified Celsius
          tempCelsius = temp;
          displayUnit = 'C';
        } else if (state.temperatureUnit === 1) {
          // Mug is in Fahrenheit mode, assume input is F
          tempCelsius = (temp - 32) * 5 / 9;
          displayUnit = 'F';
        } else {
          // Mug is in Celsius mode
          tempCelsius = temp;
          displayUnit = 'C';
        }

        if (isNaN(tempCelsius) || tempCelsius < 50 || tempCelsius > 63) {
          console.log(`  Error: Temperature must be between 50-63°C (122-145°F)`);
          console.log(`  You entered: ${temp}°${displayUnit}, which is ${tempCelsius.toFixed(1)}°C`);
        } else {
          console.log(`  Setting temperature to ${temp}°${displayUnit} (${tempCelsius.toFixed(1)}°C)...`);
          await manager.setTargetTemp(tempCelsius);
          console.log(`  Done! Check mug for update.`);
        }
      } else if (cmd === 'readall') {
        const state = manager.getState();
        console.log("\n  Current Mug State:");
        console.log("  " + JSON.stringify(state, null, 2).split('\n').join('\n  '));
        console.log(`\n  Liquid State: ${state.liquidState} (${getLiquidStateName(state.liquidState)})`);
      } else if (cmd === 'color' && parts.length >= 4) {
        const r = parseInt(parts[1]);
        const g = parseInt(parts[2]);
        const b = parseInt(parts[3]);
        const a = parts[4] ? parseInt(parts[4]) : 255;
        if ([r, g, b, a].some(v => isNaN(v) || v < 0 || v > 255)) {
          console.log("  Error: Color values must be between 0 and 255");
        } else {
          console.log(`  Setting color to rgb(${r}, ${g}, ${b}, ${a/255})...`);
          await manager.setLedColor({ r, g, b, a });
          console.log(`  Done! Check mug for update.`);
        }
      } else if (cmd === 'status') {
        const state = manager.getState();
        console.log("\n  Current Status:");
        console.log("  " + JSON.stringify(state, null, 2).split('\n').join('\n  '));
      } else if (cmd === 'quit' || cmd === 'exit') {
        rl.close();
        manager.disconnect();
        process.exit(0);
      } else if (cmd) {
        console.log(`  Unknown command: ${cmd}`);
      }
    } catch (error: unknown) {
      console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    rl.prompt();
  };

  rl.prompt();
  rl.on('line', handleCommand);
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
