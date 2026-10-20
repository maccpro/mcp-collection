# Implementation Plan: 100% Enterprise Upgrade & Forensic Defect Remediation for `@maccpro/database-mcp`

## 1. Objective
- **User request:** "database-mcp ei deep analize kor and missing ki ki ase find kor act as expert" → User subsequently approved full remediation and enhancement.
- **Current behavior:** `database-mcp` runs 6 tools with partial functionality:
  1. `tenant_id` silently downgrades to a `string` column due to a type naming mismatch between `SchemaModeler` (`foreignId`) and `DialectManager` (`foreign_id`).
  2. Primary key strategy `ulid` is defined in the schema but ignored in `MigrationEngine`, falling back to standard integer `id()`.
  3. Foreign key `on_delete: 'set null'` fails to apply `->nullOnDelete()` due to space vs underscore mismatch.
  4. Mermaid ER generation breaks when `col.references` is `'id'`.
  5. Configured environment variables (`DEFAULT_DATABASE_DIALECT`, `DEFAULT_MIGRATION_SCOPE`) are never read by code.
  6. Missing essential DDL operations: `modify_column`, `rename_column`, `rename_table`, `drop_foreign_key`, `add_foreign_key`, `drop_indexes`, `raw_sql`.
  7. Missing data types: `tinyint`, `smallint`, `mediumint`, `float`, `double`, `enum`, `date`, `time`, `binary/blob`, `geometry/spatial`.
  8. Query analysis relies on fragile regexes, failing on table aliases, and misses critical anti-patterns (`OR` index-merge hazards, inequality, implicit type coercion, deep `OFFSET` pagination).
  9. No execution plan analyzer (`EXPLAIN` / `EXPLAIN ANALYZE`).
  10. Zero Disaster Recovery (DR), backup, PITR, or replication runbooks.
  11. Missing `instructions.md` for AI agent governance and missing `db_quality_gate`.
- **Desired behavior:** A 100% robust, enterprise-grade, offline database MCP server with complete DDL lifecycle, full SQL type mapping, advanced SARGable AST analysis, explain plan diagnostics, zero-downtime lock recipes, multi-tenant isolation, disaster recovery, pre-commit quality gate, and complete agent documentation.

---

## 2. Repository Findings
- **Application/runtime:** Node.js ES Modules (zero external npm dependencies, pure native `node:*` APIs).
- **Target location:** `servers/database-mcp/`.
- **Existing architecture:** 
  - `server.js`: Stdio JSON-RPC 2.0 interface.
  - `engine/dialect-manager.js`: Dialect normalization and Laravel Blueprint column mapping.
  - `engine/migration-engine.js`: Reversible migration generator with Artisan command outputs.
  - `engine/query-analyzer.js`: Regex-based SARGability and ESR indexing advisor.
  - `engine/lock-auditor.js`: DDL lock hazard evaluator.
  - `engine/schema-modeler.js`: Multi-tenant entity designer and Mermaid ER generator.
  - `engine/config-tuner.js`: Hardware sizing for `my.cnf` and `postgresql.conf`.
  - `engine/maintenance-engine.js`: Bloat, fragmentation, and lock diagnostic queries.
  - `test/run-tests.js`: 16 basic assertions.
- **Working-tree state:**
  - Branch: `main`.
  - Pre-existing staged modifications in `servers/backend-mcp`, `servers/code-impact-analyzer`, and `servers/laravel-code-pattern`.
  - Untracked `implementation_plan.md` from previous session.
  - All modifications for this task must strictly be confined to `servers/database-mcp/` and root `implementation_plan.md`.

---

## 3. Scope

### In scope
1. **Critical Bug Fixes:**
   - Fix `tenant_id` mapping to ensure `unsignedBigInteger` / `foreignId` and foreign key constraint.
   - Fix `ulid` primary key generation (`$table->ulid('id')->primary();`).
   - Fix `on_delete` normalization to accept both `'set null'` and `'set_null'`.
   - Fix Mermaid ER relationship generation to resolve parent table names correctly.
   - Connect environment variables (`DB_DEFAULT_DIALECT`, `DEFAULT_DATABASE_DIALECT`, `DB_MIGRATION_SCOPE`, etc.) to default options.
