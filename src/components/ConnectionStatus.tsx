import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface ConnectionStatusProps {
  isScanning: boolean;
  isConnected: boolean;
  foundMugName: string | null;
  error: string | null;
  onRetry: () => void;
}

export function ConnectionStatus({
  isScanning,
  isConnected,
  foundMugName,
  error,
}: ConnectionStatusProps): React.ReactElement {
  if (isConnected) {
    return <></>;
  }

  return (
    <Box flexDirection="column" alignItems="center" marginY={2}>
      {error ? (
        <Box flexDirection="column" alignItems="center">
          <Text color="red">Error: {error}</Text>
          <Text dimColor marginTop={1}>
            Press <Text color="cyan">r</Text> to retry scanning
          </Text>
        </Box>
      ) : isScanning ? (
        <Box flexDirection="column" alignItems="center">
          <Box>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> Scanning for Ember mug...</Text>
          </Box>
          {foundMugName && (
            <Box marginTop={1}>
              <Text color="green">Found: {foundMugName}</Text>
              <Text> - Connecting...</Text>
            </Box>
          )}
          <Text dimColor marginTop={1}>
            Make sure your Ember mug is powered on and in range
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" alignItems="center">
          <Text>No Ember mug connected</Text>
          <Text dimColor marginTop={1}>
            Press <Text color="cyan">s</Text> to start scanning
          </Text>
        </Box>
      )}
    </Box>
  );
}
