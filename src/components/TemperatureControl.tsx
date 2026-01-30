import React from "react";
import { Box, Text, useInput } from "ink";
import {
  TemperatureUnit,
  MIN_TEMP_CELSIUS,
  MAX_TEMP_CELSIUS,
} from "../lib/types.js";
import { formatTemperature, clampTemperature } from "../lib/utils.js";
import { Panel } from "./Panel.js";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface TemperatureControlProps {
  targetTemp: number;
  temperatureUnit: TemperatureUnit;
  onTempChange: (temp: number) => void;
  isActive: boolean;
  width?: number;
  height?: number;
  theme: TerminalTheme;
}

export function TemperatureControl({
  targetTemp,
  temperatureUnit,
  onTempChange,
  isActive,
  width,
  height,
  theme,
}: TemperatureControlProps): React.ReactElement {
  useInput(
    (input, key) => {
      if (!isActive) return;

      let delta = 0;

      if (key.leftArrow) {
        delta = -0.5;
      } else if (key.rightArrow) {
        delta = 0.5;
      }

      if (delta !== 0) {
        const newTemp = clampTemperature(targetTemp + delta);
        onTempChange(newTemp);
      }
    },
    { isActive },
  );

  const minTempDisplay = formatTemperature(MIN_TEMP_CELSIUS, temperatureUnit);
  const maxTempDisplay = formatTemperature(MAX_TEMP_CELSIUS, temperatureUnit);

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
          value={targetTemp}
          min={MIN_TEMP_CELSIUS}
          max={MAX_TEMP_CELSIUS}
          isActive={isActive}
          theme={theme}
        />
        <Text> </Text>
        <Text color={theme.dimText}>{maxTempDisplay}</Text>
      </Box>

      <Box justifyContent="center">
        <Text color={theme.dimText}>
          <Text color={theme.primary}>←/→</Text>
        </Text>
      </Box>
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
  const normalizedValue = (value - min) / (max - min);
  const position = Math.round(normalizedValue * (totalWidth - 1));

  const leftPart = "━".repeat(position);
  const rightPart = "━".repeat(totalWidth - position - 1);

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
