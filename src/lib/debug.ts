// Debug logging utility
// When enabled, outputs detailed logs to stderr (so it doesn't interfere with Ink UI)

let debugEnabled = false;

export function setDebugMode(enabled: boolean): void {
  debugEnabled = enabled;
  if (enabled) {
    debug('Debug mode enabled');
  }
}

export function isDebugMode(): boolean {
  return debugEnabled;
}

export function debug(message: string, ...args: unknown[]): void {
  if (!debugEnabled) return;

  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0
    ? ' ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
    : '';

  // Write to stderr so it doesn't interfere with Ink's stdout rendering
  process.stderr.write(`[${timestamp}] [DEBUG] ${message}${formattedArgs}\n`);
}
