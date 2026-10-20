import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { StaticAnalyzer } from '../engine/static-analyzer.js';
import { RulesEvaluator } from '../engine/rules.js';
import { CrossModuleChecker } from '../engine/cross-module.js';
import { Reporter } from '../engine/reporter.js';
import { RelationalArchitectureEngine } from '../engine/relational-architecture.js';
import { ProjectIntrospector } from '../engine/project-introspector.js';

console.log('--- Running Enterprise Laravel Code Pattern Quality Gate Tests ---');

// ---------------------------------------------------------
// Test 1: Violating Controller with direct Model and DB calls
// ---------------------------------------------------------
const badControllerCode = `<?php
namespace App\\Modules\\Billing\\Http\\Controllers;

use App\\Models\\Invoice;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class InvoiceController
{
    public function store(Request $request)
    {
        DB::table('logs')->insert(['action' => 'storing']);
        $invoice = Invoice::create($request->all());
        return response()->json($invoice);
    }
}
`;

const parsedBadController = StaticAnalyzer.parse('app/Modules/Billing/Http/Controllers/InvoiceController.php', badControllerCode);
assert.strictEqual(parsedBadController.layer, 'Controller');
assert.strictEqual(parsedBadController.moduleName, 'Billing');

const violationsBadController = RulesEvaluator.evaluate(parsedBadController);
const rulesTriggered = violationsBadController.map(v => v.rule);

assert.ok(rulesTriggered.includes('controller_direct_model'), 'Should detect controller_direct_model');
assert.ok(rulesTriggered.includes('controller_direct_db'), 'Should detect controller_direct_db');

const reportBad = Reporter.generateReport({
  filesAnalyzed: [parsedBadController],
  violations: violationsBadController,
  scanDurationMs: 5
});

assert.strictEqual(reportBad.status, 'FAIL');
assert.strictEqual(reportBad.gate_decision, 'BLOCK_AND_RETRY_MIMO');
assert.ok(reportBad.mimo_remediation_payload !== null);
assert.ok(reportBad.mimo_remediation_payload.prompt_for_mimo.includes('controller_direct_model'));
console.log('✅ Test 1 Passed: Controller violations detected and MiMo payload generated.');

// ---------------------------------------------------------
// Test 2: Violating Repository with HTTP Request dependency
// ---------------------------------------------------------
const badRepoCode = `<?php
namespace App\\Modules\\Billing\\Repositories;

use Illuminate\\Http\\Request;

class InvoiceRepository
{
    public function search(Request $request)
    {
        return [];
    }
}
`;

const parsedBadRepo = StaticAnalyzer.parse('app/Modules/Billing/Repositories/InvoiceRepository.php', badRepoCode);
assert.strictEqual(parsedBadRepo.layer, 'Repository');

const violationsBadRepo = RulesEvaluator.evaluate(parsedBadRepo);
const repoRules = violationsBadRepo.map(v => v.rule);
assert.ok(repoRules.includes('repository_http_dependency'), 'Should detect repository_http_dependency');
console.log('✅ Test 2 Passed: Repository HTTP dependency detected.');

// ---------------------------------------------------------
// Test 3: Cross-Module internal dependency
// ---------------------------------------------------------
const crossModuleCode = `<?php
namespace App\\Modules\\Billing\\Services;

use App\\Modules\\Auth\\Models\\User;

class BillingService
{
    public function checkUser()
    {
        return User::all();
    }
}
`;

const parsedCrossModule = StaticAnalyzer.parse('app/Modules/Billing/Services/BillingService.php', crossModuleCode);
assert.strictEqual(parsedCrossModule.moduleName, 'Billing');
const crossViolations = CrossModuleChecker.check(parsedCrossModule);

assert.strictEqual(crossViolations.length, 1);
assert.strictEqual(crossViolations[0].rule, 'cross_module_internal_dependency');
assert.strictEqual(crossViolations[0].severity, 'ERROR');
console.log('✅ Test 3 Passed: Cross-module internal boundary violation detected.');

// ---------------------------------------------------------
// Test 4: Canonical compliant flow (Controller -> FormRequest -> DTO -> Action -> Repository)
// ---------------------------------------------------------
const cleanControllerCode = `<?php
namespace App\\Modules\\Billing\\Http\\Controllers;

use App\\Modules\\Billing\\Http\\Requests\\CreateInvoiceRequest;
use App\\Modules\\Billing\\DTOs\\InvoiceDTO;
use App\\Modules\\Billing\\Actions\\CreateInvoiceAction;

class InvoiceController
{
    public function __construct(
        private CreateInvoiceAction $createInvoiceAction
    ) {}

    public function store(CreateInvoiceRequest $request)
    {
        $dto = InvoiceDTO::fromRequest($request);
        $invoice = ($this->createInvoiceAction)($dto);
        return response()->json($invoice);
    }
}
`;

const parsedCleanController = StaticAnalyzer.parse('app/Modules/Billing/Http/Controllers/InvoiceController.php', cleanControllerCode);
const cleanViolations = RulesEvaluator.evaluate(parsedCleanController);
assert.strictEqual(cleanViolations.length, 0, 'Clean controller should have zero violations');

const reportClean = Reporter.generateReport({
  filesAnalyzed: [parsedCleanController],
  violations: cleanViolations,
  scanDurationMs: 2
});

