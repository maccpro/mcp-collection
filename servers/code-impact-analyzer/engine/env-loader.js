import fs from 'node:fs';
import path from 'node:path';

/**
 * Zero-dependency .env loader with optional override support
 * @param {string} baseDir Base directory containing .env
 * @param {Object} [options]
 * @param {boolean} [options.override=false] Whether to overwrite existing process.env variables
 */
export function loadEnv(baseDir, { override = false } = {}) {
  const envPath = path.join(baseDir, '.env');
  if (!fs.existsSync(envPath)) return;

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (override || process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    // Silently continue if .env cannot be read
  }
}

export default loadEnv;
