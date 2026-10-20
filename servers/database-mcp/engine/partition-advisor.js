/**
 * @file partition-advisor.js
 * @description Enterprise Table Partitioning Advisor and Migration Generator.
 * Designs Range & List table partitioning strategies for high-volume (10M+ row) tables.
 */

import { MigrationEngine } from './migration-engine.js';

export class PartitionAdvisor {
  /**
   * Generate partitioning strategy and migration code
   * @param {Object} params
   * @param {string} params.table_name - Table name (e.g. 'audit_logs', 'transactions')
   * @param {string} [params.partition_type='range'] - 'range' | 'list'
   * @param {string} [params.partition_column='created_at'] - Column to partition on
   * @param {string} [params.dialect='postgresql'] - 'postgresql' | 'mysql' | 'mariadb'
   * @param {string} [params.interval='monthly'] - 'monthly' | 'yearly'
   * @returns {Object} Strategy, DDL migrations, and partition maintenance runbooks
   */
  static advise(params = {}) {
    const tableName = (params.table_name || params.table || 'audit_logs').toLowerCase().trim();
    const partitionType = (params.partition_type || 'range').toLowerCase().trim();
    const partitionColumn = (params.partition_column || 'created_at').toLowerCase().trim();
    const dialect = String(params.dialect || 'postgresql').toLowerCase().trim();
    const interval = (params.interval || 'monthly').toLowerCase().trim();

    const currentYear = new Date().getUTCFullYear();
    const currentMonth = new Date().getUTCMonth() + 1;

    if (dialect === 'sqlite') {
      return {
        success: false,
        dialect: 'sqlite',
        table_name: tableName,
        error: 'SQLite does not support native table partitioning. Use table sharding or archive tables with ATTACH DATABASE.',
        recommended_alternative: `-- SQLite Sharding / Archival Pattern:\nCREATE TABLE ${tableName}_archive AS SELECT * FROM ${tableName} WHERE ${partitionColumn} < datetime('now', '-1 year');\nDELETE FROM ${tableName} WHERE ${partitionColumn} < datetime('now', '-1 year');\nVACUUM;`
      };
    }

    let upSql = '';
    let downSql = '';
    let partitionList = [];

    if (dialect === 'postgresql' || dialect === 'postgres') {
      // PostgreSQL Declarative Partitioning
      if (partitionType === 'range') {
        upSql = `-- 1. Rename existing table or create partitioned master table
CREATE TABLE ${tableName}_partitioned (
    id bigserial,
    tenant_id bigint,
    ${partitionColumn} timestamptz NOT NULL,
    payload jsonb,
    PRIMARY KEY (id, ${partitionColumn})
) PARTITION BY RANGE (${partitionColumn});\n\n-- 2. Create initial partitions for ${currentYear}\n`;

        for (let m = 1; m <= 12; m++) {
          const padM = String(m).padStart(2, '0');
          const nextM = m === 12 ? 1 : m + 1;
          const nextY = m === 12 ? currentYear + 1 : currentYear;
          const padNextM = String(nextM).padStart(2, '0');
          const partName = `${tableName}_y${currentYear}m${padM}`;
          partitionList.push(partName);

          upSql += `CREATE TABLE ${partName} PARTITION OF ${tableName}_partitioned
    FOR VALUES FROM ('${currentYear}-${padM}-01 00:00:00Z') TO ('${nextY}-${padNextM}-01 00:00:00Z');\n`;
        }

        downSql = `DROP TABLE IF EXISTS ${tableName}_partitioned CASCADE;`;
      } else {
        // List partitioning by tenant or region
        upSql = `CREATE TABLE ${tableName}_partitioned (
    id bigserial,
    tenant_id bigint NOT NULL,
    data text,
    PRIMARY KEY (id, tenant_id)
) PARTITION BY LIST (tenant_id);\n\n-- Default partition for unassigned tenants\nCREATE TABLE ${tableName}_default PARTITION OF ${tableName}_partitioned DEFAULT;\n`;
        downSql = `DROP TABLE IF EXISTS ${tableName}_partitioned CASCADE;`;
        partitionList.push(`${tableName}_default`);
      }
    } else {
      // MySQL / MariaDB Partitioning
      if (partitionType === 'range') {
        upSql = `-- Pre-requisite: In MySQL, the partitioning column MUST be included in the PRIMARY KEY and all UNIQUE indexes (to avoid Error 1503)
-- Step 1 (If needed): ALTER TABLE ${tableName} DROP PRIMARY KEY, ADD PRIMARY KEY (id, ${partitionColumn});

ALTER TABLE ${tableName} PARTITION BY RANGE (YEAR(${partitionColumn})) (\n`;
        const parts = [];
        for (let y = currentYear - 1; y <= currentYear + 3; y++) {
          parts.push(`    PARTITION p${y} VALUES LESS THAN (${y + 1})`);
          partitionList.push(`p${y}`);
        }
        parts.push(`    PARTITION p_max VALUES LESS THAN MAXVALUE`);
        partitionList.push('p_max');
        upSql += parts.join(',\n') + '\n);';

        downSql = `ALTER TABLE ${tableName} REMOVE PARTITIONING;`;
      } else {
        upSql = `ALTER TABLE ${tableName} PARTITION BY HASH(tenant_id) PARTITIONS 16;`;
        downSql = `ALTER TABLE ${tableName} REMOVE PARTITIONING;`;
        partitionList = Array.from({ length: 16 }, (_, i) => `p${i}`);
      }
    }

    const migration = MigrationEngine.generate({
      operation: 'raw_sql',
      table: tableName,
      dialect,
      sql_up: upSql,
      sql_down: downSql
    });

    return {
      success: true,
      table_name: tableName,
      partition_type: partitionType,
      partition_column: partitionColumn,
      dialect,
      interval,
      initial_partitions_count: partitionList.length,
      initial_partitions: partitionList,
      migration_code: migration.migration_code,
      archival_runbook: {
        detach_sql: dialect.includes('postgres')
          ? `ALTER TABLE ${tableName}_partitioned DETACH PARTITION ${partitionList[0]} CONCURRENTLY;`
          : `ALTER TABLE ${tableName} DROP PARTITION ${partitionList[0]};`,
        explanation: 'Detach historical partitions to cold storage or drop them instantly without locking active tables.'
      }
    };
  }
}

export default PartitionAdvisor;
