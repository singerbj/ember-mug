import noble, { Peripheral, Characteristic, Service } from "@abandonware/noble";
import { EventEmitter } from "events";
import {
  MugState,
  LiquidState,
  TemperatureUnit,
  RGBColor,
  EMBER_SERVICE_UUID,
  EMBER_CHARACTERISTICS,
  MIN_TEMP_CELSIUS,
  MAX_TEMP_CELSIUS,
} from "./types.js";
import { debug } from "./debug.js";

// Noble's state property exists but isn't properly typed
const getNobleState = (): string =>
  (noble as unknown as { state: string }).state;

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
    mugName: "",
  };

  constructor() {
    super();
    this.setupNobleListeners();
  }

  private setupNobleListeners(): void {
    debug("Setting up Noble Bluetooth listeners");

    noble.on("stateChange", (state) => {
      debug("Bluetooth adapter state changed:", state);
      if (state === "poweredOn") {
        debug("Bluetooth adapter is powered on and ready");
      } else {
        debug("Bluetooth adapter not ready, state:", state);
        this.emit("error", new Error(`Bluetooth state: ${state}`));
      }
    });

    noble.on("discover", async (peripheral) => {
      const name = peripheral.advertisement.localName || "";
      const uuid = peripheral.uuid || "unknown";
      const rssi = peripheral.rssi || "unknown";
      debug(`Discovered device: name="${name}", uuid=${uuid}, rssi=${rssi}`);

      if (name.toLowerCase().includes("ember")) {
        debug(`Found Ember mug: "${name}"`);
        this.emit("mugFound", name);
        await this.stopScanning();
        this.peripheral = peripheral;

        // Wait for BLE adapter to settle after stopping scan
        // This delay is necessary because some BLE adapters (especially on Linux with BlueZ)
        // need time to switch from scanning mode to connection mode
        const POST_SCAN_DELAY = 500;
        debug(
          `Waiting ${POST_SCAN_DELAY}ms for BLE adapter to settle after scan...`,
        );
        await new Promise((resolve) => setTimeout(resolve, POST_SCAN_DELAY));

        debug("Starting connection process...");
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
        debug("Connection successful!");
        return; // Success
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        debug(`Connection attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff: 1s, 2s, 4s)
          const delay = Math.pow(2, attempt - 1) * 1000;
          debug(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    debug("All connection attempts failed");
    this.emit(
      "error",
      lastError || new Error("Connection failed after multiple attempts"),
    );
  }

  async startScanning(): Promise<void> {
    debug("startScanning() called");
    const currentState = getNobleState();
    debug("Current Bluetooth adapter state:", currentState);

    return new Promise((resolve, reject) => {
      // Scan without service UUID filter - Ember mugs don't always advertise
      // the service UUID in their advertisement packets. We filter by name instead.
      const startScan = () => {
        debug("Starting BLE scan (no service UUID filter, filtering by name)");
        this.emit("scanning", true);
        noble.startScanning([], false, (error) => {
          if (error) {
            debug("Failed to start scanning:", error.message);
            reject(error);
          } else {
            debug("BLE scan started successfully");
            resolve();
          }
        });
      };

      if (currentState === "poweredOn") {
        debug("Bluetooth adapter ready, starting scan immediately");
        startScan();
      } else {
        debug("Bluetooth adapter not ready, waiting for state change...");
        noble.once("stateChange", (state) => {
          debug("Bluetooth state changed to:", state);
          if (state === "poweredOn") {
            startScan();
          } else {
            debug("Bluetooth not available, cannot scan");
            reject(new Error(`Bluetooth not available: ${state}`));
          }
        });
      }
    });
  }

  async stopScanning(): Promise<void> {
    debug("Stopping BLE scan");
    this.emit("scanning", false);
    return new Promise((resolve) => {
      noble.stopScanning(() => {
        debug("BLE scan stopped");
        resolve();
      });
    });
  }

  private async connect(): Promise<void> {
    if (!this.peripheral) {
      debug("connect() called but no peripheral available");
      throw new Error("No peripheral to connect to");
    }

    const CONNECTION_TIMEOUT = 10000; // 10 seconds timeout
    const peripheralUuid = this.peripheral.uuid || "unknown";
    const peripheralName = this.peripheral.advertisement.localName || "unknown";
    debug(
      `Connecting to peripheral: name="${peripheralName}", uuid=${peripheralUuid}`,
    );
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
            debug("Attempting to disconnect peripheral after timeout");
            this.peripheral?.disconnect();
          } catch (e) {
            debug("Error during post-timeout disconnect:", e);
            // Ignore disconnect errors during timeout
          }
          reject(
            new Error(
              "Connection timed out. Make sure your mug is nearby and awake.",
            ),
          );
        }
      }, CONNECTION_TIMEOUT);

      debug("Calling peripheral.connect()...");
      this.peripheral!.connect(async (error) => {
        if (error) {
          debug("peripheral.connect() callback received error:", error);
          cleanup();
          reject(new Error(`Failed to connect: ${error}`));
          return;
        }

        debug("peripheral.connect() callback: connection established");
        connected = true;
        cleanup();

        this.isConnected = true;
        this.state.connected = true;
        this.state.mugName =
          this.peripheral!.advertisement.localName || "Ember Mug";
        debug(`Connected to mug: "${this.state.mugName}"`);

        this.peripheral!.once("disconnect", () => {
          debug("Peripheral disconnect event received");
          this.handleDisconnect();
        });

        try {
          debug("Starting service/characteristic discovery...");
          await this.discoverCharacteristics();

          // Try to trigger OS-level pairing by reading protected characteristics
          // This may show a pairing dialog on macOS
          debug("Triggering pairing by reading protected characteristics...");
          await this.triggerPairing();

          // Make the mug writable by writing a random UDSK (User Device Secret Key)
          // This is required for the mug to accept write operations
          debug("Making mug writable by setting UDSK...");
          const writable = await this.makeWritable();

          // Test if writes actually work - this is REQUIRED for the app to function
          debug("Testing write capability...");
          const writesWork = await this.testWriteCapability();
          if (!writesWork) {
            const writeError = new Error(
              "Your Ember mug does not allow write commands. Please pair your mug with the official Ember app first, then reconnect. See https://apps.apple.com/app/ember-smart-mug/id1095189177",
            );
            debug("Write test failed, rejecting connection:", writeError.message);
            this.handleDisconnect();
            reject(writeError);
            return;
          }
          debug("Write test PASSED - mug is ready for control");

          debug("Setting up push notifications...");
          await this.setupNotifications();
          debug("Reading initial values from mug...");
          await this.readInitialValues();
          debug("Starting polling loop...");
          this.startPolling();
          debug("Connection setup complete");
          this.emit("connected");
          this.emitState();
          resolve();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          debug("Error during post-connection setup:", errorMsg);
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
      this.peripheral!.discoverServices(
        [EMBER_SERVICE_UUID],
        (error, services) => {
          if (error) {
            debug("Error discovering services:", error);
            reject(error);
            return;
          }
          debug(`Found ${services?.length || 0} services`);
          resolve(services || []);
        },
      );
    });

    if (services.length === 0) {
      debug("Ember service not found on device!");
      throw new Error("Ember service not found on device");
    }

    // Then discover characteristics for that service
    const emberService = services[0];
    debug(`Discovering characteristics for Ember service...`);
    return new Promise((resolve, reject) => {
      emberService.discoverCharacteristics([], (error, characteristics) => {
        if (error) {
          debug("Error discovering characteristics:", error);
          reject(error);
          return;
        }

        debug(`Found ${characteristics?.length || 0} characteristics`);
        for (const char of characteristics || []) {
          const normalizedUuid = char.uuid.toLowerCase().replace(/-/g, "");
          const props = char.properties || [];
          debug(
            `  - Characteristic: uuid="${normalizedUuid}" properties=[${props.join(", ")}]`,
          );
          // Increase max listeners to prevent memory leak warnings during rapid operations
          char.setMaxListeners(50);
          this.characteristics.set(normalizedUuid, char);
        }
        debug("Characteristic discovery complete");
        debug(`Stored ${this.characteristics.size} characteristics in map`);
        debug(
          `Available UUIDs: ${Array.from(this.characteristics.keys()).join(", ")}`,
        );
        resolve();
      });
    });
  }

  private async setupNotifications(): Promise<void> {
    debug("Setting up push event notifications...");
    const pushEventsChar = this.characteristics.get(
      EMBER_CHARACTERISTICS.PUSH_EVENTS,
    );
    if (pushEventsChar) {
      return new Promise((resolve, reject) => {
        pushEventsChar.subscribe((error) => {
          if (error) {
            debug("Error subscribing to push events:", error);
            reject(error);
            return;
          }

          debug("Successfully subscribed to push events");
          pushEventsChar.on("data", (data) => {
            this.handlePushEvent(data);
          });
          resolve();
        });
      });
    } else {
      debug("Push events characteristic not found, skipping notifications");
    }
  }

  private handlePushEvent(data: Buffer): void {
    const eventType = data[0];
    debug(`Push event received: type=${eventType}`);

    switch (eventType) {
      case 1: // Battery changed
        debug("Push event: Battery changed");
        this.readBattery();
        break;
      case 2: // Started charging
        debug("Push event: Started charging");
        this.state.isCharging = true;
        this.emitState();
        break;
      case 3: // Stopped charging
        debug("Push event: Stopped charging");
        this.state.isCharging = false;
        this.emitState();
        break;
      case 4: // Target temp changed
        debug("Push event: Target temp changed");
        this.readTargetTemp();
        break;
      case 5: // Current temp changed
        debug("Push event: Current temp changed");
        this.readCurrentTemp();
        break;
      case 8: // Liquid state changed
        debug("Push event: Liquid state changed");
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

  private async triggerPairing(): Promise<void> {
    // Try to trigger OS-level pairing by reading characteristics that require authentication
    // On macOS, this should show a pairing dialog if the device isn't already paired

    // Read mug name first (usually doesn't require auth but good to start)
    try {
      const nameData = await this.readCharacteristic(
        EMBER_CHARACTERISTICS.MUG_NAME,
      );
      if (nameData) {
        const name = nameData.toString("utf8").replace(/\0/g, "").trim();
        if (name) {
          debug(`Read mug name: "${name}"`);
          this.state.mugName = name;
        }
      }
    } catch (err) {
      debug("Failed to read mug name:", err);
    }

    // Read DSK (Device Secret Key) - this typically requires pairing
    try {
      debug("Reading DSK to trigger pairing...");
      const dskData = await this.readCharacteristic(EMBER_CHARACTERISTICS.DSK);
      if (dskData) {
        debug(`DSK read successful, length: ${dskData.length}, data: ${dskData.toString("hex")}`);
      }
    } catch (err) {
      debug("Failed to read DSK:", err);
    }

    // Small delay to allow pairing to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  private async testWriteCapability(): Promise<boolean> {
    // Test if writes actually work by trying to write and read back the LED color
    debug("Testing write capability with LED color...");

    try {
      // Read current LED color
      const originalData = await this.readCharacteristic(EMBER_CHARACTERISTICS.LED_COLOR);
      if (!originalData || originalData.length < 4) {
        debug("Could not read LED color for write test");
        return false;
      }
      const original = { r: originalData[0], g: originalData[1], b: originalData[2], a: originalData[3] };
      debug(`Original LED color: rgba(${original.r}, ${original.g}, ${original.b}, ${original.a})`);

      // Write a slightly different color
      const testColor = {
        r: (original.r + 10) % 256,
        g: original.g,
        b: original.b,
        a: original.a,
      };
      const testBuffer = Buffer.from([testColor.r, testColor.g, testColor.b, testColor.a]);
      debug(`Writing test color: rgba(${testColor.r}, ${testColor.g}, ${testColor.b}, ${testColor.a})`);

      await this.writeCharacteristic(EMBER_CHARACTERISTICS.LED_COLOR, testBuffer);

      // Wait for mug to process
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Read back
      const verifyData = await this.readCharacteristic(EMBER_CHARACTERISTICS.LED_COLOR);
      if (!verifyData) {
        debug("Could not read LED color after write test");
        return false;
      }
      const verify = { r: verifyData[0], g: verifyData[1], b: verifyData[2], a: verifyData[3] };
      debug(`Verify LED color: rgba(${verify.r}, ${verify.g}, ${verify.b}, ${verify.a})`);

      // Restore original color
      const restoreBuffer = Buffer.from([original.r, original.g, original.b, original.a]);
      await this.writeCharacteristic(EMBER_CHARACTERISTICS.LED_COLOR, restoreBuffer);

      // Check if write worked
      if (verify.r === testColor.r) {
        debug("Write test PASSED - writes are working!");
        return true;
      } else {
        debug(`Write test FAILED - expected r=${testColor.r}, got r=${verify.r}`);
        debug("Writes are not working. The mug may need to be set up with the official Ember app.");
        return false;
      }
    } catch (err) {
      debug(`Write test failed with error: ${err}`);
      return false;
    }
  }

  private async makeWritable(): Promise<boolean> {
    // The Ember mug requires a UDSK (User Device Secret Key) to be set before
    // it will accept write operations. This is based on the python-ember-mug implementation.
    // See: https://github.com/sopelj/python-ember-mug
    //
    // IMPORTANT: According to python-ember-mug documentation:
    // "If the device has not been set up in the app since it was reset, writing is not allowed.
    //  I don't know what they set in the app, but it changes something, and it doesn't work without it."
    //
    // This means the mug must first be set up with the official Ember app for writes to work.

    try {
      // First check if UDSK is already set (device might already be writable)
      const existingUdsk = await this.readCharacteristic(
        EMBER_CHARACTERISTICS.UDSK,
      );
      if (existingUdsk) {
        const isAllZeros = existingUdsk.every((b) => b === 0);
        debug(`UDSK read: ${existingUdsk.toString("hex")} (${existingUdsk.length} bytes, allZeros: ${isAllZeros})`);
        if (!isAllZeros) {
          debug(`UDSK already set, device should be writable`);
          return true;
        }
      }

      debug("UDSK is empty, attempting to write a new one...");
      debug("NOTE: This may only work if the mug was previously set up with the official Ember app.");

      // Generate 20 random bytes (matching the read size from the mug)
      // The python-ember-mug uses base64 encoding, but let's try raw bytes first
      // since the mug returns 20 raw bytes when read
      const udskData = Buffer.alloc(20);
      for (let i = 0; i < 20; i++) {
        udskData[i] = Math.floor(Math.random() * 256);
      }
      debug(`UDSK data to write: ${udskData.toString("hex")} (${udskData.length} bytes)`);

      // Write with a shorter timeout to fail fast if writes aren't working
      const writePromise = this.writeCharacteristic(
        EMBER_CHARACTERISTICS.UDSK,
        udskData,
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("UDSK write timeout - writes may not be supported")), 3000),
      );

      await Promise.race([writePromise, timeoutPromise]);
      debug("UDSK write completed");

      // Wait a bit for the mug to process
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify the UDSK was actually written
      const verifyUdsk = await this.readCharacteristic(
        EMBER_CHARACTERISTICS.UDSK,
      );
      if (verifyUdsk) {
        const verifyIsAllZeros = verifyUdsk.every((b) => b === 0);
        debug(`UDSK verify read: ${verifyUdsk.toString("hex")} (allZeros: ${verifyIsAllZeros})`);
        if (verifyIsAllZeros) {
          debug("WARNING: UDSK was written but read back as zeros.");
          debug("This likely means the mug needs to be set up with the official Ember app first.");
          debug("Please download the Ember app from the App Store and pair your mug there.");
          return false;
        }
      }

      debug("UDSK written and verified - device should now be writable");
      return true;
    } catch (err) {
      debug("Failed to make device writable:", err);
      debug("This may be because the mug hasn't been set up with the official Ember app.");
      debug("Try setting up your mug in the Ember app first, then reconnect here.");
      // Don't throw - device might still work for reads even if writes fail
      return false;
    }
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
    debug("Handling disconnect...");
    this.isConnected = false;
    this.state.connected = false;
    if (this.pollInterval) {
      debug("Clearing polling interval");
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.characteristics.clear();
    debug("Disconnect complete, emitting disconnected event");
    this.emit("disconnected");
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
    debug(`writeCharacteristic: attempting to write to UUID: ${uuid}`);
    debug(
      `  Characteristics map keys: [${Array.from(this.characteristics.keys()).join(", ")}]`,
    );
    debug(`  Data to write: [${data.toString("hex")}] (${data.length} bytes)`);

    const char = this.characteristics.get(uuid);
    if (!char) {
      const error = `Characteristic not found for UUID: ${uuid}. Available characteristics: ${Array.from(this.characteristics.keys()).join(", ")}`;
      debug(`  ERROR: ${error}`);
      throw new Error(error);
    }

    const props = char.properties || [];
    debug(`  Characteristic properties: [${props.join(", ")}]`);

    // Determine write type based on characteristic properties
    // 'write' = write with response, 'writeWithoutResponse' = write without response
    const supportsWrite = props.includes("write");
    const supportsWriteWithoutResponse = props.includes("writeWithoutResponse");

    debug(`  Supports write: ${supportsWrite}, writeWithoutResponse: ${supportsWriteWithoutResponse}`);

    // Use write with response if supported, otherwise fall back to without response
    const useWithoutResponse = !supportsWrite && supportsWriteWithoutResponse;
    debug(`  Using write ${useWithoutResponse ? "WITHOUT" : "WITH"} response...`);

    return new Promise((resolve, reject) => {
      char.write(data, useWithoutResponse, (error) => {
        if (error) {
          debug(`  Write failed: ${error}`);
          reject(error);
        } else {
          debug(`  Write successful`);
          resolve();
        }
      });
    });
  }

  private async readCurrentTemp(): Promise<void> {
    const data = await this.readCharacteristic(
      EMBER_CHARACTERISTICS.CURRENT_TEMP,
    );
    if (data && data.length >= 2) {
      const temp = data.readUInt16LE(0) * 0.01;
      this.state.currentTemp = temp;
      this.emitState();
    }
  }

  private async readTargetTemp(): Promise<void> {
    const data = await this.readCharacteristic(
      EMBER_CHARACTERISTICS.TARGET_TEMP,
    );
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
    const data = await this.readCharacteristic(
      EMBER_CHARACTERISTICS.LIQUID_STATE,
    );
    if (data && data.length >= 1) {
      const rawValue = data[0];
      const state = rawValue as LiquidState;
      debug(
        `readLiquidState: raw=${rawValue}, state=${LiquidState[state]}, current=${this.state.currentTemp}°C, target=${this.state.targetTemp}°C`,
      );
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
    debug(`setTargetTemp called with: ${temp}°C`);
    const clampedTemp = Math.max(
      MIN_TEMP_CELSIUS,
      Math.min(MAX_TEMP_CELSIUS, temp),
    );
    const value = Math.round(clampedTemp * 100);
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(value, 0);
    debug(
      `  Clamped temp: ${clampedTemp}°C, Value: ${value}, Buffer hex: ${buffer.toString("hex")}`,
    );
    debug(`  Target UUID: ${EMBER_CHARACTERISTICS.TARGET_TEMP}`);

    await this.writeCharacteristic(EMBER_CHARACTERISTICS.TARGET_TEMP, buffer);

    // Give the mug time to process the write before re-reading
    debug(`  Waiting 200ms for mug to process write...`);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Re-read to confirm the value was actually set
    debug(`  Re-reading target temp to confirm...`);
    await this.readTargetTemp();

    // Verify the value actually changed
    if (Math.abs(this.state.targetTemp - clampedTemp) > 0.5) {
      const error = `Temperature write succeeded but value didn't change (expected ${clampedTemp}°C, got ${this.state.targetTemp}°C). This usually means either:\n` +
        `  1. The mug needs to be set up with the official Ember app first\n` +
        `  2. The mug needs to be re-paired (press 'r' to repair)\n` +
        `  3. You may need to "Forget" the mug in System Settings > Bluetooth, then reconnect`;
      debug(`  ERROR: ${error}`);
      throw new Error(error);
    }
  }

  async setTemperatureUnit(unit: TemperatureUnit): Promise<void> {
    debug(`setTemperatureUnit called with: ${unit}`);
    const buffer = Buffer.from([unit]);
    await this.writeCharacteristic(EMBER_CHARACTERISTICS.TEMP_UNIT, buffer);
    // Re-read to confirm the value was actually set
    await this.readTemperatureUnit();

    // Verify the value actually changed
    if (this.state.temperatureUnit !== unit) {
      const error = `Temperature unit write succeeded but value didn't change. This usually means the mug needs to be re-paired. Try pressing 'r' for repair.`;
      debug(`  ERROR: ${error}`);
      debug(`  Expected: ${unit}, Got: ${this.state.temperatureUnit}`);
      throw new Error(error);
    }
  }

  async setLedColor(color: RGBColor): Promise<void> {
    debug(
      `setLedColor called with: r=${color.r}, g=${color.g}, b=${color.b}, a=${color.a}`,
    );
    const buffer = Buffer.from([color.r, color.g, color.b, color.a]);
    debug(`  Buffer hex: ${buffer.toString("hex")}`);
    debug(`  LED Color UUID: ${EMBER_CHARACTERISTICS.LED_COLOR}`);
    await this.writeCharacteristic(EMBER_CHARACTERISTICS.LED_COLOR, buffer);
    // Re-read to confirm the value was actually set
    await this.readLedColor();

    // Verify the value actually changed (check RGB, ignore alpha as mug may modify it)
    if (
      this.state.color.r !== color.r ||
      this.state.color.g !== color.g ||
      this.state.color.b !== color.b
    ) {
      const error = `LED color write succeeded but value didn't change. This usually means the mug needs to be re-paired. Try pressing 'r' for repair.`;
      debug(`  ERROR: ${error}`);
      debug(
        `  Expected: rgb(${color.r}, ${color.g}, ${color.b}), Got: rgb(${this.state.color.r}, ${this.state.color.g}, ${this.state.color.b})`,
      );
      throw new Error(error);
    }
  }

  getState(): MugState {
    return { ...this.state };
  }

  private emitState(): void {
    this.emit("stateChange", this.getState());
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

  // Force repair: disconnect and clear peripheral to force re-pairing
  async forgetAndRepair(): Promise<void> {
    debug("forgetAndRepair() called - forcing re-pairing flow");

    // Stop any scanning
    try {
      await this.stopScanning();
    } catch (e) {
      debug("Error stopping scan during repair:", e);
    }

    // Disconnect if connected
    if (this.isConnected) {
      try {
        await this.disconnect();
      } catch (e) {
        debug("Error disconnecting during repair:", e);
      }
    }

    // Clear peripheral reference to force rediscovery
    this.peripheral = null;
    debug("Peripheral reference cleared - ready for re-pairing");
  }
}

// Singleton instance
let instance: BluetoothManager | null = null;

// Check if mock mode is enabled
export function isMockMode(): boolean {
  return process.env.EMBER_MOCK === "true" || process.env.EMBER_MOCK === "1";
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
