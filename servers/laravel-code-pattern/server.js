#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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
    description: 'Compact PASS/FAIL architecture quality gate for Antigravity & MiMo loops. Validates changed files against the canonical flow (Controller -> FormRequest -> DTO -> Policy -> Action -> RepositoryInterface -> Repository -> Model -> Resource -> Response) without calling an LLM. Automatically discovers modified and untracked Git files if files argument is omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Optional array of file paths or file objects to analyze (defaults to auto-discovering modified and untracked PHP files from Git).',
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
        include_warnings: {
          type: 'boolean',
          description: 'Whether to include warnings in the MiMo remediation payload (default: false).'
        },
        workspace_path: {
          type: 'string',
          description: 'Optional path to the project root or workspace.'
        },
        strict_mode: {
          type: 'boolean',
          description: 'Enable strict architectural gate enforcement.'
        }
      }
    }
  },
  {
    name: 'architecture_remediate_mimo',
    description: 'Invokes Xiaomi MiMo (or configured fallback LLM) to automatically refactor non-compliant Laravel PHP code into canonical clean architecture classes (Controller -> FormRequest -> DTO -> Action -> RepositoryInterface).',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path of the violating PHP file to refactor.'
        },
        code: {
          type: 'string',
          description: 'Optional file content (auto-read from disk if omitted).'
        },
        violations: {
          type: 'array',
          description: 'Optional array of detected violations (auto-scanned if omitted).'
        },
        workspace_path: {
          type: 'string',
          description: 'Optional project root path.'
        }
      },
      required: ['file_path']
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
        },
        file_path: {
          type: 'string',
          description: 'Alternative path of the PHP file to audit.'
        },
        code: {
          type: 'string',
          description: 'Optional file content (if evaluating in-memory).'
        },
        expected_layer: {
          type: 'string',
          description: 'Optional expected layer (e.g. Action, DTO, Model, Controller) to assert against.'
        }
      }
    }
  }
];

/**
 * Dynamically discovers modified, added, and untracked PHP files in git repository
 */
