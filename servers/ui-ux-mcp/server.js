#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { loadEnv } from './engine/env-loader.js';
import { PATTERNS, getPattern } from './engine/patterns-catalog.js';
import { AuditHeuristics } from './engine/audit-heuristics.js';
import { DesignTokens } from './engine/design-tokens.js';
import { OpenAIClient } from './engine/openai-client.js';
import { ProjectDetector } from './engine/project-detector.js';
import { ComponentConverter } from './engine/component-converter.js';
import { ColorEngine } from './engine/color-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load local and cascading .env
loadEnv(__dirname);

const TOOLS = [
  {
    name: 'ui_ux_suggest_pattern',
    description: 'Instant curated UI/UX pattern generator for SaaS, Cloud Hosting, E-commerce, and Admin Dashboards. Returns production-ready, accessible Tailwind CSS, Shadcn UI, Blade/Livewire, or Vue markup with dynamic brand name, currency symbol, and color theming without needing an external API key.',
    inputSchema: {
      type: 'object',
      properties: {
        component_type: {
          type: 'string',
          enum: [
            'pricing_table',
            'dashboard_metrics',
            'checkout_flow',
            'hero_section',
            'data_table',
            'server_resource_monitor',
            'vps_configurator',
            'command_palette',
            'sidebar_navigation',
            'modal_dialog'
          ],
          description: 'The type of UI component pattern to retrieve.'
        },
        framework: {
          type: 'string',
          enum: ['html_tailwind', 'blade_livewire', 'react_shadcn', 'vue_tailwind', 'svelte_tailwind'],
          description: 'Target frontend template syntax (default: html_tailwind).'
        },
        brand_name: {
          type: 'string',
          description: 'Custom brand or project name to interpolate into copy (e.g. "JoypurHost", "MaccPro"). Default: "JoypurHost Cloud".'
        },
        currency_symbol: {
          type: 'string',
          description: 'Currency symbol to display (e.g. "৳", "$", "€", "₹"). Default: "$".'
        },
        color_scheme: {
          type: 'string',
          description: 'Primary Tailwind color family or custom hex (default: indigo).'
        },
        include_code: {
          type: 'boolean',
          description: 'Whether to include the complete markup (default: true).'
        }
      },
      required: ['component_type']
    }
  },
  {
    name: 'ui_ux_generate_custom_design',
    description: 'Generates tailored, high-converting Tailwind CSS / Shadcn UI components based on custom requirements using an OpenAI-compatible API. Automatically adapts to project framework, Tailwind version (v3 vs v4), and component architecture.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the UI component, target audience, layout, and functionality needed.'
        },
        project_path: {
          type: 'string',
          description: 'Optional path to project root to automatically detect framework, Tailwind version, and icon sets.'
        },
        target_framework: {
          type: 'string',
          enum: ['html_tailwind', 'blade_livewire', 'react_shadcn', 'vue_tailwind', 'svelte_tailwind'],
          description: 'Target frontend template syntax (default: auto-detected or html_tailwind).'
        },
        tailwind_version: {
          type: 'string',
          enum: ['auto', 'v4', 'v3'],
          description: 'Target Tailwind CSS version (default: auto).'
        },
        theme_mode: {
          type: 'string',
          enum: ['both', 'dark', 'light'],
          description: 'Color theme mode support (default: both).'
        },
        thinking_enabled: {
          type: 'boolean',
          description: 'Enable deep reasoning/thinking for complex layouts (default: true).'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'ui_ux_audit_checklist',
    description: 'Deep audit of HTML, Blade, JSX, or Vue code snippets for WCAG 2.1/2.2 AA & AAA accessibility, touch target sizing (>=44px), mobile responsiveness, and Tailwind clean code. Returns a numerical score, categorized findings, and an automated refactored fix.',
    inputSchema: {
      type: 'object',
      properties: {
        code_snippet: {
          type: 'string',
          description: 'The HTML/Tailwind/Blade/JSX code snippet to evaluate.'
        },
        context: {
          type: 'string',
          description: 'Optional business context (e.g. mobile_checkout, pricing_page, customer_portal).'
        }
      },
      required: ['code_snippet']
    }
  },
  {
    name: 'ui_ux_design_tokens',
    description: 'Generates cohesive design tokens, 10-shade tonal palettes (50-950) from ANY custom brand hex or preset, Tailwind CSS v3 config, Tailwind CSS v4 @theme CSS blocks, and Shadcn UI CSS variables.',
    inputSchema: {
      type: 'object',
      properties: {
        theme_preset: {
          type: 'string',
          enum: ['cloud_hosting', 'saas_modern', 'ecommerce_vibrant', 'enterprise_slate', 'cyber_neon', 'fintech_trust'],
          description: 'Industry design theme preset (default: cloud_hosting).'
        },
        custom_hex: {
          type: 'string',
          description: 'Optional custom brand hex code (e.g. "#0EA5E9", "#10B981") to generate dynamic 10-shade tonal palette.'
        },
        tailwind_version: {
          type: 'string',
          enum: ['both', 'v4', 'v3'],
          description: 'Target Tailwind configuration syntax (default: both).'
        },
        mode: {
          type: 'string',
          enum: ['both', 'light', 'dark'],
          description: 'Target color mode (default: both).'
        }
      }
    }
  },
  {
    name: 'ui_ux_inspect_project',
    description: 'Inspects any project directory (or workspace) to automatically detect framework (Laravel/Blade, React/Next.js, Vue/Nuxt, Svelte, HTML), Tailwind CSS version (v3 vs v4), icon library, and UI stack.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Path to project root. Defaults to current working directory.'
        }
      }
    }
  },
  {
    name: 'ui_ux_convert_component',
    description: 'Converts frontend component markup between HTML/Tailwind, Laravel Blade + Livewire, React + TypeScript + Shadcn UI, Vue 3 (Composition API), and Svelte 5.',
    inputSchema: {
      type: 'object',
      properties: {
        code_snippet: {
          type: 'string',
          description: 'The component markup to convert.'
        },
        target_framework: {
          type: 'string',
          enum: ['blade_livewire', 'react_shadcn', 'vue_tailwind', 'svelte_tailwind', 'html_tailwind'],
          description: 'Target framework syntax.'
        },
        component_name: {
          type: 'string',
          description: 'Optional name for the generated component (e.g. "ServerCard", "PricingMatrix").'
        }
      },
      required: ['code_snippet', 'target_framework']
    }
  },
  {
    name: 'ui_ux_color_contrast',
    description: 'Calculates mathematical WCAG 2.1/2.2 relative luminance and contrast ratio between foreground and background colors. Evaluates AA and AAA compliance for normal text, large text, and UI controls, and suggests accessible color alternatives.',
    inputSchema: {
      type: 'object',
      properties: {
        foreground_hex: {
          type: 'string',
          description: 'Foreground/text hex color (e.g. "#4F46E5").'
        },
        background_hex: {
          type: 'string',
          description: 'Background surface hex color (e.g. "#FFFFFF" or "#0F172A").'
        },
        font_size_pt: {
          type: 'number',
          description: 'Font size in points (default: 16pt for normal text).'
        },
        is_bold: {
          type: 'boolean',
          description: 'Whether the text is bold (default: false).'
        }
      },
      required: ['foreground_hex', 'background_hex']
    }
  }
];

