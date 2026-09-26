import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight Zero-Dependency .env Loader
 * Reads .env file from the specified directory and cascade parent/sibling directories
 * @param {string} dir Base directory
 */
export function loadEnv(dir) {
  const candidates = [
    path.join(dir, '.env'),
    path.join(dir, '..', 'backend-mcp', '.env'),
    path.join(dir, '..', '.env'),
    path.join(dir, '..', '..', '.env')
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;

    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;

        const key = line.substring(0, eqIdx).trim();
        let value = line.substring(eqIdx + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
          value = value.substring(1, value.length - 1);
        }

        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch (err) {
      // Gracefully continue
    }
  }
}
