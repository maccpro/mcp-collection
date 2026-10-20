# Implementation Plan: Upgrade `.env.example` & Environment Defaults for `@maccpro/database-mcp` (v1.2.3)

## 1. Objective
- **User request:** "env exaplem ti amder bortoma database-mcp er sathe upgrade kor" (Upgrade `.env.example` to match our current database-mcp capabilities).
- **Current behavior:** 
  - `servers/database-mcp/.env.example` is minimal (11 lines) and only lists `DB_DEFAULT_DIALECT` and `DB_MIGRATION_SCOPE`.
  - Multiple enterprise tools (`db_tune_server_config`, `db_tune_connection_pooler`, `db_partitioning_advisor`, `db_generate_seeder_factory`, `db_migration_audit`, `db_quality_gate`, `db_backup_restore_runbook`) have hardcoded defaults inside `server.js` that cannot be centrally pre-configured via `.env`.
  - In `server.js`, some tools (`db_explain_analyzer`, `db_partitioning_advisor`) hardcode `default: 'postgresql'` instead of respecting `DEFAULT_DIALECT`.
- **Desired behavior:** 
  - An enterprise-grade, comprehensive `servers/database-mcp/.env.example` file covering all 13 tools and engine settings, organized with clear comments, valid enum values, and defaults matching JoypurHost / JoypurColo production conventions.
  - `server.js` safely reads these environment variables via `engine/env-loader.js`, reflects them in tool schema defaults, and merges them when tool arguments are omitted.
  - Full backward compatibility and zero external dependencies preserved.

---

## 2. Repository Findings
- **Application:** `@maccpro/database-mcp` (v1.2.2 upgrading to v1.2.3).
- **Architecture:** Node.js (ESM), Stdio JSON-RPC 2.0, zero external npm dependencies, 100% offline and deterministic.
- **Current Test Status:** 48/48 unit and integration tests passing in `test/run-tests.js`.
- **Working-Tree State:** Clean Git working tree (`main` branch).

---

## 3. Scope
### In scope
1. **Upgrade `.env.example`:**
   - **General & Engine Dialect:** `DB_DEFAULT_DIALECT`, `DB_MIGRATION_SCOPE`, `DB_DEFAULT_ID_STRATEGY`, `DB_DEFAULT_DATABASE_NAME`, `DB_DEFAULT_STAGING_DB_NAME`.
   - **Pre-Commit Quality Gate & Audit:** `DB_WORKSPACE_PATH`, `DB_LOCK_AUDIT_ROW_THRESHOLD`.
   - **Hardware Sizing & Sysctl Tuner:** `DB_SERVER_RAM_GB`, `DB_SERVER_VCPU`, `DB_SERVER_DISK_TYPE`, `DB_SERVER_WORKLOAD`, `DB_SERVER_ENVIRONMENT`.
   - **Connection Pooler Tuner:** `DB_DEFAULT_POOLER`, `DB_POOLER_MAX_CLIENT_CONNECTIONS`, `DB_TARGET_HOST`.
   - **Seeders & Table Partitioning:** `DB_SEEDER_RECORD_COUNT`, `DB_PARTITION_DEFAULT_TYPE`, `DB_PARTITION_DEFAULT_INTERVAL`.
2. **Wire Environment Variables in `server.js`:**
   - Read parsed environment variables with fallback defaults.
   - Connect them to tool JSON schemas.
   - Merge defaults in `handleToolCall` when optional parameters are omitted by MCP clients.
3. **Automated Verification:**
   - Add new tests in `test/run-tests.js` testing environment loading and default resolution.
   - Verify that all 48 existing tests continue to pass without regression.
4. **Documentation & Versioning:**
   - Bump version to `v1.2.3` in `package.json`, `README.md`, and test runner header.

### Out of scope
- Adding external npm packages (maintains 0 external dependencies).
- Direct live database connections (server remains 100% offline static analyzer and generator).

---

## 4. Proposed Changes

| Step | File | Proposed Change | Reason | Risk |
|---|---|---|---|---|
| 1 | `servers/database-mcp/.env.example` | Add 5 structured sections with all supported environment variables, comments, and defaults. | Provide a complete configuration reference for developers and agents. | None |
| 2 | `servers/database-mcp/server.js` | Read the new environment variables and wire them into tool schemas and `handleToolCall` defaults. | Ensure `.env` settings actually take effect when arguments are omitted. | Low (fallback values preserve exact current behavior) |
| 3 | `servers/database-mcp/package.json` | Bump version from 1.2.2 to 1.2.3. | Reflect feature addition and configuration upgrade. | None |
| 4 | `servers/database-mcp/README.md` | Update configuration section in README to document `.env` capabilities. | Keep documentation aligned with codebase. | None |
| 5 | `servers/database-mcp/test/run-tests.js` | Add tests verifying environment variable defaults and tool call fallback resolution. | Prevent regression and verify that env defaults take effect. | None |

---

## 5. Design and Compatibility
- **Backward Compatibility:** All new environment variables have hardcoded fallbacks identical to the existing default values (`mariadb`, `standard`, `id`, `4`, `100000`, `2000`, etc.). Existing installations without `.env` will continue working with identical behavior.
- **Zero-Dependency Guarantee:** Uses the existing `env-loader.js` which operates using only native `node:fs` and `node:path`.

---

## 6. Security and Data Integrity
- No sensitive credentials, passwords, or live database connection strings are introduced; `database-mcp` remains completely air-gapped, offline, and safe from credential leakage.
- Variables only configure defaults for code generation, static analysis, and hardware calculation formulas.

---

## 7. Database and Operations
- **Migration/backfill:** N/A (MCP server configuration).
- **Deployment order:** Local configuration update; zero deployment downtime.
- **Rollback:** Fully reversible via Git commit rollback.

---

## 8. Implementation Sequence
1. Update `servers/database-mcp/.env.example` with full enterprise configuration options.
2. Update `servers/database-mcp/server.js` to parse and apply the environment defaults across tool schemas and handlers.
3. Update `servers/database-mcp/package.json` and `servers/database-mcp/README.md` to `v1.2.3`.
4. Add new tests to `servers/database-mcp/test/run-tests.js` and execute the full test suite.
5. Create a Conventional Commit upon successful verification.

---

## 9. Verification Plan
| Check | Command/procedure | Expected evidence | Required? |
|---|---|---|---|
| Test suite execution | `node servers/database-mcp/test/run-tests.js` | 50+ tests pass with 0 failures | Yes |
| Git status verification | `git status --short` | Only task-related files modified | Yes |
| Working tree check | Inspect git diff | Clean, minimal, and fully documented changes | Yes |

---

## 10. Acceptance Criteria
- [ ] `.env.example` contains all 5 configuration sections covering all 13 tools.
- [ ] `server.js` wires each environment variable to its respective tool default with safe fallback values.
- [ ] Omitted tool arguments automatically inherit configured `.env` values.
- [ ] 100% of tests pass in `node servers/database-mcp/test/run-tests.js`.
- [ ] Version updated to `1.2.3` in `package.json` and `README.md`.

---

## 11. Approval
- **Plan status:** Awaiting approval
- **Approved scope:** Upgrade `.env.example`, wire defaults in `server.js`, update docs/version, and add test verification for `database-mcp`.
