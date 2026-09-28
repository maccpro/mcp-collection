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
import { ProjectIntrospector } from './engine/project-introspector.js';
import { RelationalArchitectureEngine } from './engine/relational-architecture.js';
import { loadEnv } from './engine/env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial environment load
loadEnv(__dirname);

// Load base configuration
const configPath = path.join(__dirname, 'config', 'default-config.json');
let BASE_CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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
        },
        workspace_path: {
          type: 'string',
          description: 'Optional path to the project root or workspace.'
        },
        strict_mode: {
          type: 'boolean',
          description: 'Enable strict architectural gate enforcement.'
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
        },
        workspace_path: {
          type: 'string',
          description: 'Optional project root path.'
        }
      },
      required: ['files']
    }
  },
  {
    name: 'get_architecture_rules',
    description: 'Returns the project\'s canonical architecture contract, flow sequence, 20+ rule definitions, severities, and path conventions without scanning source code.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'analyze_project_architecture',
    description: 'Comprehensive enterprise architectural health audit for Laravel projects. Introspects project topology (Modular, DDD, Standard Layered, Multi-Tenant), scans layer distribution, generates full Relational Dependency Graph, calculates coupling metrics (Afferent/Efferent coupling, Instability), audits multi-tenancy isolation compliance, and produces an interactive Mermaid architecture flowchart.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_path: {
          type: 'string',
          description: 'Optional project root path (defaults to current working directory).'
        },
        max_files: {
          type: 'number',
          description: 'Maximum PHP files to scan for project topology (default: 300).'
        }
      }
    }
  },
  {
    name: 'explain_rule_remediation',
    description: 'Interactive architectural remediation guide for Laravel Clean Architecture rules. Returns in-depth rationale, SOLID principles alignment, Anti-Pattern code (Before), Canonical Refactored code (After), and common implementation traps for any rule ID.',
    inputSchema: {
      type: 'object',
      properties: {
        rule_id: {
          type: 'string',
          description: 'The specific rule ID (e.g. controller_direct_model, repository_missing_interface, sql_injection_raw_exposure, action_too_large).'
        }
      },
      required: ['rule_id']
    }
  },
  {
    name: 'validate_layer_contract',
    description: 'Validates whether a specific class satisfies all contracts for its architectural layer (e.g. DTO immutability, Action single-purpose invokable pattern, Repository interface implementation, Controller thinness).',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
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
          ],
          description: 'File path or object with path and content to audit.'
        }
      },
      required: ['file']
    }
  }
];

/**
 * Normalizes input files, executes static AST tokenization, runs rule evaluations,
 * and constructs the in-memory Relational Architecture Graph.
 */
function processInputFiles(filesInput, projectRoot = process.cwd(), activeConfig = BASE_CONFIG) {
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
        // Skip unreadable files
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

    // 1. Run Core & Layer Rules
    const ruleViolations = RulesEvaluator.evaluate(parsed, activeConfig);
    // 2. Run Cross-Module Boundary Isolation
    const moduleViolations = CrossModuleChecker.check(parsed, activeConfig);

    allViolations.push(...ruleViolations, ...moduleViolations);
  }

  // 3. Build Relational Architecture Graph & Validate Relational Rules
  const relationalGraph = RelationalArchitectureEngine.buildGraph(parsedFiles, activeConfig);
  const relationalViolations = RelationalArchitectureEngine.validateRelationalRules(relationalGraph, activeConfig);
  allViolations.push(...relationalViolations);

  return { parsedFiles, allViolations, relationalGraph };
}

/**
 * Handle MCP Tool Execution
 */
