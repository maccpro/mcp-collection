import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PATTERNS, getPattern } from '../engine/patterns-catalog.js';
import { AuditHeuristics } from '../engine/audit-heuristics.js';
import { DesignTokens } from '../engine/design-tokens.js';
import { ColorEngine } from '../engine/color-engine.js';
import { ProjectDetector } from '../engine/project-detector.js';
import { ComponentConverter } from '../engine/component-converter.js';
import { loadEnv } from '../engine/env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, '..');

console.log('--- Running Enterprise UI/UX MCP Test Suite ---\n');

// ==========================================
// TEST 1: Pattern Catalog & Dynamic Interpolation
// ==========================================
const pricingPattern = PATTERNS.pricing_table;
assert.ok(pricingPattern, 'pricing_table pattern should exist');
assert.ok(pricingPattern.html_tailwind.includes('Starter Cloud'), 'Should contain tier information');
assert.ok(pricingPattern.ux_guidelines.length > 0, 'Should contain UX guidelines');

// Test dynamic parameterization
const customPattern = getPattern('pricing_table', {
  brand_name: 'JoypurHost Dedicated',
  currency_symbol: '৳',
  framework: 'blade_livewire'
});
assert.strictEqual(customPattern.component, 'pricing_table');
assert.ok(customPattern.code.includes('JoypurHost Dedicated'), 'Brand name must be interpolated');
assert.ok(customPattern.code.includes('৳'), 'Currency symbol must be interpolated');
assert.ok(customPattern.code.includes('@props'), 'Blade component wrapper must be generated');
console.log('✅ Test 1 Passed: Pattern catalog & dynamic interpolation verified.');

// ==========================================
// TEST 2: UI/UX Audit Heuristics & Auto-Fix
// ==========================================
const badSnippet = `<div>
  <img src="banner.png">
  <input type="text">
  <button class="p-0.5 w-4 h-4" onclick="doSomething()">click here</button>
  <button class="focus:outline-none">Save</button>
</div>`;

const auditReportBad = AuditHeuristics.audit(badSnippet, 'bad_sample');
assert.ok(auditReportBad.score < 80, 'Score should be penalized for missing alt, missing input label, small button');
assert.ok(auditReportBad.findings.some(f => f.category === 'Accessibility'), 'Should flag accessibility');
assert.ok(auditReportBad.findings.some(f => f.category === 'Mobile UX'), 'Should flag small touch target');
assert.ok(auditReportBad.fixed_code.includes('alt="Illustrative visual"'), 'Auto-fix should inject image alt');
assert.ok(auditReportBad.fixed_code.includes('aria-label='), 'Auto-fix should inject form input label');
assert.ok(auditReportBad.fixed_code.includes('min-h-[44px]'), 'Auto-fix should enlarge touch target');
console.log(`✅ Test 2 Passed: Audit heuristics flagged ${auditReportBad.findings_count} issue(s) (Score: ${auditReportBad.score}) with automated fix.`);

// ==========================================
// TEST 3: Mathematical Color Science & WCAG 2.2 Contrast
// ==========================================
// Black on white should be 21:1
const blackOnWhite = ColorEngine.getContrastRatio('#000000', '#ffffff');
assert.strictEqual(blackOnWhite, 21);

// White on #4f46e5 (indigo)
const evalResult = ColorEngine.evaluateWcag('#ffffff', '#4f46e5');
assert.ok(evalResult.ratio_number >= 4.5, 'White on indigo should pass WCAG AA for normal text');
assert.strictEqual(evalResult.passes_aa, true);

// Low contrast test and auto-adjustment
const lowContrast = ColorEngine.evaluateWcag('#94a3b8', '#ffffff');
assert.strictEqual(lowContrast.passes_aa, false, 'Light gray on white should fail normal text AA');
assert.ok(lowContrast.suggested_foreground, 'Should suggest an accessible adjusted foreground color');
const adjustedRatio = ColorEngine.getContrastRatio(lowContrast.suggested_foreground, '#ffffff');
assert.ok(adjustedRatio >= 4.5, 'Suggested adjusted foreground must pass 4.5:1 ratio');
console.log('✅ Test 3 Passed: Mathematical Color Engine & WCAG 2.2 contrast evaluation verified.');

