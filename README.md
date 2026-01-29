# Ember Mug CLI

A TypeScript CLI application for controlling Ember mugs, built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

## Features

- **Temperature Control**: View current temperature and adjust target temperature
- **Temperature Presets**: Quick-select from predefined temperature presets (Latte, Coffee, Tea)
- **Battery Monitoring**: Real-time battery level with estimated battery life
- **Time Estimates**:
  - Estimated time to reach target temperature
  - Estimated battery life based on current mug state
- **LED Color Control**: Customize your mug's LED color with presets or custom RGB values
- **Temperature Unit Toggle**: Switch between Celsius and Fahrenheit
- **Persistent Settings**: Your preferences are saved between sessions

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm start
# or after build:
node dist/cli.js
# or for development:
npm run dev
```

## Controls

### When Disconnected
- `s` - Start scanning for Ember mug
- `r` - Retry scanning (after error)
- `q` - Quit

### When Connected
- `t` - Enter temperature adjustment mode
  - `←/→` or `h/l` - Adjust by ±0.5°
  - `↑/↓` or `j/k` - Adjust by ±1°
  - `t` or `Enter` - Exit temperature mode
- `1-3` - Select temperature preset
- `c` - Toggle LED color control
  - `1-8` - Select preset color
  - `c` - Toggle custom color mode
  - `r/g/b` - Select color channel (in custom mode)
  - `←/→` - Adjust selected channel
- `u` - Toggle temperature unit (°C/°F)
- `o` - Open settings
- `q` - Quit

## Requirements

- Node.js 18+
- Bluetooth adapter with BLE support
- Ember Mug 2 (other models may work but are untested)

## Technical Details

This application uses:
- [@abandonware/noble](https://github.com/abandonware/noble) for Bluetooth LE communication
- [Ink](https://github.com/vadimdemedes/ink) for the React-based CLI interface
- [Conf](https://github.com/sindresorhus/conf) for persistent settings storage

The Ember mug Bluetooth protocol was reverse-engineered by [orlopau/ember-mug](https://github.com/orlopau/ember-mug).

## License

MIT
