# Backend MCP Server (`backend-mcp`)

A dedicated, zero-dependency **Model Context Protocol (MCP)** server for enterprise backend code generation, business logic, APIs, and algorithms powered by **Xiaomi MiMo** (`mimo-v2.6-pro`), **DeepSeek**, or any OpenAI-compatible provider.

Designed specifically for AI coding assistants like **Google Antigravity**, **Claude Desktop**, and **Cursor** to offload heavy application code generation and preserve primary assistant quota.

---

## ⚡ Features

- **Enterprise Backend Code Generation:** Offloads classes, methods, database services, APIs, and business logic.
- **Zero Dependencies:** Built entirely with Node.js standard libraries (`readline`, `fetch`). No heavy node_modules needed!
- **Dynamic Configuration:** Easily customize API Key, API Endpoint, Model, and Thinking Mode via environment variables.
- **Provider Agnostic:** Supports Xiaomi MiMo, DeepSeek, OpenAI, Qwen, or custom local gateways with automatic failover.
- **Quota Saver:** Drastically reduces primary model token usage during large-scale development.

---

## 🛠️ Configuration & Setup

### 1. Zero-Config Client Setup (Recommended)
`backend-mcp` automatically loads environment variables from its local `.env` file (copied from `.env.example`).

In Google Antigravity (`mcp_config.json`):
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

In Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "backend-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-collection/servers/backend-mcp/server.js"
      ]
    }
  }
}
```

---

### 2. Local `.env` File Configuration
Create a `.env` file in `servers/backend-mcp/.env` (or copy from `.env.example`):

```env
# Primary Provider (e.g. Xiaomi MiMo / DeepSeek / OpenAI-compatible)
BACKEND_API_KEY=your_actual_api_key_here
BACKEND_API_URL=https://api.xiaomimimo.com/v1/chat/completions
BACKEND_MODEL=mimo-v2.6-pro
BACKEND_THINKING=enabled

# Fallback: DeepSeek / Secondary Provider
BACKEND_FALLBACK_API_KEY=your_fallback_api_key_here
BACKEND_FALLBACK_API_URL=https://api.deepseek.com/v1/chat/completions
BACKEND_FALLBACK_MODEL=deepseek-v4-flash
```

*(Note: `MIMO_*` variable names are also fully supported for backward compatibility).*

---

## 🔧 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `BACKEND_API_KEY` (or `MIMO_API_KEY`) | **Required.** Primary backend provider API Key | None |
| `BACKEND_API_URL` (or `MIMO_API_URL`) | Endpoint for chat completions | `https://api.xiaomimimo.com/v1/chat/completions` |
| `BACKEND_MODEL` (or `MIMO_MODEL`) | Target model name | `mimo-v2.6-pro` |
| `BACKEND_THINKING` (or `MIMO_THINKING`) | Deep reasoning mode (`enabled` or `disabled`) | `enabled` |
| `BACKEND_FALLBACK_API_KEY` | Optional fallback provider API key (e.g. DeepSeek) | None |
| `BACKEND_FALLBACK_API_URL` | Optional fallback endpoint | `https://api.deepseek.com/v1/chat/completions` |
| `BACKEND_FALLBACK_MODEL` | Optional fallback model name | `deepseek-v4-flash` |

---

## 📦 Exposed MCP Tools

### `backend_generate_code` *(Primary)*
Generates, refactors, and implements backend application source code, API services, and business logic.
- **Parameters:**
  - `prompt` (string, required): Instructions on what code or logic to write or refactor.
  - `context` (string, optional): Existing code, file snippets, or schema context.
  - `system_prompt` (string, optional): Custom persona/instructions for code generation.
  - `thinking_enabled` (boolean, optional): Enable reasoning tokens for complex algorithmic tasks (default: `true`).
  - `max_tokens` (number, optional): Maximum tokens to generate (default: `4096`).

### `mimo_generate_code` *(Backward-compatible Alias)*
Accepted as a direct alias for `backend_generate_code` to ensure existing workflows remain seamless.

---

## 🤖 Antigravity Automated Enforcement Rule

To automatically offload application code generation and preserve primary assistant quota, the following rule is configured in Antigravity's global rules (`AGENTS.md`):

```markdown
- **Auto Backend Code Generation Offload (backend-mcp)**: Offload routine application code generation, classes, APIs, algorithms, and business logic to `backend_generate_code` from `backend-mcp` to preserve primary quota. Architecture, system planning, shell execution, and testing remain strictly with Antigravity.
```

---

## 📄 License
MIT
