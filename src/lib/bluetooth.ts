import noble, { Peripheral, Characteristic } from '@abandonware/noble';
import { EventEmitter } from 'events';
import {
  MugState,
  LiquidState,
  TemperatureUnit,
  RGBColor,
  EMBER_SERVICE_UUID,
  EMBER_CHARACTERISTICS,
  MIN_TEMP_CELSIUS,
  MAX_TEMP_CELSIUS,
} from './types.js';

// Noble's state property exists but isn't properly typed
const getNobleState = (): string => (noble as unknown as { state: string }).state;

export interface BluetoothManagerEvents {
  stateChange: (state: MugState) => void;
  connected: () => void;
  disconnected: () => void;
  scanning: (isScanning: boolean) => void;
  error: (error: Error) => void;
  mugFound: (name: string) => void;
}

export class BluetoothManager extends EventEmitter {
  private peripheral: Peripheral | null = null;
  private characteristics: Map<string, Characteristic> = new Map();
  private isConnected = false;
  private pollInterval: NodeJS.Timeout | null = null;

  private state: MugState = {
    connected: false,
    batteryLevel: 0,
    isCharging: false,
    currentTemp: 0,
    targetTemp: 0,
    liquidState: LiquidState.Empty,
    temperatureUnit: TemperatureUnit.Celsius,
    color: { r: 255, g: 255, b: 255, a: 255 },
    mugName: '',
  };

  constructor() {
    super();
    this.setupNobleListeners();
  }

