import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight, zero-dependency .env loader
 * Safely loads key-value pairs into process.env if present
 */
export function loadEnv(dir = process.cwd()) {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();

      // Unquote if wrapped in single or double quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    // Gracefully ignore file read errors
  }
}
