import React from 'react';
import { Text, useStdout } from 'ink';

export function HorizontalRule(): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  return <Text dimColor>{'─'.repeat(width)}</Text>;
}
