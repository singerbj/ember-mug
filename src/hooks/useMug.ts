import { useState, useEffect, useCallback } from 'react';
import { getBluetoothManager } from '../lib/bluetooth.js';
import { MugState, LiquidState, TemperatureUnit, RGBColor } from '../lib/types.js';

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
  mugName: '',
};

export function useMug(): UseMugReturn {
  const [state, setState] = useState<MugState>(initialState);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundMugName, setFoundMugName] = useState<string | null>(null);

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

    manager.on('stateChange', handleStateChange);
    manager.on('scanning', handleScanning);
    manager.on('error', handleError);
    manager.on('mugFound', handleMugFound);
    manager.on('connected', handleConnected);
    manager.on('disconnected', handleDisconnected);

    return () => {
      manager.off('stateChange', handleStateChange);
      manager.off('scanning', handleScanning);
      manager.off('error', handleError);
      manager.off('mugFound', handleMugFound);
      manager.off('connected', handleConnected);
      manager.off('disconnected', handleDisconnected);
    };
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);
    const manager = getBluetoothManager();
    try {
      await manager.startScanning();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scanning');
    }
  }, []);

  const setTargetTemp = useCallback(async (temp: number) => {
    const manager = getBluetoothManager();
    try {
      await manager.setTargetTemp(temp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set temperature');
    }
  }, []);

  const setTemperatureUnit = useCallback(async (unit: TemperatureUnit) => {
    const manager = getBluetoothManager();
    try {
      await manager.setTemperatureUnit(unit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set temperature unit');
    }
  }, []);

  const setLedColor = useCallback(async (color: RGBColor) => {
    const manager = getBluetoothManager();
    try {
      await manager.setLedColor(color);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set LED color');
    }
  }, []);

  const disconnect = useCallback(async () => {
    const manager = getBluetoothManager();
    try {
      await manager.disconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, []);

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
  };
}
