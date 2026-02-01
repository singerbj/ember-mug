import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { TemperatureUnit, Preset, RGBColor } from "../lib/types.js";
import {
  formatTemperature,
  rgbToHex,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
} from "../lib/utils.js";
import { Panel } from "./Panel.js";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

type LoadingState = "idle" | "setting" | "retrying" | "error";

const DEBOUNCE_MS = 1000;
const RETRY_TIMEOUT_MS = 5000;
const MAX_RETRIES = 1;

// Simple spinner frames
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// Helper to compare RGB colors
function colorsEqual(a: RGBColor, b: RGBColor): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

interface SettingsViewProps {
  presets: Preset[];
  temperatureUnit: TemperatureUnit;
  ledColor: RGBColor;
  desiredLedColor: RGBColor;
  onTemperatureUnitChange: (unit: TemperatureUnit) => void;
  onPresetUpdate: (preset: Preset) => void;
  onColorChange: (color: RGBColor) => void;
  onDesiredLedColorChange: (color: RGBColor) => void;
  onIsSettingLedColorChange: (isSetting: boolean) => void;
  onClose: () => void;
  isActive: boolean;
  theme: TerminalTheme;
}

const PRESET_COLORS: { name: string; color: RGBColor }[] = [
  { name: "Orange", color: { r: 255, g: 147, b: 41, a: 255 } },
  { name: "Red", color: { r: 255, g: 0, b: 0, a: 255 } },
  { name: "Green", color: { r: 0, g: 255, b: 0, a: 255 } },
  { name: "Blue", color: { r: 0, g: 128, b: 255, a: 255 } },
  { name: "Purple", color: { r: 128, g: 0, b: 255, a: 255 } },
  { name: "Pink", color: { r: 255, g: 105, b: 180, a: 255 } },
  { name: "White", color: { r: 255, g: 255, b: 255, a: 255 } },
  { name: "Teal", color: { r: 0, g: 255, b: 200, a: 255 } },
];

