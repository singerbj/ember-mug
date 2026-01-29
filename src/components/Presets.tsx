import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Preset, TemperatureUnit } from '../lib/types.js';
import { formatTemperature } from '../lib/utils.js';

interface PresetsProps {
  presets: Preset[];
  selectedIndex: number;
  temperatureUnit: TemperatureUnit;
  onSelect: (preset: Preset) => void;
  isActive: boolean;
}

export function Presets({
  presets,
  selectedIndex,
  temperatureUnit,
  onSelect,
  isActive,
}: PresetsProps): React.ReactElement {
  useInput(
    (input, key) => {
      if (!isActive) return;

      const numKey = parseInt(input, 10);
      if (numKey >= 1 && numKey <= presets.length) {
        onSelect(presets[numKey - 1]);
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column" marginY={1}>
      <Box justifyContent="center">
        <Text bold>Presets</Text>
      </Box>

      <Box justifyContent="center" marginY={1} gap={2}>
        {presets.map((preset, index) => (
          <PresetButton
            key={preset.id}
            preset={preset}
            index={index}
            isSelected={selectedIndex === index}
            temperatureUnit={temperatureUnit}
          />
        ))}
      </Box>

      <Box justifyContent="center">
        <Text dimColor>
          Press <Text color="cyan">1-{presets.length}</Text> to select a preset
        </Text>
      </Box>
    </Box>
  );
}

interface PresetButtonProps {
  preset: Preset;
  index: number;
  isSelected: boolean;
  temperatureUnit: TemperatureUnit;
}

function PresetButton({
  preset,
  index,
  isSelected,
  temperatureUnit,
}: PresetButtonProps): React.ReactElement {
  const borderColor = isSelected ? 'cyan' : 'gray';
  const textColor = isSelected ? 'cyan' : 'white';

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={borderColor}>
        {isSelected ? '┌───────────┐' : '┌───────────┐'}
      </Text>
      <Text color={borderColor}>
        │ <Text color={textColor}>{preset.icon} {preset.name.padEnd(6)}</Text> │
      </Text>
      <Text color={borderColor}>
        │ <Text color={textColor}>{formatTemperature(preset.temperature, temperatureUnit).padStart(7)}</Text> │
      </Text>
      <Text color={borderColor}>
        └───────────┘
      </Text>
      <Text color="cyan">[{index + 1}]</Text>
    </Box>
  );
}
