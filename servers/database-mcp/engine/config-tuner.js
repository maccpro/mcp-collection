/**
 * @file config-tuner.js
 * @description Enterprise Hardware Sizing, Server Configuration, and Connection Pooler Tuner
 * for MariaDB, MySQL, PostgreSQL, SQLite, PgBouncer, and ProxySQL.
 */

class ConfigTuner {
  /**
   * Tune database server configuration based on hardware and workload.
   * @param {Object} params
   * @param {number} params.ram_gb - Server RAM in Gigabytes
   * @param {number} [params.vcpu=4] - Number of vCPU cores
   * @param {string} [params.disk_type='nvme'] - 'nvme' | 'sata_ssd' | 'hdd'
   * @param {string} [params.workload='oltp'] - 'oltp' | 'data_warehouse' | 'mixed'
   * @param {string} [params.server_type='dedicated'] - 'dedicated' | 'shared' (shared with web server)
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql' | 'sqlite'
   * @returns {Object} Tuned configuration parameters and ready-to-use config file contents
   */
  static tune(params) {
    const {
      ram_gb,
      vcpu = 4,
      disk_type = 'nvme',
      workload = 'oltp',
      server_type = 'dedicated',
      dialect = 'mariadb'
    } = params;

    if (!ram_gb || ram_gb <= 0) {
      throw new Error('ram_gb must be a positive number (RAM in Gigabytes).');
    }

    const normalizedDialect = dialect.toLowerCase();
    const isDedicated = server_type === 'dedicated';

    if (normalizedDialect === 'postgresql') {
      return this._tunePostgresql({ ram_gb, vcpu, disk_type, workload, isDedicated });
    } else if (normalizedDialect === 'sqlite') {
      return this._tuneSQLite({ ram_gb, vcpu });
    } else if (normalizedDialect === 'mysql') {
      return this._tuneMySQL({ ram_gb, vcpu, disk_type, workload, isDedicated, flavor: 'mysql' });
    } else {
      return this._tuneMySQL({ ram_gb, vcpu, disk_type, workload, isDedicated, flavor: 'mariadb' });
    }
  }

