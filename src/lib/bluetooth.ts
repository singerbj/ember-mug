import noble, { Peripheral, Characteristic, Service } from '@abandonware/noble';
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
import { debug } from './debug.js';

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
    debug('Setting up Noble Bluetooth listeners');

    noble.on('stateChange', (state) => {
      debug('Bluetooth adapter state changed:', state);
      if (state === 'poweredOn') {
        debug('Bluetooth adapter is powered on and ready');
      } else {
        debug('Bluetooth adapter not ready, state:', state);
        this.emit('error', new Error(`Bluetooth state: ${state}`));
      }
    });

    noble.on('discover', async (peripheral) => {
      const name = peripheral.advertisement.localName || '';
      const uuid = peripheral.uuid || 'unknown';
      const rssi = peripheral.rssi || 'unknown';
      debug(`Discovered device: name="${name}", uuid=${uuid}, rssi=${rssi}`);

      if (name.toLowerCase().includes('ember')) {
        debug(`Found Ember mug: "${name}"`);
        this.emit('mugFound', name);
        await this.stopScanning();
        this.peripheral = peripheral;
        debug('Starting connection process...');
        await this.connectWithRetry();
      }
    });
  }

  private async connectWithRetry(maxRetries = 3): Promise<void> {
    let lastError: Error | null = null;
    debug(`Starting connection with up to ${maxRetries} retries`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        debug(`Connection attempt ${attempt}/${maxRetries}`);
        await this.connect();
        debug('Connection successful!');
        return; // Success
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        debug(`Connection attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff: 1s, 2s, 4s)
          const delay = Math.pow(2, attempt - 1) * 1000;
          debug(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    debug('All connection attempts failed');
    this.emit('error', lastError || new Error('Connection failed after multiple attempts'));
  }

  async startScanning(): Promise<void> {
    debug('startScanning() called');
    const currentState = getNobleState();
    debug('Current Bluetooth adapter state:', currentState);

    return new Promise((resolve, reject) => {
      // Scan without service UUID filter - Ember mugs don't always advertise
      // the service UUID in their advertisement packets. We filter by name instead.
      const startScan = () => {
        debug('Starting BLE scan (no service UUID filter, filtering by name)');
        this.emit('scanning', true);
        noble.startScanning([], false, (error) => {
          if (error) {
            debug('Failed to start scanning:', error.message);
            reject(error);
          } else {
            debug('BLE scan started successfully');
            resolve();
          }
        });
      };

      if (currentState === 'poweredOn') {
        debug('Bluetooth adapter ready, starting scan immediately');
        startScan();
      } else {
        debug('Bluetooth adapter not ready, waiting for state change...');
        noble.once('stateChange', (state) => {
          debug('Bluetooth state changed to:', state);
          if (state === 'poweredOn') {
            startScan();
          } else {
            debug('Bluetooth not available, cannot scan');
            reject(new Error(`Bluetooth not available: ${state}`));
          }
        });
      }
    });
  }

  async stopScanning(): Promise<void> {
    debug('Stopping BLE scan');
    this.emit('scanning', false);
    return new Promise((resolve) => {
      noble.stopScanning(() => {
        debug('BLE scan stopped');
        resolve();
      });
    });
  }

  private async connect(): Promise<void> {
    if (!this.peripheral) {
      debug('connect() called but no peripheral available');
      throw new Error('No peripheral to connect to');
    }

    const CONNECTION_TIMEOUT = 10000; // 10 seconds timeout
    const peripheralUuid = this.peripheral.uuid || 'unknown';
    const peripheralName = this.peripheral.advertisement.localName || 'unknown';
    debug(`Connecting to peripheral: name="${peripheralName}", uuid=${peripheralUuid}`);
    debug(`Connection timeout set to ${CONNECTION_TIMEOUT}ms`);

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let connected = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      timeoutId = setTimeout(() => {
        if (!connected) {
          debug(`Connection timeout reached after ${CONNECTION_TIMEOUT}ms`);
          cleanup();
          // Try to cancel the connection attempt
          try {
            debug('Attempting to disconnect peripheral after timeout');
            this.peripheral?.disconnect();
          } catch (e) {
            debug('Error during post-timeout disconnect:', e);
            // Ignore disconnect errors during timeout
          }
          reject(new Error('Connection timed out. Make sure your mug is nearby and awake.'));
        }
      }, CONNECTION_TIMEOUT);

      debug('Calling peripheral.connect()...');
      this.peripheral!.connect(async (error) => {
        if (error) {
          debug('peripheral.connect() callback received error:', error);
          cleanup();
          reject(new Error(`Failed to connect: ${error}`));
          return;
        }

        debug('peripheral.connect() callback: connection established');
        connected = true;
        cleanup();

        this.isConnected = true;
        this.state.connected = true;
        this.state.mugName = this.peripheral!.advertisement.localName || 'Ember Mug';
        debug(`Connected to mug: "${this.state.mugName}"`);

        this.peripheral!.once('disconnect', () => {
          debug('Peripheral disconnect event received');
          this.handleDisconnect();
        });

        try {
          debug('Starting service/characteristic discovery...');
          await this.discoverCharacteristics();
          debug('Setting up push notifications...');
          await this.setupNotifications();
          debug('Reading initial values from mug...');
          await this.readInitialValues();
          debug('Starting polling loop...');
          this.startPolling();
          debug('Connection setup complete');
          this.emit('connected');
          this.emitState();
          resolve();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          debug('Error during post-connection setup:', errorMsg);
          this.handleDisconnect();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    });
  }

  private async discoverCharacteristics(): Promise<void> {
    debug(`Discovering Ember service (UUID: ${EMBER_SERVICE_UUID})...`);
    // First discover the Ember service specifically
    const services = await new Promise<Service[]>((resolve, reject) => {
      this.peripheral!.discoverServices([EMBER_SERVICE_UUID], (error, services) => {
        if (error) {
          debug('Error discovering services:', error);
          reject(error);
          return;
        }
        debug(`Found ${services?.length || 0} services`);
        resolve(services || []);
      });
    });

    if (services.length === 0) {
      debug('Ember service not found on device!');
      throw new Error('Ember service not found on device');
    }

    // Then discover characteristics for that service
    const emberService = services[0];
    debug(`Discovering characteristics for Ember service...`);
    return new Promise((resolve, reject) => {
      emberService.discoverCharacteristics([], (error, characteristics) => {
        if (error) {
          debug('Error discovering characteristics:', error);
          reject(error);
          return;
        }

        debug(`Found ${characteristics?.length || 0} characteristics`);
        for (const char of characteristics || []) {
          const uuid = char.uuid.toLowerCase().replace(/-/g, '');
          debug(`  - Characteristic: ${uuid}`);
          this.characteristics.set(uuid, char);
        }
        debug('Characteristic discovery complete');
        resolve();
      });
    });
  }

  private async setupNotifications(): Promise<void> {
    debug('Setting up push event notifications...');
    const pushEventsChar = this.characteristics.get(EMBER_CHARACTERISTICS.PUSH_EVENTS);
    if (pushEventsChar) {
      return new Promise((resolve, reject) => {
        pushEventsChar.subscribe((error) => {
          if (error) {
            debug('Error subscribing to push events:', error);
            reject(error);
            return;
          }

          debug('Successfully subscribed to push events');
          pushEventsChar.on('data', (data) => {
            this.handlePushEvent(data);
          });
          resolve();
        });
      });
    } else {
      debug('Push events characteristic not found, skipping notifications');
    }
  }

  private handlePushEvent(data: Buffer): void {
    const eventType = data[0];
    debug(`Push event received: type=${eventType}`);

    switch (eventType) {
      case 1: // Battery changed
        debug('Push event: Battery changed');
        this.readBattery();
        break;
      case 2: // Started charging
        debug('Push event: Started charging');
        this.state.isCharging = true;
        this.emitState();
        break;
      case 3: // Stopped charging
        debug('Push event: Stopped charging');
        this.state.isCharging = false;
        this.emitState();
        break;
      case 4: // Target temp changed
        debug('Push event: Target temp changed');
        this.readTargetTemp();
        break;
      case 5: // Current temp changed
        debug('Push event: Current temp changed');
        this.readCurrentTemp();
        break;
      case 8: // Liquid state changed
        debug('Push event: Liquid state changed');
        this.readLiquidState();
        break;
      default:
        debug(`Push event: Unknown type ${eventType}`);
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
    debug('Handling disconnect...');
    this.isConnected = false;
    this.state.connected = false;
    if (this.pollInterval) {
      debug('Clearing polling interval');
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.characteristics.clear();
    debug('Disconnect complete, emitting disconnected event');
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
