# Enterprise Backend MCP Server (`backend-mcp`) v2.0

A resilient, zero-dependency, and fully dynamic **Model Context Protocol (MCP)** server for enterprise backend application engineering, clean architecture code generation, business logic implementation, security review, and API specification design.

Powered by **Xiaomi MiMo** (`mimo-v2.6-pro`), **DeepSeek**, **OpenAI**, **Anthropic Claude**, **Google Gemini**, or **Local LLMs (Ollama)** with automatic cascading failover.

Designed specifically for AI coding assistants like **Google Antigravity**, **Claude Desktop**, and **Cursor** to offload heavy routine boilerplate and complex backend domain logic while preserving primary assistant quota.

---

## ⚡ Enterprise Features

- **Dynamic Multi-Framework Stack Detection:** Automatically inspects target workspaces to detect backend framework (Laravel, NestJS, Express, FastAPI, Django, Spring Boot, Go/Gin, Rust/Axum), ORM (Eloquent, Prisma, TypeORM, SQLAlchemy, GORM), and architectural layers.
- **Architectural Persona Synthesis:** Automatically injects framework-specific clean code mandates (e.g. strict Form Request validation, Service/Action classes, API Resource serialization, DB transaction safety, DTO validation).
- **Multi-Provider Failover Cascades:** Primary (MiMo / OpenAI / Claude) ➔ Fallback (DeepSeek / Groq) ➔ Local Offline (Ollama).
- **Automated Resilience:** Exponential backoff with jitter on HTTP 429 / 5xx, `AbortController` timeout protection, and dynamic parameter adaptation (`max_tokens` vs `max_completion_tokens`, reasoning toggles).
- **OWASP Security & Code Review:** Real-time static heuristic checks + AI semantic audit for SQL Injection, IDOR, Mass Assignment, Sensitive Data Leaks, and N+1 query bottlenecks.
- **OpenAPI 3.1 & Postman Generator:** Instantly converts backend code or routes into valid OpenAPI 3.1 specifications (YAML/JSON) or Postman collections.
- **Zero External Dependencies:** Built 100% on Node.js standard libraries (`node:fs`, `node:path`, `node:readline`, `node:url`, native `fetch`). No `npm install` required!

---

## 📦 Exposed MCP Tools (8 Tools)

| Tool Name | Purpose | Key Parameters |
| :--- | :--- | :--- |
| `backend_generate_code` | **Primary.** Generates enterprise backend code and business logic with framework & layer awareness. | `prompt`, `context`, `project_path`, `framework`, `layer`, `thinking_enabled`, `max_tokens`, `model`, `provider` |
| `mimo_generate_code` | Backward-compatible alias for existing pipelines. | Same as `backend_generate_code` |
| `backend_refactor_code` | Refactors backend code to SOLID, Clean Architecture, DRY, and high performance. | `code`, `instruction`, `project_path`, `framework`, `focus`, `thinking_enabled`, `max_tokens` |
| `backend_review_code` | Deep security (OWASP), architecture, and performance review. | `code`, `project_path`, `framework`, `rules` |
| `backend_explain_logic` | Explains complex algorithms, state machines, business workflows, and blast radius. | `code`, `context`, `focus` (`flow`, `edge_cases`, `blast_radius`, `security`) |
| `backend_generate_api_spec` | Generates standardized OpenAPI 3.1 (YAML/JSON) or Postman collections. | `source_code`, `routes_info`, `format`, `title`, `version` |
| `backend_detect_stack` | Dynamic inspector of project workspace to report language, framework, ORM, and layers. | `project_path` |
| `backend_health_check` | Diagnostics tool to test connectivity, model availability, and response latency. | `provider` (`all`, `primary`, `fallback`, `local`), `test_call` (boolean) |

---

## 🛠️ Configuration & Setup

### 1. Client Configuration

#### Google Antigravity (`mcp_config.json`):
```json
{
  "mcpServers": {
    "backend-mcp": {
      "command": "node",
      "args": [
        "c:/Users/JoypurHost/Desktop/mcp-collection/servers/backend-mcp/server.js"
      ]
    }
  }
}
```

#### Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "backend-mcp": {
      "command": "node",
      "args": [
        "/path/to/mcp-collection/servers/backend-mcp/server.js"
      ]
    }
  }
}
```

---

### 2. Environment Configuration (`.env`)

Create or update `.env` in `servers/backend-mcp/.env`:

```env
# ------------------------------------------------------------------------------
# Primary Provider (Xiaomi MiMo / OpenAI / DeepSeek / Claude)
# ------------------------------------------------------------------------------
BACKEND_API_KEY=your_actual_api_key_here
BACKEND_API_URL=https://api.xiaomimimo.com/v1/chat/completions
BACKEND_MODEL=mimo-v2.6-pro
BACKEND_THINKING=enabled

# ------------------------------------------------------------------------------
# Fallback Provider (DeepSeek / Groq / OpenRouter)
# ------------------------------------------------------------------------------
BACKEND_FALLBACK_API_KEY=your_fallback_api_key_here
BACKEND_FALLBACK_API_URL=https://api.deepseek.com/v1/chat/completions
BACKEND_FALLBACK_MODEL=deepseek-v4-flash

# ------------------------------------------------------------------------------
# Local / Offline Provider (Ollama / LocalAI)
# ------------------------------------------------------------------------------
BACKEND_LOCAL_API_URL=http://localhost:11434/v1/chat/completions
BACKEND_LOCAL_MODEL=deepseek-coder-v2:latest

# ------------------------------------------------------------------------------
# Resilience Settings
# ------------------------------------------------------------------------------
BACKEND_TIMEOUT_MS=90000
```

*(Note: `MIMO_*` variable names remain 100% backward-compatible).*

---

## 🤖 Antigravity Automated Enforcement Rule

To selectively offload heavy application code generation and business logic implementation while preserving primary quota, configure this rule in Antigravity's global rules (`AGENTS.md`):

```markdown
- **Selective Backend Code Generation Offload & Mandatory Review (backend-mcp)**:
  - **Selective Offload**: Offload heavy routine boilerplate, large application classes, full service layers, and extensive business logic to `backend_generate_code` from `backend-mcp` (or alias `mimo_generate_code`) to preserve primary quota. Do NOT offload small surgical edits, minor bug fixes, config adjustments, or simple single-method changes—handle those directly with primary Antigravity for speed and contextual precision.
  - **Mandatory Review & Verification**: Antigravity must NEVER blindly insert or output generated code from `backend-mcp`. Always rigorously inspect, review, and refine the returned code for architectural compliance, security standards (SQL injection, XSS, input validation), and project conventions before applying it to the codebase.
```

---

## 🧪 Testing

Run the comprehensive enterprise test suite:

```bash
npm test
# or directly:
node test/run-tests.js
```

---

## 📄 License
MIT © MaccPro Team