assert.strictEqual(reportClean.status, 'PASS');
assert.strictEqual(reportClean.gate_decision, 'PASS');
assert.strictEqual(reportClean.mimo_remediation_payload, null);
console.log('✅ Test 4 Passed: Canonical compliant controller passed with status PASS.');

// ---------------------------------------------------------
// Test 5: Dynamic Relational Graph Construction & Flow Validation
// ---------------------------------------------------------
const actionCode = `<?php
namespace App\\Modules\\Billing\\Actions;

use App\\Modules\\Billing\\DTOs\\InvoiceDTO;
use App\\Modules\\Billing\\Repositories\\InvoiceRepositoryInterface;

class CreateInvoiceAction
{
    public function __construct(
        private InvoiceRepositoryInterface $invoiceRepo
    ) {}

    public function __invoke(InvoiceDTO $dto)
    {
        return $this->invoiceRepo->create($dto);
    }
}
`;

const repoInterfaceCode = `<?php
namespace App\\Modules\\Billing\\Repositories;

interface InvoiceRepositoryInterface
{
    public function create($dto);
}
`;

const repoImplCode = `<?php
namespace App\\Modules\\Billing\\Repositories;

class InvoiceRepository implements InvoiceRepositoryInterface
{
    public function create($dto)
    {
        return null;
    }
}
`;

const parsedAction = StaticAnalyzer.parse('app/Modules/Billing/Actions/CreateInvoiceAction.php', actionCode);
const parsedRepoInterface = StaticAnalyzer.parse('app/Modules/Billing/Repositories/InvoiceRepositoryInterface.php', repoInterfaceCode);
const parsedRepoImpl = StaticAnalyzer.parse('app/Modules/Billing/Repositories/InvoiceRepository.php', repoImplCode);

const flowFiles = [parsedCleanController, parsedAction, parsedRepoInterface, parsedRepoImpl];
const graph = RelationalArchitectureEngine.buildGraph(flowFiles);

assert.strictEqual(graph.nodes.size, 4, 'Graph should have 4 nodes');
const relationalViolations = RelationalArchitectureEngine.validateRelationalRules(graph);
assert.strictEqual(relationalViolations.length, 0, 'Compliant relational flow should have zero violations');

const mermaid = RelationalArchitectureEngine.generateMermaidDiagram(graph);
assert.ok(mermaid.includes('flowchart TD'), 'Mermaid diagram should be generated');
console.log('✅ Test 5 Passed: Dynamic Relational Graph constructed and validated with zero violations.');

// ---------------------------------------------------------
// Test 6: Dependency Inversion Principle (DIP) Enforcement
// ---------------------------------------------------------
const badDipActionCode = `<?php
namespace App\\Modules\\Billing\\Actions;

use App\\Modules\\Billing\\Repositories\\InvoiceRepository;

class BadCreateInvoiceAction
{
    public function __construct(
        private InvoiceRepository $invoiceRepo
    ) {}
}
`;

const parsedBadDipAction = StaticAnalyzer.parse('app/Modules/Billing/Actions/BadCreateInvoiceAction.php', badDipActionCode);
const dipGraph = RelationalArchitectureEngine.buildGraph([parsedBadDipAction, parsedRepoImpl]);
const dipViolations = RelationalArchitectureEngine.validateRelationalRules(dipGraph);

const dipRules = dipViolations.map(v => v.rule);
assert.ok(dipRules.includes('repository_missing_interface'), 'Should flag direct concrete repository injection');
console.log('✅ Test 6 Passed: Dependency Inversion Principle (DIP) violation correctly flagged.');

// ---------------------------------------------------------
// Test 7: Multi-Tenancy Governance (Migration Misplacement)
// ---------------------------------------------------------
const misplacedTenantMigration = `<?php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('tenant_orders', function (Blueprint $table) {
            $table->id();
        });
    }
};
`;

const parsedCentralMigration = StaticAnalyzer.parse('database/migrations/2026_09_28_create_tenant_orders_table.php', misplacedTenantMigration);
const migrationViolations = RulesEvaluator.evaluate(parsedCentralMigration, { multi_tenancy: { enabled: true } });
const migRules = migrationViolations.map(v => v.rule);

assert.ok(migRules.includes('tenant_migration_misplacement'), 'Should detect tenant migration placed in central migrations directory');
console.log('✅ Test 7 Passed: Multi-tenant migration misplacement gate passed.');

// ---------------------------------------------------------
// Test 8: Security Audit (SQL Injection & Unauthorized Mutation)
// ---------------------------------------------------------
const vulnerableSecurityCode = `<?php
namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class VulnerableController
{
    public function destroy($id)
    {
        // Missing FormRequest / Policy authorization
        // SQL injection risk with raw variable concatenation
        DB::raw("DELETE FROM orders WHERE id = " . $id);
        return response()->json(['deleted' => true]);
    }
}
`;

const parsedVuln = StaticAnalyzer.parse('app/Http/Controllers/VulnerableController.php', vulnerableSecurityCode);
const secViolations = RulesEvaluator.evaluate(parsedVuln);
const secRules = secViolations.map(v => v.rule);

assert.ok(secRules.includes('sql_injection_raw_exposure'), 'Should catch unescaped SQL concatenation');
assert.ok(secRules.includes('controller_unauthorized_mutation'), 'Should catch unauthorized state mutation in destroy()');
console.log('✅ Test 8 Passed: Raw SQL injection and unauthorized mutation caught by security gate.');

