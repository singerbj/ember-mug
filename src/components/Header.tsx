import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  mugName: string;
  connected: boolean;
}

export function Header({ mugName, connected }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          {'☕ Ember Mug CLI '}
        </Text>
        {connected ? (
          <Text color="green">[Connected: {mugName}]</Text>
        ) : (
          <Text color="yellow">[Disconnected]</Text>
        )}
      </Box>
      <Text dimColor>{'─'.repeat(50)}</Text>
    </Box>
  );
}
