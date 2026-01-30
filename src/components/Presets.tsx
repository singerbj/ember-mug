import React from "react";
import { Box, Text, useInput } from "ink";
import { Preset, TemperatureUnit } from "../lib/types.js";
import { formatTemperature } from "../lib/utils.js";
import { Panel } from "./Panel.js";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface PresetsProps {
  presets: Preset[];
  selectedIndex: number;
  temperatureUnit: TemperatureUnit;
  onSelect: (preset: Preset) => void;
  isActive: boolean;
  width?: number;
  height?: number;
  theme: TerminalTheme;
}

export function Presets({
  presets,
  selectedIndex,
  temperatureUnit,
  onSelect,
  isActive,
  width,
  height,
  theme,
}: PresetsProps): React.ReactElement {
  useInput(
    (input, key) => {
      if (!isActive) return;

      const numKey = parseInt(input, 10);
      if (numKey >= 1 && numKey <= presets.length) {
        onSelect(presets[numKey - 1]);
      }
    },
    { isActive },
  );

  // Fixed width for each preset button (12 chars inner content)
  const boxWidth = 12;

  return (
    <Panel
      title="Temperature Presets"
      titleColor={theme.primary}
      borderColor={theme.border}
      width={width}
      height={height}
    >
      <Box justifyContent="center" gap={1}>
        {presets.map((preset, index) => (
          <PresetButton
            key={preset.id}
            preset={preset}
            index={index}
            isSelected={selectedIndex === index}
            temperatureUnit={temperatureUnit}
            theme={theme}
            boxWidth={boxWidth}
          />
        ))}
      </Box>
    </Panel>
  );
}

interface PresetButtonProps {
  preset: Preset;
  index: number;
  isSelected: boolean;
  temperatureUnit: TemperatureUnit;
  theme: TerminalTheme;
  boxWidth: number;
}

function PresetButton({
  preset,
  index,
  isSelected,
  temperatureUnit,
  theme,
  boxWidth,
}: PresetButtonProps): React.ReactElement {
  const borderColor = isSelected ? theme.primary : theme.dimText;
  const textColor = isSelected ? theme.text : theme.dimText;

  const nameDisplay = preset.name.substring(0, boxWidth).padEnd(boxWidth);
  const tempDisplay = formatTemperature(
    preset.temperature,
    temperatureUnit,
  ).padStart(boxWidth);

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={borderColor}>+{"-".repeat(boxWidth)}+</Text>
      <Text color={borderColor}>
        |
        <Text color={textColor} bold>
          {nameDisplay}
        </Text>
        |
      </Text>
      <Text color={borderColor}>
        |
        <Text color={isSelected ? theme.primary : theme.text}>
          {tempDisplay}
        </Text>
        |
      </Text>
      <Text color={borderColor}>+{"-".repeat(boxWidth)}+</Text>
      <Text color={theme.primary} bold>
        [{index + 1}]
      </Text>
    </Box>
  );
}
