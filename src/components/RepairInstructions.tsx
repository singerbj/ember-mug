import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TERMINAL_COLORS } from "../lib/theme.js";

type TerminalTheme = (typeof TERMINAL_COLORS)[keyof typeof TERMINAL_COLORS];

interface RepairInstructionsProps {
  onComplete: () => void;
  onCancel: () => void;
  theme: TerminalTheme;
}

export function RepairInstructions({
  onComplete,
  onCancel,
  theme,
}: RepairInstructionsProps): React.ReactElement {
  const [step, setStep] = useState(0);

  const steps = [
    { title: "Disconnect", description: "Mug has been disconnected" },
    {
      title: "Forget Device",
      description: "Open macOS System Settings → Bluetooth",
      detail: 'Click "i" next to your Ember mug → "Forget This Device"',
    },
    {
      title: "Ready to Reconnect",
      description: "Press [c] to continue scanning for your mug",
      detail: "Press [Esc] to cancel",
    },
  ];

  // Auto-advance through steps
  useEffect(() => {
    if (step < 2) {
      const timeout = setTimeout(() => setStep(step + 1), 2000);
      return () => clearTimeout(timeout);
    }
  }, [step]);

  useInput((input, key) => {
    if (step === 2) {
      if (input === "c") {
        onComplete();
      } else if (key.escape) {
        onCancel();
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      borderStyle="round"
      borderColor={theme.border}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          Force Repair - Re-pairing with your Mug
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {steps.map((s, index) => {
          const isCurrent = index === step;
          const isPast = index < step;
          const isFuture = index > step;

          return (
            <Box key={index} gap={2}>
              <Box width={3}>
                <Text
                  bold
                  color={
                    isCurrent
                      ? theme.primary
                      : isPast
                        ? "green"
                        : "gray"
                  }
                >
                  {isPast ? "✓" : isCurrent ? "→" : "○"}
                </Text>
              </Box>
              <Box flexDirection="column">
                <Text
                  bold
                  color={isCurrent ? theme.primary : isPast ? "green" : "gray"}
                >
                  {s.title}
                </Text>
                <Text
                  color={isCurrent ? theme.text : "gray"}
                  dimColor={isFuture}
                >
                  {s.description}
                </Text>
                {s.detail && (
                  <Text
                    color={isCurrent ? theme.text : "gray"}
                    dimColor={isFuture}
                  >
                    {s.detail}
                  </Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {step === 2 && (
        <Box marginTop={1}>
          <Text dimColor>Follow the steps above, then press </Text>
          <Text bold color={theme.primary}>
            [c]
          </Text>
          <Text dimColor> to continue or </Text>
          <Text bold color={theme.primary}>
            [Esc]
          </Text>
          <Text dimColor> to cancel</Text>
        </Box>
      )}
    </Box>
  );
}