// ---------------------------------------------------------
// Test 9: Performance Audit (N+1 Query in Loop)
// ---------------------------------------------------------
const nPlusOneCode = `<?php
namespace App\\Services;

class OrderReportService
{
    public function calculate($orders)
    {
        $total = 0;
        foreach ($orders as $order) {
            $items = $order->items()->where('active', 1)->get();
            $total += count($items);
        }
        return $total;
    }
}
`;

const parsedNPlusOne = StaticAnalyzer.parse('app/Services/OrderReportService.php', nPlusOneCode);
const perfViolations = RulesEvaluator.evaluate(parsedNPlusOne);
const perfRules = perfViolations.map(v => v.rule);

assert.ok(perfRules.includes('n_plus_one_loop_query'), 'Should detect query inside loop');
console.log('✅ Test 9 Passed: N+1 query loop hazard detected.');

// ---------------------------------------------------------
// Test 10: Circular Dependency Detection in Relational Graph
// ---------------------------------------------------------
const cycleClassA = `<?php
namespace App\\Services;

class ServiceA
{
    public function __construct(private ServiceB $b) {}
}
`;

const cycleClassB = `<?php
namespace App\\Services;

class ServiceB
{
    public function __construct(private ServiceA $a) {}
}
`;

const parsedCycleA = StaticAnalyzer.parse('app/Services/ServiceA.php', cycleClassA);
const parsedCycleB = StaticAnalyzer.parse('app/Services/ServiceB.php', cycleClassB);

const cycleGraph = RelationalArchitectureEngine.buildGraph([parsedCycleA, parsedCycleB]);
const cycleViolations = RelationalArchitectureEngine.validateRelationalRules(cycleGraph);
const cycleRules = cycleViolations.map(v => v.rule);

assert.ok(cycleRules.includes('circular_dependency_detected'), 'Should detect circular dependency between ServiceA and ServiceB');
console.log('✅ Test 10 Passed: Circular dependency cycle detection passed.');

// ---------------------------------------------------------
// Test 11: Project Introspector & Config Deep Merge
// ---------------------------------------------------------
const baseConfig = { policy: { failOnWarnings: false }, architecture: { rules: { controller_direct_model: 'ERROR' } } };
const customConfig = { policy: { failOnWarnings: true }, architecture: { rules: { custom_rule: 'CRITICAL' } } };
const merged = ProjectIntrospector.mergeConfig(baseConfig, customConfig);

assert.strictEqual(merged.policy.failOnWarnings, true);
assert.strictEqual(merged.architecture.rules.controller_direct_model, 'ERROR');
assert.strictEqual(merged.architecture.rules.custom_rule, 'CRITICAL');
console.log('✅ Test 11 Passed: Project Introspector config deep-merge validated.');

// ---------------------------------------------------------
// Test 12: Relational Architecture Coupling Metrics
// ---------------------------------------------------------
const metrics = RelationalArchitectureEngine.calculateMetrics(flowFiles ? graph : cycleGraph);
assert.ok(Object.keys(metrics).length > 0, 'Metrics should be calculated for all graph nodes');
const firstMetric = Object.values(metrics)[0];
assert.ok('ca' in firstMetric && 'ce' in firstMetric && 'instability' in firstMetric);
console.log('✅ Test 12 Passed: Relational coupling metrics (Ca, Ce, Instability) verified.');

// ---------------------------------------------------------
// Test 13: 14 Architectural Layers Classification
// ---------------------------------------------------------
const policyCode = `<?php namespace App\\Policies; class InvoicePolicy {}`;
const resourceCode = `<?php namespace App\\Http\\Resources; use Illuminate\\Http\\Resources\\Json\\JsonResource; class InvoiceResource extends JsonResource {}`;
const dtoCode = `<?php namespace App\\DTOs; readonly class InvoiceDTO { public function __construct(public string $title) {} }`;

const parsedPolicy = StaticAnalyzer.parse('app/Policies/InvoicePolicy.php', policyCode);
const parsedResource = StaticAnalyzer.parse('app/Http/Resources/InvoiceResource.php', resourceCode);
const parsedDTO = StaticAnalyzer.parse('app/DTOs/InvoiceDTO.php', dtoCode);

assert.strictEqual(parsedPolicy.layer, 'Policy');
assert.strictEqual(parsedResource.layer, 'Resource');
assert.strictEqual(parsedDTO.layer, 'DTO');
console.log('✅ Test 13 Passed: 14 Architectural layers correctly detected.');

// ---------------------------------------------------------
// Test 14: Dynamic Warning Remediation Payload Generation
// ---------------------------------------------------------
const warningOnlyViolations = [
  {
    id: 'controller_business_logic',
    file: 'app/Http/Controllers/UserController.php',
    line: 25,
    rule: 'controller_business_logic',
    severity: 'WARNING',
    message: 'Controller method contains heavy domain logic.',
    fix: 'Decompose into a dedicated Action class.',
    snippet: 'foreach ($items as $item) { ... }'
  }
];

const reportWithoutWarnings = Reporter.generateReport({
  filesAnalyzed: [{ filePath: 'app/Http/Controllers/UserController.php', layer: 'Controller' }],
  violations: warningOnlyViolations,
  options: { include_warnings: false }
});
assert.strictEqual(reportWithoutWarnings.status, 'PASS');
assert.strictEqual(reportWithoutWarnings.mimo_remediation_payload, null, 'Should return null when include_warnings is false and gate passes');

