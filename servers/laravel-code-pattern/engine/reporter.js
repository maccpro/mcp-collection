/**
 * @file reporter.js
 * @description Main Agent Reporting Protocol & MiMo Remediation Payload Generator.
 * Formats structured analysis output specifically for Antigravity orchestration and MiMo loops.
 */

export class Reporter {
  /**
   * Build complete orchestration report for the Main Agent
   * @param {object} params
   * @returns {object}
   */
  static generateReport({
    filesAnalyzed = [],
    violations = [],
    scanDurationMs = 0,
    config = {},
    options = {},
    relationalGraph = null
  }) {
    const blockingSeverities = config.policy?.blocking || ['CRITICAL', 'ERROR'];
    const failOnWarnings = options.fail_on_warnings ?? config.policy?.failOnWarnings ?? false;

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const blockingViolations = violations.filter(v => blockingSeverities.includes(v.severity));
    const warningViolations = violations.filter(v => !blockingSeverities.includes(v.severity));

    const isGatePassed = blockingViolations.length === 0 && (!failOnWarnings || warningViolations.length === 0);
    const gateDecision = isGatePassed ? 'PASS' : 'BLOCK_AND_RETRY_MIMO';
    const status = isGatePassed ? 'PASS' : 'FAIL';

    // Layer distribution metrics
    const layerDistribution = {};
    for (const f of filesAnalyzed) {
      const layer = f.layer || 'Other';
      layerDistribution[layer] = (layerDistribution[layer] || 0) + 1;
    }

    // Health Score calculation (starts at 100, drops per violation)
    let penalty = (criticalViolations.length * 25) + (blockingViolations.length * 15) + (warningViolations.length * 5);
    const healthScore = Math.max(0, Math.min(100, 100 - penalty));

    // Relational summary
    const relationalSummary = relationalGraph ? {
      nodes_count: relationalGraph.nodes.size,
      edges_count: relationalGraph.edges.length
    } : { nodes_count: filesAnalyzed.length, edges_count: 0 };

    // Generate Markdown summary for Main Agent & User review
    const executiveSummaryMarkdown = this.buildExecutiveSummaryMarkdown({
      status,
      gateDecision,
      healthScore,
      filesCount: filesAnalyzed.length,
      blockingCount: blockingViolations.length,
      warningCount: warningViolations.length,
      criticalCount: criticalViolations.length,
      scanDurationMs,
      blockingViolations,
      warningViolations,
      relationalSummary
    });

    // Generate focused remediation payload for MiMo
    const mimoRemediationPayload = this.buildMiMoRemediationPayload({
      isGatePassed,
      blockingViolations,
      warningViolations,
      failOnWarnings
    });

    return {
      gate_decision: gateDecision,
      status,
      health_score: healthScore,
      summary: isGatePassed
        ? `Quality Gate PASSED cleanly (${filesAnalyzed.length} file(s) scanned, 0 blocking issues, Health: ${healthScore}%).`
        : `Quality Gate FAILED: ${blockingViolations.length} blocking violation(s) detected (Health: ${healthScore}%).`,
      telemetry: {
        files_analyzed: filesAnalyzed.length,
        scan_duration_ms: scanDurationMs,
        health_score: healthScore,
        critical_count: criticalViolations.length,
        blocking_count: blockingViolations.length,
        warning_count: warningViolations.length,
        layer_distribution: layerDistribution,
        relational_summary: relationalSummary
      },
      executive_summary_markdown: executiveSummaryMarkdown,
      violations: violations.map(v => ({
        id: v.id,
        file: v.file,
        line: v.line,
        rule: v.rule,
        category: v.category || 'General',
        severity: v.severity,
        layer: v.layer,
        snippet: v.snippet,
        message: v.message,
        suggested_fix: v.fix
      })),
      mimo_remediation_payload: mimoRemediationPayload
    };
  }

