# Instructions for `database-mcp` MCP Server

The `database-mcp` MCP server provides Enterprise Database Architecture, Reversible Laravel Migrations, SARGable Query Optimization, Execution Plan (EXPLAIN) Diagnostics, Zero-Downtime Lock Risk Auditing, Connection Pooling (PgBouncer/ProxySQL), Table Partitioning, Data Masking (GDPR), Model Factories & Seeders, and Hardware Sizing for MariaDB, MySQL, PostgreSQL, and SQLite.

It operates **100% offline, deterministic, zero-token, and free**, strictly adhering to the **zero-direct-database-alterations** rule by emitting verified code, migrations, and runbooks.

---

## Mandatory Rules for AI Agents

### 1. Pre-Commit Database Quality Gate (`db_quality_gate`)
- **MUST be invoked before committing any database migrations.**
- Verifies that:
  - Every migration contains matching, tested `up()` and `down()` methods.
  - Multi-tenant migrations are strictly isolated under `database/migrations/tenant/` and unique keys are tenant-scoped.
  - PostgreSQL concurrent DDL declarations include `public bool $withinTransaction = false;`.
  - No blocking locks or raw non-concurrent DDL exist on production tables.
- In Antigravity, invoke via `call_mcp_tool`:
  ```json
  {
    "ServerName": "database-mcp",
    "ToolName": "db_quality_gate",
    "Arguments": {
      "workspace_path": "<project_root>"
    }
  }
  ```

---

### 2. Strictly Reversible Migrations (`db_generate_migration`)
- **Direct SQL modifications are forbidden in application repositories.** All schema changes must route through standard Laravel anonymous migrations.
- When generating migrations:
  - **Standard Scope:** Shared/system tables must target `database/migrations/`.
  - **Tenant Scope:** Multi-tenant SaaS business tables must target `database/migrations/tenant/`.
  - **Reversibility:** Every operation (`add_columns`, `drop_columns`, `modify_column`, `rename_column`, `drop_table`) must have an exact type-safe inverse in `down()`.
  - **Transaction Safety:** When running `CONCURRENTLY` on PostgreSQL, the migration class must define `public bool $withinTransaction = false;`.

---

### 3. Zero-Downtime Lock Hazard Auditing (`db_migration_audit`)
- **MUST be invoked before altering tables with over 100,000 estimated rows in production.**
- Analyzes:
  - Table rewrite risks on `MODIFY / CHANGE COLUMN`.
  - PostgreSQL `AccessExclusiveLock` on non-constant defaults, non-concurrent index drops, or raw `NOT NULL` additions.
  - Metadata lock (MDL) queues in MariaDB/MySQL.

---

### 4. SARGable Query Optimizer & Execution Plan Diagnostics (`db_analyze_query` & `db_explain_analyzer`)
- **Query Optimization (`db_analyze_query`):**
  - Detects non-SARGable functions (`YEAR(col)`, `LOWER(col)`, leading wildcards `%value`).
  - Groups ESR predicates by table alias across complex `JOIN`s.
  - Flags implicit type coercion (comparing strings with unquoted numbers) and detects AI vector distance operators (`<=>`, `<->`).
- **Execution Plan Diagnosis (`db_explain_analyzer`):**
  - Ingests raw text or JSON AST (`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`).
  - Pinpoints Sequential Scans (`Seq Scan` / `type: ALL`), filesorts, temporary disk spills, Buffer Hit Ratios, and JIT compilation overhead.

---

### 5. Multi-Tenant Relational Schema Design (`db_design_schema`)
- Converts entity specifications into standard Mermaid ER diagrams (`erDiagram`), topologically sorted migrations, and tenant isolation policies.
- Automatically synchronizes primary key conventions (`uuid`, `ulid`, `id`) with foreign key columns (`foreignUuid`, `foreignUlid`, `foreignId`).
- Automatically converts `unique: true` columns into tenant-scoped composite unique indexes `['tenant_id', ...col]`.

---

### 6. Connection Pooling & High-Availability (`db_tune_connection_pooler`)
- In high-concurrency environments, PHP direct connections exhaust database connections.
- Use `db_tune_connection_pooler` to generate:
  - `pgbouncer.ini` (Transaction Pooling mode) for PostgreSQL.
  - ProxySQL Read/Write splitting configuration for MySQL/MariaDB.

---

### 7. Data Masking & GDPR Sanitization (`db_data_masking_runbook`)
- Use `db_data_masking_runbook` to generate production sanitization scripts before restoring customer data to staging, QA, or development environments.

---

### 8. Model Factories & Seeders (`db_generate_seeder_factory`)
- Accelerates testing by generating type-safe Faker factories and multi-tenant seeders matching table columns.

---

### 9. High-Volume Table Partitioning (`db_partitioning_advisor`)
- For tables exceeding 10M+ rows (ERP ledgers, audit logs, invoice items), use `db_partitioning_advisor` to generate declarative Range or List partitioning migrations, batched backfill loops, zero-downtime cutover swaps, and partition detachment runbooks.

---

### 10. Hardware Sizing & Engine Parameter Tuning (`db_tune_server_config`)
- Calculates exact configuration profiles (`postgresql.conf`, `my.cnf`, and SQLite WAL PRAGMAs) dynamically tuned to server hardware:
  - Memory allocation: `shared_buffers`, `effective_cache_size`, `work_mem`, `innodb_buffer_pool_size`.
  - Storage I/O: NVMe SSD concurrency parameters (`random_page_cost = 1.1`, `effective_io_concurrency = 200`, `innodb_io_capacity = 2000`).
  - OS Kernel sysctl optimizations: `vm.swappiness = 10`, `fs.file-max`, and transparent huge page guidelines.

---

### 11. Disaster Recovery & Hot Backup Runbooks (`db_backup_restore_runbook`)
- Generates verified, zero-downtime hot backup scripts, continuous WAL/binlog archiving configurations, and Point-In-Time Recovery (PITR) procedures:
  - **MariaDB:** `mariabackup --backup` with non-blocking transactional consistency.
  - **MySQL:** Online physical and logical dumps (`mysqldump --single-transaction --quick`).
  - **PostgreSQL:** `pg_basebackup` with continuous streaming WAL replication.
  - **SQLite:** Zero-downtime hot backups via native `VACUUM INTO` API.
