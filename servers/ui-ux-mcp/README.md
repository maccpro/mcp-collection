# Enterprise Dynamic Relational UI/UX MCP Server (`ui-ux-mcp`)

Advanced, Enterprise-Grade, and Fully Dynamic Model Context Protocol (MCP) server for **Google Antigravity**, **Claude Desktop**, and **Cursor** to generate accessible, high-converting frontend UI/UX designs, production Tailwind CSS & Shadcn UI patterns, WCAG 2.2 accessibility audits with automated fixes, dynamic design tokens with OKLCH, responsive application shells, and relational UI component architecture introspection.

---

## ⚡ Enterprise Features

- **Relational UI Architecture Introspection (`ui_ux_introspect_ui_architecture`):** Maps component hierarchy (`Layouts -> Pages -> Organisms -> Molecules -> Atoms`), detects design token drift (hardcoded hex colors), flags monolithic components (>250 lines), and generates a visual Mermaid architecture diagram.
- **Dynamic Application Layout Scaffolds (`ui_ux_layout_scaffold`):** Generates complete, responsive, production-ready application shells (`admin_dashboard_shell`, `saas_portal_shell`, `landing_page_shell`) across HTML/Tailwind, Blade/Livewire, React/Shadcn, Vue 3, and Svelte 5.
- **22 Curated Production Patterns (`ui_ux_suggest_pattern`):** Complete 22 production-grade patterns across Cloud Hosting (pricing, telemetry gauges, VPS configurator, status page, domain search), SaaS Dashboards (metrics, KPI cards, data table, sidebar, filter toolbar), Enterprise Portals (user management RBAC, settings tabs, 2FA form, stepper wizard), and E-Commerce (checkout flow, tax invoice receipt, upload dropzone, modals).
- **Dynamic Color Palette Remapper:** Parameterize components with custom brand name, currency symbol (`৳`, `$`, `€`, `₹`), and dynamic color schemes (`emerald`, `violet`, `blue`, `amber`, `rose`, `cyan`, `teal`, `sky`, `slate`, or custom hex) that dynamically remap all Tailwind utility classes.
- **Mathematical Color Science, WCAG 2.2 & OKLCH (`ui_ux_color_contrast`):** Zero-dependency relative luminance and contrast ratio calculations. Automatically validates WCAG AA/AAA compliance, computes accessible color adjustments, and exports native OKLCH values (`oklch(L C H)`).
- **Deep Heuristic Audit with Smart Auto-Fix (`ui_ux_audit_checklist`):** 20 deterministic rules inspecting WCAG 2.2 accessibility, touch targets ($\ge 44\text{px}$), heading hierarchy, mobile input modes, reduced motion preferences, CLS layout shifts, and Tailwind antipatterns with an **automated refactored code output**.
- **Modern Tailwind v3 & v4 Design Tokens (`ui_ux_design_tokens`):** 10-shade tonal scales (`50` through `950`) from ANY custom brand hex or 10 industry presets (`fintech_gold`, `health_vital`, `cyberpunk_neon`, `luxury_emerald`, etc.), generating Tailwind v3 configs, Tailwind v4 `@theme` OKLCH CSS blocks, Shadcn UI CSS variables, and semantic custom properties.
- **Multi-Framework Converter & Icon Resolver (`ui_ux_convert_component`):** Converts UI markup between HTML/Tailwind, Laravel Blade + Livewire + Alpine, React + TypeScript + Shadcn UI, Vue 3, and Svelte 5 with smart icon resolution and zero icon corruption.
- **Dynamic Project Stack Inspector (`ui_ux_inspect_project`):** Scans any project folder to auto-detect framework (`Laravel/Blade/Livewire`, `Filament Admin`, `Next.js/React/Shadcn`, `Vue 3/Nuxt`, `Svelte 5`), multi-tenancy, Tailwind version (`v4 @theme` vs `v3 config`), icon sets, and UI architecture.
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
        "D:/mcp-collection/servers/ui-ux-mcp/server.js"
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

### 1. `ui_ux_suggest_pattern`
Curated production-ready UI/UX component patterns with dynamic brand name, currency symbol, color theme, and framework parameterization.
- **Parameters:**
  - `component_type` (string, required): 22 patterns available:
    - *Cloud Hosting:* `pricing_table`, `server_resource_monitor`, `vps_configurator`, `status_page_incident`, `domain_search_box`
    - *SaaS & Analytics:* `dashboard_metrics`, `stat_cards_kpi`, `data_table`, `sidebar_navigation`, `filter_bar_search`
    - *Enterprise & Access:* `user_management_table`, `settings_tabs_layout`, `two_factor_auth_form`, `stepper_wizard`
    - *Billing & Commerce:* `checkout_flow`, `invoice_receipt_template`
    - *Overlays & Inputs:* `modal_dialog`, `command_palette`, `empty_state_screen`, `file_upload_dropzone`, `notification_feed`
  - `framework` (string, optional): `html_tailwind` | `blade_livewire` | `react_shadcn` | `vue_tailwind` | `svelte_tailwind`.
  - `brand_name` (string, optional): e.g. "JoypurHost", "MaccPro".
  - `currency_symbol` (string, optional): e.g. "৳", "$", "€".
  - `color_scheme` (string, optional): Tailwind color family (`emerald`, `violet`, `blue`, `amber`, `rose`, `cyan`, etc.) or custom hex code.
  - `include_code` (boolean, optional, default: `true`).