2. **Dialect & Migration Engine Expansion:**
   - Add missing data types: `tinyint`, `smallint`, `mediumint`, `float`, `double`, `enum`, `date`, `time`, `year`, `binary`, `blob`, `spatial`, `geometry`, `point`.
   - Add missing column modifiers: `after('col')`, `first()`, `unsigned()`, `autoIncrement()`, `useCurrent()`, `useCurrentOnUpdate()`, `storedAs()`, `virtualAs()`.
   - Implement missing DDL operations: `modify_column`, `rename_column`, `rename_table`, `drop_foreign_key`, `add_foreign_key`, `drop_indexes`, `raw_sql`.
   - Format migration timestamps to standard Laravel format (`YYYY_MM_DD_HHMMSS`).
3. **Advanced Query & Lock Analysis:**
   - Enhance `query-analyzer.js` with alias-aware token parsing, `OR` hazards, inequality checks (`!=`, `<>`), implicit type coercion, and deep `OFFSET` pagination warnings.
   - Enhance `lock-auditor.js` with PostgreSQL non-constant default rewrite detection, safe `NOT NULL` check constraint recipe, and MySQL `ALGORITHM=INSTANT` evaluation.
4. **Production DBA & Disaster Recovery Upgrades:**
   - Add Backup, Restore, and Point-in-Time Recovery (PITR) runbooks in `maintenance-engine.js`.
   - Add Replication health diagnostics (`SHOW REPLICA STATUS`, `pg_stat_replication`) and connection starvation diagnostics (`idle in transaction`).
   - Add Linux kernel `sysctl` recommendations in `config-tuner.js`.
   - Add PostgreSQL `FORCE ROW LEVEL SECURITY` and schema-per-tenant support in `schema-modeler.js`.
5. **New MCP Tools in `server.js`:**
   - `db_explain_analyzer`: Parse text/JSON `EXPLAIN` and `EXPLAIN ANALYZE` output.
   - `db_backup_restore_runbook`: Dedicated tool for logical and physical backup/PITR commands.
   - `db_quality_gate`: Automated pre-commit gate verifying all migrations for reversibility, scope, and lock hazards.
6. **Agent Instructions:**
   - Create `servers/database-mcp/instructions.md`.
7. **Verification:**
   - Expand `test/run-tests.js` to comprehensively test all bug fixes, new operations, and new tools.

### Out of scope
- Modifying other servers (`backend-mcp`, `code-impact-analyzer`, `laravel-code-pattern`, `ui-ux-mcp`).
- Adding external npm packages (maintain 100% offline, zero-dependency Node.js standard).
- Connecting directly to live production databases or executing unverified live SQL commands.

---

## 4. Proposed Changes

