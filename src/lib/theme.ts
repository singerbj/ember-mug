import { LiquidState } from './types.js';

export interface Theme {
  primary: string;
  secondary: string;
  text: string;
  dimText: string;
  name: string;
}

export const THEMES = {
  heating: {
    primary: '#FF6B35',  // Orange
    secondary: '#FF8C5A',
    text: 'white',
    dimText: '#FFD4C4',
    name: 'Heating',
  },
  cooling: {
    primary: '#FF6B35',  // Orange (cooling down but not at temp yet)
    secondary: '#FF8C5A',
    text: 'white',
    dimText: '#FFD4C4',
    name: 'Cooling',
  },
  stable: {
    primary: '#4A90D9',  // Blue
    secondary: '#6BA3E0',
    text: 'white',
    dimText: '#B8D4F0',
    name: 'Perfect',
  },
  empty: {
    primary: '#666666',  // Grey
    secondary: '#888888',
    text: 'white',
    dimText: '#AAAAAA',
    name: 'Empty',
  },
  filling: {
    primary: '#4A90D9',  // Blue
    secondary: '#6BA3E0',
    text: 'white',
    dimText: '#B8D4F0',
    name: 'Filling',
  },
  disconnected: {
    primary: '#444444',
    secondary: '#666666',
    text: 'white',
    dimText: '#999999',
    name: 'Disconnected',
  },
} as const;

// Terminal color mappings (closest ANSI colors)
export const TERMINAL_COLORS = {
  heating: {
    primary: 'yellow',      // Closest to orange in terminal
    secondary: 'yellowBright',
    border: 'yellow',
    text: 'white',
    dimText: 'gray',
  },
  cooling: {
    primary: 'yellow',
    secondary: 'yellowBright',
    border: 'yellow',
    text: 'white',
    dimText: 'gray',
  },
  stable: {
    primary: 'cyan',
    secondary: 'cyanBright',
    border: 'cyan',
    text: 'white',
    dimText: 'gray',
  },
  empty: {
    primary: 'gray',
    secondary: 'white',
    border: 'gray',
    text: 'white',
    dimText: 'gray',
  },
  filling: {
    primary: 'cyan',
    secondary: 'cyanBright',
    border: 'cyan',
    text: 'white',
    dimText: 'gray',
  },
  disconnected: {
    primary: 'gray',
    secondary: 'white',
    border: 'gray',
    text: 'white',
    dimText: 'gray',
  },
} as const;

export type ThemeKey = keyof typeof TERMINAL_COLORS;

export function getThemeForState(liquidState: LiquidState, connected: boolean): ThemeKey {
  if (!connected) {
    return 'disconnected';
  }

  switch (liquidState) {
    case LiquidState.Empty:
      return 'empty';
    case LiquidState.Filling:
      return 'filling';
    case LiquidState.Heating:
      return 'heating';
    case LiquidState.Cooling:
      return 'cooling';
    case LiquidState.StableTemperature:
      return 'stable';
    default:
      return 'empty';
  }
}

export function getTerminalTheme(themeKey: ThemeKey) {
  return TERMINAL_COLORS[themeKey];
}