  /**
   * Tune Connection Pooler (PgBouncer or ProxySQL)
   * @param {Object} params
   * @param {string} [params.pooler='pgbouncer'] - 'pgbouncer' | 'proxysql'
   * @param {number} [params.max_client_connections=2000] - Expected concurrent client connections
   * @param {number} [params.vcpu=4] - Host vCPUs
   * @param {string} [params.db_host='127.0.0.1'] - Target DB host
   * @param {number} [params.db_port=5432] - Target DB port
   * @param {string} [params.database_name='app_production'] - Target DB name
   * @returns {Object} Production pooler configuration files and deployment instructions
   */
  static tunePooler(params = {}) {
    const {
      pooler = 'pgbouncer',
      max_client_connections = 2000,
      vcpu = 4,
      db_host = '127.0.0.1',
      db_port = 5432,
      database_name = 'app_production'
    } = params;

    const normPooler = pooler.toLowerCase();

    if (normPooler === 'pgbouncer' || normPooler === 'postgres' || normPooler === 'postgresql') {
      const defaultPoolSize = Math.max(20, Math.min(100, vcpu * 5));
      const minPoolSize = Math.max(5, Math.floor(defaultPoolSize / 4));
      const reservePoolSize = 5;

      const pgbouncerIni = `# PgBouncer Enterprise Production Configuration
# Optimized for High-Concurrency Web / PHP-FPM / Laravel Workloads

[databases]
${database_name} = host=${db_host} port=${db_port} dbname=${database_name} auth_user=postgres

[pgbouncer]
# --- NETWORK & SOCKETS ---
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
admin_users = postgres, app_admin
stats_users = monitoring

# --- POOLING STRATEGY (CRUCIAL) ---
# 'transaction' mode allows thousands of concurrent web requests to share a small pool of PostgreSQL backends.
pool_mode = transaction

# --- CONNECTION LIMITS ---
max_client_conn = ${max_client_connections}
default_pool_size = ${defaultPoolSize}
min_pool_size = ${minPoolSize}
reserve_pool_size = ${reservePoolSize}
reserve_pool_timeout = 5.0
max_db_connections = ${defaultPoolSize + reservePoolSize + 20}

# --- TIMEOUTS & SANITY ---
server_idle_timeout = 600.0
server_connect_timeout = 15.0
server_login_retry = 1.0
client_idle_timeout = 0.0
client_login_timeout = 60.0
query_timeout = 0.0
query_wait_timeout = 120.0

# --- PERFORMANCE & BUFFERING ---
pkt_buf = 4096
max_packet_size = 2147483648
tcp_defer_accept = 1
tcp_socket_buffer = 0
tcp_keepalive = 1
tcp_keepidle = 30
tcp_keepintvl = 10
tcp_keepcnt = 3
`;

      const userlistTxt = `"postgres" "SCRAM-SHA-256$<hash>"\n"app_user" "SCRAM-SHA-256$<hash>"`;

      return {
        pooler: 'pgbouncer',
        pool_mode: 'transaction',
        max_client_connections,
        backend_pool_size: defaultPoolSize,
        files: {
          '/etc/pgbouncer/pgbouncer.ini': pgbouncerIni,
          '/etc/pgbouncer/userlist.txt': userlistTxt
        },
        systemd_service: 'sudo systemctl restart pgbouncer',
        laravel_database_config_note: 'Update config/database.php: set pgsql port to 6432. Set "options" => "-c statement_timeout=5000" and disable PDO ATTR_EMULATE_PREPARES.'
      };
    } else {
      // ProxySQL for MariaDB/MySQL
      const proxySqlConfig = `# ProxySQL Production Sizing for MySQL / MariaDB Read-Write Splitting
# Admin Interface on port 6032, Incoming App Connections on port 6033

# --- 1. DEFINE HOSTGROUPS (0 = Writer, 1 = Reader) ---
INSERT INTO mysql_servers (hostgroup_id, hostname, port, max_connections) VALUES
(0, '${db_host}', 3306, 100),
(1, '${db_host}', 3307, 200);

# --- 2. DEFINE APPLICATION USERS ---
INSERT INTO mysql_users (username, password, default_hostgroup) VALUES
('app_user', 'strong_password', 0);

# --- 3. CONFIGURE QUERY ROUTING RULES ---
-- Send SELECT ... FOR UPDATE to writer (hostgroup 0)
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, apply) VALUES
(1, 1, '^SELECT.*FOR UPDATE', 0, 1),
-- Send standard SELECT queries to read replicas (hostgroup 1)
(2, 1, '^SELECT', 1, 1);

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
`;

      return {
        pooler: 'proxysql',
        incoming_port: 6033,
        admin_port: 6032,
        files: {
          '/etc/proxysql-setup.sql': proxySqlConfig
        },
        execution_command: 'mysql -u admin -padmin -h 127.0.0.1 -P 6032 < /etc/proxysql-setup.sql'
      };
    }
  }

