import React from "react";
import { Box, Text } from "ink";
import { LiquidState } from "../lib/types.js";
import {
  formatBatteryLevel,
  estimateBatteryLife,
  formatDuration,
} from "../lib/utils.js";
import { Panel } from "./Panel.js";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface BatteryDisplayProps {
  batteryLevel: number;
  isCharging: boolean;
  liquidState: LiquidState;
  width?: number;
  height?: number;
  theme: TerminalTheme;
  batteryRate?: number;
}

export function BatteryDisplay({
  batteryLevel,
  isCharging,
  liquidState,
  width,
  height,
  theme,
  batteryRate,
}: BatteryDisplayProps): React.ReactElement {
  const batteryTimeEstimate = estimateBatteryLife(
    batteryLevel,
    isCharging,
    liquidState,
    batteryRate,
  );

  return (
    <Panel
      title="Battery"
      titleColor={theme.primary}
      borderColor={theme.border}
      width={width}
      height={height}
    >
      <Box justifyContent="center" marginY={1}>
        <Text color={theme.primary} bold>
          {formatBatteryLevel(batteryLevel)}
        </Text>
        {isCharging && (
          <Text color={theme.primary} bold>
            {" "}
            ~
          </Text>
        )}
      </Box>

      <Box justifyContent="center">
        <BatteryBar
          level={batteryLevel}
          isCharging={isCharging}
          theme={theme}
        />
      </Box>

      {batteryTimeEstimate !== null && (
        <Box justifyContent="center" marginTop={1}>
          <Text color={theme.dimText}>
            {isCharging ? (
              <>
                {"[~] "}
                <Text color={theme.primary}>
                  {formatDuration(batteryTimeEstimate)}
                </Text>
                <Text color={theme.dimText}> to full</Text>
              </>
            ) : (
              <>
                {"[~] "}
                <Text color={theme.primary}>
                  {formatDuration(batteryTimeEstimate)}
                </Text>
                <Text color={theme.dimText}> remaining</Text>
              </>
            )}
          </Text>
        </Box>
      )}
    </Panel>
  );
}

interface BatteryBarProps {
  level: number;
  isCharging: boolean;
  theme: TerminalTheme;
}

function BatteryBar({
  level,
  isCharging,
  theme,
}: BatteryBarProps): React.ReactElement {
  const totalSegments = 20;
  const filledSegments = Math.round((level / 100) * totalSegments);
  const emptySegments = totalSegments - filledSegments;

  return (
    <Text>
      <Text color={theme.dimText}>▐</Text>
      <Text color={theme.primary}>{"█".repeat(filledSegments)}</Text>
      <Text color={theme.dimText}>{"░".repeat(emptySegments)}</Text>
      <Text color={theme.dimText}>▌</Text>
    </Text>
  );
}
