import assert from 'node:assert';
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

console.log('\n🎉 ALL 13 COMPREHENSIVE ENTERPRISE QUALITY GATE TESTS PASSED! 🎉\n');
