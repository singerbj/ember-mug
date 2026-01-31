// Simple test script to verify Bluetooth write functionality
import { getBluetoothManager, BluetoothManager } from "./src/lib/bluetooth.js";
import { setDebugMode } from "./src/lib/debug.js";

// Enable debug mode
setDebugMode(true);

const log = (...args: unknown[]) => {
  console.log(`[${new Date().toISOString()}]`, ...args);
};

async function main() {
  log("Starting Bluetooth test...");

  const manager = getBluetoothManager();

  // Set up event listeners
  manager.on("mugFound", (name) => {
    log(`Found mug: ${name}`);
  });

  manager.on("connected", () => {
    log("Connected to mug!");
    log("Current state:", manager.getState());
  });

  manager.on("stateChange", (state) => {
    log("State changed:", {
      connected: state.connected,
      currentTemp: state.currentTemp,
      targetTemp: state.targetTemp,
      batteryLevel: state.batteryLevel,
    });
  });

  manager.on("error", (error) => {
    log("Error:", error.message);
  });

  manager.on("disconnected", () => {
    log("Disconnected from mug");
    process.exit(0);
  });

  // Start scanning
  log("Starting scan...");
  try {
    await manager.startScanning();
    log("Scan started, waiting for connection...");

    // Wait for connection (timeout after 30 seconds)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 30000);

      manager.once("connected", () => {
        clearTimeout(timeout);
        resolve();
      });

      manager.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    log("=== Testing temperature write ===");
    const state = manager.getState();
    log(`Current target temp: ${state.targetTemp}°C`);

    // Try to set a slightly different target temp
    const newTemp = state.targetTemp > 55 ? state.targetTemp - 1 : state.targetTemp + 1;
    log(`Attempting to set target temp to: ${newTemp}°C`);

    try {
      await manager.setTargetTemp(newTemp);
      log("Temperature set successfully!");
      log("New state:", manager.getState());
    } catch (err) {
      log("Temperature set failed:", (err as Error).message);
    }

    // Disconnect
    log("Disconnecting...");
    await manager.disconnect();
  } catch (err) {
    log("Error:", (err as Error).message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
