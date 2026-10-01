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
import { DynamicERPDetector } from '../engine/dynamic-erp-detector.js';
import { ERPInvariantAuditor } from '../engine/erp-invariant-auditor.js';
import { ConcurrencyHazardAuditor } from '../engine/concurrency-hazard-auditor.js';
import { ForensicAuditEngine } from '../engine/forensic-audit-engine.js';
import { ProductionReadinessGate } from '../engine/production-readiness-gate.js';
import { ForensicReportFormatter } from '../engine/forensic-report-formatter.js';

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

// 12. DynamicERPDetector Tests
await runTest('DynamicERPDetector: classifies accounting, inventory, and billing entities dynamically without hardcoded names', () => {
  const ledgerCode = `
    class FinancialTransaction extends Model {
        protected $fillable = ['voucher_no', 'debit', 'credit', 'account_id', 'balance'];
        public function lines() { return $this->hasMany(JournalLine::class); }
    }
  `;
  const inventoryCode = `
    class WarehouseInventory extends Model {
        protected $fillable = ['warehouse_id', 'quantity', 'stock', 'batch_no', 'cogs'];
        public function stockMovements() { return $this->hasMany(StockMovement::class); }
    }
  `;

  const ledgerResult = DynamicERPDetector.classify(ledgerCode, 'app/Models/FinancialTransaction.php');
  assert.ok(ledgerResult.is_erp_entity);
  assert.ok(ledgerResult.roles.includes('accounting_ledger'));
  assert.strictEqual(ledgerResult.has_debit_credit, true);

  const inventoryResult = DynamicERPDetector.classify(inventoryCode, 'app/Models/WarehouseInventory.php');
  assert.ok(inventoryResult.is_erp_entity);
  assert.ok(inventoryResult.roles.includes('inventory_stock'));
});

// 13. ERPInvariantAuditor Tests
await runTest('ERPInvariantAuditor: detects asymmetric journal entry (debit without balancing credit)', () => {
  const asymmetricDiff = `
    + $ledger->create([
    +     'debit' => 500,
    +     'account_id' => 101,
    +     'voucher_no' => 'JV-2026-001'
    + ]);
  `;

  const report = ERPInvariantAuditor.audit([
    {
      filePath: 'app/Services/BillingService.php',
      newContent: asymmetricDiff,
      diff: asymmetricDiff
    }
  ]);

  assert.strictEqual(report.status, 'FAIL');
  assert.ok(report.violations.some(v => v.rule === 'ACCOUNTING_ASYMMETRIC_JOURNAL_ENTRY'));
  assert.strictEqual(report.has_accounting_hazard, true);
});

await runTest('ERPInvariantAuditor: detects direct deletion of financial ledger record', () => {
  const deleteDiff = `
    + JournalEntry::where('voucher_no', $voucherId)->delete();
  `;

  const report = ERPInvariantAuditor.audit([
    {
      filePath: 'app/Services/JournalService.php',
      newContent: deleteDiff,
      diff: deleteDiff
    }
  ]);

  assert.ok(report.violations.some(v => v.rule === 'ACCOUNTING_HARD_DELETE_PROHIBITED'));
});

await runTest('ERPInvariantAuditor: detects unlogged stock decrement violating stock conservation equation', () => {
  const directStockDecrement = `
    + $product->decrement('quantity', 5);
  `;

  const report = ERPInvariantAuditor.audit([
    {
      filePath: 'app/Services/PosService.php',
      newContent: directStockDecrement,
      diff: directStockDecrement
    }
  ]);

  assert.strictEqual(report.status, 'FAIL');
  assert.ok(report.violations.some(v => v.rule === 'INVENTORY_UNLOGGED_STOCK_MUTATION'));
  assert.strictEqual(report.has_inventory_hazard, true);
});

