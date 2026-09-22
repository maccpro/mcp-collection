#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { StaticAnalyzer } from './engine/static-analyzer.js';
import { RulesEvaluator, RULE_DEFINITIONS } from './engine/rules.js';
import { CrossModuleChecker } from './engine/cross-module.js';
import { Reporter } from './engine/reporter.js';
import { ExternalRunner } from './engine/external-runner.js';
import { SemanticReviewer } from './engine/semantic-reviewer.js';
import { loadEnv } from './engine/env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load local .env if present
loadEnv(__dirname);

// Load canonical default configuration
const configPath = path.join(__dirname, 'config', 'default-config.json');
let CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const TOOLS = [
  {
    name: 'architecture_gate',
    description: 'Compact PASS/FAIL architecture quality gate for Antigravity & MiMo loops. Validates changed files against the canonical flow (Controller -> FormRequest -> DTO -> Action -> optional Service -> RepositoryInterface -> Repository -> Model -> Database) without calling an LLM. Returns blocking findings, executive summary markdown, and a focused remediation payload for MiMo if failed.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Array of file paths or file objects ({ path: string, content?: string }) to analyze.',
          items: {
            anyOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'string' }
                },
                required: ['path']
              }
            ]
          }
        },
        fail_on_warnings: {
          type: 'boolean',
          description: 'Whether warnings should also block the quality gate (default: false).'
        }
      },
      required: ['files']
    }
  },
  {
    name: 'check_code_pattern',
    description: 'Detailed code pattern inspector for deep debugging, code reviews, and external tooling (PHPStan/Pint/Pest). Provides granular line-by-line violation reports, suggested refactoring, and optional semantic risk reviews.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Array of file paths or file objects to analyze.',
          items: {
            anyOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'string' }
                },
                required: ['path']
              }
            ]
          }
        },
        rule_filter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter to run only specific rule IDs.'
        },
        include_external: {
          type: 'boolean',
          description: 'Whether to run local PHPStan, Pint, or Pest checks if available.'
        },
        enable_semantic_review: {
          type: 'boolean',
          description: 'Whether to run conditional AI semantic review on clean code if semantic risk is suspected.'
        }
      },
      required: ['files']
    }
  },
  {
    name: 'get_architecture_rules',
    description: 'Returns the project\'s canonical architecture contract, flow sequence, rule definitions, severities, and path conventions without scanning source code.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Normalizes input files and parses them
 */
function processInputFiles(filesInput) {
  const parsedFiles = [];
  const allViolations = [];

  for (const item of filesInput) {
    let filePath = '';
    let content = '';

    if (typeof item === 'string') {
      filePath = item;
      try {
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf8');
        }
      } catch (e) {
        // If file not readable on disk, skip content
      }
    } else if (item && typeof item === 'object') {
      filePath = item.path || '';
      content = item.content || '';
      if (!content && fs.existsSync(filePath)) {
        try {
          content = fs.readFileSync(filePath, 'utf8');
        } catch (e) {}
      }
    }

    if (!filePath) continue;

    // Only process PHP files
    if (!filePath.toLowerCase().endsWith('.php')) {
      continue;
    }

    const parsed = StaticAnalyzer.parse(filePath, content || '');
    parsedFiles.push(parsed);

    // Run Core Rules
    const ruleViolations = RulesEvaluator.evaluate(parsed, CONFIG);
    // Run Cross-Module Boundary Isolation
    const moduleViolations = CrossModuleChecker.check(parsed, CONFIG);

    allViolations.push(...ruleViolations, ...moduleViolations);
  }

  return { parsedFiles, allViolations };
}

/**
 * Handle MCP Tool Execution
 */
async function handleToolCall(name, args) {
  const startTime = Date.now();

  // 1. architecture_gate
  if (name === 'architecture_gate') {
    const rawFiles = args.files || [];
    const { parsedFiles, allViolations } = processInputFiles(rawFiles);
    const duration = Date.now() - startTime;

    const report = Reporter.generateReport({
      filesAnalyzed: parsedFiles,
      violations: allViolations,
      scanDurationMs: duration,
      config: CONFIG,
      options: { fail_on_warnings: args.fail_on_warnings }
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(report, null, 2)
        }
      ]
    };
  }

  // 2. check_code_pattern
  if (name === 'check_code_pattern') {
    const rawFiles = args.files || [];
    const { parsedFiles, allViolations } = processInputFiles(rawFiles);
    const duration = Date.now() - startTime;

    let filteredViolations = allViolations;
    if (args.rule_filter && Array.isArray(args.rule_filter) && args.rule_filter.length > 0) {
      filteredViolations = allViolations.filter(v => args.rule_filter.includes(v.rule));
    }

    const report = Reporter.generateReport({
      filesAnalyzed: parsedFiles,
      violations: filteredViolations,
      scanDurationMs: duration,
      config: CONFIG,
      options: {}
    });

    // Optional external checks
    if (args.include_external) {
      const filePaths = parsedFiles.map(p => p.filePath);
      report.external_checks = ExternalRunner.run(filePaths, process.cwd(), CONFIG);
    }

    // Optional semantic AI review
    if (args.enable_semantic_review && report.status === 'PASS') {
      const sampleFile = parsedFiles[0];
      if (sampleFile) {
        report.semantic_ai_review = await SemanticReviewer.review({
          isStaticClean: true,
          semanticRiskDetected: true,
          minimalSnippet: sampleFile.cleanCode.slice(0, 1500),
          filePath: sampleFile.filePath,
          config: CONFIG
        });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(report, null, 2)
        }
      ]
    };
  }

  // 3. get_architecture_rules
  if (name === 'get_architecture_rules') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            contract: 'Laravel Canonical Flow v2.0.0',
            canonical_flow: CONFIG.architecture.flow,
            flow_description: 'Controller -> FormRequest -> DTO -> Action -> optional Service -> RepositoryInterface -> Repository -> Model -> Database',
            service_optional: CONFIG.architecture.serviceOptional,
            paths: CONFIG.paths,
            rules: RULE_DEFINITIONS,
            policy: CONFIG.policy,
            guidelines: [
              'Controllers must remain thin and handle only HTTP request/response.',
              'FormRequests must only validate and authorize, never perform DB writes.',
              'DTOs must be pure immutable value objects.',
              'Actions must be single-purpose (preferably single __invoke method).',
              'Repositories must never depend on HTTP Request/Response objects.',
              'Modules must communicate via Contracts or Events, never importing another module\'s internal Models/Repositories directly.'
            ]
          }, null, 2)
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
              name: 'laravel-code-pattern',
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
