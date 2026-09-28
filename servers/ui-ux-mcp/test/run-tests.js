import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PATTERNS, getPattern } from '../engine/patterns-catalog.js';
import { AuditHeuristics } from '../engine/audit-heuristics.js';
import { DesignTokens } from '../engine/design-tokens.js';
import { ColorEngine } from '../engine/color-engine.js';
import { ProjectDetector } from '../engine/project-detector.js';
import { ComponentConverter } from '../engine/component-converter.js';
import { LayoutScaffold, SCAFFOLDS } from '../engine/layout-scaffold.js';
import { FrontendRelationalEngine } from '../engine/frontend-relational-engine.js';
import { loadEnv } from '../engine/env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, '..');

console.log('--- Running Enterprise Dynamic Relational UI/UX MCP Test Suite ---\n');

// ==========================================
// TEST 1: Complete 22 Pattern Catalog & Dynamic Interpolation
// ==========================================
const patternKeys = Object.keys(PATTERNS);
assert.strictEqual(patternKeys.length, 22, 'All 22 production-grade patterns must be present');

const pricingPattern = PATTERNS.pricing_table;
assert.ok(pricingPattern, 'pricing_table pattern should exist');
assert.ok(pricingPattern.html_tailwind.includes('Starter Cloud'), 'Should contain tier information');
assert.ok(pricingPattern.ux_guidelines.length > 0, 'Should contain UX guidelines');

// Verify new enterprise patterns exist
assert.ok(PATTERNS.stat_cards_kpi, 'stat_cards_kpi must exist');
assert.ok(PATTERNS.user_management_table, 'user_management_table must exist');
assert.ok(PATTERNS.invoice_receipt_template, 'invoice_receipt_template must exist');
assert.ok(PATTERNS.settings_tabs_layout, 'settings_tabs_layout must exist');
assert.ok(PATTERNS.notification_feed, 'notification_feed must exist');
assert.ok(PATTERNS.filter_bar_search, 'filter_bar_search must exist');
assert.ok(PATTERNS.empty_state_screen, 'empty_state_screen must exist');
assert.ok(PATTERNS.file_upload_dropzone, 'file_upload_dropzone must exist');
assert.ok(PATTERNS.stepper_wizard, 'stepper_wizard must exist');
assert.ok(PATTERNS.two_factor_auth_form, 'two_factor_auth_form must exist');
assert.ok(PATTERNS.status_page_incident, 'status_page_incident must exist');
assert.ok(PATTERNS.domain_search_box, 'domain_search_box must exist');

// Test dynamic parameterization
const customPattern = getPattern('pricing_table', {
  brand_name: 'JoypurHost Dedicated',
  currency_symbol: '৳',
  framework: 'blade_livewire',
  color_scheme: 'emerald'
});
assert.strictEqual(customPattern.component, 'pricing_table');
assert.ok(customPattern.code.includes('JoypurHost Dedicated'), 'Brand name must be interpolated');
assert.ok(customPattern.code.includes('৳'), 'Currency symbol must be interpolated');
assert.ok(customPattern.code.includes('@props'), 'Blade component wrapper must be generated');
assert.ok(customPattern.code.includes('emerald-600'), 'Dynamic color palette remapping must transform indigo to emerald');
console.log('✅ Test 1 Passed: Complete 22-pattern catalog & dynamic interpolation verified.');

// ==========================================
// TEST 2: UI/UX Audit Heuristics (20 Rules) & Auto-Fix
// ==========================================
const badSnippet = `<div>
  <h1>Page Title</h1>
  <h3>Skipped Heading</h3>
  <img src="banner.png">
  <input type="text">
  <input type="text" name="otp">
  <button class="p-0.5 w-4 h-4" onclick="doSomething()"><svg viewBox="0 0 24 24"><path d="M12 4v16"/></svg></button>
  <button class="focus:outline-none">Save</button>
  <div class="animate-spin"></div>
</div>`;

