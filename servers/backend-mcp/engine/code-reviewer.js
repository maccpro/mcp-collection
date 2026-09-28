/**
 * @file code-reviewer.js
 * @description Enterprise Backend Security, Performance, and Architecture Review Engine.
 * 
 * Provides:
 * - 12-Rule Categorized Heuristic Rule Catalog (OWASP Top 10, Multi-Tenancy Leaks, IDOR, Atomic Transactions, Layering)
 * - Dynamic Risk Score & Severity Calculator (0-100)
 * - Multi-Language Heuristics (PHP, TypeScript, Node.js, Python, Go)
 * - AI Semantic Audit with Structured Markdown & Drop-in Remediation Code
 * - Resilient Offline Heuristic Fallback
 * 
 * Zero external dependencies: 100% Node.js standard libraries.
 */

import { ProviderEngine } from './provider-engine.js';

export class CodeReviewer {
  /**
   * Run local static heuristic analysis on code snippet before or alongside AI review
   * @param {string} code Source code snippet
   * @param {string} framework Framework context (e.g. laravel, nestjs, fastapi, express, go)
   * @param {object} [options]
   * @returns {Array<object>} Detected findings with severity and remediation
   */
  static runStaticHeuristics(code, framework = 'generic', options = {}) {
    const findings = [];

    // 1. SQL Injection Checks (Multi-Language: PHP, Node, Python, Go)
    const sqlInjectionPatterns = [
      /(?:DB::raw|whereRaw|havingRaw|orderByRaw|DB::select|DB::statement|\.query|\.execute|\$queryRawUnsafe)\s*\([^)]*(?:\.\s*\$|\$|\$\{[^}]+\}|[`'"][^`'"]*\$)/i,
      /(?:cursor\.execute|session\.execute)\s*\(\s*f["'][^"']*(?:\{[a-zA-Z0-9_]+\})/i,
      /(?:db\.Raw|db\.Exec)\s*\(\s*(?:fmt\.Sprintf|"[^"]*"\s*\+)/i
    ];
    if (sqlInjectionPatterns.some(pattern => pattern.test(code))) {
      findings.push({
        type: 'SECURITY_SQL_INJECTION',
        severity: 'CRITICAL',
        title: 'Potential Raw SQL Injection Detected',
        description: 'Unparameterized dynamic variable or interpolation found inside raw database query. Use parameter bindings instead.',
        cwe: 'CWE-89'
      });
    }

    // 2. Mass Assignment Checks
    if (
      code.includes('create($request->all())') ||
      code.includes('update($request->all())') ||
      code.includes('update($request->input())') ||
      code.includes('insert(req.body)') ||
      code.includes('create(req.body)') ||
      /new\s+[A-Za-z0-9_]+\(\$request->all\(\)\)/.test(code)
    ) {
      findings.push({
        type: 'SECURITY_MASS_ASSIGNMENT',
        severity: 'HIGH',
        title: 'Mass Assignment Vulnerability',
        description: 'Passing entire raw request payload directly to database mutation. Use a validated FormRequest/DTO or explicit field whitelisting.',
        cwe: 'CWE-915'
      });
    }

    // 3. Sensitive Data Exposure Checks
    if (
      /(?:['"]password['"]|['"]secret['"]|['"]api_key['"]|['"]private_key['"])\s*=>\s*\$|password_hash|token_secret|jwt_secret/i.test(code) &&
      /return\s+response|res\.json|return\s+\{.*password/i.test(code)
    ) {
      findings.push({
        type: 'SECURITY_DATA_LEAK',
        severity: 'HIGH',
        title: 'Potential Sensitive Data Leakage in Response',
        description: 'Sensitive credentials, passwords, or secret tokens may be returned directly in API responses. Utilize dedicated API Resources/DTOs with field whitelisting.',
        cwe: 'CWE-200'
      });
    }

    // 4. Multi-Tenant Data Isolation Hazard Check
    if (
      (code.includes('Tenant') || code.includes('tenant_id') || framework === 'laravel_multitenant') &&
      /(?:withoutGlobalScopes|withoutGlobalScope|withoutTenancy|onCentralConnection)/i.test(code)
    ) {
      findings.push({
        type: 'SECURITY_TENANT_DATA_LEAK',
        severity: 'CRITICAL',
        title: 'Tenant Isolation Scope Bypass Hazard',
        description: 'Detected explicit bypassing of tenant scoping (withoutGlobalScopes/withoutTenancy). In multi-tenant systems, bypassing tenant scope risks catastrophic cross-tenant data leaks.',
        cwe: 'CWE-639'
      });
    }

    // 5. Insecure Direct Object Reference (IDOR) Check
    if (
      /(?:User|Account|Tenant|Invoice|Order)::(?:findOrFail|find)\s*\(\s*\$(?:id|request->[a-zA-Z0-9_]+)\s*\)/i.test(code) &&
      !/(?:authorize|can|Gate::allows|Gate::authorize|\$this->can)/i.test(code) &&
      (framework === 'laravel' || code.includes('Controller'))
    ) {
      findings.push({
        type: 'SECURITY_IDOR_HAZARD',
        severity: 'HIGH',
        title: 'Potential Insecure Direct Object Reference (IDOR)',
        description: 'Model queried directly by request ID without explicit authorization or policy check (Gate::authorize or $this->authorize).',
        cwe: 'CWE-639'
      });
    }

    // 6. Hardcoded Secrets Check
    if (
      /(?:api[_-]?key|secret[_-]?key|jwt[_-]?secret|auth[_-]?token)\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(code) &&
      !code.includes('env(') && !code.includes('process.env') && !code.includes('os.environ')
    ) {
      findings.push({
        type: 'SECURITY_HARDCODED_SECRETS',
        severity: 'HIGH',
        title: 'Hardcoded Secret or Token Detected',
        description: 'Detected high-entropy API key or secret token hardcoded in source. Use environment variables (.env) or secret vaults.',
        cwe: 'CWE-798'
      });
    }

    // 7. Controller Business Logic & External HTTP Violation
    if (
      (framework === 'laravel' || code.includes('extends Controller') || code.includes('Controller {')) &&
      (code.includes('DB::transaction') || code.includes('curl_init') || code.includes('Http::post') || code.includes('Http::get') || code.includes('axios.'))
    ) {
      findings.push({
        type: 'ARCHITECTURE_CONTROLLER_BLOAT',
        severity: 'MEDIUM',
        title: 'Business Logic or HTTP Integration in Controller',
        description: 'External HTTP calls or multi-step transaction orchestration detected inside Controller. Delegate to dedicated Service or Action classes.',
        cwe: 'Architectural Layering Violation'
      });
    }

    // 8. Raw Database Queries Inside Controller
    if (
      (framework === 'laravel' || code.includes('extends Controller')) &&
      /(?:DB::select|DB::statement|DB::table|\.query\s*\()\s*\(/i.test(code)
    ) {
      findings.push({
        type: 'ARCHITECTURE_RAW_QUERY_IN_CONTROLLER',
        severity: 'MEDIUM',
        title: 'Direct Database Query Inside Controller',
        description: 'Controller executes direct database queries, violating Clean Layered Architecture. Query execution belongs in Services or Repositories.',
        cwe: 'Architectural Layering Violation'
      });
    }

    // 9. Missing Database Transaction on Multi-Write Operations
    const cleanCodeForTx = code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    const writeOperations = (cleanCodeForTx.match(/(?:->save\s*\([^)]*\)|->update\s*\([^)]*\)|->create\s*\([^)]*\)|->delete\s*\([^)]*\)|\.save\s*\([^)]*\)|\.update\s*\([^)]*\)|\.delete\s*\([^)]*\))/g) || []).length;
    if (writeOperations >= 2 && !cleanCodeForTx.includes('DB::transaction') && !cleanCodeForTx.includes('transaction(') && !cleanCodeForTx.includes('@Transactional')) {
      findings.push({
        type: 'ARCHITECTURE_MISSING_TRANSACTION',
        severity: 'HIGH',
        title: 'Multiple Mutations Missing Atomic Transaction Wrap',
        description: `Found ${writeOperations} sequential database write operations without wrapping in an atomic transaction (DB::transaction). Risk of partial failure and inconsistent state.`,
        cwe: 'CWE-662'
      });
    }

    // 10. N+1 Query Warning in Loops
    if (/(?:foreach|for\s*\([^)]+\)|while\s*\([^)]+\))\s*\{[^}]*(?:->where|->find|->get|\.findOne|\.findMany|\.query)/s.test(code)) {
      findings.push({
        type: 'PERFORMANCE_N_PLUS_ONE',
        severity: 'MEDIUM',
        title: 'Potential N+1 Database Query in Loop',
        description: 'Database query executed inside iteration loop. Utilize eager loading (with()) or batch fetching.',
        cwe: 'Performance Anti-Pattern'
      });
    }

    // 11. Unbounded Query Warning
    if (/(?:[A-Za-z0-9_]+::all\(\)|->get\(\)|\.findAll\(\)|\.findMany\(\))\s*;/i.test(code) && !/(?:take|limit|paginate|chunk|cursor)/i.test(code)) {
      findings.push({
        type: 'PERFORMANCE_UNBOUNDED_QUERY',
        severity: 'LOW',
        title: 'Unbounded Query Without Limit or Pagination',
        description: 'Fetching all records without limit or pagination. On large database tables, this can cause production out-of-memory crashes.',
        cwe: 'CWE-770'
      });
    }

    // 12. Floating Async Promise / Missing Error Handling (Node / TS)
    if (
      (framework === 'nestjs' || framework === 'express' || code.includes('async ') || code.includes('Promise')) &&
      /(?:\.then\s*\([^)]+\)\s*(?!\.catch))/i.test(code)
    ) {
      findings.push({
        type: 'RELIABILITY_UNHANDLED_ASYNC',
        severity: 'MEDIUM',
        title: 'Unhandled Asynchronous Promise Rejection',
        description: 'Promise .then() used without accompanying .catch() or centralized try/catch boundary, risking unhandled promise rejection process crashes.',
        cwe: 'CWE-703'
      });
    }

