# Instructions for `code-impact-analyzer` MCP Server

The `code-impact-analyzer` MCP server conducts Dynamic Code Impact Analysis, blast radius calculation, ERP bug-fix forensic audits, double-entry invariant verification, and production readiness checks.

## Mandatory Rules for AI Agents

1. **Pre-Commit Quality Gate (`cia_quality_gate`)**:
   - MUST be invoked before committing code to verify that no contract-breaking changes, high-risk blast radiuses, or invariant violations exist.
   - Automatically inspects Git working tree changes (both staged and unstaged/untracked).
   - In Antigravity, invoke via `call_mcp_tool`:
     ```json
     {
       "ServerName": "code-impact-analyzer",
       "ToolName": "cia_quality_gate",
       "Arguments": {
         "repo_path": "<project_root>",
         "max_risk_score": 30.0
       }
     }
     ```
   - **Gate Decision:**
     - `PASS`: Changes are safe to commit.
     - `FAIL`: Fix breaking changes or critical hazards before committing.

2. **ERP Bug-Fix & Transactional Invariants Audit (`cia_erp_invariants_check` & `cia_erp_forensic_audit`)**:
   - MUST be invoked when touching billing, accounting, inventory, payments, or ledger entities.
   - Enforces:
     - Double-Entry Conservation: sum(Debit) === sum(Credit).
     - Ledger Immutability: Hard deletion of journal records is forbidden (use reversals).
     - Stock Conservation: Inventory decrements must record transactional audit entries.
     - Concurrency: Numeric balances and stock modifications must use `lockForUpdate()`.
   - Invoke via `call_mcp_tool`:
     ```json
     {
       "ServerName": "code-impact-analyzer",
       "ToolName": "cia_erp_invariants_check",
       "Arguments": {
         "repo_path": "<project_root>"
       }
     }
     ```

3. **Database Schema Blast Radius (`cia_db_blast_radius`)**:
   - MUST be invoked before creating migrations altering or dropping tables/columns:
     ```json
     {
       "ServerName": "code-impact-analyzer",
       "ToolName": "cia_db_blast_radius",
       "Arguments": {
         "table": "users",
         "column": "email",
         "operation": "modify_column"
       }
     }
     ```