  private setupNobleListeners(): void {
    noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        // Ready for scanning
      } else {
        this.emit('error', new Error(`Bluetooth state: ${state}`));
      }
    });

    noble.on('discover', async (peripheral) => {
      const name = peripheral.advertisement.localName || '';
      if (name.toLowerCase().includes('ember')) {
        this.emit('mugFound', name);
        await this.stopScanning();
        this.peripheral = peripheral;
        try {
          await this.connect();
        } catch (err) {
          this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
      }
    });
  }

  async startScanning(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (getNobleState() === 'poweredOn') {
        this.emit('scanning', true);
        noble.startScanning([EMBER_SERVICE_UUID], false, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        noble.once('stateChange', (state) => {
          if (state === 'poweredOn') {
            this.emit('scanning', true);
            noble.startScanning([EMBER_SERVICE_UUID], false, (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          } else {
            reject(new Error(`Bluetooth not available: ${state}`));
          }
        });
      }
    });
  }

  async stopScanning(): Promise<void> {
    this.emit('scanning', false);
    return new Promise((resolve) => {
      noble.stopScanning(() => resolve());
    });
  }

  private async connect(): Promise<void> {
    if (!this.peripheral) {
      throw new Error('No peripheral to connect to');
    }

    return new Promise((resolve, reject) => {
      this.peripheral!.connect(async (error) => {
        if (error) {
          reject(error);
          return;
        }

        this.isConnected = true;
        this.state.connected = true;
        this.state.mugName = this.peripheral!.advertisement.localName || 'Ember Mug';

        this.peripheral!.once('disconnect', () => {
          this.handleDisconnect();
        });

        try {
          await this.discoverCharacteristics();
          await this.setupNotifications();
          await this.readInitialValues();
          this.startPolling();
          this.emit('connected');
          this.emitState();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private async discoverCharacteristics(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peripheral!.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
        if (error) {
          reject(error);
          return;
        }

        for (const char of characteristics || []) {
          const uuid = char.uuid.toLowerCase().replace(/-/g, '');
          this.characteristics.set(uuid, char);
        }
        resolve();
      });
    });
  }

  private async setupNotifications(): Promise<void> {
    const pushEventsChar = this.characteristics.get(EMBER_CHARACTERISTICS.PUSH_EVENTS);
    if (pushEventsChar) {
      return new Promise((resolve, reject) => {
        pushEventsChar.subscribe((error) => {
          if (error) {
            reject(error);
            return;
          }

          pushEventsChar.on('data', (data) => {
            this.handlePushEvent(data);
          });
          resolve();
        });
      });
    }
  }

  private handlePushEvent(data: Buffer): void {
    const eventType = data[0];

    switch (eventType) {
      case 1: // Battery changed
        this.readBattery();
        break;
      case 2: // Started charging
        this.state.isCharging = true;
        this.emitState();
        break;
      case 3: // Stopped charging
        this.state.isCharging = false;
        this.emitState();
        break;
      case 4: // Target temp changed
        this.readTargetTemp();
        break;
      case 5: // Current temp changed
        this.readCurrentTemp();
        break;
      case 8: // Liquid state changed
        this.readLiquidState();
        break;
    }
  }

  private async readInitialValues(): Promise<void> {
    await Promise.all([
      this.readCurrentTemp(),
      this.readTargetTemp(),
      this.readBattery(),
      this.readLiquidState(),
      this.readTemperatureUnit(),
      this.readLedColor(),
    ]);
  }

  private startPolling(): void {
    // Poll temperature every 2 seconds
    this.pollInterval = setInterval(async () => {
      if (this.isConnected) {
        await this.readCurrentTemp();
        await this.readLiquidState();
      }
    }, 2000);
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.state.connected = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.characteristics.clear();
    this.emit('disconnected');
    this.emitState();
  }

  private async readCharacteristic(uuid: string): Promise<Buffer | null> {
    const char = this.characteristics.get(uuid);
    if (!char) return null;

    return new Promise((resolve) => {
      char.read((error, data) => {
        if (error) {
          resolve(null);
        } else {
          resolve(data);
        }
      });
    });
  }

  private async writeCharacteristic(uuid: string, data: Buffer): Promise<void> {
    const char = this.characteristics.get(uuid);
    if (!char) return;

    return new Promise((resolve, reject) => {
      char.write(data, false, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async readCurrentTemp(): Promise<void> {
    const data = await this.readCharacteristic(EMBER_CHARACTERISTICS.CURRENT_TEMP);
    if (data && data.length >= 2) {
      const temp = data.readUInt16LE(0) * 0.01;
      this.state.currentTemp = temp;
      this.emitState();
    }
  }

  private async readTargetTemp(): Promise<void> {
    const data = await this.readCharacteristic(EMBER_CHARACTERISTICS.TARGET_TEMP);
    if (data && data.length >= 2) {
      const temp = data.readUInt16LE(0) * 0.01;
      this.state.targetTemp = temp;
      this.emitState();
    }
  }

  private async readBattery(): Promise<void> {
    const data = await this.readCharacteristic(EMBER_CHARACTERISTICS.BATTERY);
    if (data && data.length >= 2) {
      this.state.batteryLevel = data[0];
      this.state.isCharging = data[1] === 1;
      this.emitState();
    }
  }

  private async readLiquidState(): Promise<void> {
    const data = await this.readCharacteristic(EMBER_CHARACTERISTICS.LIQUID_STATE);
    if (data && data.length >= 1) {
      const state = data[0] as LiquidState;
      if (Object.values(LiquidState).includes(state)) {
        this.state.liquidState = state;
        this.emitState();
      }
    }
  }

  private async readTemperatureUnit(): Promise<void> {
    const data = await this.readCharacteristic(EMBER_CHARACTERISTICS.TEMP_UNIT);
    if (data && data.length >= 1) {
      this.state.temperatureUnit = data[0] as TemperatureUnit;
      this.emitState();
    }
  }

  private async readLedColor(): Promise<void> {
    const data = await this.readCharacteristic(EMBER_CHARACTERISTICS.LED_COLOR);
    if (data && data.length >= 4) {
      this.state.color = {
        r: data[0],
        g: data[1],
        b: data[2],
        a: data[3],
      };
      this.emitState();
    }
  }

  async setTargetTemp(temp: number): Promise<void> {
    const clampedTemp = Math.max(MIN_TEMP_CELSIUS, Math.min(MAX_TEMP_CELSIUS, temp));
    const value = Math.round(clampedTemp * 100);
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(value, 0);
    await this.writeCharacteristic(EMBER_CHARACTERISTICS.TARGET_TEMP, buffer);
    this.state.targetTemp = clampedTemp;
    this.emitState();
  }

  async setTemperatureUnit(unit: TemperatureUnit): Promise<void> {
    const buffer = Buffer.from([unit]);
    await this.writeCharacteristic(EMBER_CHARACTERISTICS.TEMP_UNIT, buffer);
    this.state.temperatureUnit = unit;
    this.emitState();
  }

  async setLedColor(color: RGBColor): Promise<void> {
    const buffer = Buffer.from([color.r, color.g, color.b, color.a]);
    await this.writeCharacteristic(EMBER_CHARACTERISTICS.LED_COLOR, buffer);
    this.state.color = color;
    this.emitState();
  }

  getState(): MugState {
    return { ...this.state };
  }

  private emitState(): void {
    this.emit('stateChange', this.getState());
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.peripheral && this.isConnected) {
      return new Promise((resolve) => {
        this.peripheral!.disconnect(() => {
          this.handleDisconnect();
          resolve();
        });
      });
    }
  }
}

// Singleton instance
let instance: BluetoothManager | null = null;

// Check if mock mode is enabled
export function isMockMode(): boolean {
  return process.env.EMBER_MOCK === 'true' || process.env.EMBER_MOCK === '1';
}

export function getBluetoothManager(): BluetoothManager {
  if (!instance) {
    instance = new BluetoothManager();
  }
  return instance;
}

// Set a custom manager (used for mock mode)
export function setBluetoothManager(manager: BluetoothManager): void {
  instance = manager;
}
