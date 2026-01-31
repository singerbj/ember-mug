#!/usr/bin/env npx tsx
/**
 * Ember Mug Bluetooth Characteristic Dumper
 *
 * This script connects to an Ember mug and dumps all discovered
 * Bluetooth characteristics and their properties.
 *
 * Usage:
 *   npx tsx scripts/dump-characteristics.ts
 *
 * The script will:
 *   1. Scan for Ember mugs
 *   2. Connect to the first mug found
 *   3. Discover all characteristics and their descriptors
 *   4. Print detailed information about each characteristic
 *
 * Note: BLE characteristics don't have built-in descriptions.
 * Information comes from:
 *   - GATT specification (standard UUIDs like Battery Level)
 *   - Vendor documentation (custom UUIDs like Ember's)
 *   - Descriptors (e.g., User Description 0x2901) - rarely used by vendors
 */

import noble, { Peripheral, Characteristic, Service } from "@abandonware/noble";
import { EMBER_SERVICE_UUID, EMBER_CHARACTERISTICS } from "../src/lib/types.js";

// Known characteristic names for identification
const KNOWN_CHARACTERISTICS: Record<string, string> = {
  "fc540001236c4c948fa9944a3e5353fa": "MUG_NAME",
  "fc540002236c4c948fa9944a3e5353fa": "CURRENT_TEMP",
  "fc540003236c4c948fa9944a3e5353fa": "TARGET_TEMP",
  "fc540004236c4c948fa9944a3e5353fa": "TEMP_UNIT",
  "fc540007236c4c948fa9944a3e5353fa": "BATTERY",
  "fc540008236c4c948fa9944a3e5353fa": "LIQUID_STATE",
  "fc54000c236c4c948fa9944a3e5353fa": "FIRMWARE",
  "fc54000d236c4c948fa9944a3e5353fa": "MUG_ID",
  "fc54000e236c4c948fa9944a3e5353fa": "DSK",
  "fc54000f236c4c948fa9944a3e5353fa": "UDSK",
  "fc540012236c4c948fa9944a3e5353fa": "PUSH_EVENTS",
  "fc540014236c4c948fa9944a3e5353fa": "LED_COLOR",
};

// ANSI color codes for pretty output
const ansiColors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function log(message: string, color: string = ansiColors.white): void {
  console.log(`${color}${message}${ansiColors.reset}`);
}

function printHeader(title: string): void {
  console.log();
  log("═".repeat(60), ansiColors.cyan);
  log(`  ${title}`, ansiColors.bright + ansiColors.cyan);
  log("═".repeat(60), ansiColors.cyan);
}

async function discoverDescriptors(char: Characteristic): Promise<
  Array<{
    uuid: string;
    name: string;
    value?: Buffer;
  }>
> {
  return new Promise((resolve) => {
    char.discoverDescriptors((err, descriptors) => {
      if (err || !descriptors) {
        resolve([]);
        return;
      }

      const results = descriptors.map((d) => ({
        uuid: d.uuid,
        name: d.name || "Unknown Descriptor",
        value: d.value,
      }));
      resolve(results);
    });
  });
}

