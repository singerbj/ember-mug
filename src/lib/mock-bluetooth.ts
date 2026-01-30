import { EventEmitter } from 'events';
import {
  MugState,
  LiquidState,
  TemperatureUnit,
  RGBColor,
  MIN_TEMP_CELSIUS,
  MAX_TEMP_CELSIUS,
  BATTERY_DRAIN_RATE_HEATING,
  BATTERY_DRAIN_RATE_MAINTAINING,
  BATTERY_CHARGE_RATE,
} from './types.js';

export interface MockBluetoothManagerEvents {
  stateChange: (state: MugState) => void;
  connected: () => void;
  disconnected: () => void;
  scanning: (isScanning: boolean) => void;
  error: (error: Error) => void;
  mugFound: (name: string) => void;
}

export interface MockConfig {
  /** Initial battery level (0-100) */
  initialBattery?: number;
  /** Initial current temperature in Celsius */
  initialCurrentTemp?: number;
  /** Initial target temperature in Celsius */
  initialTargetTemp?: number;
  /** Initial liquid state */
  initialLiquidState?: LiquidState;
  /** Whether the mug starts on the charger */
  initiallyCharging?: boolean;
  /** Simulated mug name */
  mugName?: string;
  /** Delay before "finding" the mug during scan (ms) */
  scanDelay?: number;
  /** Delay before "connecting" after finding (ms) */
  connectionDelay?: number;
  /** How fast temperature changes (degrees per second, default 0.5) */
  tempChangeRate?: number;
  /** How often to update simulation (ms) */
  updateInterval?: number;
}

const DEFAULT_CONFIG: Required<MockConfig> = {
  initialBattery: 75,
  initialCurrentTemp: 45,
  initialTargetTemp: 55,
  initialLiquidState: LiquidState.Cooling,
  initiallyCharging: false,
  mugName: 'Mock Ember Mug',
  scanDelay: 1500,
  connectionDelay: 800,
  tempChangeRate: 0.5, // degrees per second
  updateInterval: 1000,
};

export class MockBluetoothManager extends EventEmitter {
  private config: Required<MockConfig>;
  private isConnected = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = Date.now();

  private state: MugState;

  constructor(config: MockConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.state = {
      connected: false,
      batteryLevel: this.config.initialBattery,
      isCharging: this.config.initiallyCharging,
      currentTemp: this.config.initialCurrentTemp,
      targetTemp: this.config.initialTargetTemp,
      liquidState: this.config.initialLiquidState,
      temperatureUnit: TemperatureUnit.Celsius,
      color: { r: 255, g: 147, b: 41, a: 255 }, // Default ember orange
      mugName: '',
    };
  }

  async startScanning(): Promise<void> {
    this.emit('scanning', true);

    // Simulate finding a mug after a delay
    setTimeout(() => {
      this.emit('mugFound', this.config.mugName);
      this.emit('scanning', false);

      // Auto-connect after finding
      setTimeout(() => {
        this.connect();
      }, this.config.connectionDelay);
    }, this.config.scanDelay);
  }

  async stopScanning(): Promise<void> {
    this.emit('scanning', false);
  }

  private async connect(): Promise<void> {
    this.isConnected = true;
    this.state.connected = true;
    this.state.mugName = this.config.mugName;

    this.startSimulation();
    this.emit('connected');
    this.emitState();
  }

  private startSimulation(): void {
    this.lastUpdateTime = Date.now();

    this.simulationInterval = setInterval(() => {
      if (!this.isConnected) return;

      const now = Date.now();
      const deltaSeconds = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;

      this.updateSimulation(deltaSeconds);
    }, this.config.updateInterval);
  }

