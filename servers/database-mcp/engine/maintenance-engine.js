/**
 * @file maintenance-engine.js
 * @description Enterprise Database Health, Bloat Diagnostics, Replication Monitoring,
 * Disaster Recovery, and Maintenance Runbooks for MariaDB, MySQL, and PostgreSQL.
 */

class MaintenanceEngine {
  /**
   * Generate diagnostic queries and maintenance runbooks.
   * @param {Object} params
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql'
   * @param {string} [params.task='all'] - 'bloat' | 'fragmentation' | 'locks' | 'unused_indexes' | 'replication' | 'connections' | 'all'
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
   * Generate dedicated Disaster Recovery and Backup/Restore Runbook
   */
  static getBackupRunbook(params) {
    const { dialect = 'mariadb', database_name = '<database_name>', backup_type = 'both' } = params;
    const d = dialect.toLowerCase();

    if (d === 'postgresql') {
      return {
        dialect: 'postgresql',
        database: database_name,
        logical_backup: {
          description: 'Compressed custom-format pg_dump with parallel thread restore capabilities.',
          backup_command: `pg_dump -Fc -h 127.0.0.1 -U postgres ${database_name} > backup_${database_name}_$(date +%Y%m%d_%H%M%S).dump`,
          restore_command: `pg_restore -d ${database_name} -j 4 --clean --if-exists backup_${database_name}.dump`,
          cron_daily_schedule: `0 2 * * * pg_dump -Fc -h 127.0.0.1 -U postgres ${database_name} > /backups/pg/daily_$(date +\\%F).dump && find /backups/pg/ -type f -mtime +7 -delete`
        },
        physical_backup_pitr: {
          description: 'Continuous WAL Archiving and Point-In-Time Recovery (PITR) using pg_basebackup.',
          basebackup_command: `pg_basebackup -h 127.0.0.1 -U replicator -D /var/lib/postgresql/backup_$(date +%F) -Fp -Xs -P -R`,
          wal_archive_setting: `archive_mode = on\narchive_command = 'test ! -f /mnt/wal_archive/%f && cp %p /mnt/wal_archive/%f'`,
          pitr_recovery_target: `restore_command = 'cp /mnt/wal_archive/%f %p'\nrecovery_target_time = '2026-10-20 08:30:00 UTC'`
        }
      };
    } else {
      return {
        dialect: d,
        database: database_name,
        logical_backup: {
          description: 'mysqldump/mariadb-dump with single-transaction lock-free read consistency for InnoDB.',
          backup_command: `mysqldump -u root -p --single-transaction --quick --routines --triggers --events ${database_name} | gzip > backup_${database_name}_$(date +%F).sql.gz`,
          restore_command: `gunzip < backup_${database_name}.sql.gz | mysql -u root -p ${database_name}`,
          cron_daily_schedule: `0 2 * * * mysqldump -u root -p --single-transaction --quick --routines --triggers ${database_name} | gzip > /backups/mysql/daily_$(date +\\%F).sql.gz && find /backups/mysql/ -type f -mtime +7 -delete`
        },
        physical_backup_hot: {
          description: 'Non-blocking physical InnoDB backup using MariaBackup / Percona XtraBackup.',
          mariabackup_command: `mariabackup --backup --target-dir=/data/backup/$(date +%F) --user=root`,
          prepare_command: `mariabackup --prepare --target-dir=/data/backup/<date>`,
          restore_command: `mariabackup --copy-back --target-dir=/data/backup/<date>`
        }
      };
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

    // 4. Replication Health & Lag
    if (task === 'replication' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Replication Health & Byte Lag',
        description: 'Monitors PostgreSQL physical streaming replication and WAL sender/receiver byte difference.',
        diagnostic_sql: `SELECT
    client_addr,
    application_name,
    state,
    sync_state,
    sync_priority,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    ROUND(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024.0 / 1024.0, 2) AS lag_mb
FROM pg_stat_replication;`,
        remediation_action: 'If lag_mb is growing, check replica disk write throughput, max_wal_size, or increase max_parallel_workers on the replica.'
      });
    }

    // 5. Connection Starvation & Idle In Transaction
    if (task === 'connections' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Idle in Transaction Connection Audit',
        description: 'Detects connections holding transactions open without active queries, blocking autovacuum and freezing transaction ID horizon.',
        diagnostic_sql: `SELECT
    pid,
    usename,
    client_addr,
    state,
    NOW() - state_change AS idle_duration,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND NOW() - state_change > interval '5 seconds'
ORDER BY state_change ASC;`,
        remediation_action: 'Set idle_in_transaction_session_timeout = "30s" in postgresql.conf to automatically terminate zombie transactions.'
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

    // 4. Replication Status
    if (task === 'replication' || task === 'all') {
      runbook.diagnostic_tasks.push({
        title: 'Replication Health & Seconds Behind Master',
        description: 'Checks MySQL / MariaDB replica thread status, I/O thread, SQL thread, and replication lag.',
        diagnostic_sql: flavor === 'mysql' ? 'SHOW REPLICA STATUS\\G' : 'SHOW SLAVE STATUS\\G',
        remediation_action: 'Check Seconds_Behind_Source / Seconds_Behind_Master. If Replica_SQL_Running is No, investigate Last_SQL_Error.'
      });
    }

    return runbook;
  }
}

export { MaintenanceEngine };
export default MaintenanceEngine;
