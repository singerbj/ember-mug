import React from "react";
import { Box, Text, useStdout } from "ink";

interface PanelProps {
  title?: string;
  titleColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  width?: number | string;
  minWidth?: number;
  padding?: number;
  centerContent?: boolean;
  height?: number;
}

export function Panel({
  title,
  titleColor = "cyan",
  borderColor = "gray",
  children,
  width,
  minWidth = 20,
  padding = 1,
  centerContent = true,
  height,
}: PanelProps): React.ReactElement {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  // Calculate actual width
  let actualWidth: number;
  if (typeof width === "number") {
    actualWidth = width;
  } else if (width === "100%") {
    actualWidth = terminalWidth;
  } else if (typeof width === "string" && width.endsWith("%")) {
    const percent = parseInt(width, 10) / 100;
    actualWidth = Math.floor(terminalWidth * percent);
  } else {
    // Default to ~48% of terminal width (to fit 2 panels side by side with gap)
    actualWidth = Math.floor((terminalWidth - 4) / 2);
  }

  // Ensure minimum width
  actualWidth = Math.max(actualWidth, minWidth);

  const innerWidth = actualWidth - 2; // Account for borders
  const titleText = title ? ` ${title} ` : "";
  const titleLen = title ? titleText.length : 0;

  // Ensure title fits
  const safeTitleLen = Math.min(titleLen, innerWidth - 4);
  const safeTitle =
    titleLen > innerWidth - 4
      ? titleText.substring(0, innerWidth - 4)
      : titleText;

  // Top border with title
  const topLeftPadding = Math.max(
    0,
    Math.floor((innerWidth - safeTitleLen) / 2),
  );
  const topRightPadding = Math.max(
    0,
    innerWidth - safeTitleLen - topLeftPadding,
  );

  const bottomBorder = `+${"-".repeat(innerWidth)}+`;

  return (
    <Box flexDirection="column" width={actualWidth} height={height}>
      {/* Top border with title */}
      <Text color={borderColor}>
        {title ? (
          <>
            +{"-".repeat(topLeftPadding)}
            <Text color={titleColor} bold>
              {safeTitle}
            </Text>
            {"-".repeat(topRightPadding)}+
          </>
        ) : (
          `+${"-".repeat(innerWidth)}+`
        )}
      </Text>

      {/* Content with side borders - use Box with borderLeft/borderRight */}
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderTop={false}
        borderBottom={false}
        borderColor={borderColor}
        paddingX={padding}
        justifyContent={centerContent ? "center" : "flex-start"}
        alignItems={centerContent ? "center" : "flex-start"}
      >
        {children}
      </Box>

      {/* Bottom border */}
      <Text color={borderColor}>{bottomBorder}</Text>
    </Box>
  );
}

// Hook to get terminal dimensions for responsive layouts
export function useTerminalSize(): { width: number; height: number } {
  const { stdout } = useStdout();
  return {
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  };
}
