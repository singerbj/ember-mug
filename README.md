# Ember Mug CLI

[![npm version](https://badge.fury.io/js/ember-mug.svg)](https://www.npmjs.com/package/ember-mug)
[![CI](https://github.com/singerbj/ember-mug/actions/workflows/ci.yml/badge.svg)](https://github.com/singerbj/ember-mug/actions/workflows/ci.yml)

![Screenshot](images/screenshot.png)

A TypeScript CLI application for controlling Ember mugs, built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

## Installation

### Global Installation (Recommended)

```bash
npm install -g ember-mug
```

Then run:

```bash
ember-mug
```

### Run with npx (No Installation)

```bash
npx ember-mug
```

### Local Development

```bash
git clone https://github.com/singerbj/ember-mug.git
cd ember-mug
npm install
npm run dev          # Normal development mode
npm run dev-mocked   # Mock mode for testing without hardware
npm run dev-debug    # Debug mode with Bluetooth logging
```

## Features

- **Temperature Control**: View current temperature and adjust target temperature (1°F or 0.5°C increments)
- **Temperature Presets**: Quick-select from predefined temperature presets (Latte, Coffee, Tea) - fully customizable
- **Battery Monitoring**: Real-time battery level with charging status and estimated battery life
- **Dynamic Time Estimates**:
  - Estimated time to reach target temperature based on real-time heating/cooling rates
  - Estimated battery life based on actual discharge/charge rates (heating/maintaining/charging)
- **Liquid State Detection**: Displays mug state (Empty, Filling, Heating, Cooling, Stable Temperature)
- **LED Color Control**: Customize your mug's LED color via full RGB color picker in settings
- **Temperature Unit Toggle**: Switch between Celsius and Fahrenheit (default: Fahrenheit)
- **Persistent Settings**: Your preferences (unit, LED color, custom presets, last target temperature) are saved between sessions
- **Auto-Discovery**: Automatically scans for and connects to your Ember mug
- **Dynamic Themes**: Terminal colors adapt based on mug state (heating=orange, cooling=blue, etc.)
- **Responsive Layout**: Adapts to narrow (<90 chars) or wide terminals automatically
- **Repair Guidance**: Built-in repair instructions when connection issues occur
- **Debug Mode**: Detailed Bluetooth logging for troubleshooting
- **Mock Mode**: Test the UI without hardware using `EMBER_MOCK=true`

## Controls

### When Disconnected

- `s` - Start scanning for Ember mug
- `r` - Retry scanning (after error)
- `q` - Quit

### When Connected

- `←/→` - Adjust temperature 1°F or 0.5°C
- `1-3` - Select temperature preset
- `u` - Toggle temperature unit (°C/°F)
- `o` - Open settings (LED color, unit, preset editing)
- `q` - Quit

### Debug Mode Commands (`--debug` flag)

- `temp <value>` - Set target temperature directly
- `color <hex>` - Set LED color via hex code (e.g., `color FF5500`)
- `status` - Display detailed mug status
- `readall` - Read all BLE characteristics
- `help` - Show debug commands

### In Settings

- `↑/↓` - Navigate settings
- `Enter/Space` - Toggle unit
- `←/→` - Change LED color or edit preset temperature
- `Esc` or `q` - Close settings

## Requirements

- Node.js 18+
- Bluetooth adapter with BLE support
- Ember Mug 2 (other models may work but are untested)

### Important Setup Note

**Your Ember mug must be paired with the official Ember app first.** The mug requires write permissions to be enabled through the official app before this CLI can control temperature and LED settings. Without this initial pairing, you'll be able to read temperature and battery data but not change settings.

### Platform-Specific Notes

#### Linux

You may need to grant Bluetooth permissions:

```bash
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

#### macOS

Grant Bluetooth permissions to your terminal application in System Preferences > Security & Privacy > Privacy > Bluetooth.

#### Windows

Requires Windows 10 build 15063 or later with Bluetooth 4.0+ adapter.

## Debug Mode

For troubleshooting Bluetooth connectivity issues, run with the `--debug` flag:

```bash
ember-mug --debug
```

Debug mode provides:

- Detailed Bluetooth connection logs
- BLE characteristic read/write operations
- Direct commands for testing (temp, color, status, readall)
- Error diagnostics for connection failures

## Mock Mode (Development/Testing)

To test the UI without an Ember mug, use mock mode:

```bash
EMBER_MOCK=true ember-mug
# or
npm run dev-mocked
```

Mock mode simulates:

- Temperature changes (heating/cooling dynamics)
- Battery drain and charging
- Liquid state changes
- All UI features without hardware

## Technical Details

This application uses:

- **TypeScript** - Type-safe development with ES2022 target
- **React** - UI component architecture with hooks
- **Ink** ([@inkjs](https://github.com/vadimdemedes/ink)) - React for CLIs, rendering terminal interfaces
- **@stoprocent/noble** - Bluetooth LE communication (actively maintained fork of noble)
- **Conf** ([sindresorhus/conf](https://github.com/sindresorhus/conf)) - Persistent settings storage

The Ember mug Bluetooth protocol was reverse-engineered by [orlopau/ember-mug](https://github.com/orlopau/ember-mug).

This project was heavily inspired by [EmberMate](https://github.com/matthewnitschke/EmberMate).

Coffee mug ASCII art by [Felix Lee](https://www.ascii-art.de/ascii/c/coffee.txt).

## Versioning

This project uses [Semantic Versioning](https://semver.org/). Releases are published to npm automatically when a new version tag is pushed to the main branch.

## License

MIT