  private updateSimulation(deltaSeconds: number): void {
    let stateChanged = false;

    // Update temperature based on liquid state
    if (this.state.liquidState !== LiquidState.Empty) {
      const tempDiff = this.state.targetTemp - this.state.currentTemp;
      const maxChange = this.config.tempChangeRate * deltaSeconds;

      if (Math.abs(tempDiff) > 0.1) {
        // Temperature is changing
        const change = Math.sign(tempDiff) * Math.min(Math.abs(tempDiff), maxChange);
        this.state.currentTemp = Math.round((this.state.currentTemp + change) * 100) / 100;
        stateChanged = true;

        // Update liquid state based on temperature direction
        if (tempDiff > 0.5) {
          if (this.state.liquidState !== LiquidState.Heating) {
            this.state.liquidState = LiquidState.Heating;
          }
        } else if (tempDiff < -0.5) {
          if (this.state.liquidState !== LiquidState.Cooling) {
            this.state.liquidState = LiquidState.Cooling;
          }
        }
      } else {
        // Temperature is stable
        if (this.state.liquidState !== LiquidState.StableTemperature) {
          this.state.liquidState = LiquidState.StableTemperature;
          stateChanged = true;
        }
      }
    }

    // Update battery
    if (this.state.isCharging) {
      // Charging
      const chargeGain = (BATTERY_CHARGE_RATE / 60) * deltaSeconds;
      this.state.batteryLevel = Math.min(100, this.state.batteryLevel + chargeGain);
      stateChanged = true;
    } else if (this.state.liquidState === LiquidState.Heating) {
      // Draining while heating
      const drain = (BATTERY_DRAIN_RATE_HEATING / 60) * deltaSeconds;
      this.state.batteryLevel = Math.max(0, this.state.batteryLevel - drain);
      stateChanged = true;
    } else if (this.state.liquidState === LiquidState.StableTemperature) {
      // Draining while maintaining
      const drain = (BATTERY_DRAIN_RATE_MAINTAINING / 60) * deltaSeconds;
      this.state.batteryLevel = Math.max(0, this.state.batteryLevel - drain);
      stateChanged = true;
    }

    if (stateChanged) {
      this.emitState();
    }
  }

  async setTargetTemp(temp: number): Promise<void> {
    const clampedTemp = Math.max(MIN_TEMP_CELSIUS, Math.min(MAX_TEMP_CELSIUS, temp));
    this.state.targetTemp = clampedTemp;
    this.emitState();
  }

  async setTemperatureUnit(unit: TemperatureUnit): Promise<void> {
    this.state.temperatureUnit = unit;
    this.emitState();
  }

  async setLedColor(color: RGBColor): Promise<void> {
    this.state.color = { ...color };
    this.emitState();
  }

  getState(): MugState {
    return { ...this.state };
  }

  private emitState(): void {
    this.emit('stateChange', this.getState());
  }

  async disconnect(): Promise<void> {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.isConnected) {
      this.isConnected = false;
      this.state.connected = false;
      this.emit('disconnected');
      this.emitState();
    }
  }

  // Mock-specific methods for testing scenarios

  /** Simulate placing the mug on the charger */
  simulateStartCharging(): void {
    this.state.isCharging = true;
    this.emitState();
  }

  /** Simulate removing the mug from the charger */
  simulateStopCharging(): void {
    this.state.isCharging = false;
    this.emitState();
  }

  /** Simulate the mug becoming empty */
  simulateEmpty(): void {
    this.state.liquidState = LiquidState.Empty;
    this.state.currentTemp = 0;
    this.emitState();
  }

  /** Simulate filling the mug with liquid at a given temperature */
  simulateFill(temperature: number): void {
    this.state.currentTemp = temperature;
    this.state.liquidState = LiquidState.Filling;
    this.emitState();

    // Transition to appropriate state after a short delay
    setTimeout(() => {
      if (this.state.currentTemp < this.state.targetTemp) {
        this.state.liquidState = LiquidState.Heating;
      } else if (this.state.currentTemp > this.state.targetTemp) {
        this.state.liquidState = LiquidState.Cooling;
      } else {
        this.state.liquidState = LiquidState.StableTemperature;
      }
      this.emitState();
    }, 500);
  }

  /** Simulate a connection drop */
  simulateDisconnect(): void {
    this.disconnect();
  }

  /** Set battery level directly (for testing low battery scenarios) */
  simulateBatteryLevel(level: number): void {
    this.state.batteryLevel = Math.max(0, Math.min(100, level));
    this.emitState();
  }
}

// Singleton instance for mock mode
let mockInstance: MockBluetoothManager | null = null;

export function getMockBluetoothManager(config?: MockConfig): MockBluetoothManager {
  if (!mockInstance) {
    mockInstance = new MockBluetoothManager(config);
  }
  return mockInstance;
}

export function resetMockBluetoothManager(): void {
  if (mockInstance) {
    mockInstance.disconnect();
    mockInstance = null;
  }
}
