/**
 * @file code-reviewer.js
 * @description Enterprise Backend Security, Performance, and Architecture Review Engine.
 * Analyzes backend source code for OWASP Top 10 vulnerabilities (SQLi, IDOR, Mass Assignment),
 * N+1 query patterns, missing transaction rollbacks, and architectural layer violations.
 */

import { ProviderEngine } from './provider-engine.js';

export class CodeReviewer {
  /**
   * Run local static heuristic analysis on code snippet before or alongside AI review
   */
  static runStaticHeuristics(code, framework = 'generic') {
    const findings = [];

    // 1. SQL Injection Checks
    const rawSqlPattern = /(?:DB::raw|whereRaw|havingRaw|orderByRaw|DB::select|DB::statement|\.query|\.execute)\s*\([^)]*(?:\.\s*\$|\$|\$\{[^}]+\}|[`'"][^`'"]*\$)/i;
    if (rawSqlPattern.test(code)) {
      findings.push({
        type: 'SECURITY_SQL_INJECTION',
        severity: 'CRITICAL',
        title: 'Potential Raw SQL Injection Detected',
        description: 'Unparameterized dynamic variable or interpolation found inside raw database query. Use parameter bindings instead.'
      });
    }

    // 2. Mass Assignment Checks
    if (code.includes('create($request->all())') || code.includes('update($request->all())') || code.includes('insert(req.body)')) {
      findings.push({
        type: 'SECURITY_MASS_ASSIGNMENT',
        severity: 'HIGH',
        title: 'Mass Assignment Vulnerability',
        description: 'Passing entire request payload ($request->all() or req.body) directly to database mutation. Use validated() DTO or whitelist.'
      });
    }

    // 3. Sensitive Data Exposure Checks
    if (/(?:['"]password['"]|['"]secret['"]|['"]api_key['"])\s*=>\s*\$|password_hash|token_secret/i.test(code) && /return\s+response|res\.json/i.test(code)) {
      findings.push({
        type: 'SECURITY_DATA_LEAK',
        severity: 'HIGH',
        title: 'Potential Sensitive Data Leakage in Response',
        description: 'Sensitive credentials or secret tokens may be returned directly in API responses. Utilize dedicated API Resources/DTOs with field whitelisting.'
      });
    }

    // 4. Controller Business Logic Violation (Laravel / MVC)
    if ((framework === 'laravel' || code.includes('extends Controller')) && (code.includes('DB::transaction') || code.includes('curl_init') || code.includes('Http::post') || code.includes('Http::get'))) {
      findings.push({
        type: 'ARCHITECTURE_CONTROLLER_BLOAT',
        severity: 'MEDIUM',
        title: 'Business Logic in Controller',
        description: 'External HTTP calls or transaction orchestration detected inside Controller. Delegate to dedicated Service or Action classes.'
      });
    }

    // 5. N+1 Query Warning
    if (/(?:foreach|for\s*\([^)]+\))\s*\{[^}]*(?:->where|->find|->get|\.findOne|\.findMany|\.query)/s.test(code)) {
      findings.push({
        type: 'PERFORMANCE_N_PLUS_ONE',
        severity: 'MEDIUM',
        title: 'Potential N+1 Database Query in Loop',
        description: 'Database query executed inside iteration loop. Utilize eager loading (with()) or batch fetching.'
      });
    }

    return findings;
  }

  /**
   * Conduct comprehensive enterprise code review using AI and heuristic audit
   */
  static async review(code, framework = 'generic', rules = null, options = {}) {
    const staticFindings = this.runStaticHeuristics(code, framework);

    const systemPrompt = `You are an Enterprise Application Security Auditor and Principal Backend Architect.
Review the provided backend code for:
1. SECURITY: SQL Injection, IDOR, Mass Assignment, AuthN/AuthZ flaws, Timing attacks, Sensitive data exposure.
2. ARCHITECTURE: Layered architecture violations (e.g. logic in controllers), missing DTOs, tight coupling.
3. PERFORMANCE: N+1 queries, unindexed lookups, memory leaks, unclosed connections/transactions.
4. ERROR HANDLING: Uncaught exceptions, unhandled promises, generic error masking.

Framework context: ${framework}.
${rules ? `Special rules to check: ${rules}` : ''}

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
        review_report: aiResult.content,
        provider: aiResult.provider,
        model: aiResult.model
      };
    } catch {
      // Fallback if AI provider unavailable
      return {
        static_findings: staticFindings,
        review_report: `### Static Heuristic Review (Offline Mode)\n\nFound ${staticFindings.length} issue(s) in code:\n` +
          staticFindings.map(f => `- **[${f.severity}] ${f.title}**: ${f.description}`).join('\n') +
          `\n\n*Note: AI Provider was unreachable for semantic review.*`,
        provider: 'static_heuristic',
        model: 'none'
      };
    }
  }
}