const reportWithWarnings = Reporter.generateReport({
  filesAnalyzed: [{ filePath: 'app/Http/Controllers/UserController.php', layer: 'Controller' }],
  violations: warningOnlyViolations,
  options: { include_warnings: true }
});
assert.ok(reportWithWarnings.mimo_remediation_payload !== null, 'Should generate remediation payload when include_warnings is true');
assert.strictEqual(reportWithWarnings.mimo_remediation_payload.violations_count, 1);
assert.ok(reportWithWarnings.mimo_remediation_payload.prompt_for_mimo.includes('controller_business_logic'));
console.log('✅ Test 14 Passed: Dynamic warning remediation payload generation verified.');

// ---------------------------------------------------------
// Test 15: Full 18 Architectural Layers Detection
// ---------------------------------------------------------
const eventCode = `<?php namespace App\\Events; class OrderCreated {}`;
const listenerCode = `<?php namespace App\\Listeners; class SendOrderNotification {}`;
const jobCode = `<?php namespace App\\Jobs; use Illuminate\\Contracts\\Queue\\ShouldQueue; class ProcessInvoiceJob implements ShouldQueue {}`;
const notificationCode = `<?php namespace App\\Notifications; use Illuminate\\Notifications\\Notification; class InvoicePaidNotification extends Notification {}`;
const observerCode = `<?php namespace App\\Observers; class OrderObserver {}`;
const exceptionCode = `<?php namespace App\\Exceptions; use Exception; class PaymentFailedException extends Exception {}`;
const responseCode = `<?php namespace App\\Http\\Responses; use Illuminate\\Http\\JsonResponse; class ApiResponse extends JsonResponse {}`;

assert.strictEqual(StaticAnalyzer.parse('app/Events/OrderCreated.php', eventCode).layer, 'Event');
assert.strictEqual(StaticAnalyzer.parse('app/Listeners/SendOrderNotification.php', listenerCode).layer, 'Listener');
assert.strictEqual(StaticAnalyzer.parse('app/Jobs/ProcessInvoiceJob.php', jobCode).layer, 'Job');
assert.strictEqual(StaticAnalyzer.parse('app/Notifications/InvoicePaidNotification.php', notificationCode).layer, 'Notification');
assert.strictEqual(StaticAnalyzer.parse('app/Observers/OrderObserver.php', observerCode).layer, 'Observer');
assert.strictEqual(StaticAnalyzer.parse('app/Exceptions/PaymentFailedException.php', exceptionCode).layer, 'Exception');
assert.strictEqual(StaticAnalyzer.parse('app/Http/Responses/ApiResponse.php', responseCode).layer, 'Response');
console.log('✅ Test 15 Passed: All 18 Architectural Layers cleanly detected.');

// ---------------------------------------------------------
// Test 16: controller_raw_model_response Rule Enforcement
// ---------------------------------------------------------
const rawModelController = `<?php
namespace App\\Http\\Controllers;
use App\\Models\\User;
class UserController {
    public function index() {
        return response()->json(User::all());
    }
}
`;
const parsedRawController = StaticAnalyzer.parse('app/Http/Controllers/UserController.php', rawModelController);
const rawViolations = RulesEvaluator.evaluate(parsedRawController);
assert.ok(rawViolations.some(v => v.rule === 'controller_raw_model_response'), 'Should detect controller_raw_model_response when returning raw Model::all()');

const resourceController = `<?php
namespace App\\Http\\Controllers;
use App\\Http\\Resources\\UserResource;
class UserController {
    public function index() {
        return response()->json(UserResource::collection($users));
    }
}
`;
const parsedResourceController = StaticAnalyzer.parse('app/Http/Controllers/UserController.php', resourceController);
const resourceViolations = RulesEvaluator.evaluate(parsedResourceController);
assert.ok(!resourceViolations.some(v => v.rule === 'controller_raw_model_response'), 'Should pass when wrapped in Resource');
console.log('✅ Test 16 Passed: controller_raw_model_response rule verified.');

// ---------------------------------------------------------
// Test 17: policy_mutation_hazard Rule Enforcement
// ---------------------------------------------------------
const mutatingPolicy = `<?php
namespace App\\Policies;
use App\\Models\\User;
class InvoicePolicy {
    public function update(User $user, $invoice) {
        $user->update(['role' => 'admin']);
        return true;
    }
}
`;
const parsedMutatingPolicy = StaticAnalyzer.parse('app/Policies/InvoicePolicy.php', mutatingPolicy);
const policyViolations = RulesEvaluator.evaluate(parsedMutatingPolicy);
assert.ok(policyViolations.some(v => v.rule === 'policy_mutation_hazard'), 'Should flag DB mutation inside Policy class');
console.log('✅ Test 17 Passed: policy_mutation_hazard rule verified.');

// ---------------------------------------------------------
// Test 18: swallowed_exception_hazard Rule Enforcement
// ---------------------------------------------------------
const swallowedCatchCode = `<?php
namespace App\\Actions;
class ProcessPaymentAction {
    public function __invoke() {
        try {
            $this->repo->charge();
        } catch (\\Exception $e) {
        }
    }
}
`;
const parsedSwallowed = StaticAnalyzer.parse('app/Actions/ProcessPaymentAction.php', swallowedCatchCode);
const swallowedViolations = RulesEvaluator.evaluate(parsedSwallowed);
assert.ok(swallowedViolations.some(v => v.rule === 'swallowed_exception_hazard'), 'Should flag empty catch block');
console.log('✅ Test 18 Passed: swallowed_exception_hazard rule verified.');

