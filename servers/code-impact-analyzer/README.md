# @maccpro/code-impact-analyzer (v2.1.0)

> **Enterprise Dynamic Relational Code Impact Analysis, Blast Radius Calculator, Runtime Hazard Evaluator & Cognitive Reasoning Engine**
> 100% Dynamic, Zero-Hardcoded, Resilient with AI Cognitive Synthesis & 100% Offline Fallback.

`code-impact-analyzer` is an enterprise-grade Model Context Protocol (MCP) server engineered to prevent production regressions, detect contract-breaking API changes, prevent in-flight queue worker crashes, detect multi-tenant isolation leaks, simulate database mutation hazards, and synthesize executive architectural decisions before code is committed or deployed.

---

## 🚀 Key Innovations in v2.1 (Dynamic Relational Architecture)

1. **Dynamic Relational Dependency Graph (`RelationalDependencyGraph`)**
   - **Typed Directed Graph**: Models codebase artifacts and database tables with typed relationships (`CALLS`, `INHERITS`, `IMPLEMENTS`, `USES_TRAIT`, `DISPATCHES`, `FOREIGN_KEY`, `INJECTS`).
   - **Cycle-Safe BFS/DFS Traversal**: Dynamically traverses transitive blast radiuses to arbitrary depths (`max_depth`) without recursion overflow or duplicated loop logic.
   - **Path Tracing**: Computes exact shortest causality paths (e.g. `OrderController -> OrderService -> InvoiceRepository -> invoices.total_amount`).

2. **Advanced Contract Breaking Change Detector**
   - Detects removed or renamed public/protected methods (`PUBLIC_METHOD_REMOVED`, `PROTECTED_METHOD_REMOVED`).
   - Detects visibility narrowing (`public` to `protected` / `private`).
   - Detects return type mutations and nullability narrowing (`RETURN_TYPE_MUTATED`).
   - Detects newly added abstract methods in abstract classes (`ABSTRACT_METHOD_ADDED`).
   - Detects removed public class properties (`PUBLIC_PROPERTY_REMOVED`).

3. **Relational Database Impact & Foreign Key Cascade**
   - **Foreign Key Cascades**: Discovers child foreign key constraints across migrations (`foreignId()->constrained()`, `references()->on()`).
   - **Model Relationships**: Couples database table alterations to Eloquent relations (`belongsTo`, `hasMany`, etc.).
   - **Composite Index Blast Radius**: Detects index degradation when leading composite index columns are modified.
   - **Multi-Tenant Migration Governance**: Audits tenant-aware table modifications against tenant migration directories (Rule 7).

4. **Runtime & Infrastructure Hazard Evaluator**
   - **In-Flight Queue Deserialization**: Audits both constructor parameters and serialized public properties of `ShouldQueue` jobs.
   - **N+1 Query Loop Detection**: Detects database queries or relation calls inside loops without eager loading.
   - **Unbounded Memory Protection**: Detects un-chunked `Model::all()` in batch workers.
   - **Multi-Tenant Isolation Breach**: Detects queries bypassing tenant scoping (`withoutGlobalScope('tenant')`, raw `DB::table` missing `tenant_id`).
   - **Long-Running DB Lock with External I/O**: Detects network calls inside active database transactions.

5. **100% Zero-Hardcoded Architecture (PSR-4 & AST)**
   - **Dynamic PSR-4 Introspection**: Parses `composer.json` (`autoload` and `autoload-dev`), `phpunit.xml`, and tenant migration directories with mtime-based in-memory caching.
   - **Structural AST Classification**: Code entities are classified by token inheritance, traits, and interfaces, not directory path strings.

6. **Neuro-Symbolic Cognitive Reasoner (`cia_deep_impact_analysis` & `cia_executive_verdict`)**
   - Synthesizes complex AST diffs, symbol graphs, runtime hazards, and database blast radius into an executive architectural verdict (`APPROVE`, `REQUIRES_PEER_REVIEW`, `REJECT_BREAKING_CHANGES`).
   - 100% Deterministic Offline Fallback with zero token cost.

## 🛠️ MCP Tools Overview

| Tool | Purpose | Key Arguments |
| :--- | :--- | :--- |
| `cia_deep_impact_analysis` | **All-in-one cognitive impact analysis**: Combines PSR-4 introspection, AST classification, blast radius, queue & tenant hazards, breaking changes, targeted tests, and AI cognitive synthesis. | `repo_path`, `staged_only`, `enable_ai_reasoning` |
| `cia_executive_verdict` | Generates a high-level architectural verdict (`APPROVE` / `WARN` / `FAIL`) with canary deployment readiness. | `repo_path`, `staged_only`, `max_risk_score` |
| `cia_analyze_git_diff` | Computes full dynamic blast radius, risk score, hazards, and targeted tests from git diff. | `repo_path`, `staged_only`, `max_depth` |
| `cia_trace_symbol` | Traces a specific class, method, or event across upstream callers with Mermaid diagram. | `symbol`, `file_path`, `max_depth` |
| `cia_db_blast_radius` | Analyzes blast radius of column/table drop, rename, or type modification across Models, Requests, and Repositories. | `table`, `column`, `operation` |
| `cia_targeted_test_suite` | Selects minimal Pest/PHPUnit test suite based on modified code. | `changed_files`, `framework` |
| `cia_quality_gate` | Pre-commit/CI PASS/FAIL gate blocking breaking changes, critical hazards, and excessive risk scores. | `max_risk_score`, `fail_on_breaking` |

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
- **Auto Dynamic Code Impact & Blast Radius Gate (code-impact-analyzer)**: Always utilize `code-impact-analyzer` tools (`cia_deep_impact_analysis`, `cia_executive_verdict`, `cia_analyze_git_diff`, `cia_trace_symbol`, `cia_db_blast_radius`, `cia_targeted_test_suite`, `cia_quality_gate`) before commits or PRs to calculate blast radius, detect in-flight queue hazards, multi-tenant leaks, contract-breaking changes, evaluate database mutation risks, and execute targeted test suites.
```

---

## 🛡️ Antigravity Auto-Permission Grants (`config.json`)

To prevent Antigravity or the AI assistant from prompting for confirmation on every single analysis, add the following lines to `globalPermissionGrants.allow` in `~/.gemini/config/config.json`:

```json
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

1. **Pre-Commit Deep Impact Analysis**:
   - The agent runs `cia_deep_impact_analysis(staged_only: true)` to evaluate the transitive dependencies, in-flight queue hazards, tenant isolation leaks, and breaking changes.
2. **Quality Gate Verification**:
   - The agent runs `cia_quality_gate()`. If `FAIL`, the commit is blocked until breaking changes or critical hazards are resolved.
3. **Database Schema Mutation Auditing**:
   - Before applying any database migration altering or dropping a column, the agent runs `cia_db_blast_radius(table: "users", column: "email", operation: "modify_column")` to ensure no active Form Requests, Repositories, or Views break.
4. **Targeted Testing**:
   - The agent runs `cia_targeted_test_suite(changed_files: [...])` and executes only the relevant Pest/PHPUnit tests, avoiding expensive full test runs.
