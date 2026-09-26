# @maccpro/code-impact-analyzer

> **Enterprise Dynamic Code Impact Analysis, Blast Radius Calculator & Breaking Change Detector for Laravel, PHP & Full-Stack Systems**
> 100% Offline, Deterministic, Zero-Token & Free.

`code-impact-analyzer` is an enterprise Model Context Protocol (MCP) server engineered to prevent production regressions, detect contract-breaking API changes, simulate database mutation hazards, and select minimal targeted tests before code is committed or deployed.

---

## Key Features

1. **Framework-Aware Dynamic Symbol Resolution**
   - Resolves Eloquent dynamic magic scopes (`scopeActive` <-> `active()`).
   - Resolves Service Container interface-to-concrete bindings (`bind(Interface::class, Concrete::class)`).
   - Resolves Event-Listener dispatch graphs (`event(new OrderCreated())` -> `[SendEmail, ProvisionService]`).
   - Resolves single-purpose invokable actions (`__invoke`).

2. **Multi-Level Blast Radius Engine (`cia_analyze_git_diff` & `cia_trace_symbol`)**
   - Generates multi-depth caller graphs (Level 1 Direct -> Level 2 Transitive -> Level 3 Architecture).
   - Exports high-visibility Mermaid flowcharts (`flowchart TD`).
   - Calculates a weighted mathematical Risk Score (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

3. **Database Mutation Impact Analyzer (`cia_db_blast_radius`)**
   - Scans Eloquent Models, Form Request validation rules, Repositories, Services, and Blade views before a column or table is dropped, renamed, or modified.
   - Provides safe zero-downtime expand-contract migration recipes.

4. **Backward Compatibility & Breaking Change Gate (`cia_quality_gate`)**
   - Detects added required parameters without default values.
   - Detects newly added Interface methods requiring immediate implementation.
   - Blocks unsafe git commits in CI/CD or Antigravity pre-commit quality gates.

5. **Test Impact Analysis (`cia_targeted_test_suite`)**
   - Maps modified classes directly to their corresponding Pest or PHPUnit test files.
   - Saves 75% to 95% of test execution time by running only relevant tests.

---

## MCP Tools Overview

| Tool | Purpose | Key Arguments |
| :--- | :--- | :--- |
| `cia_analyze_git_diff` | Computes full dynamic blast radius, risk score, and targeted tests from git diff. | `repo_path`, `staged_only`, `max_depth` |
| `cia_trace_symbol` | Traces a specific class, method, or event across upstream callers. | `symbol`, `file_path`, `max_depth` |
| `cia_db_blast_radius` | Analyzes blast radius of column/table drop, rename, or type modification. | `table`, `column`, `operation` |
| `cia_targeted_test_suite` | Selects minimal Pest/PHPUnit test suite based on modified code. | `changed_files`, `framework` |
| `cia_quality_gate` | Pre-commit/CI PASS/FAIL gate blocking breaking changes and excessive risk scores. | `max_risk_score`, `fail_on_breaking` |

---

## Installation & Testing

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
      "args": ["c:/Users/JoypurHost/Desktop/mcp-collection/servers/code-impact-analyzer/server.js"]
    }
  }
}
```
