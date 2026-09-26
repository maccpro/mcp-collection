/**
 * @file config-tuner.js
 * @description Enterprise Hardware Sizing and Server Configuration Tuner for MariaDB, MySQL, and PostgreSQL.
 * Computes optimal memory, I/O, concurrency, and WAL/redo log parameters based on RAM, vCPU, and NVMe SSD metrics.
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
   * @param {string} [params.dialect='mariadb'] - 'mariadb' | 'mysql' | 'postgresql'
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
    } else if (normalizedDialect === 'mysql') {
      return this._tuneMySQL({ ram_gb, vcpu, disk_type, workload, isDedicated, flavor: 'mysql' });
    } else {
      return this._tuneMySQL({ ram_gb, vcpu, disk_type, workload, isDedicated, flavor: 'mariadb' });
    }
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

# --- DISK & I/O TUNING (${disk_type.toUpperCase()}) ---
random_page_cost = ${randomPageCost}
effective_io_concurrency = ${effectiveIoConcurrency}

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

# --- QUERY PLANNER ---
default_statistics_target = 100
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
      config_file_content: configContent
    };
  }

  /**
   * MariaDB & MySQL Configuration Tuning
   */
  static _tuneMySQL({ ram_gb, vcpu, disk_type, workload, isDedicated, flavor }) {
    const ramMB = ram_gb * 1024;
    const ramRatio = isDedicated ? 0.70 : 0.40;

    // innodb_buffer_pool_size: 70% of RAM on dedicated, 40% on shared
    const bufferPoolMB = Math.round(ramMB * ramRatio);
    // Buffer pool instances: 1 per GB, max 64
    const bufferPoolInstances = Math.min(64, Math.max(1, Math.floor(bufferPoolMB / 1024)));

    // max_connections
    const maxConnections = isDedicated
      ? (ram_gb >= 64 ? 400 : ram_gb >= 16 ? 250 : 150)
      : (ram_gb >= 16 ? 150 : 75);

    // I/O Capacity
    let ioCapacity = 2000;
    let ioCapacityMax = 4000;
    if (disk_type === 'nvme') {
      ioCapacity = 4000;
      ioCapacityMax = 8000;
    } else if (disk_type === 'hdd') {
      ioCapacity = 200;
      ioCapacityMax = 400;
    }

    // Redo log sizing
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
      config_file_content: configContent
    };
  }
}

export { ConfigTuner };
export default ConfigTuner;

