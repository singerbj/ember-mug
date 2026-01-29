import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { RGBColor } from '../lib/types.js';
import { rgbToHex } from '../lib/utils.js';

interface ColorControlProps {
  color: RGBColor;
  onColorChange: (color: RGBColor) => void;
  isActive: boolean;
}

const PRESET_COLORS: { name: string; color: RGBColor }[] = [
  { name: 'Orange', color: { r: 255, g: 147, b: 41, a: 255 } },
  { name: 'Red', color: { r: 255, g: 0, b: 0, a: 255 } },
  { name: 'Green', color: { r: 0, g: 255, b: 0, a: 255 } },
  { name: 'Blue', color: { r: 0, g: 128, b: 255, a: 255 } },
  { name: 'Purple', color: { r: 128, g: 0, b: 255, a: 255 } },
  { name: 'Pink', color: { r: 255, g: 105, b: 180, a: 255 } },
  { name: 'White', color: { r: 255, g: 255, b: 255, a: 255 } },
  { name: 'Teal', color: { r: 0, g: 255, b: 200, a: 255 } },
];

type ColorChannel = 'r' | 'g' | 'b';

export function ColorControl({
  color,
  onColorChange,
  isActive,
}: ColorControlProps): React.ReactElement {
  const [selectedChannel, setSelectedChannel] = useState<ColorChannel>('r');
  const [customMode, setCustomMode] = useState(false);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Number keys for preset colors
      const numKey = parseInt(input, 10);
      if (numKey >= 1 && numKey <= PRESET_COLORS.length) {
        onColorChange(PRESET_COLORS[numKey - 1].color);
        setCustomMode(false);
        return;
      }

      // Toggle custom mode
      if (input === 'c') {
        setCustomMode(!customMode);
        return;
      }

      if (customMode) {
        // Switch channels
        if (input === 'r') {
          setSelectedChannel('r');
        } else if (input === 'g') {
          setSelectedChannel('g');
        } else if (input === 'b') {
          setSelectedChannel('b');
        }

        // Adjust selected channel
        let delta = 0;
        if (key.leftArrow || input === 'h') {
          delta = -10;
        } else if (key.rightArrow || input === 'l') {
          delta = 10;
        } else if (key.upArrow || input === 'k') {
          delta = 25;
        } else if (key.downArrow || input === 'j') {
          delta = -25;
        }

        if (delta !== 0) {
          const newColor = { ...color };
          newColor[selectedChannel] = Math.max(0, Math.min(255, newColor[selectedChannel] + delta));
          onColorChange(newColor);
        }
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column" marginY={1}>
      <Box justifyContent="center">
        <Text bold>LED Color</Text>
      </Box>

      <Box justifyContent="center" marginY={1}>
        <Text>
          Current: <Text color={rgbToHex(color.r, color.g, color.b)}>●</Text>{' '}
          <Text dimColor>
            ({rgbToHex(color.r, color.g, color.b)})
          </Text>
        </Text>
      </Box>

      <Box justifyContent="center" gap={1} marginY={1}>
        {PRESET_COLORS.map((preset, index) => (
          <Box key={preset.name}>
            <Text color={rgbToHex(preset.color.r, preset.color.g, preset.color.b)}>●</Text>
            <Text dimColor>{index + 1}</Text>
          </Box>
        ))}
      </Box>

      {customMode && (
        <Box flexDirection="column" marginY={1}>
          <Box justifyContent="center">
            <Text dimColor>Custom Color Mode</Text>
          </Box>
          <Box justifyContent="center" gap={2}>
            <ChannelSlider
              label="R"
              value={color.r}
              isSelected={selectedChannel === 'r'}
              color="red"
            />
            <ChannelSlider
              label="G"
              value={color.g}
              isSelected={selectedChannel === 'g'}
              color="green"
            />
            <ChannelSlider
              label="B"
              value={color.b}
              isSelected={selectedChannel === 'b'}
              color="blue"
            />
          </Box>
        </Box>
      )}

      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>
          Press <Text color="cyan">1-{PRESET_COLORS.length}</Text> for presets |{' '}
          <Text color="cyan">c</Text> for custom mode
        </Text>
      </Box>
    </Box>
  );
}

interface ChannelSliderProps {
  label: string;
  value: number;
  isSelected: boolean;
  color: string;
}

function ChannelSlider({
  label,
  value,
  isSelected,
  color,
}: ChannelSliderProps): React.ReactElement {
  const width = 10;
  const filled = Math.round((value / 255) * width);

  return (
    <Box>
      <Text color={isSelected ? color : 'gray'}>
        {label}: {'█'.repeat(filled)}{'░'.repeat(width - filled)} {value.toString().padStart(3)}
      </Text>
    </Box>
  );
}