async function handleToolCall(name, args) {
  // Hot-reload .env if modified
  loadEnv(__dirname);

  const startTime = Date.now();
  const workspacePath = args.workspace_path || process.cwd();
  const projectProfile = ProjectIntrospector.introspect(workspacePath, BASE_CONFIG);
  const activeConfig = projectProfile.config;

  // 1. architecture_gate
  if (name === 'architecture_gate') {
    const rawFiles = args.files || [];
    const { parsedFiles, allViolations, relationalGraph } = processInputFiles(rawFiles, projectProfile.projectRoot, activeConfig);
    const duration = Date.now() - startTime;

    const report = Reporter.generateReport({
      filesAnalyzed: parsedFiles,
      violations: allViolations,
      scanDurationMs: duration,
      config: activeConfig,
      options: { fail_on_warnings: args.fail_on_warnings || args.strict_mode },
      relationalGraph
    });

    report.project_topology = {
      type: projectProfile.projectType,
      is_multi_tenant: projectProfile.isMultiTenant,
      has_custom_config: projectProfile.hasCustomConfig
    };

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
    const { parsedFiles, allViolations, relationalGraph } = processInputFiles(rawFiles, projectProfile.projectRoot, activeConfig);
    const duration = Date.now() - startTime;

    let filteredViolations = allViolations;
    if (args.rule_filter && Array.isArray(args.rule_filter) && args.rule_filter.length > 0) {
      filteredViolations = allViolations.filter(v => args.rule_filter.includes(v.rule));
    }

    const report = Reporter.generateReport({
      filesAnalyzed: parsedFiles,
      violations: filteredViolations,
      scanDurationMs: duration,
      config: activeConfig,
      options: {},
      relationalGraph
    });

    // Optional external checks
    if (args.include_external) {
      const filePaths = parsedFiles.map(p => p.filePath);
      report.external_checks = ExternalRunner.run(filePaths, projectProfile.projectRoot, activeConfig);
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
          config: activeConfig
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
            contract: 'Enterprise Laravel Canonical Architecture v2.1.0',
            canonical_flow: activeConfig.architecture.flow,
            flow_description: 'Controller -> FormRequest -> DTO -> Action -> optional Service -> RepositoryInterface -> Repository -> Model -> Database',
            service_optional: activeConfig.architecture.serviceOptional,
            paths: activeConfig.paths,
            multi_tenancy_policy: activeConfig.multi_tenancy,
            security_policy: activeConfig.security,
            rules: RULE_DEFINITIONS,
            policy: activeConfig.policy,
            guidelines: [
              'Controllers must remain thin and handle only HTTP request/response.',
              'FormRequests must only validate and authorize, never perform DB writes.',
              'DTOs must be pure immutable value objects.',
              'Actions must be single-purpose (preferably single __invoke method).',
              'Repositories must implement RepositoryInterface and never depend on HTTP Request/Response objects.',
              'Modules must communicate via Contracts or Events, never importing another module\'s internal Models/Repositories directly.',
              'Tenant migrations must strictly reside in database/migrations/tenant/.',
              'Raw SQL expressions must always use parameterized bindings to prevent SQL Injection.'
            ]
          }, null, 2)
        }
      ]
    };
  }

  // 4. analyze_project_architecture (NEW)
  if (name === 'analyze_project_architecture') {
    const root = projectProfile.projectRoot;
    const maxFiles = args.max_files || 300;

    // Discover PHP files in app/, src/, database/migrations/
    const discoveredFiles = [];
    const searchDirs = ['app', 'src', 'Modules', 'database/migrations'];
    for (const sDir of searchDirs) {
      const fullDir = path.join(root, sDir);
      if (fs.existsSync(fullDir)) {
        const stack = [fullDir];
        while (stack.length > 0 && discoveredFiles.length < maxFiles) {
          const curr = stack.pop();
          try {
            const entries = fs.readdirSync(curr, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(curr, entry.name);
              if (entry.isDirectory()) {
                stack.push(fullPath);
              } else if (entry.isFile() && entry.name.endsWith('.php')) {
                discoveredFiles.push(fullPath);
                if (discoveredFiles.length >= maxFiles) break;
              }
            }
          } catch {}
        }
      }
    }

    const { parsedFiles, allViolations, relationalGraph } = processInputFiles(discoveredFiles, root, activeConfig);
    const duration = Date.now() - startTime;
    const metrics = RelationalArchitectureEngine.calculateMetrics(relationalGraph);
    const mermaid = RelationalArchitectureEngine.generateMermaidDiagram(relationalGraph);

    const report = Reporter.generateReport({
      filesAnalyzed: parsedFiles,
      violations: allViolations,
      scanDurationMs: duration,
      config: activeConfig,
      relationalGraph
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            project_path: root,
            project_topology: projectProfile.projectType,
            is_multi_tenant: projectProfile.isMultiTenant,
            tenancy_details: projectProfile.tenancy,
            total_php_files_scanned: parsedFiles.length,
            architectural_health_score: report.health_score,
            status: report.status,
            gate_decision: report.gate_decision,
            violations_count: allViolations.length,
            layer_distribution: report.telemetry.layer_distribution,
            relational_metrics: metrics,
            mermaid_diagram: mermaid,
            executive_summary: report.executive_summary_markdown
          }, null, 2)
        }
      ]
    };
  }

  // 5. explain_rule_remediation (NEW)
  if (name === 'explain_rule_remediation') {
    const ruleId = args.rule_id;
    const rule = RULE_DEFINITIONS[ruleId];
    if (!rule) {
      throw new Error(`Rule ID '${ruleId}' not recognized. Available rules: ${Object.keys(RULE_DEFINITIONS).join(', ')}`);
    }

    const explanations = {
      controller_direct_model: {
        solid_principle: 'Single Responsibility Principle (SRP) & Separation of Concerns (SoC)',
        rationale: 'Controllers belong to the HTTP Transport / Presentation layer. Interacting directly with Eloquent models tightly couples HTTP concerns with database persistence, making unit testing impossible without database fixtures and preventing code reuse from CLI commands or queue workers.',
        anti_pattern_before: `class InvoiceController extends Controller {\n    public function store(Request $request) {\n        $invoice = Invoice::create($request->all());\n        return response()->json($invoice);\n    }\n}`,
        canonical_after: `class InvoiceController extends Controller {\n    public function __construct(private CreateInvoiceAction $createInvoiceAction) {}\n\n    public function store(CreateInvoiceRequest $request): JsonResponse {\n        $dto = InvoiceDTO::fromRequest($request);\n        $invoice = ($this->createInvoiceAction)($dto);\n        return response()->json(new InvoiceResource($invoice));\n    }\n}`
      },
      sql_injection_raw_exposure: {
        solid_principle: 'Defensive Programming & Security Compliance (OWASP A03:2021-Injection)',
        rationale: 'Direct string interpolation or concatenation in raw queries allows attackers to break out of query context and execute arbitrary SQL commands (e.g. data exfiltration, deletion, privilege escalation).',
        anti_pattern_before: `DB::raw("SELECT * FROM users WHERE email = '$email'");\nUser::whereRaw("status = '$status' AND role = '$role'")->get();`,
        canonical_after: `DB::raw("SELECT * FROM users WHERE email = ?", [$email]);\nUser::whereRaw("status = ? AND role = ?", [$status, $role])->get();`
      },
      repository_missing_interface: {
        solid_principle: 'Dependency Inversion Principle (DIP)',
        rationale: 'High-level modules (Actions, Domain Services) should not depend on low-level persistence implementations. Both should depend on abstractions (Interfaces). This enables swapping storage engines, adding caching decorators, and clean in-memory test mocking.',
        anti_pattern_before: `class CreateInvoiceAction {\n    public function __construct(private InvoiceRepository $repository) {} // Concrete dependency!\n}`,
        canonical_after: `interface InvoiceRepositoryInterface {\n    public function create(InvoiceDTO $dto): Invoice;\n}\n\nclass CreateInvoiceAction {\n    public function __construct(private InvoiceRepositoryInterface $repository) {} // Contract abstraction!\n}`
      },
      controller_unauthorized_mutation: {
        solid_principle: 'Principle of Least Privilege & Broken Object Level Authorization (BOLA/IDOR Prevention)',
        rationale: 'Every state-changing HTTP endpoint must explicitly verify whether the authenticated actor is authorized to perform the operation on the specified resource before mutating state.',
        anti_pattern_before: `public function update(Request $request, Invoice $invoice) {\n    $invoice->update($request->all()); // Anyone can edit anyone's invoice!\n}`,
        canonical_after: `public function update(UpdateInvoiceRequest $request, Invoice $invoice): JsonResponse {\n    $this->authorize('update', $invoice);\n    $dto = InvoiceDTO::fromRequest($request);\n    $updated = ($this->updateInvoiceAction)($invoice, $dto);\n    return response()->json(new InvoiceResource($updated));\n}`
      }
    };

    const exp = explanations[ruleId] || {
      solid_principle: 'Clean Architecture & Modular Isolation',
      rationale: rule.description,
      anti_pattern_before: '// Code violating ' + ruleId,
      canonical_after: '// ' + rule.fix
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            rule_id: rule.id,
            name: rule.name,
            category: rule.category,
            severity: rule.severity,
            description: rule.description,
            fix: rule.fix,
            solid_principle: exp.solid_principle,
            architectural_rationale: exp.rationale,
            anti_pattern_example: exp.anti_pattern_before,
            canonical_refactored_example: exp.canonical_after
          }, null, 2)
        }
      ]
    };
  }

  // 6. validate_layer_contract (NEW)
  if (name === 'validate_layer_contract') {
    const rawFile = args.file;
    const { parsedFiles, allViolations } = processInputFiles([rawFile], projectProfile.projectRoot, activeConfig);
    const parsed = parsedFiles[0];

    if (!parsed) {
      throw new Error('Unable to parse specified file.');
    }

    const layer = parsed.layer;
    const layerViolations = allViolations.filter(v => v.file === parsed.filePath);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            file: parsed.filePath,
            class_name: parsed.className,
            detected_layer: layer,
            module: parsed.moduleName,
            is_tenant_scoped: parsed.isTenantScoped,
            is_compliant: layerViolations.length === 0,
            violations_count: layerViolations.length,
            violations: layerViolations,
            structure_summary: {
              class_type: parsed.classType,
              extends: parsed.extendsClass,
              implements: parsed.implementsInterfaces,
              traits_used: parsed.traits,
              injections_count: parsed.injections.length,
              methods_count: parsed.methods.length
            }
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
              version: '2.1.0'
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
