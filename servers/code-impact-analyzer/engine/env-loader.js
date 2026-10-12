import fs from 'node:fs';
import path from 'node:path';

/**
 * Zero-dependency .env loader with Dynamic Hierarchical Discovery & optional override support
 * Cascades across:
 * 1. baseDir/.env
 * 2. sibling ../backend-mcp/.env, ../laravel-code-pattern/.env
 * 3. parent directories searching upwards
 * 
 * @param {string} baseDir Base directory containing .env
 * @param {Object} [options]
 * @param {boolean} [options.override=false] Whether to overwrite existing process.env variables
 */
export function loadEnv(baseDir, { override = false } = {}) {
  const candidatePaths = [
    path.join(baseDir, '.env'),
    path.join(baseDir, '..', 'backend-mcp', '.env'),
    path.join(baseDir, '..', 'laravel-code-pattern', '.env'),
    path.join(baseDir, '..', '.env')
  ];

  // Upwards search
  let currentDir = baseDir;
  for (let i = 0; i < 4; i++) {
    const parentDir = path.dirname(currentDir);
    if (!parentDir || parentDir === currentDir) break;
    const parentEnv = path.join(parentDir, '.env');
    if (!candidatePaths.includes(parentEnv)) {
      candidatePaths.push(parentEnv);
    }
    currentDir = parentDir;
  }

  for (const envPath of candidatePaths) {
    if (!fs.existsSync(envPath)) continue;

    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined || (override && envPath === candidatePaths[0])) {
          process.env[key] = val;
        }
      }
    } catch (err) {
      // Continue to next candidate path
    }
  }
}

export default loadEnv;
