# @maccpro/database-mcp

> **Enterprise Database Architecture, Reversible Migrations, SARGable Query Optimizer, EXPLAIN Plan Diagnostics, Connection Pooler & Hardware Tuner for MariaDB, MySQL, PostgreSQL & SQLite**
> 100% Offline, Deterministic, Zero-Token & Free.

`database-mcp` is an enterprise Model Context Protocol (MCP) server engineered for production backend systems, multi-tenant SaaS applications, and high-performance database administration. It guarantees strict adherence to zero direct database modifications by outputting reversible Laravel migrations (`up()` & `down()`), analyzes queries for SARGability and composite B-Tree/GIN/HNSW indexes, diagnoses `EXPLAIN` execution plans (both text and JSON AST), detects zero-downtime lock hazards, calculates NVMe/RAM hardware tuning configurations with Linux OS sysctl parameters, generates disaster recovery runbooks, generates PgBouncer and ProxySQL connection pooling configs, provides GDPR data masking scripts, creates model factories & seeders, designs declarative table partitioning, and enforces a pre-commit database quality gate.

---

## Key Features

1. **Mandatory Reversible Laravel Migrations (`db_generate_migration`)**
   - Strictly outputs reversible anonymous migrations with matching `up()` and `down()` methods.
   - Operations: `create_table`, `drop_table`, `add_columns`, `drop_columns`, `modify_column`, `rename_column`, `rename_table`, `add_indexes`, `drop_indexes`, `add_foreign_keys`, `drop_foreign_keys`, `raw_sql`.
   - Automatic multi-tenant composite unique index scoping (`['tenant_id', ...column]`).
   - Dynamic foreign key typing matching primary keys (`foreignUuid`, `foreignUlid`, `foreignId`).
   - Automatic `public bool $withinTransaction = false;` emission on PostgreSQL concurrent DDL.
   - Full dialect mapping for MariaDB, MySQL, PostgreSQL, and SQLite (pgvector, ULID, UUID, TinyInt, Enum, JSON/JSONB, spatial, polymorphic morphs).

2. **SARGable Query Optimizer & ESR Index Advisor (`db_analyze_query`)**
   - Detects non-SARGable query anti-patterns (`YEAR(col)`, `DATE(col)`, `LOWER(col)`, leading `%wildcards`, column arithmetic).
   - Groups ESR predicates by table alias across complex `JOIN`s without cross-table index pollution.
   - Flags implicit type coercion and detects AI vector similarity operators (`<=>`, `<->`).
   - Recommends zero-downtime DDL (`CONCURRENTLY` in PostgreSQL, `ALGORITHM=INPLACE, LOCK=NONE` in MariaDB/MySQL).

3. **Execution Plan Analyzer (`db_explain_analyzer`)**
   - Parses raw text or JSON AST `EXPLAIN` and `EXPLAIN ANALYZE` output from PostgreSQL, MariaDB, MySQL, and SQLite.
   - Detects Sequential Scans (`Seq Scan`, `type: ALL`), filesorts, temporary table creation, disk sort spills (`external merge Disk`), cardinality estimation mismatches, Buffer Hit Ratios, and JIT compilation overhead.

4. **Connection Pooler Tuner (`db_tune_connection_pooler`)**
   - Generates production `pgbouncer.ini` (Transaction Pooling mode) and `userlist.txt` for PostgreSQL.
   - Generates ProxySQL Read/Write splitting configuration for MySQL/MariaDB.

5. **GDPR Data Masking Runbook (`db_data_masking_runbook`)**
   - Generates automated SQL data scrubbing scripts to safely anonymize customer PII (emails, phone numbers, password hashes, balances) before staging/dev database restoration.

6. **Model Factory & Seeder Generator (`db_generate_seeder_factory`)**
   - Automatically generates type-safe Laravel Model Factories and multi-tenant Database Seeders matching table schemas.

7. **High-Volume Table Partitioning Advisor (`db_partitioning_advisor`)**
   - Designs Range and List declarative table partitioning migrations for tables with 10M+ rows (ERP ledgers, audit logs, invoice items) with partition detachment runbooks.

8. **Pre-Commit Database Quality Gate (`db_quality_gate`)**
   - Single-call pre-commit gate verifying that all migration files in the project strictly implement tested `up()` and `down()` methods, scoping in tenant directories, and safe transaction properties.

---

## MCP Tools Overview

| Tool | Description |
| :--- | :--- |
| `db_generate_migration` | Generates reversible Laravel migrations for standard or tenant scopes across all DDL operations. |
| `db_analyze_query` | Analyzes SQL for SARGability, anti-patterns (OR, deep offset), recommends ESR composite indexes, and produces Eloquent code. |
| `db_design_schema` | Converts entity models into Mermaid ER diagrams, topologically ordered migrations, and tenant isolation policies. |
| `db_migration_audit` | Evaluates table locks and outputs zero-downtime expand-contract migration runbooks. |
| `db_tune_server_config` | Generates production hardware sizing for MariaDB, MySQL, PostgreSQL, and SQLite PRAGMAs. |
| `db_maintenance_runbook` | Diagnostic queries for table bloat, index fragmentation, replication lag, deadlocks, and buffer hit ratios. |
| `db_explain_analyzer` | Ingests text or JSON AST execution plans, diagnosing scans, disk spills, buffer hit ratios, and JIT bottlenecks. |
| `db_backup_restore_runbook` | Disaster recovery runbooks for logical dumps and physical hot backups with PITR. |
| `db_quality_gate` | Pre-commit quality gate verifying migration reversibility and lock safety. |
| `db_tune_connection_pooler` | Sizes and configures PgBouncer (transaction pooling) and ProxySQL (read-write splitting). |
| `db_data_masking_runbook` | Generates GDPR/PCI-DSS compliant production data sanitization scripts for staging/dev. |
| `db_generate_seeder_factory` | Generates Laravel Model Factories and Database Seeders with realistic Faker definitions. |
| `db_partitioning_advisor` | Generates declarative Range & List table partitioning migrations for 10M+ row tables. |

---

## MCP Resources

- `db://templates/my.cnf`: MySQL/MariaDB Enterprise my.cnf template.
- `db://templates/postgresql.conf`: PostgreSQL Enterprise postgresql.conf template.
- `db://templates/pgbouncer.ini`: PgBouncer Transaction Pooling configuration template.
- `db://templates/sqlite-tuning.sql`: SQLite WAL mode and high-concurrency PRAGMA tuning.

---

## MCP Prompts

- `optimize-slow-query`: Step-by-step query optimization, SARGability audit, and ESR composite index design.
- `plan-zero-downtime-migration`: Safe expand-contract zero-downtime migration recipe.
