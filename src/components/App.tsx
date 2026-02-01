import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useMug } from "../hooks/useMug.js";
import { Header } from "./Header.js";
import { CoffeeMug } from "./CoffeeMug.js";
import { TemperatureDisplay } from "./TemperatureDisplay.js";
import { BatteryDisplay } from "./BatteryDisplay.js";
import { TemperatureControl } from "./TemperatureControl.js";
import { Presets } from "./Presets.js";
import { ConnectionStatus } from "./ConnectionStatus.js";
import { SettingsView } from "./SettingsView.js";
import { HelpDisplay } from "./HelpDisplay.js";
import { RepairInstructions } from "./RepairInstructions.js";
import { TemperatureUnit, Preset, RGBColor } from "../lib/types.js";
import {
  getPresets,
  getTemperatureUnit,
  setTemperatureUnit as saveTemperatureUnit,
  setLastTargetTemp,
  updatePreset,
} from "../lib/settings.js";
import { getThemeForState, getTerminalTheme, ThemeKey } from "../lib/theme.js";

type ViewMode = "main" | "settings" | "repair";
type ActiveControl = "none" | "temperature";

export function App(): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  // Responsive layout: stack vertically on narrow terminals, 3 columns on wide
  const isNarrowTerminal = terminalWidth < 90;

  // Coffee mug width: fixed at ~22 columns for the ASCII art
  const coffeeMugWidth = 24;

  // Calculate panel widths for 2x2 grid on the right side
  // For wide terminals: CoffeeMug | Panel Panel
  //                    CoffeeMug | Panel Panel
  // Each panel gets (remainingWidth - 2 gaps) / 2
  const remainingWidth = terminalWidth - coffeeMugWidth - 3; // -3 for gaps
  const panelWidth = isNarrowTerminal
    ? terminalWidth - 4 // Full width minus margins for stacked layout
    : Math.max(20, Math.floor((remainingWidth - 2) / 2)); // Min 20 for panel content

  const {
    state: mugState,
    isScanning,
    error,
    foundMugName,
    startScanning,
    setTargetTemp,
    setTemperatureUnit: setMugTempUnit,
    setLedColor,
    disconnect,
    tempRate,
    batteryRate,
  } = useMug();

  // Get theme based on mug state
  const themeKey = getThemeForState(mugState.liquidState, mugState.connected);
  const theme = getTerminalTheme(themeKey);

  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [activeControl, setActiveControl] = useState<ActiveControl>("none");
  const [presets, setPresets] = useState<Preset[]>(getPresets());
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(-1);
  const [localTempUnit, setLocalTempUnit] =
    useState<TemperatureUnit>(getTemperatureUnit());
  // Local state for desired temperature (user's intended target)
  const [desiredTemp, setDesiredTemp] = useState<number>(mugState.targetTemp);
  // Track if we're in the middle of setting temperature
  const [isSettingTemp, setIsSettingTemp] = useState(false);
  // Local state for desired LED color (user's intended color)
  const [desiredLedColor, setDesiredLedColor] = useState<RGBColor>(mugState.color);
  // Track if we're in the middle of setting LED color
  const [isSettingLedColor, setIsSettingLedColor] = useState(false);

  // Start scanning on mount
  useEffect(() => {
    startScanning();
  }, [startScanning]);

  // Sync temperature unit with mug when connected
  // Priority: Local settings > Mug settings
  useEffect(() => {
    if (mugState.connected && mugState.temperatureUnit !== localTempUnit) {
      setMugTempUnit(localTempUnit);
    }
  }, [
    mugState.connected,
    mugState.temperatureUnit,
    localTempUnit,
    setMugTempUnit,
  ]);

  // Auto-select preset when target temperature matches (with tolerance for floating point)
  useEffect(() => {
    const matchingIndex = presets.findIndex(
      (p) => Math.abs(p.temperature - mugState.targetTemp) < 0.1,
    );
    setSelectedPresetIndex(matchingIndex);
  }, [mugState.targetTemp, presets]);

  // Sync desired temp with mug target temp ONLY when not in the middle of setting temp
  // This prevents jumping when user is actively adjusting temperature
  useEffect(() => {
    if (!isSettingTemp) {
      setDesiredTemp(mugState.targetTemp);
    }
  }, [mugState.targetTemp, isSettingTemp]);

  // Sync desired LED color with mug LED color ONLY when not in the middle of setting color
  useEffect(() => {
    if (!isSettingLedColor) {
      setDesiredLedColor(mugState.color);
    }
  }, [mugState.color, isSettingLedColor]);

  const handleTempChange = useCallback(
    async (temp: number) => {
      await setTargetTemp(temp);
      setLastTargetTemp(temp);
    },
    [setTargetTemp],
  );

  const handleDesiredTempChange = useCallback((temp: number) => {
    setDesiredTemp(temp);
  }, []);

  const handleIsSettingTempChange = useCallback((isSetting: boolean) => {
    setIsSettingTemp(isSetting);
  }, []);

  const handleColorChange = useCallback(
    async (color: RGBColor) => {
      await setLedColor(color);
    },
    [setLedColor],
  );

  const handleDesiredLedColorChange = useCallback((color: RGBColor) => {
    setDesiredLedColor(color);
  }, []);

  const handleIsSettingLedColorChange = useCallback((isSetting: boolean) => {
    setIsSettingLedColor(isSetting);
  }, []);

  const handlePresetSelect = useCallback(
    async (preset: Preset) => {
      await setTargetTemp(preset.temperature);
      setLastTargetTemp(preset.temperature);
      const index = presets.findIndex((p) => p.id === preset.id);
      setSelectedPresetIndex(index);
    },
    [setTargetTemp, presets],
  );

  const handleTemperatureUnitChange = useCallback(
    async (unit: TemperatureUnit) => {
      setLocalTempUnit(unit);
      saveTemperatureUnit(unit);
      if (mugState.connected) {
        await setMugTempUnit(unit);
      }
    },
    [mugState.connected, setMugTempUnit],
  );

  const handlePresetUpdate = useCallback((preset: Preset) => {
    // Update local state
    setPresets((currentPresets) =>
      currentPresets.map((p) => (p.id === preset.id ? preset : p)),
    );
    // Persist to settings
    updatePreset(preset.id, preset);
  }, []);

  const handleRepair = useCallback(async () => {
    const { getBluetoothManager } = await import("../lib/bluetooth.js");
    const manager = getBluetoothManager();
    await manager.forgetAndRepair();
    setViewMode("repair");
  }, []);

  const handleRepairComplete = useCallback(async () => {
    setViewMode("main");
    await startScanning();
  }, [startScanning]);

  useInput((input, key) => {
    // Global controls
    if (input === "q" && viewMode === "main" && activeControl === "none") {
      exit();
      return;
    }

    // Handle escape to go back
    if (key.escape) {
      if (activeControl !== "none") {
        setActiveControl("none");
      } else if (viewMode !== "main") {
        setViewMode("main");
      }
      return;
    }

    // Only handle these if we're in main view with no active control
    if (viewMode === "main" && activeControl === "none") {
      if (input === "s" && !mugState.connected && !isScanning) {
        startScanning();
        return;
      }

      if (input === "r" && !mugState.connected && error) {
        startScanning();
        return;
      }

      if (mugState.connected) {
        if (input === "r") {
          handleRepair();
          return;
        }

        if (input === "o") {
          setViewMode("settings");
          return;
        }

        if (input === "u") {
          const newUnit =
            localTempUnit === TemperatureUnit.Celsius
              ? TemperatureUnit.Fahrenheit
              : TemperatureUnit.Celsius;
          handleTemperatureUnitChange(newUnit);
          return;
        }
      }
    }
  });

  // Repair view
  if (viewMode === "repair") {
    return (
      <Box flexDirection="column">
        <Header
          mugName={mugState.mugName}
          connected={false}
          theme={theme}
          ledColor={mugState.color}
        />
        <RepairInstructions
          onComplete={handleRepairComplete}
          onCancel={() => setViewMode("main")}
          theme={theme}
        />
      </Box>
    );
  }

  // Settings view
  if (viewMode === "settings") {
    return (
      <Box flexDirection="column">
        <Header
          mugName={mugState.mugName}
          connected={mugState.connected}
          theme={theme}
          ledColor={desiredLedColor}
        />
        <SettingsView
          presets={presets}
          temperatureUnit={localTempUnit}
          ledColor={mugState.color}
          desiredLedColor={desiredLedColor}
          onTemperatureUnitChange={handleTemperatureUnitChange}
          onPresetUpdate={handlePresetUpdate}
          onColorChange={handleColorChange}
          onDesiredLedColorChange={handleDesiredLedColorChange}
          onIsSettingLedColorChange={handleIsSettingLedColorChange}
          onClose={() => setViewMode("main")}
          isActive={true}
          theme={theme}
        />
      </Box>
    );
  }

  // Main view
  return (
    <Box flexDirection="column">
      <Header
        mugName={mugState.mugName}
        connected={mugState.connected}
        theme={theme}
        ledColor={desiredLedColor}
      />

      {!mugState.connected ? (
        <ConnectionStatus
          isScanning={isScanning}
          isConnected={mugState.connected}
          foundMugName={foundMugName}
          error={error}
          onRetry={startScanning}
          width={panelWidth}
          theme={theme}
        />
      ) : (
        <Box flexDirection="column">
          {isNarrowTerminal ? (
            /* Narrow terminal: coffee mug on top, stack all panels vertically */
            <>
              <Box justifyContent="center">
                <CoffeeMug theme={theme} />
              </Box>
              <Box marginTop={1}>
                <TemperatureDisplay
                  currentTemp={mugState.currentTemp}
                  targetTemp={mugState.targetTemp}
                  desiredTemp={desiredTemp}
                  liquidState={mugState.liquidState}
                  temperatureUnit={localTempUnit}
                  width={panelWidth}
                  theme={theme}
                  tempRate={tempRate}
                />
              </Box>
              <Box marginTop={1}>
                <BatteryDisplay
                  batteryLevel={mugState.batteryLevel}
                  isCharging={mugState.isCharging}
                  liquidState={mugState.liquidState}
                  width={panelWidth}
                  theme={theme}
                  batteryRate={batteryRate}
                />
              </Box>
              <Box marginTop={1}>
                <TemperatureControl
                  targetTemp={mugState.targetTemp}
                  currentTemp={mugState.currentTemp}
                  desiredTemp={desiredTemp}
                  temperatureUnit={localTempUnit}
                  onTempChange={handleTempChange}
                  onDesiredTempChange={handleDesiredTempChange}
                  onIsSettingTempChange={handleIsSettingTempChange}
                  isActive={true}
                  width={panelWidth}
                  theme={theme}
                />
              </Box>
              <Box marginTop={1}>
                <Presets
                  presets={presets}
                  selectedIndex={selectedPresetIndex}
                  temperatureUnit={localTempUnit}
                  onSelect={handlePresetSelect}
                  isActive={activeControl === "none"}
                  width={panelWidth}
                  theme={theme}
                />
              </Box>
            </>
          ) : (
            /* Wide terminal: CoffeeMug on left, 2x2 grid on right */
            <>
              {/* Top row: CoffeeMug | Temperature Display | Battery Display */}
              <Box justifyContent="center" gap={1}>
                <Box width={coffeeMugWidth} height={20}>
                  <CoffeeMug theme={theme} />
                </Box>
                <Box flexDirection="column" gap={1}>
                  <Box gap={1}>
                    <TemperatureDisplay
                      currentTemp={mugState.currentTemp}
                      targetTemp={mugState.targetTemp}
                      desiredTemp={desiredTemp}
                      liquidState={mugState.liquidState}
                      temperatureUnit={localTempUnit}
                      width={panelWidth}
                      height={9}
                      theme={theme}
                      tempRate={tempRate}
                    />
                    <BatteryDisplay
                      batteryLevel={mugState.batteryLevel}
                      isCharging={mugState.isCharging}
                      liquidState={mugState.liquidState}
                      width={panelWidth}
                      height={9}
                      theme={theme}
                      batteryRate={batteryRate}
                    />
                  </Box>

                  {/* Bottom row: Temperature Control | Presets */}
                  <Box gap={1}>
                    <TemperatureControl
                      targetTemp={mugState.targetTemp}
                      currentTemp={mugState.currentTemp}
                      desiredTemp={desiredTemp}
                      temperatureUnit={localTempUnit}
                      onTempChange={handleTempChange}
                      onDesiredTempChange={handleDesiredTempChange}
                      onIsSettingTempChange={handleIsSettingTempChange}
                      isActive={true}
                      width={panelWidth}
                      height={9}
                      theme={theme}
                    />
                    <Presets
                      presets={presets}
                      selectedIndex={selectedPresetIndex}
                      temperatureUnit={localTempUnit}
                      onSelect={handlePresetSelect}
                      isActive={activeControl === "none"}
                      width={panelWidth}
                      height={9}
                      theme={theme}
                    />
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}

      <HelpDisplay
        isConnected={mugState.connected}
        isScanning={isScanning}
        error={error}
        theme={theme}
      />
    </Box>
  );
}
