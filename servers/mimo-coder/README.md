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

### 1. Google Antigravity
Open `mcp_config.json` (or click **Open MCP Config** under Settings > Customizations):

```json
{
  "mcpServers": {
    "mimo-coder": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-collection/servers/mimo-coder/mimo-server.js"
      ],
      "env": {
        "MIMO_API_KEY": "your_mimo_api_key_here",
        "MIMO_API_URL": "https://api.xiaomimimo.com/v1/chat/completions",
        "MIMO_MODEL": "mimo-v2.6-pro",
        "MIMO_THINKING": "enabled"
      }
    }
  }
}
```

### 2. Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "mimo-coder": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-collection/servers/mimo-coder/mimo-server.js"
      ],
      "env": {
        "MIMO_API_KEY": "your_mimo_api_key_here"
      }
    }
  }
}
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MIMO_API_KEY` | **Required.** Your Xiaomi MiMo API Key | None |
| `MIMO_API_URL` | Endpoint for chat completions | `https://api.xiaomimimo.com/v1/chat/completions` |
| `MIMO_MODEL` | Target MiMo model name | `mimo-v2.6-pro` |
| `MIMO_THINKING` | Deep reasoning mode (`enabled` or `disabled`) | `enabled` |

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
