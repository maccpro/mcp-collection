import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Optional External Tools Bridge (PHPStan, Laravel Pint, Pest)
 * Runs tools only when requested and when local binaries exist.
 */
export class ExternalRunner {
  /**
   * Run enabled external checks
   * @param {string[]} targetFiles 
   * @param {string} cwd Workspace directory 
   * @param {object} config 
   * @returns {object}
   */
  static run(targetFiles = [], cwd = process.cwd(), config = {}) {
    const checks = config.externalChecks || {};
    const results = {};

    // 1. PHPStan
    if (checks.phpstan) {
      results.phpstan = this.runPHPStan(targetFiles, cwd);
    }

    // 2. Laravel Pint
    if (checks.pint) {
      results.pint = this.runPint(targetFiles, cwd);
    }

    // 3. Pest
    if (checks.pest) {
      results.pest = this.runPest(cwd);
    }

    return results;
  }

  static findBinary(binName, cwd) {
    const isWindows = process.platform === 'win32';
    const localBin = path.join(cwd, 'vendor', 'bin', isWindows ? `${binName}.bat` : binName);
    if (fs.existsSync(localBin)) {
      return localBin;
    }
    const localBinNoExt = path.join(cwd, 'vendor', 'bin', binName);
    if (fs.existsSync(localBinNoExt)) {
      return localBinNoExt;
    }
    return null;
  }

  static runPHPStan(files, cwd) {
    const bin = this.findBinary('phpstan', cwd);
    if (!bin) {
      return { status: 'SKIPPED', message: 'PHPStan binary not found in vendor/bin.' };
    }

    try {
      const filesArg = files.length > 0 ? files.map(f => `"${f}"`).join(' ') : '';
      const cmd = `"${bin}" analyse ${filesArg} --error-format=json --no-progress`;
      const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      return { status: 'PASS', output: stdout };
    } catch (err) {
      return {
        status: 'FAIL',
        output: err.stdout ? err.stdout.toString() : err.message
      };
    }
  }

  static runPint(files, cwd) {
    const bin = this.findBinary('pint', cwd);
    if (!bin) {
      return { status: 'SKIPPED', message: 'Pint binary not found in vendor/bin.' };
    }

    try {
      const filesArg = files.length > 0 ? files.map(f => `"${f}"`).join(' ') : '';
      const cmd = `"${bin}" --test ${filesArg}`;
      const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      return { status: 'PASS', output: stdout };
    } catch (err) {
      return {
        status: 'FAIL',
        output: err.stdout ? err.stdout.toString() : err.message
      };
    }
  }

  static runPest(cwd) {
    const bin = this.findBinary('pest', cwd);
    if (!bin) {
      return { status: 'SKIPPED', message: 'Pest binary not found in vendor/bin.' };
    }

    try {
      const cmd = `"${bin}" --compact`;
      const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      return { status: 'PASS', output: stdout };
    } catch (err) {
      return {
        status: 'FAIL',
        output: err.stdout ? err.stdout.toString() : err.message
      };
    }
  }
}
