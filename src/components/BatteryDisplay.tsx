import React from 'react';
import { Box, Text } from 'ink';
import { LiquidState } from '../lib/types.js';
import {
  formatBatteryLevel,
  getBatteryIcon,
  estimateBatteryLife,
  formatDuration,
} from '../lib/utils.js';

interface BatteryDisplayProps {
  batteryLevel: number;
  isCharging: boolean;
  liquidState: LiquidState;
}

export function BatteryDisplay({
  batteryLevel,
  isCharging,
  liquidState,
}: BatteryDisplayProps): React.ReactElement {
  const batteryColor = getBatteryColor(batteryLevel, isCharging);
  const batteryIcon = getBatteryIcon(batteryLevel, isCharging);
  const batteryTimeEstimate = estimateBatteryLife(batteryLevel, isCharging, liquidState);

  return (
    <Box flexDirection="column" marginY={1}>
      <Box justifyContent="center">
        <Text bold>Battery</Text>
      </Box>

      <Box justifyContent="center" marginY={1}>
        <Text color={batteryColor}>
          {batteryIcon} {formatBatteryLevel(batteryLevel)}
          {isCharging && <Text color="yellow"> (Charging)</Text>}
        </Text>
      </Box>

      {batteryTimeEstimate !== null && (
        <Box justifyContent="center">
          <Text dimColor>
            {isCharging ? (
              <>
                {'Time to full: '}
                <Text color="green">{formatDuration(batteryTimeEstimate)}</Text>
              </>
            ) : (
              <>
                {'Est. battery life: '}
                <Text color={batteryLevel < 20 ? 'red' : 'yellow'}>
                  {formatDuration(batteryTimeEstimate)}
                </Text>
              </>
            )}
          </Text>
        </Box>
      )}

      <Box justifyContent="center" marginTop={1}>
        <BatteryBar level={batteryLevel} isCharging={isCharging} />
      </Box>
    </Box>
  );
}

interface BatteryBarProps {
  level: number;
  isCharging: boolean;
}

function BatteryBar({ level, isCharging }: BatteryBarProps): React.ReactElement {
  const totalSegments = 20;
  const filledSegments = Math.round((level / 100) * totalSegments);
  const emptySegments = totalSegments - filledSegments;

  const color = getBatteryColor(level, isCharging);

  return (
    <Text>
      <Text dimColor>[</Text>
      <Text color={color}>{'█'.repeat(filledSegments)}</Text>
      <Text dimColor>{'░'.repeat(emptySegments)}</Text>
      <Text dimColor>]</Text>
      {isCharging && <Text color="yellow"> ⚡</Text>}
    </Text>
  );
}

function getBatteryColor(level: number, isCharging: boolean): string {
  if (isCharging) return 'yellow';
  if (level >= 50) return 'green';
  if (level >= 25) return 'yellow';
  return 'red';
}
