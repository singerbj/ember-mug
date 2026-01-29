import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { useMug } from '../hooks/useMug.js';
import { Header } from './Header.js';
import { TemperatureDisplay } from './TemperatureDisplay.js';
import { BatteryDisplay } from './BatteryDisplay.js';
import { TemperatureControl } from './TemperatureControl.js';
import { Presets } from './Presets.js';
import { ColorControl } from './ColorControl.js';
import { ConnectionStatus } from './ConnectionStatus.js';
import { SettingsView } from './SettingsView.js';
import { HelpDisplay } from './HelpDisplay.js';
import { TemperatureUnit, Preset, RGBColor } from '../lib/types.js';
import {
  getPresets,
  getTemperatureUnit,
  setTemperatureUnit as saveTemperatureUnit,
  setLastTargetTemp,
} from '../lib/settings.js';

type ViewMode = 'main' | 'settings' | 'color';
type ActiveControl = 'none' | 'temperature' | 'color';

export function App(): React.ReactElement {
  const { exit } = useApp();
  const {
    state: mugState,
    isScanning,
    error,
    foundMugName,
    startScanning,
    setTargetTemp,
    setTemperatureUnit: setMugTempUnit,
    setLedColor,
  } = useMug();

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [activeControl, setActiveControl] = useState<ActiveControl>('none');
  const [presets] = useState<Preset[]>(getPresets());
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(-1);
  const [localTempUnit, setLocalTempUnit] = useState<TemperatureUnit>(getTemperatureUnit());

  // Start scanning on mount
  useEffect(() => {
    startScanning();
  }, [startScanning]);

  // Sync temperature unit with mug when connected
  useEffect(() => {
    if (mugState.connected) {
      setLocalTempUnit(mugState.temperatureUnit);
    }
  }, [mugState.connected, mugState.temperatureUnit]);

  const handleTempChange = useCallback(
    async (temp: number) => {
      await setTargetTemp(temp);
      setLastTargetTemp(temp);
      setSelectedPresetIndex(-1);
    },
    [setTargetTemp]
  );

  const handlePresetSelect = useCallback(
    async (preset: Preset) => {
      await setTargetTemp(preset.temperature);
      setLastTargetTemp(preset.temperature);
      const index = presets.findIndex((p) => p.id === preset.id);
      setSelectedPresetIndex(index);
    },
    [setTargetTemp, presets]
  );

  const handleColorChange = useCallback(
    async (color: RGBColor) => {
      await setLedColor(color);
    },
    [setLedColor]
  );

  const handleTemperatureUnitChange = useCallback(
    async (unit: TemperatureUnit) => {
      setLocalTempUnit(unit);
      saveTemperatureUnit(unit);
      if (mugState.connected) {
        await setMugTempUnit(unit);
      }
    },
    [mugState.connected, setMugTempUnit]
  );

  useInput((input, key) => {
    // Global controls
    if (input === 'q' && viewMode === 'main' && activeControl === 'none') {
      exit();
      return;
    }

    // Handle escape to go back
    if (key.escape) {
      if (activeControl !== 'none') {
        setActiveControl('none');
      } else if (viewMode !== 'main') {
        setViewMode('main');
      }
      return;
    }

    // Only handle these if we're in main view with no active control
    if (viewMode === 'main' && activeControl === 'none') {
      if (input === 's' && !mugState.connected) {
        startScanning();
        return;
      }

      if (input === 'r' && !mugState.connected && error) {
        startScanning();
        return;
      }

      if (mugState.connected) {
        if (input === 't') {
          setActiveControl('temperature');
          return;
        }

        if (input === 'c') {
          setActiveControl('color');
          return;
        }

        if (input === 'o') {
          setViewMode('settings');
          return;
        }

        if (input === 'u') {
          const newUnit =
            localTempUnit === TemperatureUnit.Celsius
              ? TemperatureUnit.Fahrenheit
              : TemperatureUnit.Celsius;
          handleTemperatureUnitChange(newUnit);
          return;
        }
      }
    }

    // Exit temperature control mode
    if (activeControl === 'temperature' && (key.return || input === 't')) {
      setActiveControl('none');
      return;
    }

    // Exit color control mode
    if (activeControl === 'color' && input === 'c') {
      setActiveControl('none');
      return;
    }
  });

  // Settings view
  if (viewMode === 'settings') {
    return (
      <Box flexDirection="column">
        <Header mugName={mugState.mugName} connected={mugState.connected} />
        <SettingsView
          presets={presets}
          temperatureUnit={localTempUnit}
          onTemperatureUnitChange={handleTemperatureUnitChange}
          onClose={() => setViewMode('main')}
          isActive={true}
        />
      </Box>
    );
  }

  // Main view
  return (
    <Box flexDirection="column">
      <Header mugName={mugState.mugName} connected={mugState.connected} />

      {!mugState.connected ? (
        <ConnectionStatus
          isScanning={isScanning}
          isConnected={mugState.connected}
          foundMugName={foundMugName}
          error={error}
          onRetry={startScanning}
        />
      ) : (
        <Box flexDirection="column">
          <Box>
            <Box flexDirection="column" flexGrow={1}>
              <TemperatureDisplay
                currentTemp={mugState.currentTemp}
                targetTemp={mugState.targetTemp}
                liquidState={mugState.liquidState}
                temperatureUnit={localTempUnit}
              />
            </Box>

            <Box flexDirection="column" flexGrow={1}>
              <BatteryDisplay
                batteryLevel={mugState.batteryLevel}
                isCharging={mugState.isCharging}
                liquidState={mugState.liquidState}
              />
            </Box>
          </Box>

          <TemperatureControl
            targetTemp={mugState.targetTemp}
            temperatureUnit={localTempUnit}
            onTempChange={handleTempChange}
            isActive={activeControl === 'temperature'}
          />

          <Presets
            presets={presets}
            selectedIndex={selectedPresetIndex}
            temperatureUnit={localTempUnit}
            onSelect={handlePresetSelect}
            isActive={activeControl === 'none'}
          />

          {activeControl === 'color' && (
            <ColorControl
              color={mugState.color}
              onColorChange={handleColorChange}
              isActive={true}
            />
          )}
        </Box>
      )}

      <HelpDisplay isConnected={mugState.connected} />
    </Box>
  );
}
