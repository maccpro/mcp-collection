/**
 * @file quality-gate.js
 * @description Pre-Commit Database Quality Gate for Laravel & SQL Projects.
 * Scans migration files for strict reversibility, proper scoping, and lock hazards.
 */

import fs from 'node:fs';
import path from 'node:path';

export class QualityGate {
  /**
   * Run pre-commit quality gate on database migrations
   * @param {Object} params
   * @param {string} [params.workspace_path=process.cwd()] - Project root path
   * @param {Array<string>} [params.files] - Optional explicit list of migration files to check
   * @returns {Object} Quality gate decision: PASS or FAIL with detailed violations
   */
  static evaluate(params = {}) {
    const workspacePath = params.workspace_path || process.cwd();
    const explicitFiles = params.files;

    let migrationFiles = [];

    if (Array.isArray(explicitFiles) && explicitFiles.length > 0) {
      migrationFiles = explicitFiles.map(f => path.isAbsolute(f) ? f : path.join(workspacePath, f));
    } else {
      // Auto-discover in database/migrations
      const standardDir = path.join(workspacePath, 'database', 'migrations');
      const tenantDir = path.join(workspacePath, 'database', 'migrations', 'tenant');

      if (fs.existsSync(standardDir)) {
        const stdFiles = fs.readdirSync(standardDir)
          .filter(f => f.endsWith('.php'))
          .map(f => path.join(standardDir, f));
        migrationFiles.push(...stdFiles);
      }

      if (fs.existsSync(tenantDir)) {
        const tenFiles = fs.readdirSync(tenantDir)
          .filter(f => f.endsWith('.php'))
          .map(f => path.join(tenantDir, f));
        migrationFiles.push(...tenFiles);
      }
    }

    if (migrationFiles.length === 0) {
      return {
        gate_status: 'PASS',
        decision: 'No migration files found to inspect. Gate passed.',
        files_scanned: 0,
        violations: []
      };
    }

    const violations = [];

    for (const filePath of migrationFiles) {
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(workspacePath, filePath).replace(/\\/g, '/');
      const isTenantMigration = relPath.includes('/tenant/') || /tenant_id/i.test(content);

      // 1. Check for up() and down() methods
      const hasUp = /public\s+function\s+up\s*\(/i.test(content);
      const hasDown = /public\s+function\s+down\s*\(/i.test(content);

      if (!hasUp) {
        violations.push({
          file: relPath,
          severity: 'CRITICAL',
          rule: 'MISSING_UP_METHOD',
          message: 'Migration must contain an up() method.'
        });
      }

      if (!hasDown) {
        violations.push({
          file: relPath,
          severity: 'CRITICAL',
          rule: 'MISSING_DOWN_METHOD',
          message: 'Strict Reversibility Rule: Migration is missing a down() method.'
        });
      } else {
        // Extract down() body to check if empty
        const downMatch = content.match(/public\s+function\s+down\s*\(\s*\)[^{]*\{([\s\S]*?)\}/i);
        if (downMatch) {
          const downBody = downMatch[1].trim().replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
          if (!downBody || downBody.length === 0) {
            violations.push({
              file: relPath,
              severity: 'CRITICAL',
              rule: 'EMPTY_DOWN_METHOD',
              message: 'Irreversible Migration Hazard: down() method is empty. Every migration must have a tested reversal.'
            });
          }
        }
      }

      // 2. Check for unsafe dropColumn without reverse
      if (/\bSchema::create\b/i.test(content)) {
        if (hasDown && !/\bSchema::dropIfExists\b|\bSchema::drop\b/i.test(content)) {
          violations.push({
            file: relPath,
            severity: 'HIGH',
            rule: 'INCOMPLETE_REVERSIBLE_CREATE',
            message: 'Schema::create() in up() should be reversed by Schema::dropIfExists() in down().'
          });
        }
      }

      // 3. Check for raw unindexed locks or non-concurrent index in Postgres statement
      if (/DB::statement\s*\(\s*['"]CREATE\s+INDEX\b/i.test(content) && !/CONCURRENTLY/i.test(content)) {
        violations.push({
          file: relPath,
          severity: 'HIGH',
          rule: 'LOCK_HAZARD_NON_CONCURRENT_INDEX',
          message: 'Raw CREATE INDEX statement detected without CONCURRENTLY. In PostgreSQL, this locks the table against writes.'
        });
      }

      // 4. Check for CONCURRENTLY inside transaction block
      if (/CONCURRENTLY/i.test(content) && !/withinTransaction\s*=\s*false/i.test(content)) {
        violations.push({
          file: relPath,
          severity: 'CRITICAL',
          rule: 'POSTGRES_CONCURRENT_TRANSACTION_ABORT_HAZARD',
          message: 'Migration executes CONCURRENT DDL without declaring "public bool $withinTransaction = false;". In PostgreSQL, this causes an immediate runtime abort because concurrent statements cannot execute inside a transaction block.'
        });
      }

      // 5. Check for un-scoped unique constraints in multi-tenant migrations
      if (isTenantMigration) {
        const singleUniqueMatches = [...content.matchAll(/\$table->unique\s*\(\s*(?:\[([^\]]+)\]|'([^']+)')/gi)];
        for (const match of singleUniqueMatches) {
          const cols = match[1] || match[2];
          if (cols && !cols.includes('tenant_id')) {
            violations.push({
              file: relPath,
              severity: 'HIGH',
              rule: 'TENANT_UNIQUE_NAMESPACE_LEAK',
              message: `Unique constraint '${cols}' in multi-tenant migration is not scoped by 'tenant_id'. This creates a global unique constraint causing cross-tenant namespace collisions.`
            });
          }
        }
      }
    }

    const isFailing = violations.some(v => v.severity === 'CRITICAL');

    return {
      gate_status: isFailing ? 'FAIL' : violations.length > 0 ? 'WARNING' : 'PASS',
      decision: isFailing ? 'BLOCK_COMMIT: Critical migration violations detected.' : 'PASS: All inspected migrations are reversible and lock-safe.',
      files_scanned: migrationFiles.length,
      violations_count: violations.length,
      violations
    };
  }
}

export default QualityGate;
