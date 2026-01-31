import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

interface Particle {
  char: string;
  x: number;
  y: number;
}

// Base mug template (without steam/particles)
// Using \x60 for backtick character
const MUG_BASE = "       {   }\n    {   }\n     }_{ __{\n  .-{   }   }-.\n (   }     {   )\n |\x60-.._____..-\x27|\n |             ;--.\n |            (__  \\\\\n |             | )  )\n |             |/  /\n |             /  /\n |            (  /\n \\\\             y\x27\n  \x60-.._____..-\x27";

// Generate a frame with rising curly brace particles
function generateFrame(particles: Particle[]): string {
  // Start with mug base
  let lines = MUG_BASE.split('\n');

  // Add particles above the mug
  particles.forEach(p => {
    if (p.y >= 0 && p.y < 3) { // Only draw if within steam area
      const line = lines[p.y];
      if (p.x >= 0 && p.x < line.length) {
        lines[p.y] = line.substring(0, p.x) + p.char + line.substring(p.x + 1);
      }
    }
  });

  return lines.join('\n');
}

// Steam animation templates (top 3 lines only)
const STEAM_TEMPLATES = [
  "       (   )",
  "      (     )",
  "     \\     /",
  "      |   |",
  "       ) ( ",
  "      (   )",
];

// Particle spawn positions (above mug opening)
const SPAWN_POSITIONS = [
  { x: 7, y: 2 },
  { x: 8, y: 2 },
  { x: 9, y: 2 },
  { x: 10, y: 2 },
  { x: 11, y: 2 },
  { x: 12, y: 2 },
  { x: 13, y: 2 },
];

interface CoffeeMugProps {
  theme?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
}

export function CoffeeMug({ theme }: CoffeeMugProps): React.ReactElement {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [steamIndex, setSteamIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // Move existing particles up
      setParticles(prev => {
        const moved = prev
          .map(p => ({ ...p, y: p.y - 1 })) // Move up
          .filter(p => p.y >= -2); // Remove if off screen (give them some room above)

        // Randomly spawn new particles (20% chance per frame)
        if (Math.random() < 0.25) {
          const pos = SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
          moved.push({
            char: Math.random() < 0.5 ? '{' : '}',
            x: pos.x + Math.floor(Math.random() * 3) - 1, // Slight x variation
            y: pos.y,
          });
        }

        return moved;
      });

      // Cycle steam template
      setSteamIndex(prev => (prev + 1) % STEAM_TEMPLATES.length);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Build the frame
  const steamLines = [
    STEAM_TEMPLATES[(steamIndex + 2) % STEAM_TEMPLATES.length],
    STEAM_TEMPLATES[(steamIndex + 1) % STEAM_TEMPLATES.length],
    STEAM_TEMPLATES[steamIndex],
  ];

  const mugLines = MUG_BASE.split('\n');
  const fullFrame = [...steamLines, ...mugLines];

  // Add particles
  particles.forEach(p => {
    if (p.y >= 0 && p.y < fullFrame.length) {
      const line = fullFrame[p.y];
      if (p.x >= 0 && p.x < line.length) {
        fullFrame[p.y] = line.substring(0, p.x) + p.char + line.substring(p.x + 1);
      }
    }
  });

  const mugColor = theme?.primary || "cyan";

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" paddingX={1}>
      <Text color={mugColor}>{fullFrame.join('\n')}</Text>
    </Box>
  );
}
