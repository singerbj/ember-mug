# Ember Mug CLI

[![npm version](https://badge.fury.io/js/ember-mug.svg)](https://www.npmjs.com/package/ember-mug)
[![CI](https://github.com/singerbj/ember-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/singerbj/ember-cli/actions/workflows/ci.yml)

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
git clone https://github.com/singerbj/ember-cli.git
cd ember-cli
npm install
npm run dev
```

## Features

- **Temperature Control**: View current temperature and adjust target temperature
- **Temperature Presets**: Quick-select from predefined temperature presets (Latte, Coffee, Tea)
- **Battery Monitoring**: Real-time battery level with estimated battery life
- **Dynamic Time Estimates**:
  - Estimated time to reach target temperature based on real-time heating/cooling rates
  - Estimated battery life based on actual discharge/charge rates
- **LED Color Control**: Customize your mug's LED color via the settings panel
- **Temperature Unit Toggle**: Switch between Celsius and Fahrenheit
- **Persistent Settings**: Your preferences and custom presets are saved between sessions
- **Responsive Layout**: Adapts to narrow or wide terminals automatically

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

### In Settings

- `↑/↓` - Navigate settings
- `Enter/Space` - Toggle unit
- `←/→` - Change LED color or edit preset temperature
- `Esc` or `q` - Close settings

## Requirements

- Node.js 18+
- Bluetooth adapter with BLE support
- Ember Mug 2 (other models may work but are untested)

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

## Technical Details

This application uses:

- [@abandonware/noble](https://github.com/abandonware/noble) for Bluetooth LE communication
- [Ink](https://github.com/vadimdemedes/ink) for the React-based CLI interface
- [Conf](https://github.com/sindresorhus/conf) for persistent settings storage

The Ember mug Bluetooth protocol was reverse-engineered by [orlopau/ember-mug](https://github.com/orlopau/ember-mug).

This project was heavily inspired by [EmberMate](https://github.com/matthewnitschke/EmberMate).

Coffee mug ASCII art by [Felix Lee](https://www.ascii-art.de/ascii/c/coffee.txt).

## Versioning

This project uses [Semantic Versioning](https://semver.org/). Releases are published to npm automatically when a new version tag is pushed to the main branch.

## License

MIT
