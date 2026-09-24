#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { loadEnv } from './engine/env-loader.js';
import { PATTERNS } from './engine/patterns-catalog.js';
import { AuditHeuristics } from './engine/audit-heuristics.js';
import { DesignTokens } from './engine/design-tokens.js';
import { OpenAIClient } from './engine/openai-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load local .env if present
loadEnv(__dirname);

const TOOLS = [
  {
    name: 'ui_ux_suggest_pattern',
    description: 'Instant curated UI/UX pattern generator for SaaS, Cloud Hosting, E-commerce, and Admin Dashboards. Returns production-ready Tailwind CSS & Shadcn UI markup, design guidelines, and conversion best practices without needing an API key.',
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
            'data_table'
          ],
          description: 'The type of UI component pattern to retrieve.'
        },
        include_code: {
          type: 'boolean',
          description: 'Whether to include the complete HTML/Tailwind CSS markup (default: true).'
        }
      },
      required: ['component_type']
    }
  },
  {
    name: 'ui_ux_generate_custom_design',
    description: 'Generates tailored, high-converting Tailwind CSS / Shadcn UI components based on custom requirements using an OpenAI-compatible API (OpenAI, Xiaomi MiMo, DeepSeek, OpenRouter, Groq).',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the UI component, target audience, layout, and functionality needed.'
        },
        target_framework: {
          type: 'string',
          enum: ['html_tailwind', 'blade_livewire', 'vue_tailwind', 'react_tailwind'],
          description: 'Target frontend template syntax (default: html_tailwind).'
        },
        theme_mode: {
          type: 'string',
          enum: ['both', 'dark', 'light'],
          description: 'Color theme mode support (default: both).'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'ui_ux_audit_checklist',
    description: 'Audits frontend HTML/Tailwind/Blade code snippets for UX heuristics, touch target sizing (>=44px), mobile responsiveness, and WCAG 2.1 accessibility (a11y).',
    inputSchema: {
      type: 'object',
      properties: {
        code_snippet: {
          type: 'string',
          description: 'The HTML/Tailwind/Blade code snippet to evaluate.'
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
    description: 'Generates cohesive Tailwind CSS design tokens, color palettes (cloud hosting, saas, ecommerce), typography scales, and tailwind.config.js snippets.',
    inputSchema: {
      type: 'object',
      properties: {
        theme_preset: {
          type: 'string',
          enum: ['cloud_hosting', 'saas_modern', 'ecommerce_vibrant'],
          description: 'Industry design theme preset (default: cloud_hosting).'
        },
        mode: {
          type: 'string',
          enum: ['both', 'light', 'dark'],
          description: 'Target color mode (default: both).'
        }
      }
    }
  }
];

async function handleToolCall(name, args) {
  // 1. ui_ux_suggest_pattern (Instant offline)
  if (name === 'ui_ux_suggest_pattern') {
    const patternKey = args.component_type;
    const pattern = PATTERNS[patternKey];
    if (!pattern) {
      throw new Error(`Unknown component type: ${patternKey}. Available: ${Object.keys(PATTERNS).join(', ')}`);
    }

    const result = {
      component: patternKey,
      name: pattern.name,
      description: pattern.description,
      ux_guidelines: pattern.ux_guidelines
    };

    if (args.include_code !== false) {
      result.html_tailwind = pattern.html_tailwind;
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

  // 2. ui_ux_generate_custom_design (OpenAI-compatible)
  if (name === 'ui_ux_generate_custom_design') {
    const framework = args.target_framework || 'html_tailwind';
    const themeMode = args.theme_mode || 'both';

    const systemPrompt = `You are a world-class Frontend UI/UX Architect specializing in modern Tailwind CSS, Shadcn UI, and high-converting web applications.
Guidelines:
1. Produce clean, modern, accessible semantic markup with Tailwind CSS utilities.
2. Ensure mobile-first responsiveness (sm:, md:, lg: breakpoints).
3. If theme_mode is "both", include dark: variants for backgrounds, texts, and borders.
4. Ensure interactive touch targets are at least 44x44px.
5. Provide the output in markdown with:
   - A clean code block containing the complete copy-pasteable component.
   - A bulleted section explaining key UI/UX decisions, conversion psychology, and accessibility features.`;

    const userPrompt = `Target Framework: ${framework}\nTheme Mode: ${themeMode}\nUser Request: ${args.prompt}`;

    try {
      const response = await OpenAIClient.complete([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return {
        content: [
          {
            type: 'text',
            text: response.content
          }
        ]
      };
    } catch (err) {
      // Graceful fallback to catalog suggestion if API fails or is unconfigured
      return {
        content: [
          {
            type: 'text',
            text: `AI Custom Design Notice: ${err.message}\n\nFalling back to high-converting catalog pattern:\n` + JSON.stringify(PATTERNS.hero_section, null, 2)
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
    const tokens = DesignTokens.generate(preset, mode);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tokens, null, 2)
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
              version: '1.0.0'
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
