/**
 * @file maintenance-engine.js
 * @description Enterprise Database Health, Bloat Diagnostics, and Maintenance Runbooks
 * for MariaDB, MySQL, and PostgreSQL.
 */

class MaintenanceEngine {
  /**
   * Generate diagnostic queries and maintenance runbooks.
   * @param {Object} params
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql'
   * @param {string} [params.task='all'] - 'bloat' | 'fragmentation' | 'locks' | 'unused_indexes' | 'all'
   * @param {string} [params.table] - Target table name
   * @returns {Object} Comprehensive maintenance runbook with executable diagnostic SQL and remediation scripts
   */
  static getRunbook(params) {
    const { dialect = 'mariadb', task = 'all', table = null } = params;
    const normalizedDialect = dialect.toLowerCase();

    if (normalizedDialect === 'postgresql') {
      return this._getPostgresqlRunbook(task, table);
    } else {
      return this._getMySQLRunbook(normalizedDialect, task, table);
    }
  }

  /**
   * PostgreSQL Runbook
   */
  static _getPostgresqlRunbook(task, targetTable) {
    const runbook = {
      dialect: 'postgresql',
      diagnostic_tasks: []
    };

    // 1. Table and Dead Tuple Bloat
    if (task === 'bloat' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Table Dead Tuple & Bloat Inspection',
        description: 'Identifies tables with high percentages of dead tuples requiring autovacuum intervention.',
        diagnostic_sql: `SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_ratio_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
${targetTable ? `WHERE relname = '${targetTable}'` : ''}
ORDER BY n_dead_tup DESC
LIMIT 20;`,
        remediation_action: 'Perform a non-blocking VACUUM ANALYZE. If bloat is severe and space must be reclaimed immediately without downtime, use pg_repack.',
        remediation_sql: targetTable ? `VACUUM (ANALYZE, VERBOSE) ${targetTable};` : `VACUUM (ANALYZE, VERBOSE);`,
        cli_command: targetTable
          ? `sudo -u postgres vacuumdb --analyze --verbose --table=${targetTable} <database_name>`
          : `sudo -u postgres vacuumdb --analyze --verbose --all`
      });
    }

    // 2. Index Health & Reindexing
    if (task === 'fragmentation' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Zero-Downtime Index Rebuilding',
        description: 'Rebuilds bloated B-Tree indexes concurrently without blocking concurrent read/write traffic.',
        diagnostic_sql: `SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
${targetTable ? `WHERE relname = '${targetTable}'` : ''}
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;`,
        remediation_sql: targetTable
          ? `REINDEX TABLE CONCURRENTLY ${targetTable};`
          : `-- Reindex specific bloated tables concurrently:\nREINDEX TABLE CONCURRENTLY <table_name>;`,
        cli_command: targetTable
          ? `sudo -u postgres reindexdb --concurrently --table=${targetTable} <database_name>`
          : `sudo -u postgres reindexdb --concurrently <database_name>`
      });
    }

    // 3. Lock & Blocking Queries
    if (task === 'locks' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Active Locks & Transaction Blockers',
        description: 'Finds queries that are waiting for locks and the blocking PID that holds them.',
        diagnostic_sql: `SELECT
    blocked_locks.pid     AS blocked_pid,
    blocked_activity.usename  AS blocked_user,
    blocking_locks.pid    AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query    AS blocked_statement,
    blocking_activity.query   AS blocking_statement,
    NOW() - blocked_activity.query_start AS blocked_duration
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;`,
        remediation_action: 'To terminate a blocking PID safely: SELECT pg_cancel_backend(<blocking_pid>); or if unresponsive: SELECT pg_terminate_backend(<blocking_pid>);'
      });
    }

    return runbook;
  }

  /**
   * MariaDB & MySQL Runbook
   */
  static _getMySQLRunbook(flavor, task, targetTable) {
    const runbook = {
      dialect: flavor,
      diagnostic_tasks: []
    };

    // 1. Table Fragmentation & Data Free
    if (task === 'fragmentation' || task === 'bloat' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Table Fragmentation & Free Space Analysis',
        description: 'Calculates wasted disk space (DATA_FREE) caused by deletes and page splits.',
        diagnostic_sql: `SELECT 
    table_schema,
    table_name,
    engine,
    ROUND(data_length / 1024 / 1024, 2) AS data_size_mb,
    ROUND(index_length / 1024 / 1024, 2) AS index_size_mb,
    ROUND(data_free / 1024 / 1024, 2) AS data_free_mb,
    ROUND((data_free / (data_length + index_length + data_free)) * 100, 2) AS fragmentation_pct
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
  ${targetTable ? `AND table_name = '${targetTable}'` : ''}
  AND data_free > 50 * 1024 * 1024
ORDER BY data_free DESC
LIMIT 20;`,
        remediation_action: 'Defragment table using Online DDL (ALGORITHM=INPLACE). Reclaims unused space and rebuilds clustered indexes.',
        remediation_sql: targetTable
          ? `ALTER TABLE ${targetTable} ENGINE=InnoDB, ALGORITHM=INPLACE, LOCK=NONE;`
          : `OPTIMIZE TABLE <table_name>;`,
        cli_command: targetTable
          ? `mysqlcheck -u root -p --optimize --tables <database_name> ${targetTable}`
          : `mysqlcheck -u root -p --optimize --all-databases`
      });
    }

    // 2. Unused Indexes
    if (task === 'unused_indexes' || task === 'all') {
      const unusedSql = flavor === 'mysql'
        ? `SELECT object_schema, object_name, index_name FROM sys.schema_unused_indexes WHERE object_schema NOT IN ('sys', 'mysql');`
        : `-- MariaDB (Requires userstat = 1 in my.cnf)\nSELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, ROWS_READ FROM information_schema.INDEX_STATISTICS WHERE ROWS_READ = 0;`;

      runbook.diagnostic_tasks.push({
        title: 'Unused Index Audit',
        description: 'Detects indexes that consume write I/O and RAM but are never utilized by queries.',
        diagnostic_sql: unusedSql,
        remediation_action: 'Verify over multiple business cycles before dropping unused indexes via reversible Laravel migration: $table->dropIndex("idx_name");'
      });
    }

    // 3. Processlist & Metadata Locks
    if (task === 'locks' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Active Queries & Metadata Lock (MDL) Queue',
        description: 'Inspects long-running transactions and processes holding or waiting for metadata locks.',
        diagnostic_sql: `SELECT 
    id AS process_id,
    user,
    host,
    db,
    command,
    time AS elapsed_seconds,
    state,
    info AS query_text
FROM information_schema.processlist
WHERE command != 'Sleep' AND time > 5
ORDER BY time DESC;`,
        remediation_action: 'Kill hung query: KILL QUERY <process_id>; or terminate connection: KILL <process_id>;'
      });
    }

    return runbook;
  }
}

export { MaintenanceEngine };
export default MaintenanceEngine;

