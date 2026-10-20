# Instructions for `database-mcp` MCP Server

The `database-mcp` MCP server provides Enterprise Database Architecture, Reversible Laravel Migrations, SARGable Query Optimization, Execution Plan (EXPLAIN) Diagnostics, Zero-Downtime Lock Risk Auditing, and Hardware Sizing for MariaDB, MySQL, and PostgreSQL.

It operates **100% offline, deterministic, zero-token, and free**, strictly adhering to the **zero-direct-database-alterations** rule by emitting verified code, migrations, and runbooks.

---

## Mandatory Rules for AI Agents

### 1. Pre-Commit Database Quality Gate (`db_quality_gate`)
- **MUST be invoked before committing any database migrations.**
- Verifies that:
  - Every migration contains matching, tested `up()` and `down()` methods.
  - Multi-tenant migrations are strictly isolated under `database/migrations/tenant/`.
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
- **Gate Decision:**
  - `PASS`: Proceed with Git commit.
  - `FAIL`: Fix empty `down()` methods or lock violations before committing!

---

### 2. Strictly Reversible Migrations (`db_generate_migration`)
- **Direct SQL modifications are forbidden in application repositories.** All schema changes must route through standard Laravel anonymous migrations.
- When generating migrations:
  - **Standard Scope:** Shared/system tables must target `database/migrations/`.
  - **Tenant Scope:** Multi-tenant SaaS business tables must target `database/migrations/tenant/`.
  - **Reversibility:** Every operation (`add_columns`, `drop_columns`, `modify_column`, `rename_column`) must have an exact type-safe inverse in `down()`.
- Example Invocation:
  ```json
  {
    "ServerName": "database-mcp",
    "ToolName": "db_generate_migration",
    "Arguments": {
      "table_name": "invoices",
      "operation": "create_table",
      "scope": "tenant",
      "database_type": "postgresql",
      "primary_key": "uuid",
      "columns": [
        { "name": "invoice_number", "type": "string", "length": 50, "unique": true },
        { "name": "amount", "type": "decimal", "precision": 15, "scale": 4 },
        { "name": "status", "type": "enum", "values": ["draft", "issued", "paid"] }
      ]
    }
  }
  ```

---

### 3. Zero-Downtime Lock Hazard Auditing (`db_migration_audit`)
- **MUST be invoked before altering tables with over 100,000 estimated rows in production.**
- Analyzes:
  - Table rewrite risks on `MODIFY / CHANGE COLUMN`.
  - PostgreSQL `AccessExclusiveLock` on non-constant defaults or raw `NOT NULL` additions.
  - Metadata lock (MDL) queues in MariaDB/MySQL.
- In Antigravity:
  ```json
  {
    "ServerName": "database-mcp",
    "ToolName": "db_migration_audit",
    "Arguments": {
      "table": "orders",
      "dialect": "postgresql",
      "estimated_rows": 2000000,
      "operations": [
        { "type": "add_column", "column": "tracking_code", "nullable": false, "default": "PENDING" }
      ]
    }
  }
  ```

---

### 4. SARGable Query Optimizer & Execution Plan Diagnostics (`db_analyze_query` & `db_explain_analyzer`)
- **Query Optimization (`db_analyze_query`):**
  - Detects non-SARGable functions (`YEAR(col)`, `LOWER(col)`, leading wildcards `%value`).
  - Flags `OR` predicate index-merge hazards, inequality (`!=`) full scans, and deep `OFFSET` pagination traps.
  - Applies the **ESR Rule** (Equality -> Sort -> Range) to formulate optimal composite indexes.
- **Execution Plan Diagnosis (`db_explain_analyzer`):**
  - Ingests raw `EXPLAIN` or `EXPLAIN (ANALYZE, BUFFERS)` output.
  - Pinpoints Sequential Scans (`Seq Scan` / `type: ALL`), filesorts, and temporary disk spills (`external merge Disk`).

---

### 5. Multi-Tenant Relational Schema Design (`db_design_schema`)
- Converts entity specifications into standard Mermaid ER diagrams (`erDiagram`), topologically sorted migrations, and tenant isolation policies.
- Supported Tenancy Models:
  - `discriminator`: Shared database with `tenant_id` column + PostgreSQL RLS (`FORCE ROW LEVEL SECURITY`) or Eloquent `BelongsToTenant` global scopes.
  - `schema`: PostgreSQL Schema-per-tenant (`SET search_path TO tenant_xxx`).
  - `multi_database`: Dynamic tenant database connection switching.

---

### 6. Production Maintenance & Disaster Recovery (`db_maintenance_runbook` & `db_backup_restore_runbook`)
- **Disaster Recovery:** Use `db_backup_restore_runbook` to generate daily non-blocking logical dumps (`pg_dump`, `mysqldump`) and physical hot backups with Point-in-Time Recovery (PITR).
- **Health Checks:** Use `db_maintenance_runbook` for dead tuple bloat, online defragmentation (`OPTIMIZE TABLE` / `pg_repack`), and replication lag monitoring.