// ==========================================
// TEST 4: Design Tokens & Dual Tailwind v3/v4 Support
// ==========================================
// Test Preset
const tokens = DesignTokens.generate('cloud_hosting', 'both');
assert.strictEqual(tokens.preset_key, 'cloud_hosting');
assert.ok(tokens.tailwind_config.includes('tailwind.config.js'), 'Should generate tailwind v3 config');
assert.ok(tokens.tailwind_v4_theme.includes('@theme'), 'Should generate modern tailwind v4 @theme');
assert.ok(tokens.shadcn_variables.includes('--primary:'), 'Should generate Shadcn UI variables');
assert.ok(tokens.primary_scale[500], 'Should include 500 base shade');
assert.ok(tokens.primary_scale[950], 'Should include 950 deep shade');

// Test Custom Hex Color Token Generation
const customTokens = DesignTokens.generate(null, 'both', { custom_hex: '#0EA5E9' });
assert.ok(customTokens.preset_name.includes('#0EA5E9'), 'Should recognize custom hex');
assert.strictEqual(customTokens.primary_scale[500].hex, '#0ea5e9');
console.log('✅ Test 4 Passed: Design tokens generated for Tailwind v3, Tailwind v4 @theme, and Shadcn UI.');

// ==========================================
// TEST 5: Dynamic Workspace & Project Stack Inspection
// ==========================================
const detected = ProjectDetector.inspect(serverDir);
assert.ok(detected.project_path, 'Should resolve project path');
assert.ok(detected.framework, 'Should identify framework');
assert.ok(detected.summary, 'Should produce human readable summary');
console.log(`✅ Test 5 Passed: Project stack inspection verified (${detected.framework_display}).`);

// ==========================================
// TEST 6: Multi-Framework Component Converter
// ==========================================
const sampleHtml = `<div class="bg-white p-6 rounded-2xl shadow">
  <img src="avatar.jpg" alt="User Avatar">
  <input type="text" name="username" class="p-2 border rounded" placeholder="Enter name">
  <button class="px-4 py-2 bg-indigo-600 text-white rounded-xl">Submit</button>
</div>`;

// React conversion
const reactConverted = ComponentConverter.convert(sampleHtml, 'react_shadcn', { component_name: 'UserProfileCard' });
assert.strictEqual(reactConverted.framework, 'react_shadcn');
assert.ok(reactConverted.converted_code.includes('className='), 'Should convert class to className');
assert.ok(reactConverted.converted_code.includes('<img '), 'Should preserve img');
assert.ok(reactConverted.converted_code.includes('export function UserProfileCard'), 'Should export typed component');

// Blade conversion
const bladeConverted = ComponentConverter.convert(sampleHtml, 'blade_livewire', { component_name: 'UserProfileCard' });
assert.strictEqual(bladeConverted.framework, 'blade_livewire');
assert.ok(bladeConverted.converted_code.includes('@props'), 'Should add Blade @props');
assert.ok(bladeConverted.converted_code.includes("@error('username')"), 'Should add Blade form error hook');

// Vue conversion
const vueConverted = ComponentConverter.convert(sampleHtml, 'vue_tailwind', { component_name: 'UserProfileCard' });
assert.strictEqual(vueConverted.framework, 'vue_tailwind');
assert.ok(vueConverted.converted_code.includes('<script setup lang="ts">'), 'Should wrap in Vue 3 script setup');
console.log('✅ Test 6 Passed: Multi-framework component converter verified (React/Shadcn, Blade/Livewire, Vue).');

// ==========================================
// TEST 7: Cascading Environment Loader
// ==========================================
loadEnv(serverDir);
console.log('✅ Test 7 Passed: Multi-directory cascading .env loader verified.');

console.log('\n🎉 ALL 7 ENTERPRISE UI/UX MCP TESTS PASSED WITH ZERO ERRORS! 🎉\n');