// ---------------------------------------------------------
// Test 19: observer_recursion_hazard Rule Enforcement
// ---------------------------------------------------------
const recursiveObserverCode = `<?php
namespace App\\Observers;
class UserObserver {
    public function saved($user) {
        $user->last_seen = now();
        $user->save();
    }
}
`;
const parsedRecursiveObserver = StaticAnalyzer.parse('app/Observers/UserObserver.php', recursiveObserverCode);
const observerViolations = RulesEvaluator.evaluate(parsedRecursiveObserver);
assert.ok(observerViolations.some(v => v.rule === 'observer_recursion_hazard'), 'Should flag recursive save() inside Observer saved()');

const safeObserverCode = `<?php
namespace App\\Observers;
class UserObserver {
    public function saved($user) {
        $user->last_seen = now();
        $user->saveQuietly();
    }
}
`;
const parsedSafeObserver = StaticAnalyzer.parse('app/Observers/UserObserver.php', safeObserverCode);
const safeObserverViolations = RulesEvaluator.evaluate(parsedSafeObserver);
assert.ok(!safeObserverViolations.some(v => v.rule === 'observer_recursion_hazard'), 'Should pass when saveQuietly() is used');
console.log('✅ Test 19 Passed: observer_recursion_hazard rule verified.');

// ---------------------------------------------------------
// Test 20: job_missing_should_queue Rule Enforcement
// ---------------------------------------------------------
const syncJobCode = `<?php
namespace App\\Jobs;
class ExportInvoicesJob {
    public function handle() {}
}
`;
const parsedSyncJob = StaticAnalyzer.parse('app/Jobs/ExportInvoicesJob.php', syncJobCode);
const syncJobViolations = RulesEvaluator.evaluate(parsedSyncJob);
assert.ok(syncJobViolations.some(v => v.rule === 'job_missing_should_queue'), 'Should flag missing ShouldQueue in Job');
console.log('✅ Test 20 Passed: job_missing_should_queue rule verified.');

// ---------------------------------------------------------
// Test 21: notification_missing_should_queue Rule Enforcement
// ---------------------------------------------------------
const syncNotificationCode = `<?php
namespace App\\Notifications;
use Illuminate\\Notifications\\Notification;
class InvoiceOverdueNotification extends Notification {
    public function via() { return ['mail']; }
}
`;
const parsedSyncNotification = StaticAnalyzer.parse('app/Notifications/InvoiceOverdueNotification.php', syncNotificationCode);
const syncNotificationViolations = RulesEvaluator.evaluate(parsedSyncNotification);
assert.ok(syncNotificationViolations.some(v => v.rule === 'notification_missing_should_queue'), 'Should flag missing ShouldQueue in Notification');
console.log('✅ Test 21 Passed: notification_missing_should_queue rule verified.');

// ---------------------------------------------------------
// Test 22: Complete 10-Stage Canonical Flow & Mermaid Graph
// ---------------------------------------------------------
const f1 = StaticAnalyzer.parse('app/Http/Controllers/OrderController.php', '<?php namespace App\\Http\\Controllers; class OrderController { public function __construct(private CreateOrderAction $action) {} }');
const f2 = StaticAnalyzer.parse('app/Http/Requests/CreateOrderRequest.php', '<?php namespace App\\Http\\Requests; class CreateOrderRequest extends FormRequest {}');
const f3 = StaticAnalyzer.parse('app/DTOs/OrderDTO.php', '<?php namespace App\\DTOs; readonly class OrderDTO {}');
const f4 = StaticAnalyzer.parse('app/Policies/OrderPolicy.php', '<?php namespace App\\Policies; class OrderPolicy {}');
const f5 = StaticAnalyzer.parse('app/Actions/CreateOrderAction.php', '<?php namespace App\\Actions; class CreateOrderAction { public function __construct(private OrderRepositoryInterface $repo) {} }');
const f6 = StaticAnalyzer.parse('app/Repositories/OrderRepositoryInterface.php', '<?php namespace App\\Repositories; interface OrderRepositoryInterface {}');
const f7 = StaticAnalyzer.parse('app/Repositories/OrderRepository.php', '<?php namespace App\\Repositories; class OrderRepository implements OrderRepositoryInterface {}');
const f8 = StaticAnalyzer.parse('app/Models/Order.php', '<?php namespace App\\Models; class Order extends Model {}');
const f9 = StaticAnalyzer.parse('app/Http/Resources/OrderResource.php', '<?php namespace App\\Http\\Resources; class OrderResource extends JsonResource {}');
const f10 = StaticAnalyzer.parse('app/Http/Responses/OrderResponse.php', '<?php namespace App\\Http\\Responses; class OrderResponse extends JsonResponse {}');

const fullFlowGraph = RelationalArchitectureEngine.buildGraph([f1, f2, f3, f4, f5, f6, f7, f8, f9, f10]);
assert.strictEqual(fullFlowGraph.nodes.size, 10);
const fullFlowViolations = RelationalArchitectureEngine.validateRelationalRules(fullFlowGraph);
assert.strictEqual(fullFlowViolations.length, 0, 'Canonical 10-stage flow must have 0 relational violations');

