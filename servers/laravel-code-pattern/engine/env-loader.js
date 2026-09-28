import fs from 'node:fs';
import path from 'node:path';

let lastLoadedMtime = 0;
let lastLoadedDir = '';

/**
 * Lightweight Zero-Dependency .env Loader with Hot-Reloading
 * Reads .env file from the specified directory and populates process.env.
 * Automatically detects file modification time (mtime) and reloads changes.
 * 
 * @param {string} dir Directory containing .env
 * @param {boolean} [forceReload=false] Force reload even if mtime unchanged
 * @returns {boolean} True if loaded or reloaded, false otherwise
 */
export function loadEnv(dir, forceReload = false) {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) {
    return false;
  }

  try {
    const stats = fs.statSync(envPath);
    const mtimeMs = stats.mtimeMs;

    if (!forceReload && lastLoadedDir === dir && lastLoadedMtime === mtimeMs) {
      return false; // Already up to date
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) {
        continue;
      }

      const key = line.substring(0, eqIdx).trim();
      let value = line.substring(eqIdx + 1).trim();

      // Strip surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.substring(1, value.length - 1);
      }

      // Populate or overwrite in process.env
      process.env[key] = value;
    }

    lastLoadedMtime = mtimeMs;
    lastLoadedDir = dir;
    return true;
  } catch (err) {
    // Gracefully handle read errors without crashing
    return false;
  }
}
