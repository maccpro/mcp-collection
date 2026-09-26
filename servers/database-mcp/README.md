# @maccpro/database-mcp

> **Enterprise Database Architecture, Reversible Migrations, SARGable Query Optimizer & Hardware Tuner for MariaDB, MySQL & PostgreSQL**
> 100% Offline, Deterministic, Zero-Token & Free.

`database-mcp` is an enterprise Model Context Protocol (MCP) server engineered for production backend systems, multi-tenant SaaS applications, and high-performance database administration. It guarantees strict adherence to zero direct database modifications by outputting reversible Laravel migrations (`up()` & `down()`), analyzes queries for SARGability and composite B-Tree/GIN indexes, detects zero-downtime lock hazards, calculates NVMe/RAM hardware tuning configurations, and generates maintenance runbooks.

---

## Key Features

1. **Mandatory Reversible Laravel Migrations (`db_generate_migration`)**
   - Strictly outputs reversible anonymous migrations with matching `up()` and `down()` methods.
   - Enforces scope separation: `standard` (`database/migrations/`) vs `tenant` (`database/migrations/tenant/`).
   - Generates exact Artisan execution commands (`php artisan migrate` or `php artisan tenants:artisan "migrate"`).
   - Full dialect mapping for MariaDB, MySQL, and PostgreSQL (UUID, JSON vs JSONB, spatial, inet).

2. **SARGable Query Optimizer & ESR Index Advisor (`db_analyze_query`)**
   - Detects non-SARGable query anti-patterns (`YEAR(col)`, `DATE(col)`, `LOWER(col)`, leading `%wildcards`, column arithmetic).
   - Applies the **ESR Rule** (Equality -> Sort -> Range) for composite index creation.
   - Recommends zero-downtime DDL (`CONCURRENTLY` in PostgreSQL, `ALGORITHM=INPLACE, LOCK=NONE` in MariaDB/MySQL).
   - Generates idiomatic Laravel Eloquent queries with eager loading (`with()`) and chunking recommendations (`chunkById()`).

3. **Enterprise Schema Modeler & ER Visualizer (`db_design_schema`)**
   - Converts entity models into standard Mermaid Entity-Relationship diagrams (`erDiagram`).
   - Topologically sorts migrations by foreign key dependency order.
   - Generates SaaS multi-tenant isolation policies: PostgreSQL Row-Level Security (`RLS`) or Eloquent `BelongsToTenant` global scopes.

4. **Zero-Downtime Migration Lock Auditor (`db_migration_audit`)**
   - Analyzes table alterations against row count and engine locks.
   - Detects `AccessExclusiveLock`, MySQL table rebuilds, and metadata lock (MDL) pileups.
   - Provides safe expand-contract zero-downtime recipes.

5. **NVMe & Hardware Sizing Server Tuner (`db_tune_server_config`)**
   - Calculates production configuration for `my.cnf` (MariaDB/MySQL) and `postgresql.conf` (PostgreSQL).
   - Automatically sizes InnoDB buffer pool, shared buffers, effective cache size, work memory, redo logs, and NVMe IO capacity (`innodb_io_capacity`, `random_page_cost = 1.1`).

6. **Production Health & Maintenance Runbooks (`db_maintenance_runbook`)**
   - Generates diagnostic SQL and CLI commands for PostgreSQL dead tuple bloat and concurrent reindexing.
   - Calculates MariaDB/MySQL InnoDB table fragmentation (`DATA_FREE`) and defragmentation (`OPTIMIZE TABLE`).
   - Identifies unused indexes and hung query/transaction lock blockers.

---

## MCP Tools Overview

| Tool | Description |
| :--- | :--- |
| `db_generate_migration` | Generates reversible Laravel migrations (`up()`/`down()`) for standard or tenant scopes. |
| `db_analyze_query` | Analyzes SQL for SARGability, recommends ESR composite indexes, and produces Eloquent code. |
| `db_design_schema` | Relational schema designer with Mermaid ER diagrams and multi-tenant policies. |
| `db_migration_audit` | Lock hazard auditor detecting table copy, MDL queues, and zero-downtime risks. |
| `db_tune_server_config` | Generates tuned `my.cnf` or `postgresql.conf` based on RAM, vCPU, and NVMe SSD metrics. |
| `db_maintenance_runbook` | Diagnostic queries and maintenance CLI runbooks for bloat, reindexing, and fragmentation. |

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
      "args": ["c:/Users/JoypurHost/Desktop/mcp-collection/servers/database-mcp/server.js"],
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
