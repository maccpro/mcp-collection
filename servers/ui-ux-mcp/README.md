# Enterprise UI/UX MCP Server (`ui-ux-mcp`)

Advanced, Enterprise-Grade, and Fully Dynamic Model Context Protocol (MCP) server for **Google Antigravity**, **Claude Desktop**, and **Cursor** to generate accessible, high-converting frontend UI/UX designs, production Tailwind CSS & Shadcn UI patterns, WCAG 2.2 accessibility audits with automated fixes, and dynamic design tokens for any project.

---

## ⚡ Enterprise Features

- **Dynamic Project Stack Inspector (`ui_ux_inspect_project`):** Scans any project folder to auto-detect framework (`Laravel/Blade/Livewire`, `Next.js/React/Shadcn`, `Vue 3/Nuxt`, `Svelte 5`), Tailwind version (`v4 @theme` vs `v3 config`), icon sets, and UI architecture.
- **Pure Math Color Science & WCAG 2.2 Contrast (`ui_ux_color_contrast`):** Zero-dependency relative luminance and contrast ratio calculations. Automatically validates WCAG AA/AAA compliance and computes accessible color adjustments.
- **Curated Production Patterns (`ui_ux_suggest_pattern`):** 22 production-grade patterns across Cloud Hosting (pricing, telemetry gauges, VPS configurator), SaaS Dashboards, Enterprise Portals, E-Commerce, and Overlays.
- **Dynamic Multi-Framework Interpolation:** Parameterize components with custom brand name, currency symbol (`৳`, `$`, `€`, `₹`), color scheme, and target framework (`html_tailwind`, `blade_livewire`, `react_shadcn`, `vue_tailwind`, `svelte_tailwind`).
- **Deep Heuristic Audit with Auto-Fix (`ui_ux_audit_checklist`):** 18 deterministic rules inspecting WCAG 2.2 accessibility, touch targets ($\ge 44\text{px}$), CLS layout shifts, and Tailwind antipatterns with an **automated refactored code output**.
- **Dual Tailwind v3 & v4 Design Tokens (`ui_ux_design_tokens`):** Computes complete 10-shade tonal scales (`50` through `950`) from ANY custom brand hex, generating Tailwind v3 configs, Tailwind v4 `@theme` CSS blocks, and Shadcn UI CSS variables.
- **Multi-Framework Converter (`ui_ux_convert_component`):** Converts UI markup between HTML/Tailwind, Laravel Blade + Livewire + Alpine, React + TypeScript + Shadcn UI, Vue 3, and Svelte 5.
- **Resilient Multi-Provider AI Cascade (`ui_ux_generate_custom_design`):** Automatically discovers keys (`UI_UX_API_KEY`, `BACKEND_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`) and supports modern reasoning models (`o1`, `o3`, `gpt-5.6-sol`, `mimo-v2.6-pro`, `deepseek-v4-flash`).
- **Zero External Dependencies:** Built 100% on Node.js standard libraries (`node:fs`, `node:path`, `node:readline`, native `fetch`).

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

### 2. Local `.env` Configuration
Create a `.env` file in `servers/ui-ux-mcp/.env` (or copy from `.env.example`):

```env
# Primary OpenAI-Compatible Provider (e.g. OpenAI / Xiaomi MiMo / OpenRouter)
UI_UX_API_KEY=your_api_key_here
UI_UX_API_URL=https://api.openai.com/v1/chat/completions
UI_UX_MODEL=gpt-5.6-sol

# Fallback Provider (e.g. DeepSeek / Groq)
UI_UX_FALLBACK_API_KEY=your_fallback_key_here
UI_UX_FALLBACK_API_URL=https://api.deepseek.com/v1/chat/completions
UI_UX_FALLBACK_MODEL=deepseek-v4-flash
```

---

## 📦 Exposed Enterprise MCP Tools

### 1. `ui_ux_inspect_project`
Inspects workspace directory to auto-detect framework, Tailwind version (v3 vs v4), icon set, and UI stack.
- **Parameters:**
  - `project_path` (string, optional): Project root directory. Defaults to current working directory.