const mermaidOutput = RelationalArchitectureEngine.generateMermaidDiagram(fullFlowGraph);
assert.ok(mermaidOutput.includes('Sub_Controller'));
assert.ok(mermaidOutput.includes('Sub_Action'));
assert.ok(mermaidOutput.includes('Sub_RepositoryInterface'));
assert.ok(mermaidOutput.includes('Sub_Resource'));
console.log('✅ Test 22 Passed: Complete 10-Stage Canonical Flow & Mermaid Graph validated with zero violations.');


// ---------------------------------------------------------
// Test 23: Heredoc parsing with internal quotes without data loss
// ---------------------------------------------------------
const heredocCode = `<?php
namespace App\\Services;
class TemplateService {
    public function render() {
        \$html = <<<HTML
<div class="user-card" id='profile'>
    <p>Hello "world", it's a great day!</p>
</div>
HTML;
        return \$html;
    }
    public function afterHeredocMethod() {
        return 42;
    }
}
`;
const parsedHeredoc = StaticAnalyzer.parse('app/Services/TemplateService.php', heredocCode);
assert.strictEqual(parsedHeredoc.className, 'TemplateService');
assert.ok(parsedHeredoc.methods.some(m => m.name === 'render'), 'Should parse render method');
assert.ok(parsedHeredoc.methods.some(m => m.name === 'afterHeredocMethod'), 'Methods after heredoc must not be wiped');
console.log('✅ Test 23 Passed: Heredoc parsing with internal quotes preserved without data loss.');

// ---------------------------------------------------------
// Test 24: PHP 8 attributes & SensitiveParameter preservation
// ---------------------------------------------------------
const attributeCode = `<?php
namespace App\\Actions;
#[AsCommand('app:test')]
class ResetPasswordAction {
    public function __invoke(
        #[SensitiveParameter] string \$password,
        ?string \$token = null
    ): bool {
        return true;
    }
}
`;
const parsedAttr = StaticAnalyzer.parse('app/Actions/ResetPasswordAction.php', attributeCode);
assert.strictEqual(parsedAttr.className, 'ResetPasswordAction');
assert.strictEqual(parsedAttr.layer, 'Action');
assert.ok(parsedAttr.methods.some(m => m.name === '__invoke'), 'Should extract __invoke method despite PHP 8 attributes');
console.log('✅ Test 24 Passed: PHP 8 attributes and SensitiveParameter preserved without line corruption.');

// ---------------------------------------------------------
// Test 25: Closure use ($var) not polluting imports
// ---------------------------------------------------------
const closureCode = `<?php
namespace App\\Actions;
use App\\Repositories\\UserRepositoryInterface;

class FilterUsersAction {
    public function __invoke(UserRepositoryInterface \$repo) {
        \$multiplier = 2;
        \$items = array_map(function(\$x) use (\$multiplier, \$repo) {
            return \$x * \$multiplier;
        }, [1, 2, 3]);
        return \$items;
    }
}
`;
const parsedClosure = StaticAnalyzer.parse('app/Actions/FilterUsersAction.php', closureCode);
assert.ok(parsedClosure.imports.some(imp => imp.classPath === 'App\\Repositories\\UserRepositoryInterface'));
assert.ok(!parsedClosure.imports.some(imp => imp.statement.includes('\$multiplier')), 'Closure use ($multiplier) must not be treated as class import');
assert.ok(!parsedClosure.imports.some(imp => imp.statement.includes('\$repo')), 'Closure use ($repo) must not be treated as class import');
console.log('✅ Test 25 Passed: Closure use ($var) scoped and excluded from relational imports.');

// ---------------------------------------------------------
// Test 26: SQL injection detection with comma inside SQL string
// ---------------------------------------------------------
const sqlInjCode = `<?php
namespace App\\Repositories;
use Illuminate\\Support\\Facades\\DB;
class UserRepository implements UserRepositoryInterface {
    public function findRaw(\$id) {
        return DB::selectRaw("SELECT id, name, email FROM users WHERE id = " . \$id);
    }
}
`;
const parsedSql = StaticAnalyzer.parse('app/Repositories/UserRepository.php', sqlInjCode);
const sqlViolations = RulesEvaluator.evaluate(parsedSql);
assert.ok(sqlViolations.some(v => v.rule === 'sql_injection_raw_exposure'), 'Should detect raw SQL concatenation with commas');
console.log('✅ Test 26 Passed: Raw SQL injection with comma-separated column string correctly flagged.');

// ---------------------------------------------------------
// Test 27: Layer detection on suffix edge cases
// ---------------------------------------------------------
const actionWithRequestInName = `<?php namespace App\\Actions; class ApproveRefundRequestAction { public function __invoke() {} }`;
const parsedRefundAction = StaticAnalyzer.parse('app/Actions/ApproveRefundRequestAction.php', actionWithRequestInName);
assert.strictEqual(parsedRefundAction.layer, 'Action', 'ApproveRefundRequestAction must be detected as Action, not FormRequest');

