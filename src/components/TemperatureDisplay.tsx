import React from 'react';
import { Box, Text } from 'ink';
import { LiquidState, TemperatureUnit } from '../lib/types.js';
import {
  formatTemperature,
  getLiquidStateText,
  getLiquidStateIcon,
  estimateTimeToTargetTemp,
  formatDuration,
} from '../lib/utils.js';

interface TemperatureDisplayProps {
  currentTemp: number;
  targetTemp: number;
  liquidState: LiquidState;
  temperatureUnit: TemperatureUnit;
}

export function TemperatureDisplay({
  currentTemp,
  targetTemp,
  liquidState,
  temperatureUnit,
}: TemperatureDisplayProps): React.ReactElement {
  const isEmpty = liquidState === LiquidState.Empty;
  const isAtTarget = Math.abs(currentTemp - targetTemp) < 0.5 && !isEmpty;

  const tempDiff = currentTemp - targetTemp;
  let tempColor: string;
  if (isEmpty) {
    tempColor = 'gray';
  } else if (Math.abs(tempDiff) < 1) {
    tempColor = 'green';
  } else if (tempDiff > 0) {
    tempColor = 'red';
  } else {
    tempColor = 'blue';
  }

  const timeToTarget = estimateTimeToTargetTemp(currentTemp, targetTemp, liquidState);

  return (
    <Box flexDirection="column" marginY={1}>
      <Box justifyContent="center">
        <Text bold>Temperature</Text>
      </Box>

      <Box marginY={1} justifyContent="center">
        <Box flexDirection="column" alignItems="center">
          <Text dimColor>Current</Text>
          <Text bold color={tempColor}>
            {isEmpty ? '---' : formatTemperature(currentTemp, temperatureUnit)}
          </Text>
        </Box>

        <Box marginX={3}>
          <Text dimColor>{'  →  '}</Text>
        </Box>

        <Box flexDirection="column" alignItems="center">
          <Text dimColor>Target</Text>
          <Text bold color="cyan">
            {formatTemperature(targetTemp, temperatureUnit)}
          </Text>
        </Box>
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Text>
          <Text color={getStateColor(liquidState)}>
            {getLiquidStateIcon(liquidState)} {getLiquidStateText(liquidState)}
          </Text>
          {isAtTarget && <Text color="green"> - Perfect!</Text>}
        </Text>
      </Box>

      {timeToTarget !== null && timeToTarget > 0 && (
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>
            {'Est. time to target: '}
            <Text color="yellow">{formatDuration(timeToTarget)}</Text>
          </Text>
        </Box>
      )}

      {timeToTarget === 0 && !isEmpty && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="green">At target temperature!</Text>
        </Box>
      )}
    </Box>
  );
}

function getStateColor(state: LiquidState): string {
  switch (state) {
    case LiquidState.Empty:
      return 'gray';
    case LiquidState.Filling:
      return 'cyan';
    case LiquidState.Cooling:
      return 'blue';
    case LiquidState.Heating:
      return 'red';
    case LiquidState.StableTemperature:
      return 'green';
    default:
      return 'white';
  }
}
