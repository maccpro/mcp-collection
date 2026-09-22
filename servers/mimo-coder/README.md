# MiMo Coder MCP Server

A dedicated, zero-dependency **Model Context Protocol (MCP)** server powered by Xiaomi's **MiMo** (`mimo-v2.6-pro`) model. 

Designed specifically for AI coding assistants like **Google Antigravity**, **Claude Desktop**, and **Cursor** to offload heavy application code generation and preserve primary assistant quota.

---

## ⚡ Features

- **Pure Application Code Generation:** Offloads classes, methods, functions, and business logic to Xiaomi MiMo.
- **Zero Dependencies:** Built entirely with Node.js standard libraries (`readline`, `fetch`). No heavy node_modules needed!
- **Dynamic Configuration:** Easily customize API Key, API Endpoint, Model, and Thinking Mode via environment variables.
- **Quota Saver:** Drastically reduces primary model token usage during large-scale development.

---

## 🛠️ Configuration & Setup

### 1. Zero-Config Client Setup (Recommended)
`mimo-coder` automatically loads environment variables from its local `.env` file (copied from `.env.example`).

In Google Antigravity (`mcp_config.json`):
```json
{
  "mcpServers": {
    "mimo-coder": {
      "command": "node",
      "args": [
        "c:/Users/JoypurHost/Desktop/mcp-collection/servers/mimo-coder/mimo-server.js"
      ]
    }
  }
}
```

In Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "mimo-coder": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-collection/servers/mimo-coder/mimo-server.js"
      ]
    }
  }
}
```

---

### 2. Local `.env` File Configuration
Create a `.env` file in `servers/mimo-coder/.env` (or copy from `.env.example`):

```env
# Primary: Xiaomi MiMo
MIMO_API_KEY=your_actual_mimo_api_key_here
MIMO_API_URL=https://api.xiaomimimo.com/v1/chat/completions
MIMO_MODEL=mimo-v2.6-pro
MIMO_THINKING=enabled

# Fallback: DeepSeek / OpenAI-compatible
# Automatically called if primary MiMo API request fails or is rate-limited
MIMO_FALLBACK_API_KEY=your_fallback_api_key_here
MIMO_FALLBACK_API_URL=https://api.deepseek.com/v1/chat/completions
MIMO_FALLBACK_MODEL=deepseek-v4-flash
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MIMO_API_KEY` | **Required.** Your Xiaomi MiMo API Key | None |
| `MIMO_API_URL` | Endpoint for chat completions | `https://api.xiaomimimo.com/v1/chat/completions` |
| `MIMO_MODEL` | Target MiMo model name | `mimo-v2.6-pro` |
| `MIMO_THINKING` | Deep reasoning mode (`enabled` or `disabled`) | `enabled` |
| `MIMO_FALLBACK_API_KEY` | Optional fallback provider API key (e.g. DeepSeek) | None |
| `MIMO_FALLBACK_API_URL` | Optional fallback endpoint | `https://api.deepseek.com/v1/chat/completions` |
| `MIMO_FALLBACK_MODEL` | Optional fallback model name | `deepseek-v4-flash` |

---

## 📦 Exposed MCP Tools

### `mimo_generate_code`
Generates, refactors, and implements application source code and business logic.
- **Parameters:**
  - `prompt` (string, required): Instructions on what code to write or refactor.
  - `context` (string, optional): Existing code, file snippets, or schema context.
  - `system_prompt` (string, optional): Custom persona/instructions for code generation.
  - `thinking_enabled` (boolean, optional): Enable reasoning tokens for complex algorithmic tasks (default: `true`).
  - `max_tokens` (number, optional): Maximum tokens to generate (default: `4096`).

---

## 📄 License
MIT
