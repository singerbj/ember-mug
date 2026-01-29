import Conf from 'conf';
import {
  AppSettings,
  Preset,
  TemperatureUnit,
  DEFAULT_PRESETS,
} from './types.js';

interface SettingsSchema {
  presets: Preset[];
  temperatureUnit: TemperatureUnit;
  notifyOnTemperatureReached: boolean;
  notifyAtBatteryPercentage: number;
  lastTargetTemp: number;
  ledColor: { r: number; g: number; b: number; a: number };
}

const config = new Conf<SettingsSchema>({
  projectName: 'ember-mug-cli',
  defaults: {
    presets: DEFAULT_PRESETS,
    temperatureUnit: TemperatureUnit.Celsius,
    notifyOnTemperatureReached: true,
    notifyAtBatteryPercentage: 15,
    lastTargetTemp: 55,
    ledColor: { r: 255, g: 147, b: 41, a: 255 }, // Warm orange
  },
});

export function getSettings(): AppSettings {
  return {
    presets: config.get('presets'),
    temperatureUnit: config.get('temperatureUnit'),
    notifyOnTemperatureReached: config.get('notifyOnTemperatureReached'),
    notifyAtBatteryPercentage: config.get('notifyAtBatteryPercentage'),
  };
}

export function getPresets(): Preset[] {
  return config.get('presets');
}

export function setPresets(presets: Preset[]): void {
  config.set('presets', presets);
}

export function addPreset(preset: Preset): void {
  const presets = getPresets();
  presets.push(preset);
  setPresets(presets);
}

export function removePreset(id: string): void {
  const presets = getPresets().filter((p) => p.id !== id);
  setPresets(presets);
}

export function updatePreset(id: string, updates: Partial<Preset>): void {
  const presets = getPresets().map((p) =>
    p.id === id ? { ...p, ...updates } : p
  );
  setPresets(presets);
}

export function getTemperatureUnit(): TemperatureUnit {
  return config.get('temperatureUnit');
}

export function setTemperatureUnit(unit: TemperatureUnit): void {
  config.set('temperatureUnit', unit);
}

export function getLastTargetTemp(): number {
  return config.get('lastTargetTemp');
}

export function setLastTargetTemp(temp: number): void {
  config.set('lastTargetTemp', temp);
}

export function getLedColor(): { r: number; g: number; b: number; a: number } {
  return config.get('ledColor');
}

export function setLedColor(color: { r: number; g: number; b: number; a: number }): void {
  config.set('ledColor', color);
}

export function getNotifyOnTemperatureReached(): boolean {
  return config.get('notifyOnTemperatureReached');
}

export function setNotifyOnTemperatureReached(enabled: boolean): void {
  config.set('notifyOnTemperatureReached', enabled);
}

export function getNotifyAtBatteryPercentage(): number {
  return config.get('notifyAtBatteryPercentage');
}

export function setNotifyAtBatteryPercentage(percentage: number): void {
  config.set('notifyAtBatteryPercentage', percentage);
}

export function resetSettings(): void {
  config.clear();
}
