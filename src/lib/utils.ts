import {
  TemperatureUnit,
  LiquidState,
  MIN_TEMP_CELSIUS,
  MAX_TEMP_CELSIUS,
  BATTERY_DRAIN_RATE_HEATING,
  BATTERY_DRAIN_RATE_MAINTAINING,
  BATTERY_CHARGE_RATE,
} from "./types.js";

export function formatTemperature(temp: number, unit: TemperatureUnit): string {
  if (unit === TemperatureUnit.Celsius) {
    return `${temp.toFixed(1)}°C`;
  }
  const fahrenheit = (temp * 9) / 5 + 32;
  return `${Math.round(fahrenheit)}°F`;
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function formatBatteryLevel(level: number): string {
  return `${Math.round(level)}%`;
}

export function getBatteryIcon(level: number, isCharging: boolean): string {
  if (isCharging) {
    return "~";
  }
  if (level >= 75) return "||||";
  if (level >= 50) return "|||.";
  if (level >= 25) return "||..";
  if (level >= 10) return "|...";
  return "....";
}

export function getLiquidStateText(state: LiquidState): string {
  switch (state) {
    case LiquidState.Empty:
      return "Empty";
    case LiquidState.Filling:
      return "Filling";
    case LiquidState.Cooling:
      return "Cooling";
    case LiquidState.Heating:
      return "Heating";
    case LiquidState.StableTemperature:
      return "Perfect Temperature";
    default:
      return "Unknown";
  }
}

export function clampTemperature(temp: number): number {
  return Math.max(MIN_TEMP_CELSIUS, Math.min(MAX_TEMP_CELSIUS, temp));
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function estimateTimeToTargetTemp(
  currentTemp: number,
  targetTemp: number,
  liquidState: LiquidState,
): number | null {
  if (liquidState === LiquidState.Empty) {
    return null;
  }

  const tempDiff = Math.abs(targetTemp - currentTemp);

  if (tempDiff < 0.5) {
    return 0; // Already at target
  }

  // Estimate based on typical Ember mug heating/cooling rates
  // Heating: approximately 1°C per minute
  // Cooling: approximately 0.5°C per minute (slower due to insulation)
  const isHeating = currentTemp < targetTemp;
  const ratePerMinute = isHeating ? 1.0 : 0.5;

  return tempDiff / ratePerMinute;
}

export function estimateBatteryLife(
  batteryLevel: number,
  isCharging: boolean,
  liquidState: LiquidState,
): number | null {
  if (isCharging) {
    // Estimate time to full charge
    const remaining = 100 - batteryLevel;
    if (remaining <= 0) return 0;
    return remaining / BATTERY_CHARGE_RATE;
  }

  if (batteryLevel <= 0) {
    return 0;
  }

  // Determine drain rate based on mug state
  let drainRate: number;
  switch (liquidState) {
    case LiquidState.Heating:
      drainRate = BATTERY_DRAIN_RATE_HEATING;
      break;
    case LiquidState.StableTemperature:
    case LiquidState.Cooling:
      drainRate = BATTERY_DRAIN_RATE_MAINTAINING;
      break;
    default:
      drainRate = 0.1; // Minimal drain when empty or idle
  }

  return batteryLevel / drainRate;
}

export function getTemperatureColor(
  currentTemp: number,
  targetTemp: number,
): string {
  const diff = currentTemp - targetTemp;

  if (Math.abs(diff) < 1) {
    return "green"; // At target
  }
  if (diff > 0) {
    return "red"; // Too hot
  }
  return "blue"; // Too cold
}

export function interpolateColor(
  value: number,
  minColor: [number, number, number],
  maxColor: [number, number, number],
): [number, number, number] {
  const clampedValue = Math.max(0, Math.min(1, value));
  return [
    Math.round(minColor[0] + (maxColor[0] - minColor[0]) * clampedValue),
    Math.round(minColor[1] + (maxColor[1] - minColor[1]) * clampedValue),
    Math.round(minColor[2] + (maxColor[2] - minColor[2]) * clampedValue),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
