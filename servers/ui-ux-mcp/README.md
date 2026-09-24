# UI/UX MCP Server (`ui-ux-mcp`)

Professional, OpenAI-compatible Model Context Protocol (MCP) server for **Google Antigravity**, **Claude Desktop**, and **Cursor** to generate high-converting frontend UI/UX designs, Tailwind CSS & Shadcn UI component patterns, accessibility (a11y) audits, and design systems.

---

## ⚡ Features

- **OpenAI API Compatibility:** Seamlessly connect to official OpenAI, Xiaomi MiMo, DeepSeek, OpenRouter, Groq, or local gateways via standard `/v1/chat/completions`.
- **Automatic Fallback Provider:** If the primary provider times out or fails, automatically switches to a secondary provider (e.g. DeepSeek).
- **Instant Offline Patterns:** Retrieve curated, production-ready Tailwind CSS patterns (Pricing matrices, KPI Dashboards, Multi-Step Checkouts, Hero sections, Data tables) without needing an API key or internet.
- **UX & a11y Heuristics Audit:** Evaluates HTML/Tailwind snippets against WCAG 2.1 accessibility rules, touch target sizing ($\ge 44\text{px}$), and responsive breakpoints.
- **Tailwind Design Tokens:** Generates cohesive industry-specific color palettes (`cloud_hosting`, `saas_modern`, `ecommerce_vibrant`), CSS variables, and `tailwind.config.js` presets.
- **Zero Dependencies:** Built entirely with Node.js standard libraries (`readline`, `fetch`, `fs`).

---

## 🛠️ Configuration & Setup

### 1. Antigravity Configuration (`mcp_config.json`)
Open `mcp_config.json` (under Settings > Customizations > Open MCP Config):

```json
{
  "mcpServers": {
    "ui-ux-mcp": {
      "command": "node",
      "args": [
        "c:/Users/JoypurHost/Desktop/mcp-collection/servers/ui-ux-mcp/server.js"
      ]
    }
  }
}
```

### 2. Local `.env` File Configuration
Create a `.env` file in `servers/ui-ux-mcp/.env` (or copy from `.env.example`):

```env
# Primary OpenAI-Compatible Provider (e.g. OpenAI / Xiaomi MiMo / OpenRouter)
UI_UX_API_KEY=your_api_key_here
UI_UX_API_URL=https://api.xiaomimimo.com/v1/chat/completions
UI_UX_MODEL=mimo-v2.6-pro

# Fallback Provider (e.g. DeepSeek / Groq)
UI_UX_FALLBACK_API_KEY=your_fallback_key_here
UI_UX_FALLBACK_API_URL=https://api.deepseek.com/v1/chat/completions
UI_UX_FALLBACK_MODEL=deepseek-v4-flash
```

---

## 📦 Exposed MCP Tools

### 1. `ui_ux_suggest_pattern`
Returns curated, production-ready Tailwind CSS and Shadcn UI component markup, UX principles, and guidelines.
- **Parameters:**
  - `component_type` (string, required): `pricing_table` | `dashboard_metrics` | `checkout_flow` | `hero_section` | `data_table`.
  - `include_code` (boolean, optional, default: `true`): Include ready-to-use HTML/Tailwind markup.

### 2. `ui_ux_generate_custom_design`
Generates customized Tailwind CSS / Shadcn UI components based on your prompt using an OpenAI-compatible model.
- **Parameters:**
  - `prompt` (string, required): Description of the UI, functionality, and styling requirements.
  - `target_framework` (string, optional): `html_tailwind` | `blade_livewire` | `vue_tailwind` | `react_tailwind`.
  - `theme_mode` (string, optional): `both` | `dark` | `light`.

### 3. `ui_ux_audit_checklist`
Audits frontend HTML/Tailwind snippets for UX heuristics, touch targets ($\ge 44\text{px}$), responsiveness, and WCAG 2.1 accessibility.
- **Parameters:**
  - `code_snippet` (string, required): The code to inspect.
  - `context` (string, optional): Business context (e.g. `mobile_checkout`).

### 4. `ui_ux_design_tokens`
Generates cohesive Tailwind CSS design tokens, color palettes, and `tailwind.config.js` extension objects.
- **Parameters:**
  - `theme_preset` (string, optional): `cloud_hosting` | `saas_modern` | `ecommerce_vibrant`.
  - `mode` (string, optional): `both` | `light` | `dark`.

---

## 📄 License
MIT © MaccPro Team