  /**
   * Build clean Markdown executive summary
   */
  static buildExecutiveSummaryMarkdown({
    status,
    gateDecision,
    healthScore,
    filesCount,
    blockingCount,
    warningCount,
    criticalCount,
    scanDurationMs,
    blockingViolations,
    warningViolations,
    relationalSummary
  }) {
    const icon = status === 'PASS' ? '✅' : '❌';
    let md = `### ${icon} Architecture Quality Gate: **${status}** (Health: **${healthScore}%**)\n\n`;
    md += `- **Gate Decision:** \`${gateDecision}\`\n`;
    md += `- **Files Checked:** ${filesCount} (Scanned in ${scanDurationMs}ms)\n`;
    md += `- **Relational Graph:** ${relationalSummary.nodes_count} nodes, ${relationalSummary.edges_count} edges\n`;
    if (criticalCount > 0) {
      md += `- **Critical Security Hazards:** ${criticalCount} 🚨\n`;
    }
    md += `- **Blocking Violations:** ${blockingCount}\n`;
    md += `- **Non-Blocking Warnings:** ${warningCount}\n\n`;

    if (blockingViolations.length > 0) {
      md += `#### 🚨 Blocking Violations (Action Required):\n`;
      for (const v of blockingViolations) {
        md += `- **[${v.severity}]** \`${v.file}:${v.line}\` — **${v.rule}**\n`;
        md += `  - *Issue:* ${v.message}\n`;
        if (v.snippet) {
          md += `  - *Code:* \`${v.snippet}\`\n`;
        }
        md += `  - *Fix:* ${v.fix}\n`;
      }
      md += '\n';
    }

    if (warningViolations.length > 0) {
      md += `#### ⚠️ Non-Blocking Warnings:\n`;
      for (const v of warningViolations.slice(0, 5)) {
        md += `- **[${v.severity}]** \`${v.file}:${v.line}\` — ${v.message}\n`;
      }
      if (warningViolations.length > 5) {
        md += `- *...and ${warningViolations.length - 5} more warnings.*\n`;
      }
      md += '\n';
    }

    if (status === 'PASS') {
      md += `> [!NOTE]\n> All analyzed files strictly adhere to the Canonical Architecture Flow:\n> \`Controller -> FormRequest -> DTO -> Action -> optional Service -> RepositoryInterface -> Repository -> Model -> Database\`\n`;
    }

    return md;
  }

  /**
   * Build ready-to-dispatch high-fidelity prompt for MiMo
   */
  static buildMiMoRemediationPayload({
    isGatePassed,
    blockingViolations,
    warningViolations,
    failOnWarnings
  }) {
    if (isGatePassed) {
      return null;
    }

    const targetViolations = failOnWarnings
      ? [...blockingViolations, ...warningViolations]
      : blockingViolations;

    const targetFilesSet = new Set(targetViolations.map(v => v.file));
    const targetFiles = Array.from(targetFilesSet);

    let prompt = `CRITICAL ARCHITECTURE GATE FAILURE:\n`;
    prompt += `The previous code implementation violates the project's canonical architecture rules.\n`;
    prompt += `Canonical Flow: Controller -> FormRequest -> DTO -> Action -> Service (optional) -> RepositoryInterface -> Repository -> Model -> Database.\n\n`;
    prompt += `Please strictly fix the following architectural violations:\n\n`;

    targetViolations.forEach((v, idx) => {
      prompt += `${idx + 1}. [${v.severity}] File: ${v.file} (Line ${v.line})\n`;
      prompt += `   Rule: ${v.rule}\n`;
      prompt += `   Problem: ${v.message}\n`;
      if (v.snippet) {
        prompt += `   Violating Code: ${v.snippet}\n`;
      }
      prompt += `   Required Refactoring: ${v.fix}\n\n`;
    });

    prompt += `INSTRUCTIONS & ARCHITECTURAL SCAFFOLDING FOR MIMO:\n`;
    prompt += `1. Controller Refactoring:\n`;
    prompt += `   - Remove direct Model queries and raw DB queries from Controller.\n`;
    prompt += `   - Controller must only: (a) validate input via FormRequest, (b) instantiate DTO, (c) call Action, (d) return response/resource.\n`;
    prompt += `2. Action & DTO Scaffolding:\n`;
    prompt += `   - Create single-purpose Action class with public function __invoke(SomeDTO $dto).\n`;
    prompt += `   - Action must inject RepositoryInterface (NOT concrete repository or HTTP request).\n`;
    prompt += `3. Security & SQL Injection Remediation:\n`;
    prompt += `   - For raw SQL (DB::raw, whereRaw), ALWAYS use query bindings: DB::raw("... ?", [$var]).\n`;
    prompt += `   - Never pass raw $request->all() to Model::create() or update(); use $request->validated() or DTO.\n`;
    prompt += `4. Module Isolation & Multi-Tenancy:\n`;
    prompt += `   - Do NOT bypass module boundaries by importing another module's internal classes.\n`;
    prompt += `   - Keep tenant migrations inside database/migrations/tenant/.\n`;
    prompt += `Output only the corrected, production-ready code for the affected classes.\n`;

    return {
      target_files: targetFiles,
      prompt_for_mimo: prompt,
      affected_snippets: targetViolations.map(v => ({
        file: v.file,
        line: v.line,
        rule: v.rule,
        code: v.snippet
      }))
    };
  }
}