await runTest('ERPInvariantAuditor: detects non-transactional multi-entity writes in ERP entity', () => {
  const multiWrite = `
    class OrderCheckoutService {
        protected $fillable = ['voucher_no', 'balance', 'debit', 'credit'];
        public function checkout() {
            $invoice = Invoice::create(['amount' => 100]);
            $payment = Payment::create(['invoice_id' => $invoice->id]);
            $customer->save();
        }
    }
  `;

  const report = ERPInvariantAuditor.audit([
    {
      filePath: 'app/Services/OrderCheckoutService.php',
      newContent: multiWrite,
      diff: multiWrite
    }
  ]);

  assert.ok(report.violations.some(v => v.rule === 'ATOMICITY_NON_TRANSACTIONAL_MULTI_WRITE'));
});

await runTest('ERPInvariantAuditor: detects swallowed exception in transactional path', () => {
  const swallowedTx = `
    DB::transaction(function() {
        try {
            $invoice->save();
        } catch (\\Exception $e) {
            Log::error($e->getMessage());
            return null;
        }
    });
  `;

  const report = ERPInvariantAuditor.audit([
    {
      filePath: 'app/Services/InvoiceService.php',
      newContent: swallowedTx,
      diff: swallowedTx
    }
  ]);

  assert.ok(report.violations.some(v => v.rule === 'ATOMICITY_SWALLOWED_EXCEPTION_HAZARD'));
});

// 14. ConcurrencyHazardAuditor Tests
await runTest('ConcurrencyHazardAuditor: detects read-modify-write without lockForUpdate', () => {
  const rmwCode = `
    $account = Account::find($id);
    $account->balance -= $amount;
    $account->save();
  `;

  const report = ConcurrencyHazardAuditor.audit([
    {
      filePath: 'app/Services/WalletService.php',
      newContent: rmwCode,
      diff: rmwCode
    }
  ]);

  assert.strictEqual(report.status, 'CRITICAL_HAZARDS');
  assert.ok(report.hazards.some(h => h.type === 'CONCURRENCY_LOST_UPDATE_RACE'));
  assert.strictEqual(report.hazards[0].severity, 'CRITICAL');
});

await runTest('ConcurrencyHazardAuditor: detects missing idempotency guard on webhook/payment callback', () => {
  const webhookCode = `
    class StripeWebhookController extends Controller {
        public function handleWebhook(Request $request) {
            $order = Order::find($request->order_id);
            $order->update(['status' => 'paid']);
            Payment::create(['order_id' => $order->id, 'amount' => 100]);
        }
    }
  `;

  const report = ConcurrencyHazardAuditor.audit([
    {
      filePath: 'app/Http/Controllers/StripeWebhookController.php',
      newContent: webhookCode,
      diff: webhookCode
    }
  ]);

  assert.ok(report.hazards.some(h => h.type === 'IDEMPOTENCY_MISSING_GUARD'));
});

await runTest('ConcurrencyHazardAuditor: detects TOCTOU race condition window', () => {
  const toctouCode = `
    if ($product->stock >= $requestedQty) {
        $product->decrement('stock', $requestedQty);
    }
  `;

  const report = ConcurrencyHazardAuditor.audit([
    {
      filePath: 'app/Services/OrderService.php',
      newContent: toctouCode,
      diff: toctouCode
    }
  ]);

  assert.ok(report.hazards.some(h => h.type === 'CONCURRENCY_TOCTOU_RACE'));
});

// 15. ForensicAuditEngine & Historical Compatibility Tests
await runTest('ForensicAuditEngine: reconstructs before-vs-after behavioral drift and verifies root-cause', () => {
  const driftDiff = `
    diff --git a/app/Services/InvoiceService.php b/app/Services/InvoiceService.php
    @@ -10,3 +10,6 @@
    + if (!$customer) {
    +     return null;
    + }
  `;

  const forensic = ForensicAuditEngine.auditBugFix({
    modifiedFiles: [
      {
        filePath: 'app/Services/InvoiceService.php',
        diff: driftDiff,
        newContent: 'if (!$customer) return null;'
      }
    ]
  });

  assert.strictEqual(forensic.root_cause_verification.category, 'C. WORKAROUND');
  assert.ok(forensic.behavioral_drift.length > 0);
  assert.ok(forensic.all_findings.length >= 0);
});

