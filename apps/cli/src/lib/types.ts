export enum LiquidState {
  Empty = 1,
  Filling = 2,
  Cooling = 4,
  Heating = 5,
  StableTemperature = 6,
}

export enum TemperatureUnit {
  Celsius = 0,
  Fahrenheit = 1,
}

export interface MugState {
  connected: boolean;
  batteryLevel: number;
  isCharging: boolean;
  currentTemp: number;
  targetTemp: number;
  liquidState: LiquidState;
  temperatureUnit: TemperatureUnit;
  color: RGBColor;
  mugName: string;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Preset {
  id: string;
  name: string;
  temperature: number;
}

export interface AppSettings {
  presets: Preset[];
  temperatureUnit: TemperatureUnit;
  notifyOnTemperatureReached: boolean;
  notifyAtBatteryPercentage: number;
}

export const DEFAULT_PRESETS: Preset[] = [
  { id: "1", name: "Latte", temperature: 52.0 },
  { id: "2", name: "Coffee", temperature: 55.56 },
  { id: "3", name: "Tea", temperature: 60.0 },
];

export const EMBER_SERVICE_UUID = "fc543622236c4c948fa9944a3e5353fa";

export const EMBER_CHARACTERISTICS = {
  MUG_NAME: "fc540001236c4c948fa9944a3e5353fa",
  CURRENT_TEMP: "fc540002236c4c948fa9944a3e5353fa",
  TARGET_TEMP: "fc540003236c4c948fa9944a3e5353fa",
  TEMP_UNIT: "fc540004236c4c948fa9944a3e5353fa",
  BATTERY: "fc540007236c4c948fa9944a3e5353fa",
  LIQUID_STATE: "fc540008236c4c948fa9944a3e5353fa",
  FIRMWARE: "fc54000c236c4c948fa9944a3e5353fa",
  MUG_ID: "fc54000d236c4c948fa9944a3e5353fa",
  DSK: "fc54000e236c4c948fa9944a3e5353fa",
  UDSK: "fc54000f236c4c948fa9944a3e5353fa",
  PUSH_EVENTS: "fc540012236c4c948fa9944a3e5353fa",
  LED_COLOR: "fc540014236c4c948fa9944a3e5353fa",
} as const;

export const MIN_TEMP_CELSIUS = 50;
export const MAX_TEMP_CELSIUS = 63;

export const BATTERY_DRAIN_RATE_HEATING = 0.5; // % per minute when heating
export const BATTERY_DRAIN_RATE_MAINTAINING = 0.2; // % per minute when maintaining
export const BATTERY_CHARGE_RATE = 1.5; // % per minute when charging
