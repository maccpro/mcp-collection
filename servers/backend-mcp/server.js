#!/usr/bin/env node
/**
 * @file server.js
 * @description Enterprise Backend MCP Server (Model Context Protocol).
 * Provides 8 specialized enterprise backend engineering tools:
 * - backend_generate_code: Enterprise code and business logic generator with framework and layer awareness.
 * - mimo_generate_code: Backward-compatible alias for backend_generate_code.
 * - backend_refactor_code: SOLID, DRY, and Clean Architecture refactoring engine.
 * - backend_review_code: OWASP Top 10 security, N+1 query, and architectural auditor.
 * - backend_explain_logic: Deep business logic, state machine, and blast radius explainer.
 * - backend_generate_api_spec: OpenAPI 3.1 (YAML/JSON) and Postman spec builder.
 * - backend_detect_stack: Dynamic workspace framework, ORM, and pattern detector.
 * - backend_health_check: Provider connectivity and latency benchmark diagnostics.
 *
 * Zero external dependencies: Built 100% on Node.js standard libraries.
 */

import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { loadEnv } from './engine/env-loader.js';
import { ProjectDetector } from './engine/project-detector.js';
import { ProviderEngine } from './engine/provider-engine.js';
import { PromptEngine } from './engine/prompt-engine.js';
import { CodeReviewer } from './engine/code-reviewer.js';
import { ApiSpecGenerator } from './engine/api-spec-generator.js';
import { CodeRefactorer } from './engine/code-refactorer.js';
import { HealthChecker } from './engine/health-checker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load local .env if present
loadEnv(__dirname);

const TOOLS = [
  {
    name: 'backend_generate_code',
    description: 'Enterprise backend application code, business logic, API, classes, and algorithm generator with automatic framework and layer awareness. Note: Architecture, DevOps/Docker/Nginx/Shell, testing/TDD, and log analysis are exclusively handled by the primary Antigravity agent.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed instructions on what application backend code, API, algorithm, or logic to write, refactor, or fix.'
        },
        context: {
          type: 'string',
          description: 'Optional background code, relevant file snippets, or database schema context.'
        },
        project_path: {
          type: 'string',
          description: 'Optional path to the project root for automatic tech stack and architecture detection.'
        },
        framework: {
          type: 'string',
          description: 'Optional target framework override (e.g. laravel, nestjs, fastapi, express, spring_boot, gin, django).'
        },
        layer: {
          type: 'string',
          description: 'Optional target architectural layer (e.g. service, controller, model, dto, action, repository, job, validator).'
        },
        system_prompt: {
          type: 'string',
          description: 'Optional system prompt override. Defaults to framework-specific principal backend persona.'
        },
        thinking_enabled: {
          type: 'boolean',
          description: 'Whether to enable model deep thinking/reasoning. Default is true.'
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum completion tokens to generate. Default is 4096.'
        },
        model: {
          type: 'string',
          description: 'Optional AI model name override.'
        },
        provider: {
          type: 'string',
          description: 'Optional provider selection (primary, fallback, local).'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'mimo_generate_code',
    description: 'Backward-compatible alias for backend_generate_code powered by Xiaomi MiMo, DeepSeek, or OpenAI-compatible backend model.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed instructions on what application backend code, API, algorithm, or logic to write, refactor, or fix.'
        },
        context: {
          type: 'string',
          description: 'Optional background code, relevant file snippets, or database schema context.'
        },
        project_path: {
          type: 'string',
          description: 'Optional path to the project root.'
        },
        framework: {
          type: 'string',
          description: 'Optional framework override.'
        },
        layer: {
          type: 'string',
          description: 'Optional architectural layer.'
        },
        system_prompt: {
          type: 'string',
          description: 'Optional system prompt override.'
        },
        thinking_enabled: {
          type: 'boolean',
          description: 'Whether to enable model deep thinking/reasoning. Default is true.'
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum completion tokens to generate. Default is 4096.'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'backend_refactor_code',
    description: 'Refactors backend application code to adhere strictly to SOLID principles, Clean Architecture, DRY patterns, and high-performance execution.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Source code to refactor.'
        },
        instruction: {
          type: 'string',
          description: 'Specific refactoring requirements or objectives (e.g. extract service, eliminate N+1, convert to DTO).'
        },
        project_path: {
          type: 'string',
          description: 'Optional project path for framework auto-detection.'
        },
        framework: {
          type: 'string',
          description: 'Optional framework override.'
        },
        focus: {
          type: 'string',
          enum: ['clean_architecture', 'solid', 'dry', 'performance', 'security'],
          description: 'Primary refactoring focus area (default: clean_architecture).'
        },
        thinking_enabled: {
          type: 'boolean',
          description: 'Enable deep reasoning tokens.'
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to generate (default: 4096).'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'backend_review_code',
    description: 'Conducts an in-depth security, architectural, and performance review of backend code, identifying OWASP Top 10 vulnerabilities, N+1 queries, and layering violations.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Source code to review.'
        },
        project_path: {
          type: 'string',
          description: 'Optional project root path.'
        },
        framework: {
          type: 'string',
          description: 'Optional framework name.'
        },
        rules: {
          type: 'string',
          description: 'Optional specific custom rules or policies to audit against.'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'backend_explain_logic',
    description: 'Deeply analyzes and explains complex backend business logic, algorithms, state machines, edge cases, and blast radius.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Backend code or algorithm to analyze.'
        },
        context: {
          type: 'string',
          description: 'Optional surrounding schema, architecture, or workflow context.'
        },
        focus: {
          type: 'string',
          enum: ['flow', 'edge_cases', 'blast_radius', 'security', 'performance'],
          description: 'Analysis focus area (default: flow).'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'backend_generate_api_spec',
    description: 'Generates standardized OpenAPI 3.1 (YAML/JSON) specifications or Postman v2.1 collections from backend code or endpoint declarations.',
    inputSchema: {
      type: 'object',
      properties: {
        source_code: {
          type: 'string',
          description: 'Controllers, route declarations, or DTO source code.'
        },
        routes_info: {
          type: 'string',
          description: 'Optional summary of routes, query parameters, and authentication methods.'
        },
        format: {
          type: 'string',
          enum: ['openapi_yaml', 'openapi_json', 'postman'],
          description: 'Output specification format (default: openapi_yaml).'
        },
        title: {
          type: 'string',
          description: 'API Title (e.g. Billing Service API).'
        },
        version: {
          type: 'string',
          description: 'API Semantic Version (default: 1.0.0).'
        }
      },
      required: ['source_code']
    }
  },
  {
    name: 'backend_detect_stack',
    description: 'Dynamic workspace inspector that automatically detects backend language, framework, ORM, database dialect, and architectural layers.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Target project directory (defaults to current working directory).'
        }
      }
    }
  },
  {
    name: 'backend_health_check',
    description: 'Diagnostics tool to verify connectivity, active models, and response latency across configured AI providers.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['all', 'primary', 'fallback', 'local'],
          description: 'Provider to check (default: all).'
        },
        test_call: {
          type: 'boolean',
          description: 'Whether to execute a live ping test (default: true).'
        }
      }
    }
  }
];

