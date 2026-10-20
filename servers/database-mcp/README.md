# @maccpro/database-mcp

> **Enterprise Database Architecture, Reversible Migrations, SARGable Query Optimizer, EXPLAIN Plan Diagnostics & Hardware Tuner for MariaDB, MySQL & PostgreSQL**
> 100% Offline, Deterministic, Zero-Token & Free.

`database-mcp` is an enterprise Model Context Protocol (MCP) server engineered for production backend systems, multi-tenant SaaS applications, and high-performance database administration. It guarantees strict adherence to zero direct database modifications by outputting reversible Laravel migrations (`up()` & `down()`), analyzes queries for SARGability and composite B-Tree/GIN indexes, diagnoses `EXPLAIN` execution plans, detects zero-downtime lock hazards, calculates NVMe/RAM hardware tuning configurations with Linux OS sysctl parameters, generates disaster recovery runbooks, and enforces a pre-commit database quality gate.

---

## Key Features

1. **Mandatory Reversible Laravel Migrations (`db_generate_migration`)**
   - Strictly outputs reversible anonymous migrations with matching `up()` and `down()` methods.
   - Operations: `create_table`, `add_columns`, `drop_columns`, `modify_column`, `rename_column`, `rename_table`, `add_indexes`, `drop_indexes`, `add_foreign_keys`, `drop_foreign_keys`, `raw_sql`.
   - Enforces scope separation: `standard` (`database/migrations/`) vs `tenant` (`database/migrations/tenant/`).
   - Generates exact Artisan execution commands (`php artisan migrate` or `php artisan tenants:artisan "migrate"`).
   - Full dialect mapping for MariaDB, MySQL, and PostgreSQL (ID, UUID, ULID, TinyInt, Enum, JSON/JSONB, spatial, inet).

2. **SARGable Query Optimizer & ESR Index Advisor (`db_analyze_query`)**
   - Detects non-SARGable query anti-patterns (`YEAR(col)`, `DATE(col)`, `LOWER(col)`, leading `%wildcards`, column arithmetic).
   - Flags `OR` predicate hazards, inequality (`!=`, `<>`) scans, and deep `OFFSET` pagination traps with Keyset/Cursor recommendations.
   - Applies the **ESR Rule** (Equality -> Sort -> Range) for composite index creation with table alias support.
   - Recommends zero-downtime DDL (`CONCURRENTLY` in PostgreSQL, `ALGORITHM=INPLACE, LOCK=NONE` in MariaDB/MySQL).
   - Generates idiomatic Laravel Eloquent queries with eager loading (`with()`) and chunking recommendations (`chunkById()`).

3. **Execution Plan Analyzer (`db_explain_analyzer`)**
   - Parses raw text or JSON `EXPLAIN` and `EXPLAIN ANALYZE` output from PostgreSQL, MariaDB, and MySQL.
   - Detects Sequential Scans (`Seq Scan`, `type: ALL`), filesorts, temporary table creation, disk sort spills (`external merge Disk`), and cardinality estimation mismatches.

4. **Pre-Commit Database Quality Gate (`db_quality_gate`)**
   - Single-call pre-commit gate verifying that all migration files in the project strictly implement tested `up()` and `down()` methods.
   - Blocks commits on missing down methods, unverified drops, or raw locking DDL.

5. **Enterprise Schema Modeler & ER Visualizer (`db_design_schema`)**
   - Converts entity models into standard Mermaid Entity-Relationship diagrams (`erDiagram`).
   - Topologically sorts migrations by foreign key dependency order.
   - Generates SaaS multi-tenant isolation policies: PostgreSQL Row-Level Security (`RLS` with `FORCE ROW LEVEL SECURITY`), Schema-per-tenant (`SET search_path`), or Eloquent `BelongsToTenant` global scopes.

6. **Zero-Downtime Migration Lock Auditor (`db_migration_audit`)**
   - Analyzes table alterations against row count and engine locks.
   - Detects `AccessExclusiveLock`, volatile default rewrites in PostgreSQL, MySQL table rebuilds, and metadata lock (MDL) pileups.
   - Recommends safe expand-contract zero-downtime recipes, PostgreSQL check constraint validation, and triggerless DDL tools (`gh-ost`, `pg-roll`).

7. **NVMe & Hardware Sizing Server Tuner (`db_tune_server_config`)**
   - Calculates production configuration for `my.cnf` (MariaDB/MySQL) and `postgresql.conf` (PostgreSQL).
   - Automatically sizes InnoDB buffer pool, shared buffers, effective cache size, work memory, redo logs, slow query logging, and NVMe IO capacity.
   - Emits Linux kernel `sysctl` recommendations (`vm.swappiness = 10`, `vm.dirty_ratio = 10`, hugepages).

8. **Disaster Recovery & Maintenance Runbooks (`db_backup_restore_runbook` & `db_maintenance_runbook`)**
   - Generates production backup and Point-in-Time Recovery (PITR) scripts for PostgreSQL (`pg_dump`, `pg_basebackup`) and MySQL/MariaDB (`mysqldump`, `mariabackup`).
   - Diagnostic SQL and CLI commands for dead tuple bloat, concurrent reindexing, fragmentation, replication lag, and idle-in-transaction zombie connections.

---

## MCP Tools Overview

| Tool | Description |
| :--- | :--- |
| `db_generate_migration` | Generates reversible Laravel migrations for standard or tenant scopes across all DDL operations. |
| `db_analyze_query` | Analyzes SQL for SARGability, anti-patterns (OR, deep offset), recommends ESR composite indexes, and produces Eloquent code. |
| `db_explain_analyzer` | Ingests PostgreSQL/MySQL EXPLAIN output and pinpoints full table scans, filesorts, and disk spills. |
| `db_quality_gate` | Pre-commit quality gate verifying that all migrations in the repository are strictly reversible and scope-compliant. |
| `db_design_schema` | Relational schema designer with Mermaid ER diagrams and multi-tenant isolation policies. |
| `db_migration_audit` | Lock hazard auditor detecting table rewrites, MDL queues, and zero-downtime risks. |
| `db_tune_server_config` | Generates tuned `my.cnf` or `postgresql.conf` with Linux kernel sysctl parameters based on RAM and vCPU. |
| `db_backup_restore_runbook` | Production Disaster Recovery runbook with logical dumps, hot physical backups, and PITR. |
| `db_maintenance_runbook` | Diagnostic queries and maintenance CLI runbooks for bloat, reindexing, fragmentation, and replication lag. |

---

## Installation & Setup

```bash
cd servers/database-mcp
npm test
```

### Stdio Configuration (`mcp_config.json`)

```json
{
  "mcpServers": {
    "database-mcp": {
      "command": "node",
      "args": ["D:/mcp-collection/servers/database-mcp/server.js"],
      "env": {
        "DB_DEFAULT_DIALECT": "mariadb",
        "DB_MIGRATION_SCOPE": "standard"
      }
    }
  }
}
```

---

## Architecture Compliance

- **Zero Direct Schema Modifications**: Direct SQL schema changes are forbidden; all changes must route through standard or tenant Laravel migrations.
- **Strictly Reversible**: Every `up()` operation has a corresponding, type-safe `down()` operation.
- **Zero Token Usage**: Built with pure deterministic algorithms and AST templates. Operates 100% offline with zero latency.