| Step | File | Proposed Change | Reason | Risk |
|---|---|---|---|---|
| 1 | `engine/dialect-manager.js` | Fix `foreignId` mapping; add `tinyint`, `smallint`, `mediumint`, `float`, `double`, `enum`, `date`, `time`, `binary`, `blob`, `spatial`; add modifiers (`after`, `unsigned`, `useCurrent`, etc.). | Fixes `tenant_id` string corruption and provides complete SQL type coverage. | Low (pure mapping function) |
| 2 | `engine/migration-engine.js` | Add `ulid` primary key support; fix `set null` check; add `modify_column`, `rename_column`, `rename_table`, `drop_foreign_key`, `add_foreign_key`, `drop_indexes`, `raw_sql`; format standard timestamp. | Provides complete, reversible Laravel migration generation. | Low (strictly adds operations) |
| 3 | `engine/schema-modeler.js` | Populate foreign key constraint for `tenant_id`; fix Mermaid ER syntax; support schema-per-tenant mode; add `FORCE ROW LEVEL SECURITY`. | Fixes broken ER diagrams and prevents tenant data leakage in PostgreSQL. | Low |
| 4 | `engine/query-analyzer.js` | Implement tokenized alias-aware query parser; detect `OR`, `!=`, deep `OFFSET`, implicit type coercion, and group/order mismatches. | Eliminates brittle regex failures and catches major production performance bugs. | Medium (ensure zero regressions on existing test queries) |
| 5 | `engine/lock-auditor.js` | Add PG volatile default rewrite detection, PG safe `NOT NULL` constraint recipe, and MySQL `ALGORITHM=INSTANT` recommendations. | Accurate zero-downtime lock hazard evaluation. | Low |
| 6 | `engine/config-tuner.js` | Add modern PostgreSQL 15–17 parameters, MariaDB slow query & thread pool settings, and Linux `sysctl` kernel parameters. | Turnkey bare-metal and NVMe configuration tuning. | Low |
| 7 | `engine/maintenance-engine.js` | Add backup/PITR runbooks, replication health queries, and connection starvation diagnostics. | Comprehensive production DBA diagnostic capability. | Low |
| 8 | `engine/explain-analyzer.js` *(New)* | Create dedicated engine to parse text/JSON `EXPLAIN` and `EXPLAIN ANALYZE` outputs (PG & MySQL). | Empowers developers to debug query execution plans. | Low (isolated module) |
| 9 | `server.js` | Connect env variables; register new tools (`db_explain_analyzer`, `db_backup_restore_runbook`, `db_quality_gate`). | Exposes new capabilities to MCP clients. | Low |
| 10| `instructions.md` *(New)* | Author comprehensive instructions for AI agents and Antigravity. | Parity with other enterprise servers in the collection. | None (doc only) |
| 11| `test/run-tests.js` | Expand test suite to validate all 5 bug fixes, new operations, new data types, and new tools. | Rigorous evidence-based verification. | None |
| 12| `README.md` & `.env.example` | Update tool list, parameters, and documentation. | Keep documentation synchronized with implementation. | None |

---

## 5. Design and Compatibility
- **100% Backward Compatibility:** All existing tool names, parameter names, and return payload structures are strictly preserved.
- **Zero Dependencies:** All new functionality (including SQL tokenizer and EXPLAIN analyzer) is built purely using standard JavaScript ES Modules and Node.js built-in modules (`node:path`, `node:fs`, `node:readline`).
- **Standardized MCP JSON-RPC 2.0:** Follows the established protocol specification (`tools/list`, `tools/call`, `initialize`, `ping`).

---

## 6. Security and Data Integrity
- **Tenant Isolation:** PostgreSQL RLS policies will include `FORCE ROW LEVEL SECURITY` so table owners cannot accidentally bypass tenant filters. Multi-tenant unique constraints will automatically be scoped by `tenant_id`.
- **Zero Direct Writes:** Remains strictly non-destructive. Never writes to live database connections; generates verified code, migrations, and runbooks.
- **Zero Secrets Logging:** Diagnostic runbooks and configuration generators never log or store cleartext passwords.

---

## 7. Database and Operations
- **Migration & Rollout:** Offline MCP server code only. No database migration is run on live environments.
- **Reversibility:** Every generated Laravel migration strictly contains both `up()` and `down()` methods with type-safe rollbacks.

---

## 8. Implementation Sequence
1. **Step 1:** Fix `DialectManager` bugs and add full SQL type system + modifiers.
2. **Step 2:** Fix `MigrationEngine` bugs (ULID, `set null`) and implement missing DDL operations (`modify_column`, `rename_column`, `drop_foreign_key`, `add_foreign_key`, `drop_indexes`, `raw_sql`).
3. **Step 3:** Fix `SchemaModeler` (`tenant_id` FK generation, Mermaid syntax, `FORCE ROW LEVEL SECURITY`, tenant-scoped unique indexes).
4. **Step 4:** Implement `ExplainAnalyzer` (`engine/explain-analyzer.js`) for PG and MySQL EXPLAIN plans.
5. **Step 5:** Enhance `QueryAnalyzer` with alias support and anti-pattern detections (`OR`, `!=`, deep `OFFSET`, type coercion).
6. **Step 6:** Enhance `LockAuditor` with PG volatile defaults, PG safe `NOT NULL`, and MySQL `ALGORITHM=INSTANT`.
7. **Step 7:** Enhance `ConfigTuner` with modern parameters and Linux kernel `sysctl` guidelines.
8. **Step 8:** Enhance `MaintenanceEngine` with backup/PITR, replication lag, and connection diagnostics.
9. **Step 9:** Wire new tools (`db_explain_analyzer`, `db_backup_restore_runbook`, `db_quality_gate`) and env variables into `server.js`.
10. **Step 10:** Create `instructions.md`.
11. **Step 11:** Expand and execute `test/run-tests.js`.
12. **Step 12:** Update `README.md` and `.env.example`.

