import React from "react";
import { Box, Text, useStdout } from "ink";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface HelpDisplayProps {
  isConnected: boolean;
  isScanning?: boolean;
  error?: string | null;
  theme: TerminalTheme;
}

export function HelpDisplay({
  isConnected,
  isScanning,
  error,
  theme,
}: HelpDisplayProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={theme.border}>{"─".repeat(width)}</Text>
      <Box paddingY={1} justifyContent="center" gap={2}>
        {isConnected ? (
          <>
            <HelpKey keyChar="t" label="temp" color={theme.primary} />
            <HelpKey keyChar="1-3" label="presets" color={theme.primary} />
            <HelpKey keyChar="u" label="unit" color={theme.primary} />
            <HelpKey keyChar="r" label="repair" color={theme.primary} />
            <HelpKey keyChar="o" label="settings" color={theme.primary} />
            <HelpKey keyChar="q" label="quit" color={theme.primary} />
          </>
        ) : (
          <>
            {!isScanning && !error && (
              <HelpKey keyChar="s" label="scan" color={theme.primary} />
            )}
            {error && (
              <HelpKey keyChar="r" label="retry" color={theme.primary} />
            )}
            <HelpKey keyChar="q" label="quit" color={theme.primary} />
          </>
        )}
      </Box>
    </Box>
  );
}

interface HelpKeyProps {
  keyChar: string;
  label: string;
  color: string;
}

function HelpKey({ keyChar, label, color }: HelpKeyProps): React.ReactElement {
  return (
    <Text>
      <Text color={color} bold>
        [{keyChar}]
      </Text>
      <Text dimColor> {label}</Text>
    </Text>
  );
}
