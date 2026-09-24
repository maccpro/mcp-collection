import assert from 'node:assert';
import { PATTERNS } from '../engine/patterns-catalog.js';
import { AuditHeuristics } from '../engine/audit-heuristics.js';
import { DesignTokens } from '../engine/design-tokens.js';
import { loadEnv } from '../engine/env-loader.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, '..');

console.log('--- Running UI/UX Designer MCP Tests ---');

// Test 1: Pattern Catalog Retrieval
const pricingPattern = PATTERNS.pricing_table;
assert.ok(pricingPattern, 'pricing_table pattern should exist');
assert.ok(pricingPattern.html_tailwind.includes('Starter Cloud'), 'Should contain tier information');
assert.ok(pricingPattern.ux_guidelines.length > 0, 'Should contain UX guidelines');
console.log('✅ Test 1 Passed: Pattern catalog retrieved successfully.');

// Test 2: UI/UX Audit Heuristics
const badSnippet = `<div>
  <img src="banner.png">
  <input type="text">
  <button class="p-0.5 w-4 h-4">click here</button>
</div>`;

const auditReportBad = AuditHeuristics.audit(badSnippet, 'bad_sample');
assert.ok(auditReportBad.score < 80, 'Score should be penalized for missing alt, missing input label, small button');
assert.ok(auditReportBad.findings.some(f => f.category === 'Accessibility'), 'Should flag accessibility');
assert.ok(auditReportBad.findings.some(f => f.category === 'Mobile UX'), 'Should flag small touch target');
console.log(`✅ Test 2 Passed: Audit heuristics flagged ${auditReportBad.findings_count} issue(s) with score ${auditReportBad.score}.`);

// Test 3: Design Tokens Generation
const tokens = DesignTokens.generate('cloud_hosting', 'both');
assert.strictEqual(tokens.preset_key, 'cloud_hosting');
assert.ok(tokens.tailwind_config.includes('tailwind.config.js'), 'Should generate tailwind config');
assert.ok(tokens.css_variables.includes(':root'), 'Should generate CSS variables');
console.log('✅ Test 3 Passed: Cloud Hosting design tokens generated.');

// Test 4: Local .env Loading
loadEnv(serverDir);
console.log('✅ Test 4 Passed: .env loaded (API Key configured:', !!process.env.UI_UX_API_KEY, ').');

console.log('\n🎉 ALL UI/UX DESIGNER MCP TESTS PASSED! 🎉\n');
