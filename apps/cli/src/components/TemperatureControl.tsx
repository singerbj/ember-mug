import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import {
  TemperatureUnit,
  MIN_TEMP_CELSIUS,
  MAX_TEMP_CELSIUS,
} from "../lib/types.js";
import {
  formatTemperature,
  clampTemperature,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
} from "../lib/utils.js";
import { Panel } from "./Panel.js";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface TemperatureControlProps {
  targetTemp: number;
  currentTemp: number;
  desiredTemp: number;
  temperatureUnit: TemperatureUnit;
  onTempChange: (temp: number) => void;
  onDesiredTempChange: (temp: number) => void;
  onIsSettingTempChange: (isSetting: boolean) => void;
  isActive: boolean;
  width?: number;
  height?: number;
  theme: TerminalTheme;
}

type LoadingState = "idle" | "setting" | "retrying" | "error";

const DEBOUNCE_MS = 1000;
const RETRY_TIMEOUT_MS = 5000;
const MAX_RETRIES = 1;

// Simple spinner frames
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function TemperatureControl({
  targetTemp,
  currentTemp,
  desiredTemp: desiredTempProp,
  temperatureUnit,
  onTempChange,
  onDesiredTempChange,
  onIsSettingTempChange,
  isActive,
  width,
  height,
  theme,
}: TemperatureControlProps): React.ReactElement {
  // Local state for loading and retry tracking
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [retryCount, setRetryCount] = useState(0);

  // Notify parent when loading state changes (to prevent syncing during active setting)
  useEffect(() => {
    const isSetting = loadingState === "setting" || loadingState === "retrying";
    onIsSettingTempChange(isSetting);
  }, [loadingState, onIsSettingTempChange]);

  // Spinner animation state
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  // Animate spinner when loading
  useEffect(() => {
    if (loadingState === "idle" || loadingState === "error") {
      setSpinnerFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setSpinnerFrame(prev => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, [loadingState]);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Timeout timer ref for retry/error
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we're waiting for temp to be set
  const waitingForTempRef = useRef(false);

  // Check if target temp has reached desired temp
  useEffect(() => {
    if (waitingForTempRef.current && loadingState !== "idle") {
      const tempReached = Math.abs(targetTemp - desiredTempProp) < 0.1;

      if (tempReached) {
        // Success! Clear all timers
        waitingForTempRef.current = false;
        setLoadingState("idle");
        setRetryCount(0);
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }
      }
    }
  }, [targetTemp, desiredTempProp, loadingState]);

  // Function to initiate temperature change with debouncing
  const initiateTempChange = useCallback((newTemp: number) => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear any existing timeout timer
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    // Set desired temp immediately for UI update
    const clampedTemp = clampTemperature(newTemp);
    onDesiredTempChange(clampedTemp);

    // Set up debounce
    debounceTimerRef.current = setTimeout(() => {
      // Clear debounce timer ref
      debounceTimerRef.current = null;

      // Set loading state
      setLoadingState("setting");
      setRetryCount(0);
      waitingForTempRef.current = true;

      // Send the command
      onTempChange(clampedTemp);

      // Set up timeout for retry
      timeoutTimerRef.current = setTimeout(() => {
        if (waitingForTempRef.current) {
          if (retryCount < MAX_RETRIES) {
            // Retry
            setLoadingState("retrying");
            setRetryCount(prev => prev + 1);
            onTempChange(clampedTemp);

            // Set up another timeout for error
            timeoutTimerRef.current = setTimeout(() => {
              if (waitingForTempRef.current) {
                // Failed after retry - show error and reset
                setLoadingState("error");
                waitingForTempRef.current = false;
                onDesiredTempChange(targetTemp);

                // Clear error after 3 seconds
                setTimeout(() => {
                  setLoadingState("idle");
                }, 3000);
              }
              timeoutTimerRef.current = null;
            }, RETRY_TIMEOUT_MS);
          } else {
            // Already retried, show error
            setLoadingState("error");
            waitingForTempRef.current = false;
            onDesiredTempChange(targetTemp);

            // Clear error after 3 seconds
            setTimeout(() => {
              setLoadingState("idle");
            }, 3000);
          }
          timeoutTimerRef.current = null;
        }
      }, RETRY_TIMEOUT_MS);
    }, DEBOUNCE_MS);
  }, [onTempChange, onDesiredTempChange, retryCount, targetTemp]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
    };
  }, []);

  useInput(
    (input, key) => {
      if (!isActive) return;

      const isFahrenheit = temperatureUnit === TemperatureUnit.Fahrenheit;
      const step = isFahrenheit ? 1 : 0.5;

      // Use desired temp for calculations
      let currentDisplayTemp = isFahrenheit
        ? celsiusToFahrenheit(desiredTempProp)
        : desiredTempProp;

      // Round to nearest step increment
      currentDisplayTemp = Math.round(currentDisplayTemp / step) * step;

      let delta = 0;
      if (key.leftArrow) {
        delta = -step;
      } else if (key.rightArrow) {
        delta = step;
      }

      if (delta !== 0) {
        const newDisplayTemp = currentDisplayTemp + delta;
        const newTemp = isFahrenheit
          ? fahrenheitToCelsius(newDisplayTemp)
          : newDisplayTemp;
        initiateTempChange(newTemp);
      }
    },
    { isActive },
  );

  const minTempDisplay = formatTemperature(MIN_TEMP_CELSIUS, temperatureUnit);
  const maxTempDisplay = formatTemperature(MAX_TEMP_CELSIUS, temperatureUnit);

  // Determine what to show in status area
  const renderStatus = () => {
    switch (loadingState) {
      case "setting":
        return (
          <Box justifyContent="center">
            <Text color={theme.primary}>
              {SPINNER_FRAMES[spinnerFrame]} Setting...
            </Text>
          </Box>
        );
      case "retrying":
        return (
          <Box justifyContent="center">
            <Text color={theme.primary}>
              {SPINNER_FRAMES[spinnerFrame]} Retrying...
            </Text>
          </Box>
        );
      case "error":
        return (
          <Box justifyContent="center">
            <Text color="red">Failed to set temperature</Text>
          </Box>
        );
      default:
        return (
          <Box justifyContent="center">
            <Text color={theme.dimText}>
              <Text color={theme.primary}>←/→</Text> Adjust
            </Text>
          </Box>
        );
    }
  };

  return (
    <Panel
      title="Temperature Adjust"
      titleColor={theme.primary}
      borderColor={theme.border}
      width={width}
      height={height}
    >
      <Box justifyContent="center" marginY={1}>
        <Text color={theme.dimText}>{minTempDisplay}</Text>
        <Text> </Text>
        <TemperatureSlider
          value={desiredTempProp}
          min={MIN_TEMP_CELSIUS}
          max={MAX_TEMP_CELSIUS}
          isActive={isActive}
          theme={theme}
        />
        <Text> </Text>
        <Text color={theme.dimText}>{maxTempDisplay}</Text>
      </Box>

      {renderStatus()}
    </Panel>
  );
}

interface TemperatureSliderProps {
  value: number;
  min: number;
  max: number;
  isActive: boolean;
  theme: TerminalTheme;
}

function TemperatureSlider({
  value,
  min,
  max,
  isActive,
  theme,
}: TemperatureSliderProps): React.ReactElement {
  const totalWidth = 16;
  // Clamp value to prevent negative repeat counts
  const clampedValue = Math.max(min, Math.min(max, value));
  const normalizedValue = (clampedValue - min) / (max - min);
  const position = Math.round(normalizedValue * (totalWidth - 1));

  const leftPart = "━".repeat(Math.max(0, position));
  const rightPart = "━".repeat(Math.max(0, totalWidth - position - 1));

  return (
    <Text>
      <Text color={isActive ? theme.primary : theme.dimText}>{leftPart}</Text>
      <Text color={theme.text} bold>
        ◉
      </Text>
      <Text color={theme.dimText}>{rightPart}</Text>
    </Text>
  );
}
