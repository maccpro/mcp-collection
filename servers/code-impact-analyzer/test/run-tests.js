/**
 * @file run-tests.js
 * @description Enterprise Test Suite for @maccpro/code-impact-analyzer.
 * Validates GitDiffAnalyzer, DynamicSymbolResolver, BlastRadiusEngine,
 * DatabaseImpactEngine, BreakingChangeDetector, TestImpactSelector,
 * DynamicProjectIntrospector, ASTClassClassifier, DynamicHazardEvaluator,
 * RelationalDependencyGraph, and AICognitiveReasoner.
 */

import assert from 'node:assert';
import { GitDiffAnalyzer } from '../engine/git-diff-analyzer.js';
import { DynamicSymbolResolver } from '../engine/dynamic-symbol-resolver.js';
import { BlastRadiusEngine } from '../engine/blast-radius-engine.js';
import { DatabaseImpactEngine } from '../engine/database-impact-engine.js';
import { BreakingChangeDetector } from '../engine/breaking-change-detector.js';
import { TestImpactSelector } from '../engine/test-impact-selector.js';
import { DynamicProjectIntrospector } from '../engine/dynamic-project-introspector.js';
import { ASTClassClassifier } from '../engine/ast-class-classifier.js';
import { DynamicHazardEvaluator } from '../engine/dynamic-hazard-evaluator.js';
import { AICognitiveReasoner } from '../engine/ai-cognitive-reasoner.js';
import { RelationalDependencyGraph } from '../engine/relational-dependency-graph.js';

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

console.log('\n--- Starting code-impact-analyzer Verification Suite ---\n');

// 1. RelationalDependencyGraph Tests
await runTest('RelationalDependencyGraph: builds typed directed graph with cycle-safe BFS traversal', () => {
  const graph = new RelationalDependencyGraph();

  // Nodes: Controller -> Service -> Repository -> Model
  graph.addEdge('app/Http/Controllers/OrderController.php', 'app/Services/OrderService.php', 'CALLS');
  graph.addEdge('app/Services/OrderService.php', 'app/Repositories/OrderRepository.php', 'CALLS');
  graph.addEdge('app/Repositories/OrderRepository.php', 'app/Models/Order.php', 'INJECTS');

  // Cycle check: OrderModel refers back to OrderService (soft circular reference)
  graph.addEdge('app/Models/Order.php', 'app/Services/OrderService.php', 'CALLS');

  const traversal = graph.traverseBFS({
    startNodes: ['app/Models/Order.php'],
    maxDepth: 3,
    direction: 'upstream'
  });

  assert.strictEqual(traversal.origins[0], 'app/Models/Order.php');
  assert.ok(traversal.level_1.includes('app/Repositories/OrderRepository.php'));
  assert.ok(traversal.level_2.includes('app/Services/OrderService.php'));
  assert.ok(traversal.level_3.includes('app/Http/Controllers/OrderController.php'));
  assert.strictEqual(traversal.all_affected.length, 4); // No infinite loop despite cycle
});

await runTest('RelationalDependencyGraph: finds exact shortest trace path between two nodes', () => {
  const graph = new RelationalDependencyGraph();
  graph.addEdge('Controller.php', 'Service.php', 'CALLS');
  graph.addEdge('Service.php', 'Repository.php', 'CALLS');
  graph.addEdge('Repository.php', 'Database.php', 'QUERIES');

  const path = graph.findPath('Database.php', 'Controller.php');
  assert.deepStrictEqual(path, ['Database.php', 'Repository.php', 'Service.php', 'Controller.php']);
});

await runTest('RelationalDependencyGraph: generates valid Mermaid flowchart with typed edge annotations', () => {
  const graph = new RelationalDependencyGraph();
  graph.addEdge('Caller.php', 'Target.php', 'DISPATCHES');

  const mermaid = graph.toMermaid({ origins: ['Target.php'], level1: ['Caller.php'] });
  assert.ok(mermaid.startsWith('flowchart TD'));
  assert.ok(mermaid.includes('|DISPATCHES|'));
});

