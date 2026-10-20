# Implementation Plan: Register `database-mcp` as System MCP Server

## 1. Objective
- **User request:** "database-mcp amader system e mcp hisabe add koro" (Add `database-mcp` to our system as an active MCP server).
- **Current behavior:** 
  - `@maccpro/database-mcp` (v1.2.3) is fully implemented and passes all 50/50 test suites in `D:\mcp-collection\servers\database-mcp`.
  - It communicates via Stdio JSON-RPC 2.0 (MCP 2024-11-05 protocol).
  - However, it is not registered in the system's global MCP configuration (`C:\Users\JoypurHost\.gemini\config\mcp_config.json`).
  - Antigravity's lazy tool schema registry directory (`C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp`) does not yet exist, preventing the agent from discovering the 13 database tools via `call_mcp_tool`.
- **Desired behavior:** 
  - `database-mcp` is registered under `mcpServers` in `C:\Users\JoypurHost\.gemini\config\mcp_config.json` with stdio command `node` and argument `D:\mcp-collection\servers\database-mcp\server.js`.
  - Tool schema definitions for all 13 tools and `instructions.md` are populated in `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp\`.
  - All 13 database MCP tools are granted execution permissions in `C:\Users\JoypurHost\.gemini\config\config.json`.
  - Verification proves that the server initializes, lists tools, executes calls via stdio, and all schemas match the live tool declarations.

---

## 2. Repository Findings
- **Server Path:** `D:\mcp-collection\servers\database-mcp\server.js`
- **Application:** `@maccpro/database-mcp` (v1.2.3, Node.js ESM).
- **Architecture:** Zero-dependency, offline, deterministic Stdio JSON-RPC 2.0 server.
- **Global Config Path:** `C:\Users\JoypurHost\.gemini\config\mcp_config.json`
- **User Settings & Permissions:** `C:\Users\JoypurHost\.gemini\config\config.json`
- **Antigravity Tool Schemas Path:** `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp\`
- **Working-Tree State:** Git working tree in `D:\mcp-collection` is clean on `main` branch.

---

## 3. Scope
### In scope
1. **Global MCP Registration:**
   - Update `C:\Users\JoypurHost\.gemini\config\mcp_config.json` to register `database-mcp` with command `node` and path `D:\mcp-collection\servers\database-mcp\server.js`.
2. **Antigravity Lazy Tool Schema Provisioning:**
   - Create directory `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp`.
   - Generate exact JSON tool schema files for all 13 tools:
     - `db_generate_migration.json`
     - `db_analyze_query.json`
     - `db_design_schema.json`
     - `db_migration_audit.json`
     - `db_tune_server_config.json`
     - `db_maintenance_runbook.json`
     - `db_explain_analyzer.json`
     - `db_backup_restore_runbook.json`
     - `db_quality_gate.json`
     - `db_tune_connection_pooler.json`
     - `db_data_masking_runbook.json`
     - `db_generate_seeder_factory.json`
     - `db_partitioning_advisor.json`
   - Copy `instructions.md` into `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp\instructions.md`.
3. **Execution Permissions:**
   - Update `globalPermissionGrants.allow` in `C:\Users\JoypurHost\.gemini\config\config.json` with permissions for the 13 `database-mcp` tools.
4. **Verification & Testing:**
   - Verify Stdio JSON-RPC handshake (`initialize`, `tools/list`, and `tools/call`).
   - Validate JSON schema syntax and parameter completeness.

### Out of scope
- Modifying `servers/database-mcp` core source code or engine logic (already verified at v1.2.3 with 50 passing tests).
- Modifying other MCP servers (`chrome-devtools-mcp`, `canva`, `gopls-mcp-server`, `next-devtools`).

---

## 4. Proposed Changes

| Step | Target File/Directory | Proposed Change | Reason | Risk |
|---|---|---|---|---|
| 1 | `C:\Users\JoypurHost\.gemini\config\mcp_config.json` | Add `"database-mcp"` entry with command `"node"` and argument `"D:\\mcp-collection\\servers\\database-mcp\\server.js"` | Registers the MCP server globally in Antigravity. | None (valid JSON structure preserved) |
| 2 | `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp\` | Create folder and generate 13 `<toolName>.json` schema files and copy `instructions.md`. | Enables lazy-loading and schema validation for `call_mcp_tool`. | None (isolated new directory) |
| 3 | `C:\Users\JoypurHost\.gemini\config\config.json` | Add the 13 `mcp(database-mcp/<tool>)` permissions to `userSettings.globalPermissionGrants.allow`. | Ensures seamless tool execution without permission interruption. | None |

---

## 5. Design and Compatibility
- **Transport:** Standard MCP Stdio transport using standard Node.js runtime.
- **Portability & Pathing:** Absolute Windows path `D:\mcp-collection\servers\database-mcp\server.js` ensures reliable process invocation across all project workspaces.
- **Safety:** Offline, deterministic, zero network dependencies, zero credentials required.

---

## 6. Security and Data Integrity
- No secrets or credentials needed or stored.
- Adheres strictly to the offline read-only/code-generation guarantee of `database-mcp`.
- Backups of `mcp_config.json` and `config.json` can be kept prior to modification to guarantee zero-risk rollback.

---

## 7. Database and Operations
- **Migration/Backfill:** N/A (Configuration and tool registry only).
- **Deployment Order:**
  1. Register in `mcp_config.json`.
  2. Generate schema files and `instructions.md` in `antigravity/mcp/database-mcp`.
  3. Update `config.json` permission grants.
- **Rollback Procedure:** Remove the `database-mcp` key from `mcp_config.json` and delete the `antigravity/mcp/database-mcp` folder.

---

## 8. Implementation Sequence
1. Create backup snapshots of `mcp_config.json` and `config.json`.
2. Update `mcp_config.json` to include `"database-mcp"`.
3. Create `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp\` and generate the 13 schema JSON files along with `instructions.md`.
4. Update `C:\Users\JoypurHost\.gemini\config\config.json` permission grants.
5. Execute end-to-end verification via Node.js stdio communication and schema validation tests.
6. Commit the updated `implementation_plan.md` in Git.

---

## 9. Verification Plan
| Check | Command/Procedure | Expected Evidence | Required? |
|---|---|---|---|
| JSON Syntax Check | `Get-Content C:\Users\JoypurHost\.gemini\config\mcp_config.json \| ConvertFrom-Json` | Valid JSON parse with no errors | Yes |
| Schema File Existence | Check 13 `.json` files and `instructions.md` in `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp\` | All 14 files exist and are valid JSON / Markdown | Yes |
| Stdio JSON-RPC Check | Run Node.js stdio test script calling `initialize`, `tools/list`, and `tools/call` for `db_generate_migration` | Server responds with JSON-RPC result containing generated migration | Yes |
| Git Status | `git status --short` in `D:\mcp-collection` | Clean working tree with only `implementation_plan.md` updated | Yes |

---

## 10. Acceptance Criteria
- [x] `database-mcp` is properly declared under `mcpServers` in `C:\Users\JoypurHost\.gemini\config\mcp_config.json`.
- [x] All 13 tool schema files and `instructions.md` are generated in `C:\Users\JoypurHost\.gemini\antigravity\mcp\database-mcp\`.
- [x] Tool execution permissions are registered in `C:\Users\JoypurHost\.gemini\config\config.json`.
- [x] Stdio communication test confirms end-to-end tool execution and response.

---

## 11. Risks, Blockers, and Open Questions
- None. `database-mcp` is verified and self-contained with 0 external dependencies.

---

## 12. Approval
- **Plan status:** Approved & Completed
- **Approved scope:** Register `database-mcp` as a global MCP server in `mcp_config.json`, generate tool schemas in Antigravity MCP directory, and add tool permission grants.
- **Approval evidence:** User explicit confirmation ("approve") on 2026-10-20.