### 2. `ui_ux_layout_scaffold`
Scaffolds complete responsive application shells with mobile drawers, headers, breadcrumbs, and containers.
- **Parameters:**
  - `scaffold_type` (string, required): `admin_dashboard_shell` | `saas_portal_shell` | `landing_page_shell`.
  - `framework` (string, optional): `html_tailwind` | `blade_livewire` | `react_shadcn` | `vue_tailwind` | `svelte_tailwind`.
  - `brand_name` (string, optional): e.g. "JoypurHost Cloud".
  - `currency_symbol` (string, optional): e.g. "৳", "$".
  - `color_scheme` (string, optional): Tailwind color family or hex code.

### 3. `ui_ux_introspect_ui_architecture`
Deep dynamic introspection of project UI/UX architecture. Maps component hierarchy (`Layouts -> Pages -> Organisms -> Molecules -> Atoms`), detects design token drift (hardcoded hexes), flags monolithic components (>250 lines), and generates a visual Mermaid architecture diagram.
- **Parameters:**
  - `project_path` (string, optional): Path to project root. Defaults to current working directory.

### 4. `ui_ux_audit_checklist`
Deep audit of frontend markup against 20 deterministic rules covering WCAG 2.2 AA & AAA, touch target sizing ($\ge 44\text{px}$), heading order, inputmodes, reduced motion, CLS, and Tailwind clean code. Returns a numerical score, findings, and an automated refactored fix.
- **Parameters:**
  - `code_snippet` (string, required): HTML, Blade, JSX, or Vue template to evaluate.
  - `context` (string, optional): Business context (e.g. `mobile_checkout`).

### 5. `ui_ux_design_tokens`
Generates cohesive design tokens, 10-shade tonal scales (`50` through `950`) from ANY custom brand hex or 10 built-in presets (`fintech_gold`, `health_vital`, `cyberpunk_neon`, `luxury_emerald`, `cloud_hosting`, `saas_modern`, `ecommerce_vibrant`, `enterprise_slate`, `cyber_neon`, `fintech_trust`), Tailwind CSS v3 config, Tailwind CSS v4 `@theme` OKLCH CSS blocks, and Shadcn UI CSS variables.
- **Parameters:**
  - `theme_preset` (string, optional): Built-in theme preset.
  - `custom_hex` (string, optional): Custom brand hex code (e.g. `#0EA5E9`).
  - `tailwind_version` (string, optional): `both` | `v4` | `v3`.
  - `mode` (string, optional): `both` | `light` | `dark`.

### 6. `ui_ux_generate_custom_design`
Generates tailored, high-converting Tailwind / Shadcn UI components with project stack context awareness.
- **Parameters:**
  - `prompt` (string, required): Description of UI requirements and layout.
  - `project_path` (string, optional): Project root for auto-detection.
  - `target_framework` (string, optional): `html_tailwind` | `blade_livewire` | `react_shadcn` | `vue_tailwind` | `svelte_tailwind`.
  - `tailwind_version` (string, optional): `auto` | `v4` | `v3`.
  - `theme_mode` (string, optional): `both` | `dark` | `light`.
  - `thinking_enabled` (boolean, optional, default: `true`).

### 7. `ui_ux_convert_component`
Converts UI components across frameworks with framework-specific idioms (`@props`, `className`, Lucide icons, Vue 3 setup, Svelte runes).
- **Parameters:**
  - `code_snippet` (string, required): Component markup to convert.
  - `target_framework` (string, required): `blade_livewire` | `react_shadcn` | `vue_tailwind` | `svelte_tailwind` | `html_tailwind`.
  - `component_name` (string, optional): Name of generated component.

### 8. `ui_ux_color_contrast`
Calculates mathematical WCAG 2.1/2.2 relative luminance and contrast ratio between foreground and background colors. Evaluates AA and AAA compliance and suggests accessible color alternatives.
- **Parameters:**
  - `foreground_hex` (string, required): e.g. `#4F46E5`.
  - `background_hex` (string, required): e.g. `#FFFFFF`.
  - `font_size_pt` (number, optional, default: `16`).
  - `is_bold` (boolean, optional, default: `false`).

### 9. `ui_ux_inspect_project`
Inspects workspace directory to auto-detect framework, Tailwind version (v3 vs v4), icon set, multi-tenancy, Filament Admin, and UI stack.
- **Parameters:**
  - `project_path` (string, optional): Project root directory. Defaults to current working directory.

---

## 🧪 Verification & Testing

Run the zero-dependency test suite:
```bash
node test/run-tests.js
```

---

## 📄 License
MIT © MaccPro Team