### 2. `ui_ux_suggest_pattern`
Curated production-ready UI/UX component patterns with dynamic brand name, currency symbol, color theme, and framework parameterization.
- **Parameters:**
  - `component_type` (string, required): `pricing_table` | `dashboard_metrics` | `checkout_flow` | `hero_section` | `data_table` | `server_resource_monitor` | `vps_configurator` | `command_palette` | `sidebar_navigation` | `modal_dialog`.
  - `framework` (string, optional): `html_tailwind` | `blade_livewire` | `react_shadcn` | `vue_tailwind` | `svelte_tailwind`.
  - `brand_name` (string, optional): e.g. "JoypurHost", "MaccPro".
  - `currency_symbol` (string, optional): e.g. "৳", "$", "€".
  - `color_scheme` (string, optional): Tailwind color family or hex code.
  - `include_code` (boolean, optional, default: `true`).

### 3. `ui_ux_generate_custom_design`
Generates customized, high-converting Tailwind / Shadcn UI components with project stack context awareness.
- **Parameters:**
  - `prompt` (string, required): Description of UI requirements and layout.
  - `project_path` (string, optional): Project root for auto-detection.
  - `target_framework` (string, optional): `html_tailwind` | `blade_livewire` | `react_shadcn` | `vue_tailwind` | `svelte_tailwind`.
  - `tailwind_version` (string, optional): `auto` | `v4` | `v3`.
  - `theme_mode` (string, optional): `both` | `dark` | `light`.
  - `thinking_enabled` (boolean, optional, default: `true`).

### 4. `ui_ux_audit_checklist`
Deep audit of frontend markup against WCAG 2.2 AA & AAA, touch target sizing ($\ge 44\text{px}$), Core Web Vitals (CLS), and Tailwind clean code. Returns a numerical score, findings, and an automated refactored fix.
- **Parameters:**
  - `code_snippet` (string, required): HTML, Blade, JSX, or Vue template to evaluate.
  - `context` (string, optional): Business context (e.g. `mobile_checkout`).

### 5. `ui_ux_design_tokens`
Generates cohesive design tokens, 10-shade tonal scales (`50` through `950`) from ANY custom brand hex or built-in preset, Tailwind CSS v3 config, Tailwind CSS v4 `@theme` CSS blocks, and Shadcn UI CSS variables.
- **Parameters:**
  - `theme_preset` (string, optional): `cloud_hosting` | `saas_modern` | `ecommerce_vibrant` | `enterprise_slate` | `cyber_neon` | `fintech_trust`.
  - `custom_hex` (string, optional): Custom brand hex code (e.g. `#0EA5E9`).
  - `tailwind_version` (string, optional): `both` | `v4` | `v3`.
  - `mode` (string, optional): `both` | `light` | `dark`.

### 6. `ui_ux_convert_component`
Converts UI components across frameworks with framework-specific idioms (`@props`, `className`, Lucide icons, Vue 3 setup, Svelte runes).
- **Parameters:**
  - `code_snippet` (string, required): Component markup to convert.
  - `target_framework` (string, required): `blade_livewire` | `react_shadcn` | `vue_tailwind` | `svelte_tailwind` | `html_tailwind`.
  - `component_name` (string, optional): Name of generated component.

### 7. `ui_ux_color_contrast`
Calculates mathematical WCAG 2.1/2.2 relative luminance and contrast ratio between foreground and background colors. Evaluates AA and AAA compliance and suggests accessible color alternatives.
- **Parameters:**
  - `foreground_hex` (string, required): e.g. `#4F46E5`.
  - `background_hex` (string, required): e.g. `#FFFFFF`.
  - `font_size_pt` (number, optional, default: `16`).
  - `is_bold` (boolean, optional, default: `false`).

---

## 🧪 Verification & Testing

Run the zero-dependency test suite:
```bash
node test/run-tests.js
```

---

## 📄 License
MIT © MaccPro Team