function discoverChangedPhpFiles(projectRoot) {
  const discovered = new Set();
  try {
    const diffFiles = execSync('git diff --name-only HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).split(/\r?\n/).filter(f => f.trim().endsWith('.php'));
    diffFiles.forEach(f => discovered.add(path.resolve(projectRoot, f.trim())));
  } catch (e) {
    try {
      const diffUnstaged = execSync('git diff --name-only', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).split(/\r?\n/).filter(f => f.trim().endsWith('.php'));
      diffUnstaged.forEach(f => discovered.add(path.resolve(projectRoot, f.trim())));
    } catch {}
  }

  try {
    const statusOutput = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).split(/\r?\n/);
    for (const line of statusOutput) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const filePath = parts[parts.length - 1];
      if (filePath && filePath.endsWith('.php')) {
        discovered.add(path.resolve(projectRoot, filePath));
      }
    }
  } catch (e) {}

  return Array.from(discovered);
}

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
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
      try {
        if (fs.existsSync(resolvedPath)) {
          content = fs.readFileSync(resolvedPath, 'utf8');
          filePath = resolvedPath;
        } else {
          // Skip deleted or nonexistent files
          continue;
        }
      } catch (e) {
        continue;
      }
    } else if (item && typeof item === 'object') {
      filePath = item.path || item.file_path || item.file || '';
      content = item.content || item.code || '';
      if (!content && filePath) {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
        if (fs.existsSync(resolvedPath)) {
          try {
            content = fs.readFileSync(resolvedPath, 'utf8');
            filePath = resolvedPath;
          } catch (e) {}
        }
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
    let rawFiles = args.files;
    if (typeof rawFiles === 'string') {
      rawFiles = [rawFiles];
    } else if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
      rawFiles = discoverChangedPhpFiles(projectProfile.projectRoot);
    }

    const { parsedFiles, allViolations, relationalGraph } = processInputFiles(rawFiles, projectProfile.projectRoot, activeConfig);
    const duration = Date.now() - startTime;

    const report = Reporter.generateReport({
      filesAnalyzed: parsedFiles,
      violations: allViolations,
      scanDurationMs: duration,
      config: activeConfig,
      options: {
        fail_on_warnings: args.fail_on_warnings || args.strict_mode,
        include_warnings: args.include_warnings
      },
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

  // architecture_remediate_mimo
  if (name === 'architecture_remediate_mimo') {
    const rawPath = args.file_path;
    const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(projectProfile.projectRoot, rawPath);
    let code = args.code;
    if (!code && fs.existsSync(resolvedPath)) {
      code = fs.readFileSync(resolvedPath, 'utf8');
    }
    if (!code) {
      throw new Error(`Unable to read code from ${resolvedPath}`);
    }

    let violations = args.violations;
    if (!violations || violations.length === 0) {
      const { allViolations } = processInputFiles([{ path: resolvedPath, content: code }], projectProfile.projectRoot, activeConfig);
      violations = allViolations;
    }

    const remediationResult = await SemanticReviewer.remediate({
      filePath: resolvedPath,
      code,
      violations,
      prompt: `Please refactor this Laravel file strictly adhering to Clean Architecture rules.`,
      config: activeConfig
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(remediationResult, null, 2)
        }
      ]
    };
  }

  // 2. check_code_pattern
  if (name === 'check_code_pattern') {
    let rawFiles = args.files || [];
    if (typeof rawFiles === 'string') rawFiles = [rawFiles];
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
            contract: 'Enterprise Laravel Canonical Architecture v2.3.0',
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
    const ruleId = args.rule_id || args.rule;
    const rule = RULE_DEFINITIONS[ruleId];
    if (!rule) {
      throw new Error(`Rule ID '${ruleId}' not recognized. Available rules: ${Object.keys(RULE_DEFINITIONS).join(', ')}`);
    }

    const explanations = {
      controller_direct_model: {
        solid_principle: 'Single Responsibility Principle (SRP) & Separation of Concerns (SoC)',
        rationale: 'Controllers belong to the HTTP Transport / Presentation layer. Interacting directly with Eloquent models tightly couples HTTP concerns with database persistence, making unit testing impossible without database fixtures and preventing code reuse from CLI commands or queue workers.',
        anti_pattern_before: "class InvoiceController extends Controller {\n    public function store(Request $request) {\n        $invoice = Invoice::create($request->all());\n        return response()->json($invoice);\n    }\n}",
        canonical_after: "class InvoiceController extends Controller {\n    public function __construct(private CreateInvoiceAction $createInvoiceAction) {}\n\n    public function store(CreateInvoiceRequest $request): JsonResponse {\n        $dto = InvoiceDTO::fromRequest($request);\n        $invoice = ($this->createInvoiceAction)($dto);\n        return response()->json(new InvoiceResource($invoice));\n    }\n}"
      },
      controller_direct_db: {
        solid_principle: 'Information Hiding & Storage Decoupling',
        rationale: 'Direct database execution via DB facade in controllers bypasses application boundaries and couples presentation to database schema.',
        anti_pattern_before: "DB::table('users')->where('id', $id)->delete();",
        canonical_after: "($this->deleteUserAction)($id);"
      },
      controller_business_logic: {
        solid_principle: 'Single Responsibility Principle (Thin Controllers)',
        rationale: 'Controllers should only coordinate HTTP requests, invoke domain actions, and serialize responses. Business calculations belong in Actions.',
        anti_pattern_before: "public function calculateTax(Request $request) {\n    $tax = $request->amount * 0.15;\n    // ... 50 lines of calculations\n}",
        canonical_after: "public function calculateTax(CalculateTaxRequest $request): JsonResponse {\n    $dto = TaxDTO::fromRequest($request);\n    $result = ($this->calculateTaxAction)($dto);\n    return response()->json(new TaxResource($result));\n}"
      },
      controller_unauthorized_mutation: {
        solid_principle: 'Principle of Least Privilege & Broken Object Level Authorization (BOLA/IDOR Prevention)',
        rationale: 'Every state-changing HTTP endpoint must explicitly verify whether the authenticated actor is authorized to perform the operation on the specified resource before mutating state.',
        anti_pattern_before: "public function update(Request $request, Invoice $invoice) {\n    $invoice->update($request->all()); // Anyone can edit anyone's invoice!\n}",
        canonical_after: "public function update(UpdateInvoiceRequest $request, Invoice $invoice): JsonResponse {\n    $this->authorize('update', $invoice);\n    $dto = InvoiceDTO::fromRequest($request);\n    $updated = ($this->updateInvoiceAction)($invoice, $dto);\n    return response()->json(new InvoiceResource($updated));\n}"
      },
      controller_raw_model_response: {
        solid_principle: 'Information Hiding & Contract Decoupling (API Resource Serialization)',
        rationale: 'Controllers must never expose internal Eloquent models directly to clients. Returning raw models couples the public API schema tightly to internal database table columns, inadvertently exposes sensitive hidden attributes, and breaks API contract stability.',
        anti_pattern_before: "class UserController extends Controller {\n    public function index() {\n        return response()->json(User::all());\n    }\n}",
        canonical_after: "class UserController extends Controller {\n    public function index(): JsonResponse {\n        $users = ($this->listUsersAction)();\n        return response()->json(UserResource::collection($users));\n    }\n}"
      },
      sql_injection_raw_exposure: {
        solid_principle: 'Defensive Programming & Security Compliance (OWASP A03:2021-Injection)',
        rationale: 'Direct string interpolation or concatenation in raw queries allows attackers to break out of query context and execute arbitrary SQL commands (e.g. data exfiltration, deletion, privilege escalation).',
        anti_pattern_before: "DB::raw(\"SELECT * FROM users WHERE email = '$email'\");\nUser::whereRaw(\"status = '$status' AND role = '$role'\")->get();",
        canonical_after: "DB::raw(\"SELECT * FROM users WHERE email = ?\", [$email]);\nUser::whereRaw(\"status = ? AND role = ?\", [$status, $role])->get();"
      },
      mass_assignment_unguarded: {
        solid_principle: 'Input Validation & Over-Posting Prevention',
        rationale: 'Passing unvalidated request inputs directly to model create/update allows malicious users to overwrite protected columns (e.g. is_admin, role, balance).',
        anti_pattern_before: "$user->update($request->all());",
        canonical_after: "$user->update($request->validated()); // or pass via typed DTO"
      },
      form_request_persistence: {
        solid_principle: 'Separation of Concerns (Validation vs Persistence)',
        rationale: 'FormRequests are validation boundaries. Performing database writes inside FormRequest creates untraceable side-effects.',
        anti_pattern_before: "class StoreUserRequest extends FormRequest {\n    public function passedValidation() {\n        User::create($this->all());\n    }\n}",
        canonical_after: "class StoreUserRequest extends FormRequest {\n    public function rules(): array {\n        return ['name' => 'required', 'email' => 'required|email'];\n    }\n}"
      },
      form_request_business_logic: {
        solid_principle: 'Single Responsibility Principle',
        rationale: 'FormRequests should only handle request validation rules, authorization, and data preparation.',
        anti_pattern_before: "class InvoiceRequest extends FormRequest {\n    public function processPayment() { /* logic */ }\n}",
        canonical_after: "class InvoiceRequest extends FormRequest {\n    public function authorize(): bool { return true; }\n    public function rules(): array { return [...]; }\n}"
      },
      dto_persistence: {
        solid_principle: 'Pure Value Object Invariant',
        rationale: 'Data Transfer Objects must remain pure, immutable data holders with zero database coupling.',
        anti_pattern_before: "class UserDTO {\n    public function save() {\n        User::create($this->toArray());\n    }\n}",
        canonical_after: "readonly class UserDTO {\n    public function __construct(public string $name, public string $email) {}\n}"
      },
      policy_mutation_hazard: {
        solid_principle: 'Command Query Separation (CQS) & Principle of Least Privilege',
        rationale: 'Policies are pure access-control evaluation gates that must only inspect context and answer boolean questions (allow/deny). Executing database writes or state mutations inside Policy classes creates untraceable side-effects.',
        anti_pattern_before: "class InvoicePolicy {\n    public function update(User $user, Invoice $invoice): bool {\n        $invoice->update(['last_checked' => now()]);\n        return $user->id === $invoice->user_id;\n    }\n}",
        canonical_after: "class InvoicePolicy {\n    public function update(User $user, Invoice $invoice): bool {\n        return $user->id === $invoice->user_id;\n    }\n}"
      },
      repository_http_dependency: {
        solid_principle: 'Transport Decoupling & Reusability',
        rationale: 'Repositories must never import or depend on HTTP Request/Response objects, allowing reuse across CLI commands, queue workers, and tests.',
        anti_pattern_before: "class InvoiceRepository {\n    public function getByRequest(Request $request) {\n        return Invoice::where('user_id', $request->user()->id)->get();\n    }\n}",
        canonical_after: "class InvoiceRepository implements InvoiceRepositoryInterface {\n    public function getByUserId(int $userId): Collection {\n        return Invoice::where('user_id', $userId)->get();\n    }\n}"
      },
      repository_business_logic: {
        solid_principle: 'Single Responsibility Principle (Data Storage Only)',
        rationale: 'Repositories must solely query and persist records, not compute domain discounts, taxes, or send notifications.',
        anti_pattern_before: "class InvoiceRepository {\n    public function createInvoice($data) {\n        $total = $data['amount'] * 1.15; // Tax calculation in repo!\n        Mail::to($data['email'])->send(...);\n        return Invoice::create([...]);\n    }\n}",
        canonical_after: "class InvoiceRepository implements InvoiceRepositoryInterface {\n    public function create(InvoiceDTO $dto): Invoice {\n        return Invoice::create($dto->toArray());\n    }\n}"
      },
      repository_missing_interface: {
        solid_principle: 'Dependency Inversion Principle (DIP)',
        rationale: 'High-level modules (Actions, Domain Services) should not depend on low-level persistence implementations. Both should depend on abstractions (Interfaces). This enables swapping storage engines, adding caching decorators, and clean in-memory test mocking.',
        anti_pattern_before: "class CreateInvoiceAction {\n    public function __construct(private InvoiceRepository $repository) {} // Concrete dependency!\n}",
        canonical_after: "interface InvoiceRepositoryInterface {\n    public function create(InvoiceDTO $dto): Invoice;\n}\n\nclass CreateInvoiceAction {\n    public function __construct(private InvoiceRepositoryInterface $repository) {} // Contract abstraction!\n}"
      },
      action_too_large: {
        solid_principle: 'Single Responsibility Principle',
        rationale: 'Action classes must represent a single domain use-case with one public __invoke method, <= 120 lines.',
        anti_pattern_before: "class OrderAction {\n    public function create() {}\n    public function update() {}\n    public function cancel() {}\n}",
        canonical_after: "class CreateOrderAction {\n    public function __invoke(OrderDTO $dto): Order { ... }\n}"
      },
      action_http_dependency: {
        solid_principle: 'Decoupling from Transport Layer',
        rationale: 'Actions must receive typed DTOs or domain primitives, never HTTP Request objects.',
        anti_pattern_before: "class CreateOrderAction {\n    public function __invoke(Request $request) { ... }\n}",
        canonical_after: "class CreateOrderAction {\n    public function __invoke(OrderDTO $dto): Order { ... }\n}"
      },
      service_too_large: {
        solid_principle: 'Cohesion over Bloat',
        rationale: 'Giant 500+ line service classes become unmaintainable God objects. Decompose into discrete Actions.',
        anti_pattern_before: "class BillingService { /* 800 lines with 20 methods */ }",
        canonical_after: "Decompose into CreateInvoiceAction, ChargeSubscriptionAction, RefundPaymentAction."
      },
      cross_module_internal_dependency: {
        solid_principle: 'Modular Architecture & High Cohesion',
        rationale: 'Modules in modular monoliths must communicate through Contracts, DTOs, or Events, never importing another module internal models or repositories.',
        anti_pattern_before: "namespace App\Modules\Inventory;\nuse App\Modules\Billing\Models\Invoice; // Direct internal model import!",
        canonical_after: "namespace App\Modules\Inventory;\nuse App\Modules\Billing\Contracts\BillingServiceInterface; // Contract!"
      },
      unbounded_transaction_boundary: {
        solid_principle: 'ACID Consistency & Atomic Transactions',
        rationale: 'Executing multiple model mutations without DB::transaction leaves the database in an inconsistent state if a middle step fails.',
        anti_pattern_before: "$order->save();\n$payment->save();\n$inventory->decrement();",
        canonical_after: "DB::transaction(function () use ($order, $payment, $inventory) {\n    $order->save();\n    $payment->save();\n    $inventory->decrement();\n});"
      },
      swallowed_exception_hazard: {
        solid_principle: 'Fail-Fast Principle & Error Transparency',
        rationale: 'Empty catch blocks silently swallow runtime errors and database transaction failures, concealing bugs and causing silent data corruption.',
        anti_pattern_before: "try {\n    $this->repository->create($dto);\n} catch (\Exception $e) {\n    // Swallowed silently!\n}",
        canonical_after: "try {\n    $this->repository->create($dto);\n} catch (\Throwable $e) {\n    Log::error('Failed: ' . $e->getMessage());\n    throw $e;\n}"
      },
      observer_recursion_hazard: {
        solid_principle: 'Event-Driven Invariant & Loop-Free Lifecycle Hooks',
        rationale: 'Invoking $model->save() or $model->update() inside an Eloquent Observer hook like saving() or saved() fires the same lifecycle events recursively, leading to infinite loops and stack exhaustion.',
        anti_pattern_before: "class UserObserver {\n    public function saved(User $user): void {\n        $user->last_login = now();\n        $user->save();\n    }\n}",
        canonical_after: "class UserObserver {\n    public function saved(User $user): void {\n        $user->last_login = now();\n        $user->saveQuietly();\n    }\n}"
      },
      job_missing_should_queue: {
        solid_principle: 'Non-Blocking Asynchronous Processing',
        rationale: 'Queue worker jobs and heavy external notifications must implement ShouldQueue to ensure execution is dispatched to background workers rather than executing synchronously in the HTTP request thread.',
        anti_pattern_before: "class ProcessInvoicePayment {\n    public function handle() { /* sync execution */ }\n}",
        canonical_after: "class ProcessInvoicePayment implements ShouldQueue {\n    use Queueable, SerializesModels;\n    public function handle() { /* background worker */ }\n}"
      },
      notification_missing_should_queue: {
        solid_principle: 'Asynchronous Alert Dispatch',
        rationale: 'Notifications over external channels (mail, sms, slack) must implement ShouldQueue to prevent slowing down HTTP responses.',
        anti_pattern_before: "class OrderPaidNotification extends Notification {\n    public function via() { return ['mail']; }\n}",
        canonical_after: "class OrderPaidNotification extends Notification implements ShouldQueue {\n    use Queueable;\n    public function via() { return ['mail']; }\n}"
      },
      cache_unbounded_ttl: {
        solid_principle: 'Bounded Resource Usage',
        rationale: 'Using Cache::forever() or putting items without explicit expiration causes cache memory bloating and stale data.',
        anti_pattern_before: "Cache::forever('user_stats', $stats);",
        canonical_after: "Cache::put('user_stats', $stats, now()->addHours(1));"
      },
      event_after_commit_missing: {
        solid_principle: 'Transactional Event Invariant',
        rationale: 'Events dispatched inside database transactions should implement ShouldHandleEventsAfterCommit to ensure listeners only execute after the database transaction is safely committed.',
        anti_pattern_before: "class OrderCreatedEvent {\n    public function __construct(public Order $order) {}\n}",
        canonical_after: "class OrderCreatedEvent implements ShouldHandleEventsAfterCommit {\n    public function __construct(public Order $order) {}\n}"
      },
      tenant_migration_misplacement: {
        solid_principle: 'Multi-Tenancy Isolation',
        rationale: 'Tenant-specific table schemas in multi-tenant systems must reside strictly in database/migrations/tenant/, never in central migrations.',
        anti_pattern_before: "database/migrations/2026_create_tenant_orders_table.php",
        canonical_after: "database/migrations/tenant/2026_create_tenant_orders_table.php"
      },
      tenant_unscoped_query: {
        solid_principle: 'Tenant Isolation Guarantee',
        rationale: 'Querying tenant models with withoutTenancy() or withoutGlobalScopes() risks exposing another tenant data.',
        anti_pattern_before: "TenantOrder::withoutTenancy()->get();",
        canonical_after: "TenantOrder::where('status', 'active')->get(); // Scoped via BelongsToTenant"
      },
      n_plus_one_loop_query: {
        solid_principle: 'Database Performance & Batching',
        rationale: 'Running database queries or dynamic relationship queries inside loops creates N+1 query performance bottlenecks.',
        anti_pattern_before: "foreach ($orders as $order) {\n    $items = Item::where('order_id', $order->id)->get();\n}",
        canonical_after: "$orders = Order::with('items')->get();\nforeach ($orders as $order) {\n    $items = $order->items;\n}"
      },
      circular_dependency_detected: {
        solid_principle: 'Acyclic Dependencies Principle (ADP)',
        rationale: 'Cycles between classes tightly couple modules and prevent independent deployment and testing.',
        anti_pattern_before: "ServiceA injects ServiceB, and ServiceB injects ServiceA.",
        canonical_after: "Decouple using an Interface or dispatch an Event."
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

  // 6. validate_layer_contract (Hardened for all 18 Layers)
  if (name === 'validate_layer_contract') {
    const rawFile = args.file || args.file_path || { path: args.path || args.file_path, content: args.code || args.content };
    const { parsedFiles, allViolations } = processInputFiles([rawFile], projectProfile.projectRoot, activeConfig);
    const parsed = parsedFiles[0];

    if (!parsed) {
      throw new Error('Unable to parse specified file.');
    }

    const layer = parsed.layer;
    const layerViolations = allViolations.filter(v => v.file === parsed.filePath);

    // Architectural Layer Contract Invariants
    const contractChecks = [];

    // Check expected_layer if supplied
    if (args.expected_layer) {
      const matchesExpected = layer.toLowerCase() === args.expected_layer.toLowerCase();
      contractChecks.push({ check: `Matches expected layer (${args.expected_layer})`, passed: matchesExpected });
    }

    if (layer === 'Action') {
      const hasInvoke = parsed.methods.some(m => m.name === '__invoke');
      contractChecks.push({ check: 'Has public __invoke() method', passed: hasInvoke });
      const hasHttpRequest = parsed.imports.some(i => i.classPath.includes('Request'));
      contractChecks.push({ check: 'Decoupled from HTTP Request', passed: !hasHttpRequest });
      const publicDomainMethods = parsed.methods.filter(m => m.visibility === 'public' && !m.name.startsWith('__'));
      contractChecks.push({ check: 'Single-purpose (<= 1 public domain method)', passed: publicDomainMethods.length <= 1 });
    } else if (layer === 'DTO') {
      const isImmutable = parsed.cleanCode.includes('readonly class') ||
        /\b(?:public|protected|private)\s+readonly\b/i.test(parsed.cleanCode) ||
        !parsed.cleanCode.includes('$this->');
      contractChecks.push({ check: 'Pure immutable value object', passed: isImmutable });
      const hasDb = !parsed.cleanCode.includes('DB::') && !parsed.cleanCode.includes('->save(');
      contractChecks.push({ check: 'Zero database persistence calls', passed: hasDb });
    } else if (layer === 'FormRequest') {
      const hasRules = parsed.methods.some(m => m.name === 'rules' || m.name === 'authorize');
      contractChecks.push({ check: 'Contains rules() or authorize() validation method', passed: hasRules });
      const hasNoPersistence = !parsed.cleanCode.includes('->save(') && !parsed.cleanCode.includes('DB::');
      contractChecks.push({ check: 'Zero database persistence calls', passed: hasNoPersistence });
    } else if (layer === 'Policy') {
      const hasNoMutation = !parsed.cleanCode.includes('->save(') && !parsed.cleanCode.includes('->update(') && !parsed.cleanCode.includes('->delete(');
      contractChecks.push({ check: 'Pure authorization without mutations', passed: hasNoMutation });
    } else if (layer === 'Repository') {
      const implementsIface = parsed.implementsInterfaces.some(i => /RepositoryInterface$|RepositoryContract$/i.test(i));
      contractChecks.push({ check: 'Implements RepositoryInterface contract', passed: implementsIface });
      const hasNoHttp = !parsed.imports.some(i => i.classPath.includes('Illuminate\\Http'));
      contractChecks.push({ check: 'Decoupled from HTTP layer', passed: hasNoHttp });
    } else if (layer === 'Job') {
      const hasQueue = parsed.implementsInterfaces.some(i => i.includes('ShouldQueue')) || parsed.sourceCode.includes('ShouldQueue');
      contractChecks.push({ check: 'Implements ShouldQueue contract', passed: hasQueue });
    } else if (layer === 'Notification') {
      const hasQueue = parsed.implementsInterfaces.some(i => i.includes('ShouldQueue')) || parsed.sourceCode.includes('ShouldQueue');
      contractChecks.push({ check: 'Implements ShouldQueue contract', passed: hasQueue });
    } else if (layer === 'Controller') {
      const thinMethods = parsed.methods.every(m => m.linesCount <= 35);
      contractChecks.push({ check: 'Thin methods (<= 35 lines per method)', passed: thinMethods });
      const hasNoDirectModel = !parsed.imports.some(i => /Models\\/i.test(i.classPath));
      contractChecks.push({ check: 'No direct Model imports', passed: hasNoDirectModel });
    } else if (layer === 'Model') {
      const extendsModel = /Model|Authenticatable|Pivot/i.test(parsed.extendsClass || '');
      contractChecks.push({ check: 'Extends Eloquent Model/Authenticatable/Pivot', passed: extendsModel });
      const hasMassGuard = parsed.cleanCode.includes('$fillable') || parsed.cleanCode.includes('$guarded') || parsed.cleanCode.includes('unguarded(');
      contractChecks.push({ check: 'Mass assignment protection ($fillable or $guarded)', passed: hasMassGuard });
      if (parsed.isTenantScoped) {
        const hasTenantTrait = parsed.traits.some(t => /Tenant/i.test(t));
        contractChecks.push({ check: 'Tenant-scoped model uses tenant trait', passed: hasTenantTrait });
      }
    } else if (layer === 'Observer') {
      const hasQuietly = parsed.cleanCode.includes('saveQuietly') || parsed.cleanCode.includes('updateQuietly') || !parsed.cleanCode.includes('->save(');
      contractChecks.push({ check: 'Uses saveQuietly/updateQuietly to prevent infinite recursion', passed: hasQuietly });
    } else if (layer === 'Resource') {
      const extendsResource = /JsonResource|ResourceCollection|Resource/i.test(parsed.extendsClass || '');
      contractChecks.push({ check: 'Extends JsonResource or ResourceCollection', passed: extendsResource });
      const hasToArray = parsed.methods.some(m => m.name === 'toArray');
      contractChecks.push({ check: 'Defines toArray() serialization method', passed: hasToArray });
    } else if (layer === 'Response') {
      const extendsResponse = /JsonResponse|Response/i.test(parsed.extendsClass || '');
      contractChecks.push({ check: 'Extends standard Response/JsonResponse', passed: extendsResponse });
    } else if (layer === 'Event') {
      const hasSerializes = parsed.traits.some(t => t.includes('SerializesModels')) || parsed.cleanCode.includes('SerializesModels');
      contractChecks.push({ check: 'Uses SerializesModels trait', passed: hasSerializes });
    } else if (layer === 'Listener') {
      const hasHandle = parsed.methods.some(m => m.name === 'handle');
      contractChecks.push({ check: 'Defines handle() method', passed: hasHandle });
      const hasNoHttp = !parsed.imports.some(i => i.classPath.includes('Illuminate\\Http\\Request'));
      contractChecks.push({ check: 'Decoupled from HTTP Request', passed: hasNoHttp });
    } else if (layer === 'RepositoryInterface') {
      const isInterface = parsed.classType === 'interface';
      contractChecks.push({ check: 'Declared as interface contract', passed: isInterface });
    } else if (layer === 'Service') {
      const isBounded = parsed.totalLines <= 350;
      contractChecks.push({ check: 'Bounded size (<= 350 lines)', passed: isBounded });
      const hasNoHttp = !parsed.imports.some(i => i.classPath.includes('Illuminate\\Http\\Request'));
      contractChecks.push({ check: 'Decoupled from HTTP Request', passed: hasNoHttp });
    } else if (layer === 'Migration') {
      const extendsMigration = parsed.extendsClass === 'Migration' || /Migration/i.test(parsed.cleanCode);
      contractChecks.push({ check: 'Extends Laravel Migration', passed: extendsMigration });
      const hasUpDown = parsed.methods.some(m => m.name === 'up');
      contractChecks.push({ check: 'Contains up() migration schema definition', passed: hasUpDown });
    } else if (layer === 'Exception') {
      const extendsException = /Exception|Throwable/i.test(parsed.extendsClass || '');
      contractChecks.push({ check: 'Extends Exception or Throwable', passed: extendsException });
    } else if (layer === 'Middleware') {
      const hasHandle = parsed.methods.some(m => m.name === 'handle');
      contractChecks.push({ check: 'Defines handle($request, Closure $next) method', passed: hasHandle });
    }

    const isCompliant = layerViolations.length === 0 && contractChecks.every(c => c.passed);

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
            is_compliant: isCompliant,
            contract_checks: contractChecks,
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
    sendResponse({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON was received'
      }
    });
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
              version: '2.3.0'
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
