import { useState, useEffect, useCallback } from "react";
import { getBluetoothManager } from "../lib/bluetooth.js";
import {
  MugState,
  LiquidState,
  TemperatureUnit,
  RGBColor,
} from "../lib/types.js";
import { calculateRate } from "../lib/utils.js";
interface UseMugReturn {
  state: MugState;
  isScanning: boolean;
  error: string | null;
  foundMugName: string | null;
  startScanning: () => Promise<void>;
  setTargetTemp: (temp: number) => Promise<void>;
  setTemperatureUnit: (unit: TemperatureUnit) => Promise<void>;
  setLedColor: (color: RGBColor) => Promise<void>;
  disconnect: () => Promise<void>;
  tempRate: number;
  batteryRate: number;
}

const initialState: MugState = {
  connected: false,
  batteryLevel: 0,
  isCharging: false,
  currentTemp: 0,
  targetTemp: 55,
  liquidState: LiquidState.Empty,
  temperatureUnit: TemperatureUnit.Celsius,
  color: { r: 255, g: 147, b: 41, a: 255 },
  mugName: "",
};

export function useMug(): UseMugReturn {
  const [state, setState] = useState<MugState>(initialState);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foundMugName, setFoundMugName] = useState<string | null>(null);
  const [tempHistory, setTempHistory] = useState<
    { value: number; time: number }[]
  >([]);
  const [batteryHistory, setBatteryHistory] = useState<
    { value: number; time: number }[]
  >([]);

  // Smoothed rate values using exponential moving average
  const [smoothedTempRate, setSmoothedTempRate] = useState<number>(0);
  const [smoothedBatteryRate, setSmoothedBatteryRate] = useState<number>(0);

  // Smoothing factor: lower = more smoothing, higher = more responsive
  const SMOOTHING_ALPHA = 0.25;

  // Update temp history
  useEffect(() => {
    if (state.connected && state.liquidState !== LiquidState.Empty) {
      const now = Date.now();
      setTempHistory((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.value === state.currentTemp &&
          now - last.time < 10000
        ) {
          return prev;
        }
        const next = [...prev, { value: state.currentTemp, time: now }];
        return next.filter((item) => now - item.time < 5 * 60 * 1000);
      });
    } else if (!state.connected || state.liquidState === LiquidState.Empty) {
      if (tempHistory.length > 0) {
        setTempHistory([]);
        setSmoothedTempRate(0);
      }
    }
  }, [state.currentTemp, state.connected, state.liquidState]);

  // Update battery history
  useEffect(() => {
    if (state.connected) {
      const now = Date.now();
      setBatteryHistory((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.value === state.batteryLevel &&
          now - last.time < 30000
        ) {
          return prev;
        }
        const next = [...prev, { value: state.batteryLevel, time: now }];
        return next.filter((item) => now - item.time < 10 * 60 * 1000);
      });
    } else if (!state.connected) {
      if (batteryHistory.length > 0) {
        setBatteryHistory([]);
        setSmoothedBatteryRate(0);
      }
    }
  }, [state.batteryLevel, state.connected]);

  // Update smoothed rates using exponential moving average
  useEffect(() => {
    const rawTempRate = calculateRate(tempHistory);
    setSmoothedTempRate((prev) => {
      // Initialize with first value, then apply EMA
      if (prev === 0 && rawTempRate !== 0) return rawTempRate;
      return SMOOTHING_ALPHA * rawTempRate + (1 - SMOOTHING_ALPHA) * prev;
    });
  }, [tempHistory]);

  useEffect(() => {
    const rawBatteryRate = calculateRate(batteryHistory, 5 * 60 * 1000);
    setSmoothedBatteryRate((prev) => {
      // Initialize with first value, then apply EMA
      if (prev === 0 && rawBatteryRate !== 0) return rawBatteryRate;
      return SMOOTHING_ALPHA * rawBatteryRate + (1 - SMOOTHING_ALPHA) * prev;
    });
  }, [batteryHistory]);

  useEffect(() => {
    const manager = getBluetoothManager();

    const handleStateChange = (newState: MugState) => {
      setState(newState);
    };

    const handleScanning = (scanning: boolean) => {
      setIsScanning(scanning);
    };

    const handleError = (err: Error) => {
      setError(err.message);
    };

    const handleMugFound = (name: string) => {
      setFoundMugName(name);
    };

    const handleConnected = () => {
      setError(null);
    };

    const handleDisconnected = () => {
      setFoundMugName(null);
    };

    manager.on("stateChange", handleStateChange);
    manager.on("scanning", handleScanning);
    manager.on("error", handleError);
    manager.on("mugFound", handleMugFound);
    manager.on("connected", handleConnected);
    manager.on("disconnected", handleDisconnected);

    return () => {
      manager.off("stateChange", handleStateChange);
      manager.off("scanning", handleScanning);
      manager.off("error", handleError);
      manager.off("mugFound", handleMugFound);
      manager.off("connected", handleConnected);
      manager.off("disconnected", handleDisconnected);
    };
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);
    const manager = getBluetoothManager();
    try {
      await manager.startScanning();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scanning");
    }
  }, []);

  const setTargetTemp = useCallback(async (temp: number) => {
    const manager = getBluetoothManager();
    try {
      await manager.setTargetTemp(temp);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set temperature",
      );
    }
  }, []);

  const setTemperatureUnit = useCallback(async (unit: TemperatureUnit) => {
    const manager = getBluetoothManager();
    try {
      await manager.setTemperatureUnit(unit);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set temperature unit",
      );
    }
  }, []);

  const setLedColor = useCallback(async (color: RGBColor) => {
    const manager = getBluetoothManager();
    try {
      await manager.setLedColor(color);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set LED color");
    }
  }, []);

  const disconnect = useCallback(async () => {
    const manager = getBluetoothManager();
    try {
      await manager.disconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  }, []);

  const tempRate = smoothedTempRate;
  const batteryRate = smoothedBatteryRate;

  return {
    state,
    isScanning,
    error,
    foundMugName,
    startScanning,
    setTargetTemp,
    setTemperatureUnit,
    setLedColor,
    disconnect,
    tempRate,
    batteryRate,
  };
}