    return findings;
  }

  /**
   * Calculate risk score (0-100) and severity based on findings
   */
  static calculateRiskScore(findings) {
    let score = 0;
    for (const f of findings) {
      if (f.severity === 'CRITICAL') score += 30;
      else if (f.severity === 'HIGH') score += 18;
      else if (f.severity === 'MEDIUM') score += 10;
      else if (f.severity === 'LOW') score += 4;
    }
    const finalScore = Math.min(100, score);
    let severity = 'CLEAN';
    if (finalScore >= 60) severity = 'CRITICAL';
    else if (finalScore >= 35) severity = 'HIGH';
    else if (finalScore >= 15) severity = 'MEDIUM';
    else if (finalScore > 0) severity = 'LOW';

    return { score: finalScore, severity };
  }

  /**
   * Conduct comprehensive enterprise code review using AI and heuristic audit
   */
  static async review(code, framework = 'generic', rules = null, options = {}) {
    const staticFindings = this.runStaticHeuristics(code, framework, options);
    const { score, severity } = this.calculateRiskScore(staticFindings);

    const systemPrompt = `You are an Enterprise Application Security Auditor and Principal Backend Architect.
Review the provided backend code for:
1. SECURITY: SQL Injection, IDOR, Tenant Data Leaks, Mass Assignment, AuthN/AuthZ flaws, Timing attacks, Sensitive data exposure.
2. ARCHITECTURE: Layered architecture violations (e.g. logic in controllers, bypassing services), missing DTOs/FormRequests, missing DB::transaction wraps.
3. PERFORMANCE: N+1 queries, unindexed lookups, unbounded queries, memory leaks, unclosed connections/transactions.
4. ERROR HANDLING: Uncaught exceptions, unhandled promises, generic error masking.

Framework context: ${framework}.
${rules ? `Special rules to check: ${rules}` : ''}

Static Heuristic Pre-Audit Findings:
${staticFindings.length > 0 ? staticFindings.map(f => `- [${f.severity}] ${f.title}: ${f.description}`).join('\n') : 'No static heuristics triggered.'}

Output format:
Provide your evaluation in a clear, structured Markdown report:
### 🛡️ Security Audit
### 🏛️ Architecture & Layering Assessment
### ⚡ Performance & Database Optimization
### 💡 Actionable Remediation Code (Drop-in replacement)`;

    const userPrompt = `Please perform an in-depth review of the following backend code:\n\n\`\`\`\n${code}\n\`\`\``;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const aiResult = await ProviderEngine.complete(messages, options);
      return {
        static_findings: staticFindings,
        risk_score: score,
        severity,
        review_report: aiResult.content,
        provider: aiResult.provider,
        model: aiResult.model
      };
    } catch {
      // Fallback if AI provider unavailable
      return {
        static_findings: staticFindings,
        risk_score: score,
        severity,
        review_report: `### Static Heuristic Review (Offline Mode)\n\n**Risk Score:** ${score}/100 (${severity})\n\nFound ${staticFindings.length} issue(s) in code:\n` +
          staticFindings.map(f => `- **[${f.severity}] ${f.title}** (${f.cwe || 'Code Standard'}): ${f.description}`).join('\n') +
          `\n\n*Note: AI Provider was unreachable for semantic review.*`,
        provider: 'static_heuristic',
        model: 'none'
      };
    }
  }
}