// 2. GitDiffAnalyzer Tests
await runTest('GitDiffAnalyzer: parses unified diff and populates old_content, new_content, and diff', () => {
  const sampleDiff = `diff --git a/app/Services/InvoiceService.php b/app/Services/InvoiceService.php
index e69de29..d95f3ad 100644
--- a/app/Services/InvoiceService.php
+++ b/app/Services/InvoiceService.php
@@ -15,4 +15,6 @@ class InvoiceService
+    public function generatePdf(int $invoiceId): string
+    {
+        return 'invoice.pdf';
+    }
`;

  const result = GitDiffAnalyzer.analyze({ raw_diff: sampleDiff });
  assert.strictEqual(result.has_changes, true);
  assert.strictEqual(result.total_files_changed, 1);
  assert.strictEqual(result.files[0].category, 'service');
  assert.ok(result.files[0].changed_symbols.includes('generatePdf'));
  assert.ok(result.files[0].diff.includes('diff --git'));
  assert.ok(result.files[0].new_content.includes('generatePdf'));
});

// 3. DynamicSymbolResolver Tests
await runTest('DynamicSymbolResolver: resolves Eloquent magic scopes', () => {
  const resolved = DynamicSymbolResolver.resolve({ symbol: 'scopeActive' });
  assert.strictEqual(resolved.framework_type, 'eloquent_scope');
  assert.ok(resolved.dynamic_call_aliases.includes('active'));
  assert.ok(resolved.dynamic_call_aliases.includes('->active('));
});

await runTest('DynamicSymbolResolver: resolves invokable actions', () => {
  const resolved = DynamicSymbolResolver.resolve({
    symbol: '__invoke',
    file_content: 'class ProcessPaymentAction { public function __invoke() {} }'
  });
  assert.strictEqual(resolved.framework_type, 'invokable_action');
});

await runTest('DynamicSymbolResolver: identifies interface types', () => {
  const resolved = DynamicSymbolResolver.resolve({
    symbol: 'PaymentGatewayInterface',
    file_content: 'interface PaymentGatewayInterface {}'
  });
  assert.strictEqual(resolved.framework_type, 'interface');
});

// 4. BlastRadiusEngine Tests
await runTest('BlastRadiusEngine: risk score and severity calculation with AST classification', () => {
  const risk = BlastRadiusEngine._calculateRiskScore({
    level1Count: 4,
    level2Count: 6,
    level3Count: 2,
    l1Files: ['app/Http/Controllers/OrderController.php'],
    origins: ['database/migrations/2026_09_26_create_orders_table.php'],
    indexedFiles: [
      {
        path: 'app/Http/Controllers/OrderController.php',
        content: 'class OrderController extends Controller {}'
      },
      {
        path: 'database/migrations/2026_09_26_create_orders_table.php',
        content: 'class CreateOrdersTable extends Migration {}'
      }
    ]
  });

  // (4 * 2.0 = 8) + (6 * 1.0 = 6) + (2 * 0.5 = 1) + 6.0 (migration) + 4.0 (controller) = 25.0
  assert.strictEqual(risk.riskScore, 25.0);
  assert.strictEqual(risk.severity, 'HIGH');
  assert.ok(risk.factors.some(f => f.includes('Database Schema Mutation')));
});

await runTest('BlastRadiusEngine: generates valid Mermaid diagram', () => {
  const diagram = BlastRadiusEngine._generateMermaidDiagram(
    ['app/Services/BillingService.php'],
    ['app/Http/Controllers/BillingController.php'],
    ['routes/web.php']
  );

  assert.ok(diagram.startsWith('flowchart TD'));
  assert.ok(diagram.includes('BillingService.php'));
  assert.ok(diagram.includes('BillingController.php'));
});