async function handleToolCall(name, args) {
  // 1. ui_ux_suggest_pattern
  if (name === 'ui_ux_suggest_pattern') {
    const patternKey = args.component_type;
    const result = getPattern(patternKey, {
      brand_name: args.brand_name,
      currency_symbol: args.currency_symbol,
      framework: args.framework,
      color_scheme: args.color_scheme
    });

    if (args.include_code === false) {
      delete result.code;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  // 2. ui_ux_generate_custom_design
  if (name === 'ui_ux_generate_custom_design') {
    let framework = args.target_framework;
    let tailwindVer = args.tailwind_version || 'auto';
    let iconSet = 'lucide or heroicons';

    // Auto-detect project context if project_path provided or framework omitted
    if (args.project_path || !framework) {
      const detected = ProjectDetector.inspect(args.project_path || process.cwd());
      if (!framework) framework = detected.recommended_generator_framework;
      if (tailwindVer === 'auto') tailwindVer = detected.tailwind_version;
      iconSet = detected.icon_set;
    }

    framework = framework || 'html_tailwind';
    const themeMode = args.theme_mode || 'both';

    const systemPrompt = `You are an elite Principal Frontend UI/UX Architect specializing in modern Tailwind CSS, Shadcn UI, and high-converting web applications.
Stack Context:
- Target Framework: ${framework}
- Tailwind Version: ${tailwindVer === 'v4' ? 'Tailwind CSS v4 (@theme & CSS variables)' : 'Tailwind CSS v3 (standard config)'}
- Icon Set: ${iconSet}
- Theme Support: ${themeMode}

Strict Design & Engineering Guidelines:
1. Produce clean, modern, accessible semantic markup matching ${framework} conventions.
2. Ensure mobile-first responsiveness (sm:, md:, lg:, xl: breakpoints).
3. If theme_mode is "both", include dark: variants for all surfaces, texts, borders, and inputs.
4. Ensure interactive touch targets are at least 44x44px (min-h-[44px], py-2.5 px-4).
5. Ensure WCAG 2.2 AA contrast compliance (4.5:1 minimum on text, 3:1 on UI boundaries).
6. Provide output with:
   - A clean code block containing the complete copy-pasteable component.
   - A bulleted section explaining key UI/UX psychology, conversion decisions, and accessibility features.`;

    const userPrompt = `Generate a production-ready component for:\n${args.prompt}`;

    try {
      const response = await OpenAIClient.complete([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        thinking_enabled: args.thinking_enabled !== false
      });

      return {
        content: [
          {
            type: 'text',
            text: response.content
          }
        ]
      };
    } catch (err) {
      // Graceful fallback to rich catalog pattern
      const fallbackPattern = getPattern('hero_section', { framework });
      return {
        content: [
          {
            type: 'text',
            text: `AI Custom Design Notice: ${err.message}\n\nFalling back to high-converting catalog pattern:\n` + JSON.stringify(fallbackPattern, null, 2)
          }
        ]
      };
    }
  }

  // 3. ui_ux_audit_checklist
  if (name === 'ui_ux_audit_checklist') {
    const auditReport = AuditHeuristics.audit(args.code_snippet, args.context);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(auditReport, null, 2)
        }
      ]
    };
  }

  // 4. ui_ux_design_tokens
  if (name === 'ui_ux_design_tokens') {
    const preset = args.theme_preset || 'cloud_hosting';
    const mode = args.mode || 'both';
    const tokens = DesignTokens.generate(preset, mode, {
      custom_hex: args.custom_hex,
      tailwind_version: args.tailwind_version
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tokens, null, 2)
        }
      ]
    };
  }

  // 5. ui_ux_inspect_project (NEW)
  if (name === 'ui_ux_inspect_project') {
    const profile = ProjectDetector.inspect(args.project_path || process.cwd());
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(profile, null, 2)
        }
      ]
    };
  }

  // 6. ui_ux_convert_component (NEW)
  if (name === 'ui_ux_convert_component') {
    const converted = ComponentConverter.convert(args.code_snippet, args.target_framework, {
      component_name: args.component_name
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(converted, null, 2)
        }
      ]
    };
  }

  // 7. ui_ux_color_contrast (NEW)
  if (name === 'ui_ux_color_contrast') {
    const evaluation = ColorEngine.evaluateWcag(
      args.foreground_hex,
      args.background_hex,
      args.font_size_pt || 16,
      args.is_bold || false
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(evaluation, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// Stdio JSON-RPC 2.0 Server Setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (err) {
    return;
  }

  const { id, method, params } = message;
  if (id === undefined || id === null) {
    return;
  }

  try {
    switch (method) {
      case 'initialize':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'ui-ux-mcp',
              version: '2.0.0'
            }
          }
        });
        break;

      case 'tools/list':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        });
        break;

      case 'tools/call':
        if (!params || !params.name) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Missing tool name parameter'
            }
          });
          return;
        }

        try {
          const toolResult = await handleToolCall(params.name, params.arguments || {});
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: toolResult
          });
        } catch (err) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Tool execution failed: ${err.message}`
                }
              ]
            }
          });
        }
        break;

      case 'ping':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {}
        });
        break;

      default:
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method '${method}' not found`
          }
        });
        break;
    }
  } catch (err) {
    sendResponse({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${err.message}`
      }
    });
  }
});
