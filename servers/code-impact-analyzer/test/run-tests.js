/**
 * @file run-tests.js
 * @description Enterprise Test Suite for @maccpro/code-impact-analyzer.
 * Validates GitDiffAnalyzer, DynamicSymbolResolver, BlastRadiusEngine,
 * DatabaseImpactEngine, BreakingChangeDetector, and TestImpactSelector.
 */

import assert from 'node:assert';
import { GitDiffAnalyzer } from '../engine/git-diff-analyzer.js';
import { DynamicSymbolResolver } from '../engine/dynamic-symbol-resolver.js';
import { BlastRadiusEngine } from '../engine/blast-radius-engine.js';
import { DatabaseImpactEngine } from '../engine/database-impact-engine.js';
import { BreakingChangeDetector } from '../engine/breaking-change-detector.js';
import { TestImpactSelector } from '../engine/test-impact-selector.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

console.log('\n--- Starting code-impact-analyzer Verification Suite ---\n');

// 1. GitDiffAnalyzer Tests
runTest('GitDiffAnalyzer: parses unified diff and extracts changed symbols', () => {
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
});

// 2. DynamicSymbolResolver Tests
runTest('DynamicSymbolResolver: resolves Eloquent magic scopes', () => {
  const resolved = DynamicSymbolResolver.resolve({ symbol: 'scopeActive' });
  assert.strictEqual(resolved.framework_type, 'eloquent_scope');
  assert.ok(resolved.dynamic_call_aliases.includes('active'));
  assert.ok(resolved.dynamic_call_aliases.includes('->active('));
});

runTest('DynamicSymbolResolver: resolves invokable actions', () => {
  const resolved = DynamicSymbolResolver.resolve({
    symbol: '__invoke',
    file_content: 'class ProcessPaymentAction { public function __invoke() {} }'
  });
  assert.strictEqual(resolved.framework_type, 'invokable_action');
});

runTest('DynamicSymbolResolver: identifies interface types', () => {
  const resolved = DynamicSymbolResolver.resolve({
    symbol: 'PaymentGatewayInterface',
    file_content: 'interface PaymentGatewayInterface {}'
  });
  assert.strictEqual(resolved.framework_type, 'interface');
});

// 3. BlastRadiusEngine Tests
runTest('BlastRadiusEngine: risk score and severity calculation', () => {
  const risk = BlastRadiusEngine._calculateRiskScore({
    level1Count: 4,
    level2Count: 6,
    level3Count: 2,
    l1Files: ['app/Http/Controllers/OrderController.php'],
    origins: ['database/migrations/2026_09_26_create_orders_table.php']
  });

  // (4 * 2.0 = 8) + (6 * 1.0 = 6) + (2 * 0.5 = 1) + 6.0 (migration) + 4.0 (controller) = 25.0
  assert.strictEqual(risk.riskScore, 25.0);
  assert.strictEqual(risk.severity, 'HIGH');
  assert.ok(risk.factors.some(f => f.includes('Database Schema Mutation')));
});

runTest('BlastRadiusEngine: generates valid Mermaid diagram', () => {
  const diagram = BlastRadiusEngine._generateMermaidDiagram(
    ['app/Services/BillingService.php'],
    ['app/Http/Controllers/BillingController.php'],
    ['routes/web.php']
  );

  assert.ok(diagram.startsWith('flowchart TD'));
  assert.ok(diagram.includes('BillingService.php'));
  assert.ok(diagram.includes('BillingController.php'));
});

// 4. DatabaseImpactEngine Tests
runTest('DatabaseImpactEngine: warns on column drop operations', () => {
  const impact = DatabaseImpactEngine.analyze({
    table: 'invoices',
    column: 'total_amount',
    operation: 'drop_column',
    repo_path: process.cwd()
  });

  assert.strictEqual(impact.table, 'invoices');
  assert.strictEqual(impact.column, 'total_amount');
  assert.strictEqual(impact.operation, 'drop_column');
  assert.ok(impact.safe_remediation_steps.length > 0);
});

// 5. BreakingChangeDetector Tests
runTest('BreakingChangeDetector: detects added required parameter without default value', () => {
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

runTest('BreakingChangeDetector: passes when optional parameter with default is added', () => {
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

runTest('BreakingChangeDetector: detects new interface method additions', () => {
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

// 6. TestImpactSelector Tests
runTest('TestImpactSelector: generates targeted Pest test command', () => {
  const result = TestImpactSelector.select({
    changed_files: ['app/Services/InvoiceService.php', 'app/Models/User.php'],
    framework: 'pest'
  });

  assert.strictEqual(result.framework, 'pest');
  assert.ok(result.execution_command.startsWith('vendor/bin/pest'));
});

console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
