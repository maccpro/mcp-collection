# MCP Collection

A curated monorepo collection of high-performance, production-ready **Model Context Protocol (MCP)** servers tailored for AI coding assistants such as **Google Antigravity**, **Claude Desktop**, and **Cursor**.

---

## 📦 Available Servers

| Server | Description | Protocol | Runtime |
| :--- | :--- | :--- | :--- |
| [`mimo-coder`](./servers/mimo-coder) | Dedicated application code generator powered by Xiaomi MiMo (`mimo-v2.6-pro`) | stdio (JSON-RPC 2.0) | Node.js (Zero external dependencies) |

---

## 📁 Repository Structure

```text
mcp-collection/
├── .gitignore
├── LICENSE
├── README.md
└── servers/
    └── mimo-coder/          # Xiaomi MiMo code generator
        ├── mimo-server.js
        ├── package.json
        ├── .env.example
        └── README.md
```

---

## 🚀 Quick Setup & Usage

Each MCP server lives in its own directory under `servers/` with dedicated documentation and zero-dependency runtime scripts.

To connect any server in this collection to your AI assistant:
1. Clone this repository:
   ```bash
   git clone git@github.com:maccpro/mcp-collection.git
   ```
2. Navigate to the desired server documentation under `servers/<server-name>/README.md`.
3. Configure your assistant's `mcp_config.json` (or `claude_desktop_config.json`).

---

## 🔒 Security Best Practices
- Never commit actual API keys or credentials to this repository.
- Use `.env.example` templates for configuration guidelines.
- Always configure real secrets via client environment blocks (e.g., `mcp_config.json`).

---

## 📄 License
This project is licensed under the terms of the [LICENSE](LICENSE).