await runTest('ForensicAuditEngine: flags dynamic accessor calculation on historical transactional entities', () => {
  const accessorCode = `
    class HistoricalInvoice extends Model {
        public function getTaxAmountAttribute() {
            return $this->subtotal * 0.15;
        }
    }
  `;

  const forensic = ForensicAuditEngine.auditBugFix({
    modifiedFiles: [
      {
        filePath: 'app/Models/HistoricalInvoice.php',
        newContent: accessorCode,
        diff: '+ public function getTaxAmountAttribute()'
      }
    ]
  });

  assert.strictEqual(forensic.historical_compatibility.has_historical_risks, true);
  assert.ok(forensic.historical_compatibility.historical_risks.some(r => r.type === 'RETROSPECTIVE_CALCULATION_MUTATION'));
});

// 16. ProductionReadinessGate Tests
await runTest('ProductionReadinessGate: evaluates Gates A through J with evidence collection', () => {
  const cleanForensic = {
    root_cause_verification: { category: 'A. ROOT_CAUSE' },
    accounting_integrity: [],
    inventory_integrity: [],
    atomicity_integrity: [],
    concurrency_integrity: [],
    historical_compatibility: { has_historical_risks: false, reconciliation_required: false },
    confirmed_issues: []
  };

  const gateResult = ProductionReadinessGate.evaluate({
    forensicResult: cleanForensic,
    hazardReport: { critical_hazards: 0, hazards: [] },
    breakingReport: { breaking_changes: [] }
  });

  assert.strictEqual(gateResult.overall_decision, 'PASS');
  assert.strictEqual(gateResult.is_production_ready, true);
  assert.strictEqual(gateResult.total_gates, 10);
  assert.strictEqual(gateResult.failed_gates_count, 0);
  assert.strictEqual(gateResult.gates.gate_c_accounting_integrity.status, 'PASS');
  assert.strictEqual(gateResult.gates.gate_d_inventory_integrity.status, 'PASS');
});

await runTest('ProductionReadinessGate: blocks production gate when critical ERP violations exist', () => {
  const blockedForensic = {
    root_cause_verification: { category: 'A. ROOT_CAUSE' },
    accounting_integrity: [
      { title: 'Asymmetric Journal Entry', classification: 'CONFIRMED ISSUE', description: 'Debit without Credit' }
    ],
    inventory_integrity: [],
    atomicity_integrity: [],
    concurrency_integrity: [],
    historical_compatibility: { has_historical_risks: false },
    confirmed_issues: [{ title: 'Asymmetric Journal Entry' }]
  };

  const gateResult = ProductionReadinessGate.evaluate({
    forensicResult: blockedForensic,
    hazardReport: { critical_hazards: 0, hazards: [] },
    breakingReport: { breaking_changes: [] }
  });

  assert.strictEqual(gateResult.overall_decision, 'BLOCKED_FAIL');
  assert.strictEqual(gateResult.is_production_ready, false);
  assert.strictEqual(gateResult.gates.gate_c_accounting_integrity.status, 'FAIL');
});