  /**
   * SQLite Configuration Tuning
   */
  static _tuneSQLite({ ram_gb, vcpu }) {
    const pragmas = `-- SQLite Enterprise High-Concurrency Production Tuning
-- Enables Write-Ahead Logging (WAL) and concurrent reader execution

PRAGMA journal_mode = WAL;          -- Allows concurrent readers while a writer writes
PRAGMA synchronous = NORMAL;         -- 2-3x write throughput improvement without corrupting DB
PRAGMA busy_timeout = 5000;          -- Wait up to 5000ms on lock contention before returning SQLITE_BUSY
PRAGMA cache_size = -64000;          -- 64MB dedicated RAM cache (negative number = kilobytes)
PRAGMA foreign_keys = ON;            -- Strict foreign key enforcement
PRAGMA temp_store = MEMORY;          -- Store temp tables and indices in RAM
PRAGMA mmap_size = 268435456;        -- 256MB Memory-mapped I/O
PRAGMA auto_vacuum = INCREMENTAL;    -- Reclaim page space incrementally
`;

    return {
      dialect: 'sqlite',
      hardware: { ram_gb, vcpu },
      computed_parameters: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        busy_timeout: '5000ms',
        cache_size: '64MB',
        mmap_size: '256MB'
      },
      recommended_config_path: 'Executed via DB::statement() on application boot or in database connection config',
      config_file_content: pragmas,
      laravel_connection_snippet: `'sqlite' => [
    'driver' => 'sqlite',
    'url' => env('DB_URL'),
    'database' => env('DB_DATABASE', database_path('database.sqlite')),
    'prefix' => '',
    'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
    'busy_timeout' => 5000,
    'journal_mode' => 'WAL',
    'synchronous' => 'NORMAL',
],`
    };
  }

  /**
   * PostgreSQL Configuration Tuning
   */
  static _tunePostgresql({ ram_gb, vcpu, disk_type, workload, isDedicated }) {
    // 1. Memory calculations
    const ramMB = ram_gb * 1024;
    const ramRatio = isDedicated ? 1.0 : 0.5;

    // shared_buffers: 25% of RAM
    const sharedBuffersMB = Math.round(ramMB * 0.25 * ramRatio);
    // effective_cache_size: 75% of RAM
    const effectiveCacheSizeMB = Math.round(ramMB * 0.75 * ramRatio);
    // maintenance_work_mem: 5% of RAM up to 2GB
    const maintenanceWorkMemMB = Math.min(2048, Math.round(ramMB * 0.05 * ramRatio));

    // max_connections
    const maxConnections = isDedicated
      ? (ram_gb >= 64 ? 300 : ram_gb >= 16 ? 200 : 100)
      : (ram_gb >= 16 ? 100 : 50);

    // work_mem: (Total RAM - shared_buffers) / (max_connections * 3)
    const workMemMB = Math.max(4, Math.round(((ramMB * ramRatio) - sharedBuffersMB) / (maxConnections * 3)));

    // 2. Storage and I/O parameters
    let randomPageCost = 1.1;
    let effectiveIoConcurrency = 200;
    if (disk_type === 'sata_ssd') {
      randomPageCost = 1.5;
      effectiveIoConcurrency = 100;
    } else if (disk_type === 'hdd') {
      randomPageCost = 4.0;
      effectiveIoConcurrency = 2;
    }

    // 3. Parallelism based on vCPU
    const maxWorkerProcesses = vcpu;
    const maxParallelWorkersPerGather = Math.max(1, Math.floor(vcpu / 2));
    const maxParallelWorkers = vcpu;
    const maxParallelMaintenanceWorkers = Math.max(1, Math.min(4, Math.floor(vcpu / 2)));

    // WAL size
    const minWalSize = ram_gb >= 16 ? '2GB' : '1GB';
    const maxWalSize = ram_gb >= 32 ? '16GB' : ram_gb >= 16 ? '8GB' : '4GB';

    const configContent = `# PostgreSQL Enterprise Production Configuration
# Hardware Profile: ${ram_gb} GB RAM | ${vcpu} vCPUs | ${disk_type.toUpperCase()} Storage (${isDedicated ? 'Dedicated DB' : 'Shared Web+DB'})
# Workload: ${workload.toUpperCase()}

# --- CONNECTIONS & RESOURCE USAGE ---
max_connections = ${maxConnections}
shared_buffers = ${sharedBuffersMB}MB
effective_cache_size = ${effectiveCacheSizeMB}MB
maintenance_work_mem = ${maintenanceWorkMemMB}MB
work_mem = ${workMemMB}MB
wal_buffers = 16MB
min_wal_size = ${minWalSize}
max_wal_size = ${maxWalSize}
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
wal_compression = on

# --- DISK & I/O TUNING (${disk_type.toUpperCase()}) ---
random_page_cost = ${randomPageCost}
effective_io_concurrency = ${effectiveIoConcurrency}
track_io_timing = on
track_activity_query_size = 4096

# --- PARALLEL WORKERS (${vcpu} vCPUs) ---
max_worker_processes = ${maxWorkerProcesses}
max_parallel_workers = ${maxParallelWorkers}
max_parallel_workers_per_gather = ${maxParallelWorkersPerGather}
max_parallel_maintenance_workers = ${maxParallelMaintenanceWorkers}

# --- AUTOVACUUM PRODUCTION TUNING ---
autovacuum = on
autovacuum_max_workers = ${Math.max(3, Math.floor(vcpu / 2))}
autovacuum_vacuum_cost_limit = 2000
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02

# --- QUERY PLANNER & STATS ---
default_statistics_target = 100
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
`;

    return {
      dialect: 'postgresql',
      hardware: { ram_gb, vcpu, disk_type, is_dedicated: isDedicated },
      computed_parameters: {
        shared_buffers: `${sharedBuffersMB}MB`,
        effective_cache_size: `${effectiveCacheSizeMB}MB`,
        work_mem: `${workMemMB}MB`,
        maintenance_work_mem: `${maintenanceWorkMemMB}MB`,
        max_connections: maxConnections,
        random_page_cost: randomPageCost,
        effective_io_concurrency: effectiveIoConcurrency,
        max_parallel_workers: maxParallelWorkers
      },
      recommended_config_path: '/etc/postgresql/<version>/main/postgresql.conf',
      config_file_content: configContent,
      linux_os_tuning: {
        sysctl: {
          'vm.swappiness': 10,
          'vm.dirty_background_ratio': 3,
          'vm.dirty_ratio': 10,
          'fs.file-max': 2097152
        },
        transparent_hugepage: ram_gb >= 32 ? 'madvise' : 'never'
      }
    };
  }

  /**
   * MariaDB & MySQL Configuration Tuning
   */
  static _tuneMySQL({ ram_gb, vcpu, disk_type, workload, isDedicated, flavor }) {
    const ramMB = ram_gb * 1024;
    const ramRatio = isDedicated ? 0.70 : 0.40;

    const bufferPoolMB = Math.round(ramMB * ramRatio);
    const bufferPoolInstances = Math.min(64, Math.max(1, Math.floor(bufferPoolMB / 1024)));

    const maxConnections = isDedicated
      ? (ram_gb >= 64 ? 400 : ram_gb >= 16 ? 250 : 150)
      : (ram_gb >= 16 ? 150 : 75);

    let ioCapacity = 2000;
    let ioCapacityMax = 4000;
    if (disk_type === 'nvme') {
      ioCapacity = 4000;
      ioCapacityMax = 8000;
    } else if (disk_type === 'hdd') {
      ioCapacity = 200;
      ioCapacityMax = 400;
    }

    const redoLogSizeMB = Math.min(2048, Math.max(256, Math.round(bufferPoolMB * 0.25)));

    const configContent = `# ${flavor.toUpperCase()} Enterprise Production Configuration (my.cnf)
# Hardware Profile: ${ram_gb} GB RAM | ${vcpu} vCPUs | ${disk_type.toUpperCase()} Storage (${isDedicated ? 'Dedicated DB' : 'Shared Web+DB'})
# Workload: ${workload.toUpperCase()}

[mysqld]
# --- CONNECTION LIMITS ---
max_connections                = ${maxConnections}
max_connect_errors             = 1000000
wait_timeout                   = 600
interactive_timeout            = 600
${flavor === 'mariadb' ? 'thread_handling                = pool-of-threads' : ''}

# --- INNODB BUFFER POOL & MEMORY ---
innodb_buffer_pool_size        = ${bufferPoolMB}M
innodb_buffer_pool_instances  = ${bufferPoolInstances}
innodb_log_buffer_size         = 64M
innodb_flush_log_at_trx_commit = 1
innodb_flush_method            = O_DIRECT

# --- REDO LOG SIZING ---
${flavor === 'mysql' ? `innodb_redo_log_capacity       = ${redoLogSizeMB * 2}M` : `innodb_log_file_size          = ${redoLogSizeMB}M`}

# --- I/O & NVMe OPTIMIZATION (${disk_type.toUpperCase()}) ---
innodb_io_capacity             = ${ioCapacity}
innodb_io_capacity_max         = ${ioCapacityMax}
innodb_read_io_threads         = ${Math.min(16, Math.max(4, vcpu))}
innodb_write_io_threads        = ${Math.min(16, Math.max(4, vcpu))}

# --- THREAD & TABLE CACHE ---
thread_cache_size              = ${Math.min(128, Math.max(16, vcpu * 4))}
table_open_cache               = 4096
table_definition_cache         = 2048
tmp_table_size                 = 64M
max_heap_table_size            = 64M

# --- SLOW QUERY LOGGING ---
slow_query_log                 = 1
long_query_time                = 1.0
log_queries_not_using_indexes  = 0
min_examined_row_limit         = 1000

# --- CHARACTER SET & COLLATION ---
character-set-server           = utf8mb4
collation-server               = utf8mb4_unicode_ci
`;

    const configPath = flavor === 'mariadb' ? '/etc/mysql/mariadb.conf.d/50-server.cnf' : '/etc/mysql/mysql.conf.d/mysqld.cnf';

    return {
      dialect: flavor,
      hardware: { ram_gb, vcpu, disk_type, is_dedicated: isDedicated },
      computed_parameters: {
        innodb_buffer_pool_size: `${bufferPoolMB}M`,
        innodb_buffer_pool_instances: bufferPoolInstances,
        max_connections: maxConnections,
        innodb_io_capacity: ioCapacity,
        innodb_io_capacity_max: ioCapacityMax,
        innodb_flush_method: 'O_DIRECT'
      },
      recommended_config_path: configPath,
      config_file_content: configContent,
      linux_os_tuning: {
        sysctl: {
          'vm.swappiness': 10,
          'vm.dirty_background_ratio': 3,
          'vm.dirty_ratio': 10,
          'fs.file-max': 2097152
        },
        transparent_hugepage: 'never'
      }
    };
  }
}

export { ConfigTuner };
export default ConfigTuner;
