/**
 * @file lock-auditor.js
 * @description Zero-Downtime Migration Lock Risk Auditor for MariaDB, MySQL, and PostgreSQL.
 * Analyzes DDL operations for table lock risks, metadata lock (MDL) queues, AccessExclusiveLock,
 * and provides safe zero-downtime execution recipes.
 */

class LockAuditor {
  /**
   * Audit migration operations for locking risks and zero-downtime compliance.
   * @param {Object} params
   * @param {string} params.table - Table name being altered
   * @param {Array<Object>} params.operations - List of migration operations (add_column, drop_column, change_column, add_index, add_foreign_key, etc.)
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql'
   * @param {number} [params.estimated_rows=100000] - Estimated row count
   * @returns {Object} Comprehensive lock audit report
   */
  static audit(params) {
    const { table, operations = [], dialect = 'mariadb', estimated_rows = 100000 } = params;
    const normalizedDialect = dialect.toLowerCase();

    const hazards = [];
    let highestRisk = 'LOW';
    const safeRecipeSteps = [];

    for (const op of operations) {
      const opType = (op.type || '').toLowerCase();
      const colName = op.column || op.name || 'target_column';

      switch (opType) {
        case 'add_column': {
          const hasDefault = op.default !== undefined;
          const isNotNull = op.nullable === false;

          if (isNotNull && hasDefault && normalizedDialect === 'mysql' && estimated_rows > 500000) {
            hazards.push({
              operation: `ADD COLUMN ${colName}`,
              risk_level: 'HIGH',
              lock_type: 'METADATA_LOCK / TABLE_COPY',
              description: `Adding NOT NULL column with default on MySQL on a large table (${estimated_rows.toLocaleString()} rows) may cause a full table copy or extended lock.`,
              mitigation: 'Add column as NULLABLE without default first, backfill in batches, then set default and apply NOT NULL constraint.'
            });
            highestRisk = this._escalateRisk(highestRisk, 'HIGH');
          } else {
            hazards.push({
              operation: `ADD COLUMN ${colName}`,
              risk_level: 'LOW',
              lock_type: normalizedDialect === 'postgresql' ? 'AccessExclusiveLock (brief)' : 'ALGORITHM=INPLACE',
              description: 'Metadata-only operation in modern engines (PG 11+, MariaDB 10.3+, MySQL 8.0+).'
            });
          }
          break;
        }

        case 'drop_column': {
          hazards.push({
            operation: `DROP COLUMN ${colName}`,
            risk_level: 'HIGH',
            lock_type: normalizedDialect === 'postgresql' ? 'AccessExclusiveLock' : 'TABLE_REBUILD',
            description: `Dropping a column immediately breaks running application workers if code is deployed out of sequence. On MariaDB/MySQL, it may rebuild the entire table.`,
            mitigation: 'Phase 1: Ignore column in code/Eloquent ($hidden or remove usage). Phase 2: Deploy code. Phase 3: Drop column in a subsequent maintenance migration.'
          });
          highestRisk = this._escalateRisk(highestRisk, 'HIGH');
          break;
        }

        case 'change_column_type':
        case 'modify_column': {
          hazards.push({
            operation: `MODIFY/CHANGE COLUMN ${colName}`,
            risk_level: 'CRITICAL',
            lock_type: normalizedDialect === 'postgresql' ? 'AccessExclusiveLock (Full Table Rewrite)' : 'ALGORITHM=COPY (Exclusive Table Lock)',
            description: `Changing column data type forces a full table rewrite, holding exclusive locks for the duration of the operation. On ${estimated_rows.toLocaleString()} rows, this will block all reads and writes.`,
            mitigation: 'Use the Expand-Contract pattern: 1) Add new_col, 2) Dual-write in application, 3) Backfill historical rows in chunks, 4) Switch readers to new_col, 5) Drop old_col.'
          });
          highestRisk = 'CRITICAL';
          break;
        }

        case 'add_index': {
          if (normalizedDialect === 'postgresql') {
            const hasConcurrent = op.concurrent !== false;
            if (!hasConcurrent) {
              hazards.push({
                operation: `CREATE INDEX on ${colName}`,
                risk_level: 'HIGH',
                lock_type: 'ShareLock',
                description: 'Creating index without CONCURRENTLY blocks all concurrent write operations (INSERT, UPDATE, DELETE) until index build completes.',
                mitigation: 'Always use CREATE INDEX CONCURRENTLY in PostgreSQL for online migrations.'
              });
              highestRisk = this._escalateRisk(highestRisk, 'HIGH');
            } else {
              hazards.push({
                operation: `CREATE INDEX CONCURRENTLY on ${colName}`,
                risk_level: 'LOW',
                lock_type: 'ShareUpdateExclusiveLock',
                description: 'Safe for zero-downtime. Does not block reads or writes. Note: Cannot run inside a transaction block.'
              });
            }
          } else {
            // MariaDB / MySQL
            hazards.push({
              operation: `ADD INDEX on ${colName}`,
              risk_level: 'LOW',
              lock_type: 'ALGORITHM=INPLACE, LOCK=NONE',
              description: 'MariaDB and MySQL support online DDL for secondary index creation without blocking DML.'
            });
          }
          break;
        }

        case 'add_foreign_key': {
          if (normalizedDialect === 'postgresql') {
            hazards.push({
              operation: `ADD FOREIGN KEY on ${colName}`,
              risk_level: 'HIGH',
              lock_type: 'ShareRowExclusiveLock',
              description: 'Validating foreign key acquires a ShareRowExclusiveLock on both tables, blocking concurrent updates.',
              mitigation: 'Add foreign key with NOT VALID first (instant lock), then run VALIDATE CONSTRAINT in a separate non-blocking step.'
            });
            highestRisk = this._escalateRisk(highestRisk, 'HIGH');
          } else {
            hazards.push({
              operation: `ADD FOREIGN KEY on ${colName}`,
              risk_level: 'HIGH',
              lock_type: 'METADATA_LOCK',
              description: 'Adding foreign keys in MySQL/MariaDB requires foreign key checks that can cause long wait locks if referenced tables are hot.',
              mitigation: 'Run during off-peak hours or set lock_wait_timeout = 5 to avoid cascading connection pileups.'
            });
            highestRisk = this._escalateRisk(highestRisk, 'HIGH');
          }
          break;
        }

        case 'rename_column':
        case 'rename_table': {
          hazards.push({
            operation: `RENAME ${colName}`,
            risk_level: 'HIGH',
            lock_type: 'METADATA_LOCK',
            description: 'Renaming immediately breaks application code that hasn\'t been deployed yet, creating a deployment race condition.',
            mitigation: 'Never rename directly in production. Add new column/table, sync with views/triggers, deploy code, then retire old.'
          });
          highestRisk = this._escalateRisk(highestRisk, 'HIGH');
          break;
        }

        default: {
          hazards.push({
            operation: `${opType.toUpperCase()} ${colName}`,
            risk_level: 'MEDIUM',
            lock_type: 'Standard DDL Lock',
            description: 'Standard schema modification. Ensure lock_wait_timeout is set.'
          });
        }
      }
    }

    // Build zero-downtime execution runbook
    if (highestRisk === 'CRITICAL' || highestRisk === 'HIGH') {
      safeRecipeSteps.push('1. Set conservative lock_wait_timeout (e.g., SET statement_timeout = "5s" in PG or SET lock_wait_timeout = 5 in MariaDB/MySQL) before running DDL.');
      safeRecipeSteps.push('2. If migrating large tables (>1M rows), avoid transactions that hold DDL locks while doing data backfills.');
      safeRecipeSteps.push('3. Execute during lowest traffic window or use pg-roll / pt-online-schema-change / gh-ost for massive tables.');
    } else {
      safeRecipeSteps.push('Standard online migration is safe to execute. Always run in staging environment first.');
    }

    return {
      success: true,
      table,
      dialect: normalizedDialect,
      estimated_rows,
      highest_risk_level: highestRisk,
      zero_downtime_compliant: highestRisk === 'LOW',
      hazards,
      safe_execution_runbook: safeRecipeSteps
    };
  }

  static _escalateRisk(current, incoming) {
    const order = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return order[incoming] > order[current] ? incoming : current;
  }
}

export { LockAuditor };
export default LockAuditor;