// 17. ForensicReportFormatter Tests (29-Section Report)
await runTest('ForensicReportFormatter: generates complete 29-section Markdown report with all required headers', () => {
  const sampleForensic = {
    audit_timestamp: '2026-10-01T21:40:00.000Z',
    bug_reconstruction: {
      original_symptom: 'POS checkout balance drift',
      root_cause: 'Missing row lock on inventory decrement',
      trigger_condition: 'Simultaneous POS checkout',
      affected_workflows: ['app/Services/PosService.php'],
      confidence: 'High'
    },
    root_cause_verification: { category: 'A. ROOT_CAUSE', notes: ['Fixed root race condition.'] },
    behavioral_drift: [{ scenario: 'POS Locking', before: 'Unlocked', after: 'Locked', impact: 'Safe under concurrency' }],
    accounting_integrity: [],
    inventory_integrity: [],
    atomicity_integrity: [],
    concurrency_integrity: [],
    historical_compatibility: { has_historical_risks: false, reconciliation_items: [] },
    confirmed_issues: [],
    probable_issues: [],
    potential_risks: [],
    total_findings: 0
  };

  const sampleGates = {
    overall_decision: 'PASS',
    is_production_ready: true,
    passed_gates_count: 10,
    gates: {
      gate_a_functional_correctness: { status: 'PASS', evidence: 'Clean execution.' },
      gate_b_regression_safety: { status: 'PASS', evidence: 'Zero signature mutations.' },
      gate_c_accounting_integrity: { status: 'PASS', evidence: 'Debit = Credit preserved.' },
      gate_d_inventory_integrity: { status: 'PASS', evidence: 'Stock conservation verified.' },
      gate_e_data_integrity: { status: 'PASS', evidence: 'FKs intact.' },
      gate_f_tenant_isolation: { status: 'PASS', evidence: 'Tenant scoping preserved.' },
      gate_g_security: { status: 'PASS', evidence: 'Auth verified.' },
      gate_h_concurrency: { status: 'PASS', evidence: 'lockForUpdate present.' },
      gate_i_performance: { status: 'PASS', evidence: 'No N+1.' },
      gate_j_historical_compatibility: { status: 'PASS', evidence: 'Compatible.' }
    }
  };

  const md = ForensicReportFormatter.formatMarkdown({
    forensicResult: sampleForensic,
    productionGates: sampleGates,
    blastRadius: { risk_score: 10, severity: 'LOW', mermaid_diagram: 'graph TD; A-->B' },
    breakingChanges: [],
    hazards: [],
    targetedTests: ['tests/Feature/PosCheckoutTest.php']
  });

  // Verify all 29 Section Headers exist
  assert.ok(md.includes('# ERP Bug-Fix Forensic Audit'));
  assert.ok(md.includes('## 1. Executive Summary'));
  assert.ok(md.includes('## 2. Original Bug Analysis'));
  assert.ok(md.includes('## 3. Root Cause'));
  assert.ok(md.includes('## 4. Implemented Fix Analysis'));
  assert.ok(md.includes('## 5. Before vs After Behavior'));
  assert.ok(md.includes('## 6. Change Blast Radius'));
  assert.ok(md.includes('## 7. Dependency Graph'));
  assert.ok(md.includes('## 8. Confirmed Issues'));
  assert.ok(md.includes('## 9. Probable Issues'));
  assert.ok(md.includes('## 10. Potential Risks'));
  assert.ok(md.includes('## 11. Accounting Integrity Analysis'));
  assert.ok(md.includes('## 12. Inventory Integrity Analysis'));
  assert.ok(md.includes('## 13. Transaction & Atomicity Analysis'));
  assert.ok(md.includes('## 14. Concurrency Analysis'));
  assert.ok(md.includes('## 15. Idempotency Analysis'));
  assert.ok(md.includes('## 16. Historical Data Compatibility'));
  assert.ok(md.includes('## 17. Database Integrity'));
  assert.ok(md.includes('## 18. Multi-Tenant Security'));
  assert.ok(md.includes('## 19. Authorization & Security'));
  assert.ok(md.includes('## 20. API Compatibility'));
  assert.ok(md.includes('## 21. Event / Queue / Observer Impact'));
  assert.ok(md.includes('## 22. Reporting Impact'));
  assert.ok(md.includes('## 23. Performance Impact'));
  assert.ok(md.includes('## 24. Edge-Case Analysis'));
  assert.ok(md.includes('## 25. Reconciliation Requirements'));
  assert.ok(md.includes('## 26. Regression Test Matrix'));
  assert.ok(md.includes('## 27. Production Readiness Gates'));
  assert.ok(md.includes('## 28. Required Actions'));
  assert.ok(md.includes('### Must Fix'));
  assert.ok(md.includes('### Must Test'));
  assert.ok(md.includes('### Must Reconcile'));
  assert.ok(md.includes('### Should Improve'));
  assert.ok(md.includes('### Optional'));
  assert.ok(md.includes('## 29. Final Evidence Summary'));
});

console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
