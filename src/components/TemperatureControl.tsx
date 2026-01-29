import React from 'react';
import { Box, Text, useInput } from 'ink';
import { TemperatureUnit, MIN_TEMP_CELSIUS, MAX_TEMP_CELSIUS } from '../lib/types.js';
import { formatTemperature, clampTemperature } from '../lib/utils.js';

interface TemperatureControlProps {
  targetTemp: number;
  temperatureUnit: TemperatureUnit;
  onTempChange: (temp: number) => void;
  isActive: boolean;
}

export function TemperatureControl({
  targetTemp,
  temperatureUnit,
  onTempChange,
  isActive,
}: TemperatureControlProps): React.ReactElement {
  useInput(
    (input, key) => {
      if (!isActive) return;

      let delta = 0;

      if (key.leftArrow || input === 'h' || input === '-') {
        delta = -0.5;
      } else if (key.rightArrow || input === 'l' || input === '+' || input === '=') {
        delta = 0.5;
      } else if (key.upArrow || input === 'k') {
        delta = 1;
      } else if (key.downArrow || input === 'j') {
        delta = -1;
      }

      if (delta !== 0) {
        const newTemp = clampTemperature(targetTemp + delta);
        onTempChange(newTemp);
      }
    },
    { isActive }
  );

  const minTempDisplay = formatTemperature(MIN_TEMP_CELSIUS, temperatureUnit);
  const maxTempDisplay = formatTemperature(MAX_TEMP_CELSIUS, temperatureUnit);

  return (
    <Box flexDirection="column" marginY={1}>
      <Box justifyContent="center">
        <Text bold>Adjust Temperature</Text>
      </Box>

      <Box justifyContent="center" marginY={1}>
        <Text dimColor>{minTempDisplay}</Text>
        <Text> </Text>
        <TemperatureSlider
          value={targetTemp}
          min={MIN_TEMP_CELSIUS}
          max={MAX_TEMP_CELSIUS}
          isActive={isActive}
        />
        <Text> </Text>
        <Text dimColor>{maxTempDisplay}</Text>
      </Box>

      <Box justifyContent="center">
        <Text dimColor>
          {isActive ? (
            <Text>
              Use <Text color="cyan">←/→</Text> or <Text color="cyan">h/l</Text> (±0.5°) |{' '}
              <Text color="cyan">↑/↓</Text> or <Text color="cyan">j/k</Text> (±1°)
            </Text>
          ) : (
            <Text>Press <Text color="cyan">t</Text> to adjust temperature</Text>
          )}
        </Text>
      </Box>
    </Box>
  );
}

interface TemperatureSliderProps {
  value: number;
  min: number;
  max: number;
  isActive: boolean;
}

function TemperatureSlider({
  value,
  min,
  max,
  isActive,
}: TemperatureSliderProps): React.ReactElement {
  const totalWidth = 20;
  const normalizedValue = (value - min) / (max - min);
  const position = Math.round(normalizedValue * (totalWidth - 1));

  const sliderChars = Array(totalWidth).fill('─');
  sliderChars[position] = '●';

  return (
    <Text color={isActive ? 'cyan' : 'white'}>
      {sliderChars.join('')}
    </Text>
  );
}
