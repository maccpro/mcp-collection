import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight Zero-Dependency Multi-Tier .env Loader
 * Reads .env file from the specified directory and cascading parent/workspace directories.
 * @param {string} dir Base directory
 */
export function loadEnv(dir = process.cwd()) {
  const candidates = [
    path.join(dir, '.env'),
    path.join(dir, '..', '.env'),
    path.join(dir, '..', '..', '.env'),
    path.join(process.cwd(), '.env')
  ];

  const loadedKeys = new Set();

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;

    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);

      for (const rawLine of lines) {
        const line = rawLine.trim();
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) continue;

        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;

        const key = line.substring(0, eqIdx).trim();
        let value = line.substring(eqIdx + 1).trim();

        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
          value = value.substring(1, value.length - 1);
        }

        // Handle escape characters if enclosed in double quotes
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');

        // Populate into process.env if not already set by system or previous higher-priority file
        if (process.env[key] === undefined) {
          process.env[key] = value;
          loadedKeys.add(key);
        }
      }
    } catch {
      // Gracefully continue without breaking
    }
  }

  return loadedKeys;
}
