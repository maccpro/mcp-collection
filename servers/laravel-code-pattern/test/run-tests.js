import assert from 'node:assert';
import { StaticAnalyzer } from '../engine/static-analyzer.js';
import { RulesEvaluator } from '../engine/rules.js';
import { CrossModuleChecker } from '../engine/cross-module.js';
import { Reporter } from '../engine/reporter.js';

console.log('--- Running Laravel Code Pattern Quality Gate Tests ---');

// Test 1: Violating Controller with direct Model and DB calls
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

// Test 2: Violating Repository with HTTP Request dependency
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

// Test 3: Cross-Module internal dependency
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

// Test 4: Canonical compliant flow (Controller -> FormRequest -> DTO -> Action -> Repository)
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

console.log('\n🎉 ALL QUALITY GATE TESTS PASSED SUCCESSFULLY! 🎉\n');