// 5. DatabaseImpactEngine Tests
await runTest('DatabaseImpactEngine: warns on column drop operations and includes relational checks', () => {
  const impact = DatabaseImpactEngine.analyze({
    table: 'invoices',
    column: 'total_amount',
    operation: 'drop_column',
    repo_path: process.cwd()
  });

  assert.strictEqual(impact.table, 'invoices');
  assert.strictEqual(impact.column, 'total_amount');
  assert.strictEqual(impact.operation, 'drop_column');
  assert.ok(Array.isArray(impact.dependent_foreign_keys));
  assert.ok(Array.isArray(impact.index_blast_radius));
  assert.ok(impact.safe_remediation_steps.length > 0);
});

// 6. BreakingChangeDetector Tests
await runTest('BreakingChangeDetector: detects added required parameter without default value', () => {
  const oldCode = `public function process(string $orderId) {}`;
  const newCode = `public function process(string $orderId, int $tenantId) {}`;

  const report = BreakingChangeDetector.detect({
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, false);
  assert.strictEqual(report.severity, 'CRITICAL');
  assert.ok(report.violations.some(v => v.type === 'REQUIRED_PARAMETER_ADDED'));
});

await runTest('BreakingChangeDetector: passes when optional parameter with default is added', () => {
  const oldCode = `public function process(string $orderId) {}`;
  const newCode = `public function process(string $orderId, ?int $tenantId = null) {}`;

  const report = BreakingChangeDetector.detect({
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, true);
  assert.strictEqual(report.severity, 'SAFE');
  assert.strictEqual(report.breaking_changes_count, 0);
});

await runTest('BreakingChangeDetector: detects new interface method additions', () => {
  const oldCode = `interface PaymentGatewayInterface { public function charge(); }`;
  const newCode = `interface PaymentGatewayInterface { public function charge(); public function refund(); }`;

  const report = BreakingChangeDetector.detect({
    file_path: 'app/Contracts/PaymentGatewayInterface.php',
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, false);
  assert.ok(report.violations.some(v => v.type === 'INTERFACE_METHOD_ADDED'));
});

await runTest('BreakingChangeDetector: detects removed public and protected methods', () => {
  const oldCode = `class InvoiceService { public function calculateTax() {} protected function logAudit() {} }`;
  const newCode = `class InvoiceService { public function generatePdf() {} }`;

  const report = BreakingChangeDetector.detect({
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, false);
  assert.ok(report.violations.some(v => v.type === 'PUBLIC_METHOD_REMOVED' && v.method === 'calculateTax'));
  assert.ok(report.violations.some(v => v.type === 'PROTECTED_METHOD_REMOVED' && v.method === 'logAudit'));
});

await runTest('BreakingChangeDetector: detects method visibility narrowing', () => {
  const oldCode = `class UserService { public function findUser(int $id) {} }`;
  const newCode = `class UserService { protected function findUser(int $id) {} }`;

  const report = BreakingChangeDetector.detect({
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, false);
  assert.ok(report.violations.some(v => v.type === 'METHOD_VISIBILITY_REDUCED'));
});

await runTest('BreakingChangeDetector: detects return type narrowing / mutations', () => {
  const oldCode = `class OrderService { public function getOrder(): ?Order {} }`;
  const newCode = `class OrderService { public function getOrder(): Order {} }`;

  const report = BreakingChangeDetector.detect({
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, false);
  assert.ok(report.violations.some(v => v.type === 'RETURN_TYPE_MUTATED'));
});

await runTest('BreakingChangeDetector: detects newly added abstract method in abstract class', () => {
  const oldCode = `abstract class BasePaymentProvider { abstract public function charge(); }`;
  const newCode = `abstract class BasePaymentProvider { abstract public function charge(); abstract public function refund(); }`;

  const report = BreakingChangeDetector.detect({
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, false);
  assert.ok(report.violations.some(v => v.type === 'ABSTRACT_METHOD_ADDED'));
});

await runTest('BreakingChangeDetector: detects removed public properties', () => {
  const oldCode = `class NotificationJob { public int $userId; public string $status; }`;
  const newCode = `class NotificationJob { public string $status; }`;

  const report = BreakingChangeDetector.detect({
    old_code: oldCode,
    new_code: newCode
  });

  assert.strictEqual(report.is_backward_compatible, false);
  assert.ok(report.violations.some(v => v.type === 'PUBLIC_PROPERTY_REMOVED' && v.property === 'userId'));
});

// 7. TestImpactSelector Tests
await runTest('TestImpactSelector: generates targeted Pest test command', () => {
  const result = TestImpactSelector.select({
    changed_files: ['app/Services/InvoiceService.php', 'app/Models/User.php'],
    framework: 'pest'
  });

  assert.strictEqual(result.framework, 'pest');
  assert.ok(result.execution_command.startsWith('vendor/bin/pest'));
});

// 8. DynamicProjectIntrospector Tests (Zero-Hardcode PSR-4 Discovery & Caching)
await runTest('DynamicProjectIntrospector: introspects project structure with tenant migration awareness and caching', () => {
  const info = DynamicProjectIntrospector.introspect(process.cwd());
  assert.ok(info.project_type);
  assert.ok(Array.isArray(info.autoload_mappings));
  assert.ok(Array.isArray(info.test_directories));
  assert.ok(Array.isArray(info.tenant_migration_directories));

  // Verify in-memory cache hit
  const cachedInfo = DynamicProjectIntrospector.introspect(process.cwd());
  assert.strictEqual(info, cachedInfo);
});

// 9. ASTClassClassifier Tests (Zero-Hardcode AST Classification)
await runTest('ASTClassClassifier: classifies modular Eloquent model without hardcoded folder path', () => {
  const modularModelCode = `
    namespace Modules\\Billing\\Entities;
    use Illuminate\\Database\\Eloquent\\Model;
    use App\\Traits\\BelongsToTenant;
    class Invoice extends Model {
      use BelongsToTenant;
      protected $fillable = ['amount'];
    }
  `;
  const report = ASTClassClassifier.classify(modularModelCode, 'modules/Billing/Entities/Invoice.php');
  assert.strictEqual(report.category, 'model');
  assert.strictEqual(report.is_database_entity, true);
  assert.strictEqual(report.is_tenant_aware, true);
});

await runTest('ASTClassClassifier: classifies Asynchronous Queue Worker job', () => {
  const jobCode = `
    namespace App\\Jobs;
    use Illuminate\\Contracts\\Queue\\ShouldQueue;
    class ProvisionVpsJob implements ShouldQueue {
      public function handle() {}
    }
  `;
  const report = ASTClassClassifier.classify(jobCode);
  assert.strictEqual(report.category, 'job');
  assert.strictEqual(report.is_async_queue, true);
});

// 10. DynamicHazardEvaluator Tests
await runTest('DynamicHazardEvaluator: detects in-flight queue deserialization hazard on ctor param change', () => {
  const oldJob = `class SendInvoiceEmail implements ShouldQueue { public function __construct(int $invoiceId) {} }`;
  const newJob = `class SendInvoiceEmail implements ShouldQueue { public function __construct(int $invoiceId, string $locale) {} }`;

  const hazardReport = DynamicHazardEvaluator.evaluateHazards([
    {
      filePath: 'app/Jobs/SendInvoiceEmail.php',
      oldContent: oldJob,
      newContent: newJob
    }
  ]);

  assert.strictEqual(hazardReport.risk_level, 'CRITICAL');
  assert.ok(hazardReport.hazards.some(h => h.type === 'QUEUE_DESERIALIZATION_BREAK'));
});

await runTest('DynamicHazardEvaluator: detects in-flight queue public property removal hazard', () => {
  const oldJob = `class ProcessPaymentJob implements ShouldQueue { public int $paymentId; public string $status; }`;
  const newJob = `class ProcessPaymentJob implements ShouldQueue { public string $status; }`;

  const hazardReport = DynamicHazardEvaluator.evaluateHazards([
    {
      filePath: 'app/Jobs/ProcessPaymentJob.php',
      oldContent: oldJob,
      newContent: newJob
    }
  ]);

  assert.ok(hazardReport.hazards.some(h => h.type === 'QUEUE_PROPERTY_REMOVED'));
});

await runTest('DynamicHazardEvaluator: detects external HTTP I/O inside DB::transaction', () => {
  const codeWithHazard = `
    DB::transaction(function () {
        $invoice = Invoice::create(['status' => 'pending']);
        $response = Http::post('https://api.bkash.com/checkout', ['id' => $invoice->id]);
    });
  `;

  const hazardReport = DynamicHazardEvaluator.evaluateHazards([
    {
      filePath: 'app/Services/BkashPaymentService.php',
      oldContent: '',
      newContent: codeWithHazard
    }
  ]);

  assert.ok(hazardReport.hazards.some(h => h.type === 'TRANSACTION_HOLD_NETWORK_IO'));
  assert.strictEqual(hazardReport.hazards[0].severity, 'HIGH');
});

await runTest('DynamicHazardEvaluator: detects N+1 query loop hazard', () => {
  const codeWithNPlusOne = `
    foreach ($users as $user) {
        $orders = Order::where('user_id', $user->id)->get();
    }
  `;

  const hazardReport = DynamicHazardEvaluator.evaluateHazards([
    {
      filePath: 'app/Services/ReportingService.php',
      oldContent: '',
      newContent: codeWithNPlusOne
    }
  ]);

  assert.ok(hazardReport.hazards.some(h => h.type === 'N_PLUS_ONE_QUERY_LOOP'));
  assert.strictEqual(hazardReport.hazards[0].severity, 'HIGH');
});

await runTest('DynamicHazardEvaluator: detects unbounded Model::all() memory hazard in job', () => {
  const jobWithOom = `
    class ExportUsersJob implements ShouldQueue {
        public function handle() {
            $users = User::all();
        }
    }
  `;

  const hazardReport = DynamicHazardEvaluator.evaluateHazards([
    {
      filePath: 'app/Jobs/ExportUsersJob.php',
      oldContent: '',
      newContent: jobWithOom
    }
  ]);

  assert.ok(hazardReport.hazards.some(h => h.type === 'UNBOUNDED_MEMORY_CONSUMPTION'));
});

await runTest('DynamicHazardEvaluator: detects multi-tenant isolation breach bypass', () => {
  const leakCode = `
    $invoices = Invoice::withoutGlobalScope('tenant')->get();
  `;

  const hazardReport = DynamicHazardEvaluator.evaluateHazards([
    {
      filePath: 'app/Http/Controllers/ReportController.php',
      oldContent: '',
      newContent: leakCode
    }
  ]);

  assert.ok(hazardReport.hazards.some(h => h.type === 'TENANT_ISOLATION_LEAK'));
  assert.strictEqual(hazardReport.risk_level, 'CRITICAL');
});

// 11. AICognitiveReasoner Tests (Offline Fallback Resilience)
await runTest('AICognitiveReasoner: produces complete deterministic offline verdict when AI disabled', async () => {
  const verdict = await AICognitiveReasoner.reason({
    diffSummary: { files_changed: 2, summary: 'Updated invoice processing' },
    blastRadius: { risk_score: 75.0, severity: 'CRITICAL', direct_callers_count: 5 },
    breakingChanges: [{ type: 'REQUIRED_PARAMETER_ADDED', details: 'Added $currency' }],
    hazards: [{ severity: 'CRITICAL', type: 'QUEUE_DESERIALIZATION_BREAK' }]
  }, {
    enabled: false
  });

  assert.strictEqual(verdict.mode, 'deterministic_symbolic_synthesis');
  assert.strictEqual(verdict.verdict, 'REJECT_BREAKING_CHANGES');
  assert.strictEqual(verdict.gate_status, 'FAIL');
  assert.strictEqual(verdict.deployment_readiness, 'BLOCKED');
  assert.ok(verdict.architectural_impact.recommended_action_items.length > 0);
});

console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
