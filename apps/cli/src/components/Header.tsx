import React from "react";
import { Box, Text, useStdout } from "ink";
import { isMockMode } from "../lib/bluetooth.js";
import { TERMINAL_COLORS } from "../lib/theme.js";
import { RGBColor } from "../lib/types.js";
import { rgbToHex } from "../lib/utils.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface HeaderProps {
  mugName: string;
  connected: boolean;
  theme: TerminalTheme;
  ledColor?: RGBColor;
}

export function Header({
  mugName,
  connected,
  theme,
  ledColor,
}: HeaderProps): React.ReactElement {
  const mockMode = isMockMode();
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  const statusText = connected ? `MUG NAME: ${mugName}` : "Disconnected";

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top border */}
      <Text color={theme.border}>{"═".repeat(width)}</Text>

      {/* Title row */}
      <Box justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color={theme.primary} bold>
            C[_] EMBER MUG
          </Text>
          {mockMode && <Text color="gray"> [MOCK]</Text>}
        </Box>
        <Box>
          {connected && ledColor && (
            <Text color={rgbToHex(ledColor.r, ledColor.g, ledColor.b)}>● </Text>
          )}

          <Text color={theme.text}>{statusText}</Text>
        </Box>
      </Box>

      {/* Bottom border */}
      <Text color={theme.border}>{"═".repeat(width)}</Text>
    </Box>
  );
}