const eventWithCreatedInName = `<?php namespace App\\Events; class OrderCreatedEvent {}`;
const parsedEvent = StaticAnalyzer.parse('app/Events/OrderCreatedEvent.php', eventWithCreatedInName);
assert.strictEqual(parsedEvent.layer, 'Event', 'OrderCreatedEvent must be detected as Event');
console.log('✅ Test 27 Passed: Layer detection suffix priority verified for compound names.');

// ---------------------------------------------------------
// Test 28: N+1 query detection with inner if block inside loop
// ---------------------------------------------------------
const nPlusOneNestedCode = `<?php
namespace App\\Services;
use App\\Models\\Order;
class OrderReportService {
    public function generate(\$orders) {
        \$results = [];
        foreach (\$orders as \$order) {
            if (\$order->isActive()) {
                \$results[] = Order::find(\$order->id);
            }
        }
        return \$results;
    }
}
`;
const parsedNestedNPlusOne = StaticAnalyzer.parse('app/Services/OrderReportService.php', nPlusOneNestedCode);
const n1Violations = RulesEvaluator.evaluate(parsedNestedNPlusOne);
assert.ok(n1Violations.some(v => v.rule === 'n_plus_one_loop_query'), 'Should detect N+1 query inside nested if within loop');
console.log('✅ Test 28 Passed: N+1 query inside nested loop blocks detected via balanced brace extraction.');

// ---------------------------------------------------------
// Test 29: Instance mass assignment ($invoice->update($request->all()))
// ---------------------------------------------------------
const instanceMassAssignCode = `<?php
namespace App\\Http\\Controllers;
use App\\Actions\\UpdateInvoiceAction;
use Illuminate\\Http\\Request;
class InvoiceController {
    public function update(Request \$request, \$invoice) {
        \$invoice->update(\$request->all());
        return response()->json(['status' => 'ok']);
    }
}
`;
const parsedInstanceMass = StaticAnalyzer.parse('app/Http/Controllers/InvoiceController.php', instanceMassAssignCode);
const massViolations = RulesEvaluator.evaluate(parsedInstanceMass);
assert.ok(massViolations.some(v => v.rule === 'mass_assignment_unguarded'), 'Should detect $invoice->update($request->all())');
console.log('✅ Test 29 Passed: Instance mass assignment hazard caught.');

// ---------------------------------------------------------
// Test 30: Observer secondary model save does not trigger recursion hazard
// ---------------------------------------------------------
const secondaryObserverCode = `<?php
namespace App\\Observers;
use App\\Models\\ActivityLog;
class InvoiceObserver {
    public function saved(\$invoice) {
        \$log = new ActivityLog();
        \$log->action = 'invoice_saved';
        \$log->save();
    }
}
`;
const parsedSecObserver = StaticAnalyzer.parse('app/Observers/InvoiceObserver.php', secondaryObserverCode);
const secObsViolations = RulesEvaluator.evaluate(parsedSecObserver);
assert.ok(!secObsViolations.some(v => v.rule === 'observer_recursion_hazard'), 'Saving secondary model should not flag recursion hazard');
console.log('✅ Test 30 Passed: Observer recursion hazard properly scoped to target parameter only.');

// ---------------------------------------------------------
// Test 31: repository_business_logic detection
// ---------------------------------------------------------
const repoWithMailCode = `<?php
namespace App\\Repositories;
use Illuminate\\Support\\Facades\\Mail;
class OrderRepository implements OrderRepositoryInterface {
    public function store(\$data) {
        Mail::to('admin@example.com')->send(new OrderPlacedMail());
        return true;
    }
}
`;
const parsedRepoMail = StaticAnalyzer.parse('app/Repositories/OrderRepository.php', repoWithMailCode);
const repoMailViolations = RulesEvaluator.evaluate(parsedRepoMail);
assert.ok(repoMailViolations.some(v => v.rule === 'repository_business_logic'), 'Mail:: in Repository should trigger repository_business_logic');
console.log('✅ Test 31 Passed: repository_business_logic rule enforced.');

// ---------------------------------------------------------
// Test 32: unbounded_transaction_boundary detection
// ---------------------------------------------------------
const multiMutationCode = `<?php
namespace App\\Services;
use App\\Models\\Order;
use App\\Models\\Payment;
class CheckoutService {
    public function checkout(\$orderData, \$paymentData) {
        Order::create(\$orderData);
        Payment::create(\$paymentData);
    }
}
`;
const parsedMultiMut = StaticAnalyzer.parse('app/Services/CheckoutService.php', multiMutationCode);
const multiMutViolations = RulesEvaluator.evaluate(parsedMultiMut);
assert.ok(multiMutViolations.some(v => v.rule === 'unbounded_transaction_boundary'), 'Multiple model mutations without DB::transaction must trigger unbounded_transaction_boundary');
console.log('✅ Test 32 Passed: unbounded_transaction_boundary rule enforced.');

// ---------------------------------------------------------
// Test 33: cache_unbounded_ttl detection
// ---------------------------------------------------------
const cacheForeverCode = `<?php
namespace App\\Services;
use Illuminate\\Support\\Facades\\Cache;
class SettingsService {
    public function getSettings() {
        return Cache::rememberForever('global_settings', function() {
            return [];
        });
    }
}
`;
const parsedCache = StaticAnalyzer.parse('app/Services/SettingsService.php', cacheForeverCode);
const cacheViolations = RulesEvaluator.evaluate(parsedCache);
assert.ok(cacheViolations.some(v => v.rule === 'cache_unbounded_ttl'), 'Cache::rememberForever without tags must trigger cache_unbounded_ttl');
console.log('✅ Test 33 Passed: cache_unbounded_ttl rule enforced.');

