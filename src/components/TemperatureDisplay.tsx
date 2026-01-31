import React from "react";
import { Box, Text } from "ink";
import { LiquidState, TemperatureUnit } from "../lib/types.js";
import {
  formatTemperature,
  getLiquidStateText,
  estimateTimeToTargetTemp,
  formatDuration,
} from "../lib/utils.js";
import { Panel } from "./Panel.js";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface TemperatureDisplayProps {
  currentTemp: number;
  targetTemp: number;
  liquidState: LiquidState;
  temperatureUnit: TemperatureUnit;
  width?: number;
  height?: number;
  theme: TerminalTheme;
  tempRate?: number;
}

export function TemperatureDisplay({
  currentTemp,
  targetTemp,
  liquidState,
  temperatureUnit,
  width,
  height,
  theme,
  tempRate,
}: TemperatureDisplayProps): React.ReactElement {
  const isEmpty = liquidState === LiquidState.Empty;

  const timeToTarget = estimateTimeToTargetTemp(
    currentTemp,
    targetTemp,
    liquidState,
    tempRate,
  );

  return (
    <Panel
      title="Temperature"
      titleColor={theme.primary}
      borderColor={theme.border}
      width={width}
      height={height}
    >
      <Box marginY={1} justifyContent="center" width="100%">
        <Box
          flexDirection="column"
          alignItems="center"
          minWidth={16}
          flexShrink={0}
        >
          <Box>
            <Text color={theme.dimText}>Current</Text>
          </Box>
          <Box>
            <Text bold color={theme.primary}>
              {isEmpty
                ? "---"
                : formatTemperature(currentTemp, temperatureUnit)}
            </Text>
          </Box>
        </Box>

        <Box marginX={2} justifyContent="center" alignItems="center">
          <Text color={theme.primary} bold>
            →
          </Text>
        </Box>

        <Box
          flexDirection="column"
          alignItems="center"
          minWidth={16}
          flexShrink={0}
        >
          <Box>
            <Text color={theme.dimText}>Target</Text>
          </Box>
          <Box>
            <Text bold color={theme.text}>
              {formatTemperature(targetTemp, temperatureUnit)}
            </Text>
          </Box>
        </Box>
      </Box>

      <Box justifyContent="center">
        <Text>
          <Text color={theme.primary} bold>
            {getLiquidStateText(liquidState, currentTemp, targetTemp)}
          </Text>

          {timeToTarget !== null && timeToTarget > 0 && (
            <Text color={theme.primary} bold>
              {" "}
              *
            </Text>
          )}

          {timeToTarget !== null && timeToTarget > 0 && (
            <Text color={theme.dimText}>
              {"  •  [~] "}
              <Text color={theme.primary}>{formatDuration(timeToTarget)}</Text>
              <Text color={theme.dimText}> to target</Text>
            </Text>
          )}
        </Text>
      </Box>
    </Panel>
  );
}
