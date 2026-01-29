import React from 'react';
import { Box, Text } from 'ink';

interface HelpDisplayProps {
  isConnected: boolean;
}

export function HelpDisplay({ isConnected }: HelpDisplayProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>{'─'.repeat(50)}</Text>
      <Box marginY={1} justifyContent="center">
        <Text dimColor>
          {isConnected ? (
            <>
              <Text color="cyan">t</Text>:temp{' '}
              <Text color="cyan">1-3</Text>:presets{' '}
              <Text color="cyan">c</Text>:color{' '}
              <Text color="cyan">u</Text>:unit{' '}
              <Text color="cyan">o</Text>:settings{' '}
              <Text color="cyan">q</Text>:quit
            </>
          ) : (
            <>
              <Text color="cyan">s</Text>:scan{' '}
              <Text color="cyan">r</Text>:retry{' '}
              <Text color="cyan">q</Text>:quit
            </>
          )}
        </Text>
      </Box>
    </Box>
  );
}
