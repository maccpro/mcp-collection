import fs from 'node:fs';
import path from 'node:path';

let lastLoadedMtime = 0;
let lastLoadedDir = '';

/**
 * Lightweight Zero-Dependency .env Loader with Dynamic Hierarchical Discovery & Hot-Reloading
 * Resolves .env hierarchically:
 * 1. Specified directory (.env)
 * 2. Sibling directories in mcp-collection (e.g. ../backend-mcp/.env)
 * 3. Parent directories searching upwards
 * 
 * @param {string} dir Directory containing .env
 * @param {boolean} [forceReload=false] Force reload even if mtime unchanged
 * @returns {boolean} True if loaded or reloaded, false otherwise
 */
export function loadEnv(dir, forceReload = false) {
  const candidatePaths = [
    path.join(dir, '.env'),
    path.join(dir, '..', 'backend-mcp', '.env'),
    path.join(dir, '..', 'code-impact-analyzer', '.env'),
    path.join(dir, '..', '.env')
  ];

  // Also search upwards for any .env up to drive root
  let currentDir = dir;
  for (let i = 0; i < 4; i++) {
    const parentDir = path.dirname(currentDir);
    if (!parentDir || parentDir === currentDir) break;
    const parentEnv = path.join(parentDir, '.env');
    if (!candidatePaths.includes(parentEnv)) {
      candidatePaths.push(parentEnv);
    }
    currentDir = parentDir;
  }

  let loadedAny = false;

  for (const envPath of candidatePaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    try {
      const stats = fs.statSync(envPath);
      const mtimeMs = stats.mtimeMs;

      if (!forceReload && lastLoadedDir === envPath && lastLoadedMtime === mtimeMs) {
        continue;
      }

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
        } else {
          const commentIdx = value.indexOf(' #');
          if (commentIdx !== -1) {
            value = value.substring(0, commentIdx).trim();
          }
        }

        // Only set if not already set or if loading primary target
        if (process.env[key] === undefined || envPath === candidatePaths[0]) {
          process.env[key] = value;
        }
      }

      lastLoadedMtime = mtimeMs;
      lastLoadedDir = envPath;
      loadedAny = true;
    } catch (err) {
      // Gracefully continue searching other candidate paths
    }
  }

  return loadedAny;
}
