import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TemperatureUnit, Preset } from '../lib/types.js';
import { formatTemperature } from '../lib/utils.js';

interface SettingsViewProps {
  presets: Preset[];
  temperatureUnit: TemperatureUnit;
  onTemperatureUnitChange: (unit: TemperatureUnit) => void;
  onClose: () => void;
  isActive: boolean;
}

type SettingOption = 'unit' | 'presets';

export function SettingsView({
  presets,
  temperatureUnit,
  onTemperatureUnitChange,
  onClose,
  isActive,
}: SettingsViewProps): React.ReactElement {
  const [selectedOption, setSelectedOption] = useState<SettingOption>('unit');

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.escape || input === 'q') {
        onClose();
        return;
      }

      if (key.upArrow || input === 'k') {
        setSelectedOption('unit');
      } else if (key.downArrow || input === 'j') {
        setSelectedOption('presets');
      }

      if (key.return || input === ' ') {
        if (selectedOption === 'unit') {
          const newUnit =
            temperatureUnit === TemperatureUnit.Celsius
              ? TemperatureUnit.Fahrenheit
              : TemperatureUnit.Celsius;
          onTemperatureUnitChange(newUnit);
        }
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Settings</Text>
      </Box>

      <Text dimColor>{'─'.repeat(40)}</Text>

      <Box flexDirection="column" marginY={1}>
        <SettingRow
          label="Temperature Unit"
          value={temperatureUnit === TemperatureUnit.Celsius ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
          isSelected={selectedOption === 'unit'}
          hint="Press Enter to toggle"
        />

        <Box marginTop={1}>
          <Text bold>Presets:</Text>
        </Box>
        {presets.map((preset, index) => (
          <Box key={preset.id} marginLeft={2}>
            <Text dimColor>
              {index + 1}. {preset.icon} {preset.name}:{' '}
              {formatTemperature(preset.temperature, temperatureUnit)}
            </Text>
          </Box>
        ))}
      </Box>

      <Text dimColor>{'─'.repeat(40)}</Text>

      <Box marginTop={1}>
        <Text dimColor>
          Press <Text color="cyan">Esc</Text> or <Text color="cyan">q</Text> to close settings
        </Text>
      </Box>
    </Box>
  );
}

interface SettingRowProps {
  label: string;
  value: string;
  isSelected: boolean;
  hint?: string;
}

function SettingRow({
  label,
  value,
  isSelected,
  hint,
}: SettingRowProps): React.ReactElement {
  return (
    <Box>
      <Text color={isSelected ? 'cyan' : 'white'}>
        {isSelected ? '> ' : '  '}
        {label}: <Text bold>{value}</Text>
        {hint && isSelected && <Text dimColor> ({hint})</Text>}
      </Text>
    </Box>
  );
}
