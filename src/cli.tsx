#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./components/App.js";
import { isMockMode, setBluetoothManager } from "./lib/bluetooth.js";
import type { BluetoothManager } from "./lib/bluetooth.js";

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
  // Initialize mock manager if in mock mode (set via EMBER_MOCK env var)
  if (isMockMode()) {
    const { getMockBluetoothManager } = await import("./lib/mock-bluetooth.js");
    setBluetoothManager(
      getMockBluetoothManager() as unknown as BluetoothManager,
    );
  }

  // Render the app
  const app = render(<App />);
  await app.waitUntilExit();
  process.exit(0);
}

main().catch((error) => {
  process.stdout.write(showCursor + exitAltScreen);
  console.error("Failed to start:", error);
  process.exit(1);
});
