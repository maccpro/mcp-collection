import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight Zero-Dependency .env Loader
 * Reads .env file from the specified directory and populates process.env
 * @param {string} dir Directory containing .env
 */
export function loadEnv(dir) {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) {
        continue;
      }

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
    // Gracefully handle read errors
  }
}
