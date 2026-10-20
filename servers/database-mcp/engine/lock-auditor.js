/**
 * @file lock-auditor.js
 * @description Zero-Downtime Migration Lock Risk Auditor for MariaDB, MySQL, PostgreSQL & SQLite.
 * Analyzes DDL operations for table lock risks, metadata lock (MDL) queues, AccessExclusiveLock,
 * and provides safe zero-downtime execution recipes.
 */

class LockAuditor {
  /**
   * Audit migration operations for locking risks and zero-downtime compliance.
   * @param {Object} params
   * @param {string} params.table - Table name being altered
   * @param {Array<Object>} params.operations - List of migration operations
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql' | 'sqlite'
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
          const defaultStr = String(op.default || '').toLowerCase();
          const isVolatileDefault = defaultStr.includes('now()') || defaultStr.includes('current_timestamp') || defaultStr.includes('random()') || defaultStr.includes('uuid()');

          if (normalizedDialect === 'postgresql') {
            if (hasDefault && isVolatileDefault) {
              hazards.push({
                operation: `ADD COLUMN ${colName}`,
                risk_level: 'HIGH',
                lock_type: 'AccessExclusiveLock (Full Table Rewrite)',
                description: `Adding a column with a volatile default expression ('${op.default}') in PostgreSQL forces a full table rewrite under AccessExclusiveLock.`,
                mitigation: 'Add column as NULLABLE without default first, backfill rows in batches, then set the default.'
              });
              highestRisk = this._escalateRisk(highestRisk, 'HIGH');
            } else if (isNotNull && !hasDefault) {
              hazards.push({
                operation: `ADD COLUMN ${colName} NOT NULL`,
                risk_level: 'HIGH',
                lock_type: 'AccessExclusiveLock',
                description: 'Adding a NOT NULL column without a default requires an immediate table validation scan.',
                mitigation: `1) Add column as NULLABLE; 2) Backfill historical rows; 3) Add CHECK (${colName} IS NOT NULL) NOT VALID; 4) Run VALIDATE CONSTRAINT.`
              });
              highestRisk = this._escalateRisk(highestRisk, 'HIGH');
            } else {
              hazards.push({
                operation: `ADD COLUMN ${colName}`,
                risk_level: 'LOW',
                lock_type: 'AccessExclusiveLock (Instant / Metadata only)',
                description: 'Constant defaults in PostgreSQL 11+ are stored in catalog metadata without rewriting rows.'
              });
            }
          } else if (normalizedDialect === 'sqlite') {
            hazards.push({
              operation: `ADD COLUMN ${colName}`,
              risk_level: 'LOW',
              lock_type: 'File-level write lock',
              description: 'SQLite handles ADD COLUMN as a metadata operation unless default is non-constant.'
            });
          } else {
            // MySQL / MariaDB
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
                lock_type: 'ALGORITHM=INSTANT',
                description: 'Metadata-only operation in modern engines (MySQL 8.0+, MariaDB 10.3+).'
              });
            }
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
                mitigation: 'Always use CREATE INDEX CONCURRENTLY in PostgreSQL for online migrations and set public bool $withinTransaction = false; in migration class.'
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
          } else if (normalizedDialect === 'sqlite') {
            hazards.push({
              operation: `CREATE INDEX on ${colName}`,
              risk_level: 'LOW',
              lock_type: 'Database lock',
              description: 'SQLite index creation builds quickly but locks the database file during the build.'
            });
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

        case 'drop_index': {
          if (normalizedDialect === 'postgresql') {
            const hasConcurrent = op.concurrent !== false;
            if (!hasConcurrent) {
              hazards.push({
                operation: `DROP INDEX on ${colName}`,
                risk_level: 'HIGH',
                lock_type: 'AccessExclusiveLock',
                description: 'Dropping index without CONCURRENTLY acquires AccessExclusiveLock, blocking concurrent reads and writes.',
                mitigation: 'Use DROP INDEX CONCURRENTLY in PostgreSQL.'
              });
              highestRisk = this._escalateRisk(highestRisk, 'HIGH');
            } else {
              hazards.push({
                operation: `DROP INDEX CONCURRENTLY on ${colName}`,
                risk_level: 'LOW',
                lock_type: 'ShareUpdateExclusiveLock',
                description: 'Safe for zero-downtime concurrent dropping.'
              });
            }
          } else {
            hazards.push({
              operation: `DROP INDEX on ${colName}`,
              risk_level: 'LOW',
              lock_type: 'ALGORITHM=INPLACE',
              description: 'Online index removal.'
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
              mitigation: 'Add foreign key with NOT VALID first (instant lock), then run VALIDATE CONSTRAINT in a separate non-blocking step:\n  ALTER TABLE t ADD CONSTRAINT fk_name FOREIGN KEY (col) REFERENCES p(id) NOT VALID;\n  ALTER TABLE t VALIDATE CONSTRAINT fk_name;'
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

        case 'add_check_constraint': {
          if (normalizedDialect === 'postgresql') {
            hazards.push({
              operation: `ADD CHECK CONSTRAINT on ${colName}`,
              risk_level: 'HIGH',
              lock_type: 'AccessExclusiveLock',
              description: 'Adding a CHECK constraint without NOT VALID performs a full table scan under AccessExclusiveLock.',
              mitigation: 'Add constraint as NOT VALID, then run ALTER TABLE ... VALIDATE CONSTRAINT.'
            });
            highestRisk = this._escalateRisk(highestRisk, 'HIGH');
          } else {
            hazards.push({
              operation: `ADD CHECK CONSTRAINT on ${colName}`,
              risk_level: 'LOW',
              lock_type: 'Metadata operation',
              description: 'Check constraints are checked on subsequent inserts and updates.'
            });
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
      safeRecipeSteps.push('1. Set conservative lock timeout (SET statement_timeout = "5s" in PG or SET lock_wait_timeout = 5 in MariaDB/MySQL) before running DDL.');
      safeRecipeSteps.push('2. If migrating large tables (>1M rows), avoid transactions that hold DDL locks while doing data backfills.');
      if (normalizedDialect === 'postgresql') {
        safeRecipeSteps.push('3. For zero-downtime online schema changes on massive tables, consider `pg-roll` (github.com/xataio/pg-roll).');
      } else if (normalizedDialect !== 'sqlite') {
        safeRecipeSteps.push(`3. For tables over 5M rows, use triggerless online DDL tools:\n   gh-ost --user="app" --password="..." --host="127.0.0.1" --database="db" --table="${table}" --alter="..." --execute`);
      }
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