export function SettingsView({
  presets,
  temperatureUnit,
  ledColor,
  desiredLedColor,
  onTemperatureUnitChange,
  onPresetUpdate,
  onColorChange,
  onDesiredLedColorChange,
  onIsSettingLedColorChange,
  onClose,
  isActive,
  theme,
}: SettingsViewProps): React.ReactElement {
  // 0 = Unit Toggle, 1 = LED Color, 2...N = Presets
  const [selectedIndex, setSelectedIndex] = useState(0);

  // LED color loading state
  const [ledLoadingState, setLedLoadingState] = useState<LoadingState>("idle");
  const [ledRetryCount, setLedRetryCount] = useState(0);
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  // Debounce timer ref for LED color
  const ledDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ledTimeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForColorRef = useRef(false);

  // Animate spinner when loading
  useEffect(() => {
    if (ledLoadingState === "idle" || ledLoadingState === "error") {
      setSpinnerFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setSpinnerFrame(prev => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, [ledLoadingState]);

  // Notify parent when loading state changes
  useEffect(() => {
    const isSetting = ledLoadingState === "setting" || ledLoadingState === "retrying";
    onIsSettingLedColorChange(isSetting);
  }, [ledLoadingState, onIsSettingLedColorChange]);

  // Check if LED color has reached desired color
  useEffect(() => {
    if (waitingForColorRef.current && ledLoadingState !== "idle") {
      const colorReached = colorsEqual(ledColor, desiredLedColor);

      if (colorReached) {
        // Success! Clear all timers
        waitingForColorRef.current = false;
        setLedLoadingState("idle");
        setLedRetryCount(0);
        if (ledTimeoutTimerRef.current) {
          clearTimeout(ledTimeoutTimerRef.current);
          ledTimeoutTimerRef.current = null;
        }
      }
    }
  }, [ledColor, desiredLedColor, ledLoadingState]);

  // Function to initiate LED color change with debouncing
  const initiateLedColorChange = useCallback((newColor: RGBColor) => {
    // Clear any pending debounce timer
    if (ledDebounceTimerRef.current) {
      clearTimeout(ledDebounceTimerRef.current);
    }

    // Clear any existing timeout timer
    if (ledTimeoutTimerRef.current) {
      clearTimeout(ledTimeoutTimerRef.current);
      ledTimeoutTimerRef.current = null;
    }

    // Set desired color immediately for UI update
    onDesiredLedColorChange(newColor);

    // Set up debounce
    ledDebounceTimerRef.current = setTimeout(() => {
      // Clear debounce timer ref
      ledDebounceTimerRef.current = null;

      // Set loading state
      setLedLoadingState("setting");
      setLedRetryCount(0);
      waitingForColorRef.current = true;

      // Send the command
      onColorChange(newColor);

      // Set up timeout for retry
      ledTimeoutTimerRef.current = setTimeout(() => {
        if (waitingForColorRef.current) {
          if (ledRetryCount < MAX_RETRIES) {
            // Retry
            setLedLoadingState("retrying");
            setLedRetryCount(prev => prev + 1);
            onColorChange(newColor);

            // Set up another timeout for error
            ledTimeoutTimerRef.current = setTimeout(() => {
              if (waitingForColorRef.current) {
                // Failed after retry - show error and reset
                setLedLoadingState("error");
                waitingForColorRef.current = false;
                onDesiredLedColorChange(ledColor);

                // Clear error after 3 seconds
                setTimeout(() => {
                  setLedLoadingState("idle");
                }, 3000);
              }
              ledTimeoutTimerRef.current = null;
            }, RETRY_TIMEOUT_MS);
          } else {
            // Already retried, show error
            setLedLoadingState("error");
            waitingForColorRef.current = false;
            onDesiredLedColorChange(ledColor);

            // Clear error after 3 seconds
            setTimeout(() => {
              setLedLoadingState("idle");
            }, 3000);
          }
          ledTimeoutTimerRef.current = null;
        }
      }, RETRY_TIMEOUT_MS);
    }, DEBOUNCE_MS);
  }, [onColorChange, onDesiredLedColorChange, ledRetryCount, ledColor]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (ledDebounceTimerRef.current) {
        clearTimeout(ledDebounceTimerRef.current);
      }
      if (ledTimeoutTimerRef.current) {
        clearTimeout(ledTimeoutTimerRef.current);
      }
    };
  }, []);

  // Calculate total items: 1 (unit) + 1 (color) + presets count
  const totalItems = 2 + presets.length;

  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const panelWidth = Math.floor(terminalWidth * 0.6); // 60% of terminal width

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.escape || input === "q") {
        onClose();
        return;
      }

      if (key.upArrow || input === "k") {
        setSelectedIndex((current) => Math.max(0, current - 1));
      }

      if (key.downArrow || input === "j") {
        setSelectedIndex((current) => Math.min(totalItems - 1, current + 1));
      }

      // Toggle Unit
      if (selectedIndex === 0) {
        if (key.leftArrow || input === "h" || key.rightArrow || input === "l") {
          const newUnit =
            temperatureUnit === TemperatureUnit.Celsius
              ? TemperatureUnit.Fahrenheit
              : TemperatureUnit.Celsius;
          onTemperatureUnitChange(newUnit);
        }
      } else if (selectedIndex === 1) {
        // LED Color
        if (key.leftArrow || input === "h" || key.rightArrow || input === "l") {
          const currentColorIndex = desiredLedColor
            ? PRESET_COLORS.findIndex(
                (p) =>
                  p.color.r === desiredLedColor.r &&
                  p.color.g === desiredLedColor.g &&
                  p.color.b === desiredLedColor.b,
              )
            : -1;

          let nextIndex = currentColorIndex;
          if (key.leftArrow || input === "h") {
            nextIndex = currentColorIndex - 1;
            if (nextIndex < 0) nextIndex = PRESET_COLORS.length - 1;
          } else {
            nextIndex = currentColorIndex + 1;
            if (nextIndex >= PRESET_COLORS.length) nextIndex = 0;
          }

          initiateLedColorChange(PRESET_COLORS[nextIndex].color);
        }
      } else {
        // Edit Preset
        const presetIndex = selectedIndex - 2;
        const preset = presets[presetIndex];

        const isFahrenheit = temperatureUnit === TemperatureUnit.Fahrenheit;
        const step = isFahrenheit ? 1 : 0.5;

        // Convert current temp to display unit, round to nearest step, apply delta, convert back
        let currentDisplayTemp = isFahrenheit
          ? celsiusToFahrenheit(preset.temperature)
          : preset.temperature;

        // Round to nearest step increment
        currentDisplayTemp = Math.round(currentDisplayTemp / step) * step;

        let delta = 0;
        if (key.leftArrow || input === "h") {
          delta = -step;
        } else if (key.rightArrow || input === "l") {
          delta = step;
        }

        if (delta !== 0 && preset) {
          const newDisplayTemp = currentDisplayTemp + delta;
          const newTemp = isFahrenheit
            ? fahrenheitToCelsius(newDisplayTemp)
            : newDisplayTemp;
          onPresetUpdate({
            ...preset,
            temperature: newTemp,
          });
        }
      }
    },
    { isActive },
  );

  const currentColorPreset = desiredLedColor
    ? PRESET_COLORS.find(
        (p) =>
          p.color.r === desiredLedColor.r &&
          p.color.g === desiredLedColor.g &&
          p.color.b === desiredLedColor.b,
      )
    : undefined;
  const colorDisplayValue = currentColorPreset
    ? currentColorPreset.name
    : desiredLedColor
      ? rgbToHex(desiredLedColor.r, desiredLedColor.g, desiredLedColor.b)
      : "Unknown";

  // Get LED status text
  const getLedStatusText = () => {
    switch (ledLoadingState) {
      case "setting":
        return `${SPINNER_FRAMES[spinnerFrame]} Setting...`;
      case "retrying":
        return `${SPINNER_FRAMES[spinnerFrame]} Retrying...`;
      case "error":
        return "Failed to set color";
      default:
        return undefined;
    }
  };

  const ledStatusText = getLedStatusText();

  return (
    <Box justifyContent="center" marginY={1}>
      <Panel
        title="[=] Settings"
        titleColor={theme.primary}
        borderColor={theme.border}
        width={panelWidth}
        height={16}
      >
        <Box flexDirection="column" marginY={1}>
          <SettingRow
            label="Temperature Unit"
            value={
              temperatureUnit === TemperatureUnit.Celsius
                ? "Celsius (°C)"
                : "Fahrenheit (°F)"
            }
            isSelected={selectedIndex === 0}
            hint="Left/Right to change"
            theme={theme}
          />

          <SettingRow
            label="LED Color"
            value={colorDisplayValue}
            valueColor={
              desiredLedColor
                ? rgbToHex(desiredLedColor.r, desiredLedColor.g, desiredLedColor.b)
                : undefined
            }
            isSelected={selectedIndex === 1}
            hint="Left/Right to change"
            status={ledStatusText}
            statusColor={ledLoadingState === "error" ? "red" : theme.primary}
            theme={theme}
          />

          <Box marginTop={1} flexDirection="column">
            <Text color={theme.primary} bold>
              Presets:
            </Text>
            {presets.map((preset, index) => (
              <Box key={preset.id} marginLeft={2}>
                <Text color={theme.dimText}>
                  <Text
                    color={
                      selectedIndex === index + 2
                        ? theme.primary
                        : theme.dimText
                    }
                  >
                    {selectedIndex === index + 2 ? "> " : "  "}
                    {index + 1}.
                  </Text>{" "}
                  {preset.name}:{" "}
                  <Text
                    color={
                      selectedIndex === index + 2 ? theme.text : theme.dimText
                    }
                    bold={selectedIndex === index + 2}
                  >
                    {formatTemperature(preset.temperature, temperatureUnit)}
                  </Text>
                  {selectedIndex === index + 2 && (
                    <Text dimColor> (Left/Right to edit)</Text>
                  )}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Box marginTop={1} justifyContent="center">
          <Text color={theme.dimText}>
            <Text color={theme.primary} bold>
              [Esc]
            </Text>{" "}
            or{" "}
            <Text color={theme.primary} bold>
              [q]
            </Text>{" "}
            to close
          </Text>
        </Box>
        <Box justifyContent="center">
          <Text color={theme.dimText} dimColor>
            (Use Arrow Keys to navigate and edit)
          </Text>
        </Box>
      </Panel>
    </Box>
  );
}

interface SettingRowProps {
  label: string;
  value: string;
  valueColor?: string;
  isSelected: boolean;
  hint?: string;
  status?: string;
  statusColor?: string;
  theme: TerminalTheme;
}

function SettingRow({
  label,
  value,
  valueColor,
  isSelected,
  hint,
  status,
  statusColor,
  theme,
}: SettingRowProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={isSelected ? theme.primary : theme.text}>
          {isSelected ? "> " : "  "}
          {label}:{" "}
          <Text bold color={valueColor}>
            {value}
          </Text>
          {hint && isSelected && <Text dimColor> ({hint})</Text>}
        </Text>
      </Box>
      {status && (
        <Box marginLeft={2}>
          <Text color={statusColor}>{status}</Text>
        </Box>
      )}
    </Box>
  );
}
