# @maccpro/code-impact-analyzer (v2.2.0)

> **Enterprise Dynamic Relational Code Impact Analysis, ERP Bug-Fix Forensic Audit, Double-Entry Invariant Verifier & Cognitive Reasoning Engine**
> 100% Dynamic, Zero-Hardcoded, Resilient with AI Cognitive Synthesis & 100% Offline Fallback.

`code-impact-analyzer` is an enterprise-grade Model Context Protocol (MCP) server engineered to prevent production regressions, detect contract-breaking API changes, prevent in-flight queue worker crashes, detect multi-tenant isolation leaks, simulate database mutation hazards, audit double-entry accounting and stock conservation invariants, prevent lost updates under high concurrency, and synthesize executive architectural decisions before code is committed or deployed.

---

## 🚀 Key Innovations in v2.2 (ERP Bug-Fix Forensic Audit & Domain Invariants)

1. **Enterprise ERP Bug-Fix Forensic Audit Engine (`ForensicAuditEngine`)**
   - **Control-Flow Behavioral Drift Modeling**: Reconstructs before-vs-after execution paths and identifies altered branching conditions, added defensive guard clauses, or modified query scoping.
   - **Root-Cause vs Workaround Verification**: Classifies bug fixes into `A. ROOT_CAUSE`, `B. SYMPTOM_MASK`, `C. WORKAROUND`, or `D. PARTIAL_FIX`.
   - **Historical Data Compatibility**: Detects dynamic computed accessors (`getTaxAmountAttribute()`) on historical models that alter past financial reports, and flags non-nullable migrations lacking default values.
   - **Data Backfill & Reconciliation Matrix**: Automatically flags whether a bug fix requires a historical data reconciliation script or artisan backfill command.

2. **Mathematical Domain Invariant Auditor (`ERPInvariantAuditor`)**
   - **Double-Entry Bookkeeping Conservation**: Enforces $\sum \text{Debit} \equiv \sum \text{Credit}$. Detects asymmetric journal voucher entries where debit or credit mutations occur without a balancing leg.
   - **Direct Ledger Deletion Prohibited**: Prohibits direct hard deletion of financial ledger and journal records, enforcing reversal entries to maintain GAAP/IFRS audit trails.
   - **Perpetual Stock Conservation**: Enforces $\text{Stock}_t = \text{Opening} + \text{In} - \text{Out} \pm \text{Adjustments}$. Flags direct inventory decrements that omit accompanying `StockMovement` or `InventoryTransaction` audit entries.
   - **Negative Stock & Overpayment Boundaries**: Prevents unguarded inventory decrements and verifies receivable/payable integrity.
   - **Transaction Atomicity**: Enforces `DB::transaction()` wrapping across multi-entity ERP mutations and flags swallowed exceptions in transactional paths.

3. **Concurrency, Race Condition & Idempotency Auditor (`ConcurrencyHazardAuditor`)**
   - **Lost Update Detection**: Detects dangerous read-modify-write patterns on numeric balances, points, or stock quantities that omit pessimistic row locks (`lockForUpdate()`), optimistic versioning, or atomic database operations.
   - **Webhook & Payment Idempotency**: Detects financial callback and webhook handlers lacking idempotency tokens, unique transaction keys, or distributed atomic locks (`Cache::lock()`).
   - **TOCTOU Race Condition Windows**: Detects check-then-act race windows on inventory or balance availability.
   - **Asynchronous Financial Workers**: Enforces `ShouldBeUnique` on queued financial/billing jobs.

4. **10-Gate Production Readiness Evaluator (`ProductionReadinessGate`)**
   - Evaluates Gates A through J with empirical evidence logging:
     - **Gate A**: Functional Correctness
     - **Gate B**: Regression Safety
     - **Gate C**: Accounting Integrity
     - **Gate D**: Inventory Integrity
     - **Gate E**: Data Integrity
     - **Gate F**: Tenant Isolation
     - **Gate G**: Security & Authorization
     - **Gate H**: Concurrency & Atomicity
     - **Gate I**: Performance & Scalability
     - **Gate J**: Historical Compatibility
   - Multi-Dimensional Risk Quantification: $\text{Risk Score} = \text{Severity} \times \text{Likelihood} \times \text{Exposure}$.

5. **Complete 29-Section Executive Forensic Report (`ForensicReportFormatter`)**
   - Emits structured 29-section executive audit reports in Markdown and JSON telemetry.

---

## 🛠️ MCP Tools Overview