async function handleToolCall(name, args = {}) {
  // 1. Code Generation Tools (Primary & Alias)
  if (name === 'backend_generate_code' || name === 'mimo_generate_code') {
    const projectPath = args.project_path || process.cwd();
    const profile = ProjectDetector.inspect(projectPath);

    if (args.framework) {
      profile.framework = args.framework;
    }

    const systemPrompt = PromptEngine.buildSystemPrompt(profile, args.layer, args.system_prompt);
    const userContent = PromptEngine.buildUserContent(args.prompt, args.context, args.layer, profile.framework);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await ProviderEngine.complete(messages, {
      thinking_enabled: args.thinking_enabled,
      max_tokens: args.max_tokens || 4096,
      model: args.model,
      provider: args.provider
    });

    return {
      content: [
        {
          type: 'text',
          text: result.content
        }
      ]
    };
  }

  // 2. Code Refactoring Tool
  if (name === 'backend_refactor_code') {
    const projectPath = args.project_path || process.cwd();
    const profile = ProjectDetector.inspect(projectPath);
    if (args.framework) profile.framework = args.framework;

    const result = await CodeRefactorer.refactor(args.code, args.instruction, profile, {
      focus: args.focus,
      thinking_enabled: args.thinking_enabled,
      max_tokens: args.max_tokens
    });

    return {
      content: [
        {
          type: 'text',
          text: result.refactored_code
        }
      ]
    };
  }

  // 3. Code Review Tool
  if (name === 'backend_review_code') {
    const projectPath = args.project_path || process.cwd();
    const profile = ProjectDetector.inspect(projectPath);
    const framework = args.framework || profile.framework;

    const result = await CodeReviewer.review(args.code, framework, args.rules);

    return {
      content: [
        {
          type: 'text',
          text: result.review_report
        }
      ]
    };
  }

  // 4. Logic Explainer Tool
  if (name === 'backend_explain_logic') {
    const result = await CodeRefactorer.explain(args.code, args.context, {
      focus: args.focus
    });

    return {
      content: [
        {
          type: 'text',
          text: result.explanation
        }
      ]
    };
  }

  // 5. API Spec Generator Tool
  if (name === 'backend_generate_api_spec') {
    const result = await ApiSpecGenerator.generate(args.source_code, {
      routes_info: args.routes_info,
      format: args.format,
      title: args.title,
      version: args.version
    });

    return {
      content: [
        {
          type: 'text',
          text: result.spec
        }
      ]
    };
  }

  // 6. Project & Stack Detector Tool
  if (name === 'backend_detect_stack') {
    const projectPath = args.project_path || process.cwd();
    const profile = ProjectDetector.inspect(projectPath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(profile, null, 2)
        }
      ]
    };
  }

  // 7. Health Check Tool
  if (name === 'backend_health_check') {
    const result = await HealthChecker.check({
      provider: args.provider,
      test_call: args.test_call
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

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
  } catch {
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
              name: 'backend-mcp',
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