function printCharacteristicInfo(
  char: Characteristic,
  index: number,
  descriptors: Array<{ uuid: string; name: string; value?: Buffer }> = [],
): void {
  const uuid = char.uuid.toLowerCase().replace(/-/g, "");
  const knownName = KNOWN_CHARACTERISTICS[uuid] || "UNKNOWN";

  // Properties formatting
  const properties = char.properties || [];
  const propsStr = properties
    .map((p) => {
      const propColors: Record<string, string> = {
        read: ansiColors.green,
        write: ansiColors.yellow,
        notify: ansiColors.blue,
        indicate: ansiColors.magenta,
        broadcast: ansiColors.dim,
        readSigned: ansiColors.dim,
        writeNoResponse: ansiColors.dim,
      };
      return (propColors[p] || ansiColors.white) + p;
    })
    .join(" ");

  // Format UUID with groups
  const formattedUuid = `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;

  console.log();
  log(`[${index + 1}] ${knownName}`, ansiColors.bright + ansiColors.white);
  log(`    UUID:     ${formattedUuid}`, ansiColors.dim);
  log(`    Raw UUID: ${uuid}`, ansiColors.dim);
  log(`    Name:     ${char.name || "N/A"}`, ansiColors.dim);
  log(`    Type:     ${char.type || "N/A"}`, ansiColors.dim);
  log(`    Properties: ${propsStr}`, ansiColors.reset);

  // Print descriptors if any
  if (descriptors.length > 0) {
    log(`    Descriptors (${descriptors.length}):`, ansiColors.dim);
    for (const desc of descriptors) {
      const descName = getDescriptorName(desc.uuid);
      let descInfo = `      - ${descName} (${desc.uuid})`;
      if (desc.value) {
        descInfo += ` = "${desc.value.toString("utf8").replace(/\0/g, "")}"`;
      }
      log(descInfo, ansiColors.dim);
    }
  }
}

// Standard Bluetooth GATT descriptor UUIDs
function getDescriptorName(uuid: string): string {
  const normalized = uuid.toLowerCase().replace(/-/g, "");
  const descriptorNames: Record<string, string> = {
    "2900": "Extended Properties",
    "2901": "User Description",
    "2902": "Client Configuration (CCCD)",
    "2903": "Server Configuration",
    "2904": "Presentation Format",
    "2905": "Aggregate Format",
    "2906": "Valid Range",
    "2907": "External Report Reference",
    "2908": "Report Reference",
    "290b": "Environmental Sensing Configuration",
    "290d": "Value Trigger",
  };
  return descriptorNames[normalized.slice(0, 4)] || "Unknown";
}

async function readCharacteristicValue(
  char: Characteristic,
  name: string,
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    char.read((error, data) => {
      if (error) {
        log(`    ✗ Failed to read: ${error}`, ansiColors.red);
        resolve(null);
      } else if (data) {
        resolve(data);
      } else {
        resolve(null);
      }
    });
  });
}

function formatDataValue(data: Buffer, knownName: string): string {
  // Try to interpret the data based on characteristic type
  switch (knownName) {
    case "BATTERY":
      if (data.length >= 2) {
        const level = data[0];
        const charging = data[1] === 1;
        return `${level}% ${charging ? "(charging)" : "(not charging)"}`;
      }
      break;

    case "CURRENT_TEMP":
    case "TARGET_TEMP":
      if (data.length >= 2) {
        const temp = data.readUInt16LE(0) * 0.01;
        return `${temp.toFixed(1)}°C`;
      }
      break;

    case "TEMP_UNIT":
      if (data.length >= 1) {
        return data[0] === 0 ? "Celsius" : data[0] === 1 ? "Fahrenheit" : `Unknown (${data[0]})`;
      }
      break;

    case "LIQUID_STATE":
      if (data.length >= 1) {
        const states: Record<number, string> = {
          1: "Empty",
          2: "Filling",
          4: "Cooling",
          5: "Heating",
          6: "Stable Temperature",
        };
        return states[data[0]] || `Unknown (${data[0]})`;
      }
      break;

    case "LED_COLOR":
      if (data.length >= 4) {
        return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3]})`;
      }
      break;

    case "MUG_NAME":
      try {
        return `"${data.toString("utf8").replace(/\0/g, "").trim()}"`;
      } catch {
        break;
      }
  }

  // Default: show hex and ASCII
  const hex = data.toString("hex").match(/.{2}/g)?.join(" ") || "";
  const ascii = [...data]
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
    .join("");
  return `Hex: ${hex} | ASCII: ${ascii}`;
}

async function scanAndConnect(): Promise<{
  peripheral: Peripheral;
  characteristics: Characteristic[];
}> {
  return new Promise((resolve, reject) => {
    let found = false;

    const timeout = setTimeout(() => {
      if (!found) {
        noble.stopScanning();
        reject(new Error("Scan timeout - no Ember mug found. Make sure your mug is nearby and awake."));
      }
    }, 30000); // 30 second timeout

    noble.on("discover", async (peripheral) => {
      const name = peripheral.advertisement.localName || "";
      if (name.toLowerCase().includes("ember")) {
        found = true;
        clearTimeout(timeout);
        noble.stopScanning();

        log(`Found Ember mug: "${name}"`, ansiColors.green);
        log(`UUID: ${peripheral.uuid}`, ansiColors.dim);
        log(`RSSI: ${peripheral.rssi} dBm`, ansiColors.dim);

        try {
          await connectAndDiscover(peripheral);
          const characteristics = await getAllCharacteristics(peripheral);
          resolve({ peripheral, characteristics });
        } catch (err) {
          reject(err);
        }
      }
    });

    log("Starting BLE scan for Ember mugs...", ansiColors.cyan);
    noble.startScanning([], false);
  });
}

async function connectAndDiscover(peripheral: Peripheral): Promise<void> {
  log("Connecting to mug...", ansiColors.cyan);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout - make sure the mug is awake and nearby."));
    }, 10000);

    peripheral.connect(async (error) => {
      if (error) {
        clearTimeout(timeout);
        reject(new Error(`Connection failed: ${error}`));
        return;
      }

      clearTimeout(timeout);
      log("Connected successfully!", ansiColors.green);
      resolve();
    });
  });
}