---

## 9. Verification Plan

| Check | Command/Procedure | Expected Evidence | Required? |
|---|---|---|---|
| Focused Bug Tests | `node servers/database-mcp/test/run-tests.js` | Verify `foreignId` generates `unsignedBigInteger`, `ulid` generates `$table->ulid()`, `set null` generates `nullOnDelete()`, Mermaid renders parent table name. | Yes |
| Full DDL Operations Tests | `node servers/database-mcp/test/run-tests.js` | Verify `modify_column`, `rename_column`, `drop_foreign_key`, `add_foreign_key`, `drop_indexes` produce matching reversible `up()` and `down()` methods. | Yes |
| Query Analyzer Tests | `node servers/database-mcp/test/run-tests.js` | Verify detection of `OR` anti-patterns, deep `OFFSET` pagination, and table alias resolution. | Yes |
| Explain Analyzer Tests | `node servers/database-mcp/test/run-tests.js` | Verify text/JSON EXPLAIN parsing identifies Seq Scan and filesort. | Yes |
| Pre-Commit Quality Gate Test | `node servers/database-mcp/test/run-tests.js` | Verify `db_quality_gate` checks migration files for reversibility and scope. | Yes |
| Git Status & Diffs | `git status --short` | Verify only authorized changes in `servers/database-mcp/` and `implementation_plan.md`. | Yes |

---

## 10. Acceptance Criteria
- [ ] `tenant_id` generates `$table->unsignedBigInteger('tenant_id')` or `$table->foreignId('tenant_id')` with matching foreign key constraint.
- [ ] `ulid` primary key option generates `$table->ulid('id')->primary();`.
- [ ] Foreign key `on_delete: 'set null'` generates `->nullOnDelete();`.
- [ ] Mermaid ER diagrams generate valid parent table names without `id ||--o{`.
- [ ] `modify_column`, `rename_column`, `rename_table`, `drop_foreign_key`, `add_foreign_key`, `drop_indexes` are supported with reversible `down()` methods.
- [ ] Full SQL type system (`tinyint`, `smallint`, `mediumint`, `float`, `double`, `enum`, `date`, `time`, `binary`, `blob`, `spatial`) is implemented without silent string fallbacks.
- [ ] Anti-patterns (`OR`, `!=`, deep `OFFSET`, type coercion) are detected in `QueryAnalyzer`.
- [ ] `db_explain_analyzer` successfully diagnoses execution plans.
- [ ] `db_backup_restore_runbook` outputs verified backup and PITR commands.
- [ ] `db_quality_gate` tool checks migration files.
- [ ] `instructions.md` is present in `servers/database-mcp/`.
- [ ] All tests in `test/run-tests.js` pass with 0 failures.

---

## 11. Risks, Blockers, and Open Questions
- **Risk:** Backward compatibility with existing tool callers.  
  *Mitigation:* All new parameters have default fallbacks; no existing parameter schemas or outputs are broken.
- **Risk:** Zero-dependency constraint on SQL parsing.  
  *Mitigation:* Build a robust deterministic tokenizer for SQL statements rather than a full heavyweight AST parser, ensuring zero external npm dependencies and sub-millisecond execution.

---

## 12. Approval
- **Plan status:** Approved by user ("approve" received on 2026-10-20T08:40:06+06:00).
- **Approved scope:** Full remediation and enhancement of `database-mcp` across all 3 phases.
