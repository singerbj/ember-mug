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

  // Calculate minimum width needed for horizontal layout
  // Each box: 14 chars (12 inner + 2 borders) + 1 gap between = ~15 per preset
  // Plus panel borders (~4 chars)
  const minHorizontalWidth = presets.length * 15 + 4;
  const useVerticalLayout = width !== undefined && width < minHorizontalWidth;

  return (
    <Panel
      title="Temperature Presets"
      titleColor={theme.primary}
      borderColor={theme.border}
      width={width}
      height={height}
    >
      {useVerticalLayout ? (
        <VerticalPresetTable
          presets={presets}
          selectedIndex={selectedIndex}
          temperatureUnit={temperatureUnit}
          theme={theme}
        />
      ) : (
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
      )}
    </Panel>
  );
}

interface VerticalPresetTableProps {
  presets: Preset[];
  selectedIndex: number;
  temperatureUnit: TemperatureUnit;
  theme: TerminalTheme;
}

function VerticalPresetTable({
  presets,
  selectedIndex,
  temperatureUnit,
  theme,
}: VerticalPresetTableProps): React.ReactElement {
  const nameWidth = 8;
  const tempWidth = 7;
  const contentWidth = nameWidth + tempWidth + 1; // +1 for space between

  const topBorder = `+${"-".repeat(contentWidth)}+---+`;
  const midBorder = `+${"-".repeat(contentWidth)}+---+`;

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={theme.dimText}>{topBorder}</Text>
      {presets.map((preset, index) => {
        const isSelected = selectedIndex === index;
        const textColor = isSelected ? theme.text : theme.dimText;
        const tempColor = isSelected ? theme.primary : theme.text;
        const nameDisplay = preset.name.padEnd(nameWidth);
        const tempDisplay = formatTemperature(
          preset.temperature,
          temperatureUnit,
        ).padStart(tempWidth);

        return (
          <React.Fragment key={preset.id}>
            <Text>
              <Text color={theme.dimText}>|</Text>
              <Text color={textColor} bold={isSelected}>
                {nameDisplay}
              </Text>
              <Text> </Text>
              <Text color={tempColor}>{tempDisplay}</Text>
              <Text color={theme.dimText}>|</Text>
              <Text color={theme.primary} bold>
                {" "}{index + 1}{" "}
              </Text>
              <Text color={theme.dimText}>|</Text>
            </Text>
            <Text color={theme.dimText}>{midBorder}</Text>
          </React.Fragment>
        );
      })}
    </Box>
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