async function getAllCharacteristics(
  peripheral: Peripheral,
): Promise<Characteristic[]> {
  log("Discovering services and characteristics...", ansiColors.cyan);

  return new Promise((resolve, reject) => {
    // Discover all services (not just Ember service)
    peripheral.discoverServices([], async (error, services) => {
      if (error) {
        reject(error);
        return;
      }

      log(`Found ${services.length} service(s)`, ansiColors.dim);

      const allCharacteristics: Characteristic[] = [];

      for (const service of services) {
        const serviceUuid = service.uuid;
        log(`  Service: ${serviceUuid}`, ansiColors.dim);

        // Discover all characteristics for this service
        await new Promise<void>((resolveService, rejectService) => {
          service.discoverCharacteristics([], (err, characteristics) => {
            if (err) {
              rejectService(err);
              return;
            }

            if (characteristics) {
              for (const char of characteristics) {
                (char as any).serviceUuid = serviceUuid;
                allCharacteristics.push(char);
              }
            }
            resolveService();
          });
        });
      }

      log(`Total characteristics found: ${allCharacteristics.length}`, ansiColors.green);
      resolve(allCharacteristics);
    });
  });
}

async function tryReadValue(
  char: Characteristic,
  knownName: string,
): Promise<string | null> {
  if (!char.properties?.includes("read")) {
    return null;
  }

  try {
    const data = await readCharacteristicValue(char, knownName);
    if (data && data.length > 0) {
      return formatDataValue(data, knownName);
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

async function main(): Promise<void> {
  try {
    printHeader("Ember Mug Bluetooth Characteristic Dumper");

    // Wait for Bluetooth to be ready
    const state = (noble as unknown as { state: string }).state;
    if (state !== "poweredOn") {
      log(`Waiting for Bluetooth adapter... (current state: ${state})`, ansiColors.yellow);

      await new Promise<void>((resolve) => {
        noble.once("stateChange", (newState) => {
          if (newState === "poweredOn") {
            log("Bluetooth adapter ready!", ansiColors.green);
            resolve();
          }
        });
      });
    }

    // Scan and connect
    const { peripheral, characteristics } = await scanAndConnect();

    // Print device info
    printHeader("Device Information");
    log(`Name:     ${peripheral.advertisement.localName || "Unknown"}`, ansiColors.white);
    log(`UUID:     ${peripheral.uuid}`, ansiColors.dim);
    log(`RSSI:     ${peripheral.rssi} dBm`, ansiColors.dim);

    const txPower = peripheral.advertisement.txPowerLevel;
    if (txPower !== undefined) {
      log(`Tx Power: ${txPower} dBm`, ansiColors.dim);
    }

    // Print all characteristics
    printHeader(`Discovered Characteristics (${characteristics.length})`);

    const emberChars = characteristics.filter(
      (c) => c.uuid.toLowerCase().replace(/-/g, "") in KNOWN_CHARACTERISTICS,
    );

    // Print Ember characteristics first
    if (emberChars.length > 0) {
      log("Ember Mug Characteristics:", ansiColors.bright + ansiColors.cyan);
      for (const char of emberChars) {
        const uuid = char.uuid.toLowerCase().replace(/-/g, "");
        const knownName = KNOWN_CHARACTERISTICS[uuid];
        const descriptors = await discoverDescriptors(char);
        printCharacteristicInfo(char, characteristics.indexOf(char), descriptors);

        // Try to read the value
        const value = await tryReadValue(char, knownName);
        if (value) {
          log(`    Current Value: ${value}`, ansiColors.green);
        }
      }
    }

    // Print any other characteristics
    const otherChars = characteristics.filter(
      (c) => !(c.uuid.toLowerCase().replace(/-/g, "") in KNOWN_CHARACTERISTICS),
    );

    if (otherChars.length > 0) {
      console.log();
      log("Other Characteristics:", ansiColors.bright + ansiColors.cyan);
      for (const char of otherChars) {
        const descriptors = await discoverDescriptors(char);
        printCharacteristicInfo(char, characteristics.indexOf(char), descriptors);

        // Try to read the value
        const value = await tryReadValue(char, "UNKNOWN");
        if (value) {
          log(`    Current Value: ${value}`, ansiColors.green);
        }
      }
    }

    // Print summary
    printHeader("Summary");
    log(`Total Characteristics: ${characteristics.length}`, ansiColors.white);
    log(`Ember Characteristics: ${emberChars.length}`, ansiColors.white);
    log(`Other Characteristics: ${otherChars.length}`, ansiColors.white);

    printHeader("Done");

    // Disconnect and exit
    log("Disconnecting...", ansiColors.yellow);
    await new Promise<void>((resolve) => {
      peripheral.disconnect(() => resolve());
    });

    process.exit(0);
  } catch (err) {
    console.log();
    log(`Error: ${err}`, ansiColors.red);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  log("\nInterrupted by user", ansiColors.yellow);
  noble.stopScanning();
  process.exit(0);
});

main();