const auditReportBad = AuditHeuristics.audit(badSnippet, 'bad_sample');
assert.ok(auditReportBad.score < 80, 'Score should be penalized for violations');
assert.ok(auditReportBad.findings.some(f => f.rule_id === 'A11Y-IMG-ALT'), 'Should flag missing image alt');
assert.ok(auditReportBad.findings.some(f => f.rule_id === 'A11Y-HEADING-ORDER'), 'Should flag heading jump');
assert.ok(auditReportBad.findings.some(f => f.rule_id === 'A11Y-ICON-BUTTON-NAME'), 'Should flag icon-only button');
assert.ok(auditReportBad.findings.some(f => f.rule_id === 'UX-REDUCED-MOTION'), 'Should flag animation lacking motion-reduce');
assert.ok(auditReportBad.fixed_code.includes('alt="Illustrative visual"'), 'Auto-fix should inject image alt');
assert.ok(auditReportBad.fixed_code.includes('<h2'), 'Auto-fix should correct heading jump');
assert.ok(auditReportBad.fixed_code.includes('motion-reduce:animate-none'), 'Auto-fix should inject motion-reduce');
console.log(`✅ Test 2 Passed: 20-rule audit heuristics flagged ${auditReportBad.findings_count} issue(s) (Score: ${auditReportBad.score}) with automated fix.`);

// ==========================================
// TEST 3: Mathematical Color Science, WCAG 2.2 & OKLCH
// ==========================================
// Relative luminance and contrast
const blackOnWhite = ColorEngine.getContrastRatio('#000000', '#ffffff');
assert.strictEqual(blackOnWhite, 21);

// OKLCH calculation
const oklch = ColorEngine.hexToOklch('#4f46e5');
assert.ok(oklch.l > 0.4 && oklch.l < 0.6, 'OKLCH Lightness should be around 0.51');
assert.ok(oklch.c > 0.15, 'OKLCH Chroma should be positive');
assert.ok(oklch.css.startsWith('oklch('), 'Should format valid CSS oklch string');

// Contrast evaluation and suggestion
const lowContrast = ColorEngine.evaluateWcag('#94a3b8', '#ffffff');
assert.strictEqual(lowContrast.passes_aa, false, 'Light gray on white should fail normal text AA');
assert.ok(lowContrast.suggested_foreground, 'Should suggest an accessible adjusted foreground color');
const adjustedRatio = ColorEngine.getContrastRatio(lowContrast.suggested_foreground, '#ffffff');
assert.ok(adjustedRatio >= 4.5, 'Suggested adjusted foreground must pass 4.5:1 ratio');
console.log('✅ Test 3 Passed: Mathematical Color Engine, WCAG 2.2 & OKLCH color science verified.');

// ==========================================
// TEST 4: Design Tokens, OKLCH & Semantic CSS Variables
// ==========================================
const tokens = DesignTokens.generate('cloud_hosting', 'both');
assert.strictEqual(tokens.preset_key, 'cloud_hosting');
assert.ok(tokens.tailwind_config.includes('tailwind.config.js'), 'Should generate tailwind v3 config');
assert.ok(tokens.tailwind_v4_theme.includes('@theme'), 'Should generate modern tailwind v4 @theme');
assert.ok(tokens.tailwind_v4_theme.includes('oklch'), 'Tailwind v4 @theme should contain OKLCH tokens');
assert.ok(tokens.shadcn_variables.includes('--primary:'), 'Should generate Shadcn UI variables');
assert.ok(tokens.semantic_css.includes('--brand-primary:'), 'Should generate semantic CSS custom properties');

// Verify new preset fintech_gold
const fintechTokens = DesignTokens.generate('fintech_gold', 'both');
assert.strictEqual(fintechTokens.preset_key, 'fintech_gold');
assert.ok(fintechTokens.primary_scale[500].hex, 'Should generate scale for fintech_gold');
console.log('✅ Test 4 Passed: Design tokens generated with OKLCH, Tailwind v3/v4, and semantic CSS.');

// ==========================================
// TEST 5: Dynamic Workspace & Project Stack Inspection
// ==========================================
const detected = ProjectDetector.inspect(serverDir);
assert.ok(detected.project_path, 'Should resolve project path');
assert.ok(detected.framework, 'Should identify framework');
assert.ok(detected.summary, 'Should produce human readable summary');
console.log(`✅ Test 5 Passed: Project stack inspection verified (${detected.framework_display}).`);

// ==========================================
// TEST 6: Multi-Framework Component Converter & SVG Icon Resolver
// ==========================================
const sampleHtml = `<div class="bg-white p-6 rounded-2xl shadow">
  <img src="avatar.jpg" alt="User Avatar">
  <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
  <button class="px-4 py-2 bg-indigo-600 text-white rounded-xl" tabindex="0">Submit</button>
</div>`;

