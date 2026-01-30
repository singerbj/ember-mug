import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { Panel } from "./Panel.js";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface ConnectionStatusProps {
  isScanning: boolean;
  isConnected: boolean;
  foundMugName: string | null;
  error: string | null;
  onRetry: () => void;
  width?: number;
  height?: number;
  theme: TerminalTheme;
}

export function ConnectionStatus({
  isScanning,
  isConnected,
  foundMugName,
  error,
  width,
  height = 10,
  theme,
}: ConnectionStatusProps): React.ReactElement {
  if (isConnected) {
    return <></>;
  }

  return (
    <Box justifyContent="center" marginY={2}>
      <Panel
        title={
          error ? "[!] Error" : isScanning ? "[~] Scanning" : "C[_] Welcome"
        }
        titleColor={error ? "red" : theme.primary}
        borderColor={error ? "red" : theme.border}
        width={width}
        height={height}
      >
        {error ? (
          <Box flexDirection="column" alignItems="center" marginY={1}>
            <Text color="red" bold>
              {error}
            </Text>
            <Box marginTop={1}>
              <Text color={theme.dimText}>
                Note: Mug must be set up with the official Ember app first.
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.dimText}>
                Press{" "}
                <Text color="yellow" bold>
                  [r]
                </Text>{" "}
                to retry scanning
              </Text>
            </Box>
          </Box>
        ) : isScanning ? (
          <Box flexDirection="column" alignItems="center" marginY={1}>
            <Box>
              <Text color={theme.primary}>
                <Spinner type="dots" />
              </Text>
              <Text color={theme.text}> Searching for Ember mug...</Text>
            </Box>
            {foundMugName && (
              <Box marginTop={1}>
                <Text color="green" bold>
                  * Found: {foundMugName}
                </Text>
              </Box>
            )}
            {foundMugName && (
              <Box marginTop={1}>
                <Text color={theme.primary}>
                  <Spinner type="dots" />
                </Text>
                <Text color={theme.text}> Connecting...</Text>
              </Box>
            )}
            <Box marginTop={1}>
              <Text color={theme.dimText}>
                Ensure mug is powered on and nearby
              </Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column" alignItems="center" marginY={1}>
            <Text color={theme.text}>No Ember mug connected</Text>
            <Box marginTop={1}>
              <Text color={theme.dimText}>
                Press{" "}
                <Text color="green" bold>
                  [s]
                </Text>{" "}
                to start scanning
              </Text>
            </Box>
          </Box>
        )}
      </Panel>
    </Box>
  );
}