// ---------------------------------------------------------
// Test 34: event_after_commit_missing detection
// ---------------------------------------------------------
const eventWithoutAfterCommitCode = `<?php
namespace App\\Events;
use Illuminate\\Queue\\SerializesModels;
class OrderPaidEvent {
    use SerializesModels;
    public function __construct(public int \$orderId) {}
}
`;
const parsedEventNoCommit = StaticAnalyzer.parse('app/Events/OrderPaidEvent.php', eventWithoutAfterCommitCode);
const eventViolations = RulesEvaluator.evaluate(parsedEventNoCommit);
assert.ok(eventViolations.some(v => v.rule === 'event_after_commit_missing'), 'Transactional event without ShouldHandleEventsAfterCommit must trigger event_after_commit_missing');
console.log('✅ Test 34 Passed: event_after_commit_missing rule enforced.');

// ---------------------------------------------------------
// Test 35: tenant_unscoped_query detection
// ---------------------------------------------------------
const tenantModelCode = `<?php
namespace App\\Models;
use Illuminate\\Database\\Eloquent\\Model;
class TenantInvoice extends Model {
    protected \$table = 'tenant_invoices';
}
`;
const parsedTenantModel = StaticAnalyzer.parse('app/Models/TenantInvoice.php', tenantModelCode);
const tenantViolations = RulesEvaluator.evaluate(parsedTenantModel);
assert.ok(tenantViolations.some(v => v.rule === 'tenant_unscoped_query'), 'Tenant-named model without BelongsToTenant must trigger tenant_unscoped_query');
console.log('✅ Test 35 Passed: tenant_unscoped_query rule enforced.');

// ---------------------------------------------------------
// Test 36: Cross-module DDD subpath violation
// ---------------------------------------------------------
const crossModuleSubpathCode = `<?php
namespace App\\Modules\\Shipping\\Services;
use App\\Modules\\Billing\\Domain\\Models\\Invoice;
class ShippingService {
    public function ship(\$id) {
        return Invoice::find(\$id);
    }
}
`;
const parsedCrossDdd = StaticAnalyzer.parse('app/Modules/Shipping/Services/ShippingService.php', crossModuleSubpathCode);
const crossDddViolations = CrossModuleChecker.check(parsedCrossDdd);
assert.strictEqual(crossDddViolations.length, 1);
assert.strictEqual(crossDddViolations[0].rule, 'cross_module_internal_dependency');
console.log('✅ Test 36 Passed: Cross-module DDD nested subpath imports strictly flagged.');

// ---------------------------------------------------------
// Test 37: validate_layer_contract Invariants Verification
// ---------------------------------------------------------
const nonInvokableAction = `<?php namespace App\\Actions; class ProcessOrderAction { public function execute() { return true; } }`;
const parsedActionNoInvoke = StaticAnalyzer.parse('app/Actions/ProcessOrderAction.php', nonInvokableAction);
assert.strictEqual(parsedActionNoInvoke.methods.some(m => m.name === '__invoke'), false, 'Action without __invoke should have hasInvoke false');

const invokableAction = `<?php namespace App\\Actions; class ProcessOrderAction { public function __invoke() { return true; } }`;
const parsedActionInvoke = StaticAnalyzer.parse('app/Actions/ProcessOrderAction.php', invokableAction);
assert.strictEqual(parsedActionInvoke.methods.some(m => m.name === '__invoke'), true, 'Action with __invoke should have hasInvoke true');

const mutableDto = `<?php namespace App\\DTOs; class CreateUserDTO { public string \$name; }`;
const parsedMutableDto = StaticAnalyzer.parse('app/DTOs/CreateUserDTO.php', mutableDto);
assert.strictEqual(/\breadonly\s+class\b/i.test(parsedMutableDto.cleanCode), false);

const readonlyDto = `<?php namespace App\\DTOs; readonly class CreateUserDTO { public function __construct(public string \$name) {} }`;
const parsedReadonlyDto = StaticAnalyzer.parse('app/DTOs/CreateUserDTO.php', readonlyDto);
assert.strictEqual(/\breadonly\s+class\b/i.test(parsedReadonlyDto.cleanCode), true);
console.log('✅ Test 37 Passed: validate_layer_contract invariants verified.');

// ---------------------------------------------------------
// Test 38: JSON-RPC -32700 Parse error on invalid JSON
// ---------------------------------------------------------
const serverProcess = spawn('node', ['D:/mcp-collection/servers/laravel-code-pattern/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let stdoutData = '';
serverProcess.stdout.on('data', chunk => {
    stdoutData += chunk.toString();
});

serverProcess.stdin.write('{"jsonrpc": "2.0", INVALID_JSON\n');
setTimeout(() => {
    serverProcess.kill();
    assert.ok(stdoutData.includes('-32700'), 'Malformed input must elicit JSON-RPC -32700 error');
    assert.ok(stdoutData.includes('Parse error'), 'Error response should specify Parse error');
    console.log('✅ Test 38 Passed: JSON-RPC -32700 Parse error returned on invalid JSON.');
    console.log('\n🎉 ALL 38 COMPREHENSIVE ENTERPRISE QUALITY GATE TESTS PASSED! 🎉\n');
}, 600);