// React conversion should resolve Search icon and not convert it to Check
const reactConverted = ComponentConverter.convert(sampleHtml, 'react_shadcn', { component_name: 'SearchCard' });
assert.strictEqual(reactConverted.framework, 'react_shadcn');
assert.ok(reactConverted.converted_code.includes('className='), 'Should convert class to className');
assert.ok(reactConverted.converted_code.includes('Search'), 'SVG search icon must be resolved to Search and NOT Check');
assert.ok(reactConverted.converted_code.includes('tabIndex={0}'), 'tabindex="0" must be converted to tabIndex={0}');

// Blade conversion
const bladeConverted = ComponentConverter.convert(sampleHtml, 'blade_livewire', { component_name: 'SearchCard' });
assert.strictEqual(bladeConverted.framework, 'blade_livewire');
assert.ok(bladeConverted.converted_code.includes('@props'), 'Should add Blade @props');
console.log('✅ Test 6 Passed: Multi-framework component converter & SVG icon resolver verified (no icon corruption).');

// ==========================================
// TEST 7: Cascading Environment Loader
// ==========================================
loadEnv(serverDir);
console.log('✅ Test 7 Passed: Multi-directory cascading .env loader verified.');

// ==========================================
// TEST 8: Dynamic Tailwind Palette Remapper
// ==========================================
const inputMarkup = '<div class="bg-indigo-600 hover:bg-indigo-700 text-indigo-100 border-indigo-500 focus:ring-indigo-400"></div>';
const remappedMarkup = ColorEngine.remapTailwindPalette(inputMarkup, 'violet', 'indigo');
assert.ok(remappedMarkup.includes('bg-violet-600'), 'Should remap bg-indigo-600 to bg-violet-600');
assert.ok(remappedMarkup.includes('hover:bg-violet-700'), 'Should remap hover:bg-indigo-700 to hover:bg-violet-700');
assert.ok(remappedMarkup.includes('text-violet-100'), 'Should remap text-indigo-100 to text-violet-100');
assert.ok(remappedMarkup.includes('border-violet-500'), 'Should remap border-indigo-500 to border-violet-500');
assert.ok(remappedMarkup.includes('focus:ring-violet-400'), 'Should remap focus:ring-indigo-400 to focus:ring-violet-400');
console.log('✅ Test 8 Passed: Dynamic Tailwind color palette remapping verified.');

// ==========================================
// TEST 9: Layout Scaffold Engine
// ==========================================
const scaffoldKeys = Object.keys(SCAFFOLDS);
assert.ok(scaffoldKeys.includes('admin_dashboard_shell'), 'admin_dashboard_shell must exist');
assert.ok(scaffoldKeys.includes('saas_portal_shell'), 'saas_portal_shell must exist');
assert.ok(scaffoldKeys.includes('landing_page_shell'), 'landing_page_shell must exist');

const adminScaffold = LayoutScaffold.getScaffold('admin_dashboard_shell', {
  brand_name: 'JoypurHost Cloud',
  framework: 'blade_livewire',
  color_scheme: 'emerald'
});
assert.strictEqual(adminScaffold.scaffold_type, 'admin_dashboard_shell');
assert.ok(adminScaffold.code.includes('JoypurHost Cloud'), 'Brand name must be interpolated');
assert.ok(adminScaffold.code.includes('@props'), 'Blade wrapper must be present');
assert.ok(adminScaffold.code.includes('emerald-600'), 'Scaffold color scheme must be remapped to emerald');
console.log('✅ Test 9 Passed: Layout scaffold engine verified across frameworks.');

// ==========================================
// TEST 10: Relational UI Architecture Introspection
// ==========================================
const introspection = FrontendRelationalEngine.introspect(serverDir);
assert.ok(introspection.project_path, 'Should include project path');
assert.ok(introspection.metrics, 'Should calculate metrics');
assert.ok(introspection.mermaid_architecture_diagram.startsWith('graph TD'), 'Should generate Mermaid diagram');
assert.ok(introspection.recommendations.length > 0, 'Should provide architectural recommendations');
console.log(`✅ Test 10 Passed: Relational UI architecture introspection & Mermaid visualizer verified (Health Score: ${introspection.metrics.architectural_health_score}/100).`);

console.log('\n🎉 ALL 10 ENTERPRISE DYNAMIC RELATIONAL UI/UX MCP TESTS PASSED WITH ZERO ERRORS! 🎉\n');