| Tool | Purpose | Key Arguments |
| :--- | :--- | :--- |
| `cia_erp_forensic_audit` | **Full 29-section ERP Forensic Bug-Fix Audit**: Evaluates behavioral drift, accounting/inventory invariants, concurrency lost updates, historical compatibility, Gates A-J, and generates executive report. | `repo_path`, `staged_only`, `bug_context`, `format` ('markdown'\|'json') |
| `cia_erp_invariants_check` | Fast dedicated audit for double-entry accounting ($\sum \text{Debit} = \sum \text{Credit}$), stock conservation, and transaction atomicity. | `repo_path`, `staged_only`, `raw_diff` |
| `cia_production_gates` | Evaluates the 10 Production Readiness Gates (Gate A: Functional Correctness to Gate J: Historical Compatibility) with empirical evidence. | `repo_path`, `staged_only`, `raw_diff` |
| `cia_deep_impact_analysis` | **All-in-one cognitive impact analysis**: Combines PSR-4 introspection, AST classification, blast radius, queue & tenant hazards, breaking changes, targeted tests, ERP invariants, and AI cognitive synthesis. | `repo_path`, `staged_only`, `enable_ai_reasoning` |
| `cia_executive_verdict` | Generates a high-level architectural verdict (`APPROVE` / `WARN` / `FAIL`) with canary deployment readiness. | `repo_path`, `staged_only`, `max_risk_score` |
| `cia_analyze_git_diff` | Computes full dynamic blast radius, risk score, hazards, and targeted tests from git diff. | `repo_path`, `staged_only`, `max_depth` |
| `cia_trace_symbol` | Traces a specific class, method, or event across upstream callers with Mermaid diagram. | `symbol`, `file_path`, `max_depth` |
| `cia_db_blast_radius` | Analyzes blast radius of column/table drop, rename, or type modification across Models, Requests, and Repositories. | `table`, `column`, `operation` |
| `cia_targeted_test_suite` | Selects minimal Pest/PHPUnit test suite based on modified code. | `changed_files`, `framework` |
| `cia_quality_gate` | Pre-commit/CI PASS/FAIL gate blocking breaking changes, critical hazards, ERP invariant violations, and excessive risk scores. | `max_risk_score`, `fail_on_breaking` |

---

## 📦 Installation & Verification

```bash
cd servers/code-impact-analyzer
npm test
```

### Stdio Configuration (`mcp_config.json`)

```json
{
  "mcpServers": {
    "code-impact-analyzer": {
      "command": "node",
      "args": ["D:/mcp-collection/servers/code-impact-analyzer/server.js"],
      "env": {
        "CIA_AI_ENABLED": "true",
        "CIA_AI_PROVIDER": "auto"
      }
    }
  }
}
```

---

## 🤖 Global Agent Rules (`AGENTS.md`)

When setting up this MCP server in a new environment, add the following hard rule to your AI assistant's system instructions (e.g. `~/.gemini/config/AGENTS.md`, `.cursorrules`, or `CLAUDE.md`):

```markdown
- **Auto Dynamic Code Impact & Blast Radius Gate (code-impact-analyzer)**: Always utilize `code-impact-analyzer` tools (`cia_erp_forensic_audit`, `cia_erp_invariants_check`, `cia_production_gates`, `cia_deep_impact_analysis`, `cia_executive_verdict`, `cia_analyze_git_diff`, `cia_trace_symbol`, `cia_db_blast_radius`, `cia_targeted_test_suite`, `cia_quality_gate`) before commits or PRs to calculate blast radius, detect in-flight queue hazards, multi-tenant leaks, contract-breaking changes, evaluate ERP accounting/inventory invariants, prevent lost-update concurrency races, and execute targeted test suites.
```

---

## 🛡️ Antigravity Auto-Permission Grants (`config.json`)

To prevent Antigravity or the AI assistant from prompting for confirmation on every single analysis, add the following lines to `globalPermissionGrants.allow` in `~/.gemini/config/config.json`:

```json
"mcp(code-impact-analyzer/cia_erp_forensic_audit)",
"mcp(code-impact-analyzer/cia_erp_invariants_check)",
"mcp(code-impact-analyzer/cia_production_gates)",
"mcp(code-impact-analyzer/cia_deep_impact_analysis)",
"mcp(code-impact-analyzer/cia_executive_verdict)",
"mcp(code-impact-analyzer/cia_analyze_git_diff)",
"mcp(code-impact-analyzer/cia_trace_symbol)",
"mcp(code-impact-analyzer/cia_db_blast_radius)",
"mcp(code-impact-analyzer/cia_targeted_test_suite)",
"mcp(code-impact-analyzer/cia_quality_gate)"
```

---

## 📋 Recommended Agent Workflow

1. **Pre-Commit Forensic Audit & Invariants Check**:
   - The agent runs `cia_erp_forensic_audit(staged_only: true)` or `cia_deep_impact_analysis(staged_only: true)` to evaluate behavioral drift, accounting equations, stock conservation, in-flight queue hazards, tenant isolation leaks, and contract breaking changes.
2. **Quality Gate Verification**:
   - The agent runs `cia_quality_gate()`. If `FAIL`, the commit is blocked until breaking changes, critical hazards, or ERP invariant violations are resolved.
3. **Database Schema Mutation Auditing**:
   - Before applying any database migration altering or dropping a column, the agent runs `cia_db_blast_radius(table: "users", column: "email", operation: "modify_column")` to ensure no active Form Requests, Repositories, or Views break.
4. **Targeted Testing**:
   - The agent runs `cia_targeted_test_suite(changed_files: [...])` and executes only the relevant Pest/PHPUnit tests, avoiding expensive full test runs.
