/**
 * Main Agent Reporting Protocol & MiMo Remediation Payload Generator
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
    options = {}
  }) {
    const blockingSeverities = config.policy?.blocking || ['CRITICAL', 'ERROR'];
    const failOnWarnings = options.fail_on_warnings ?? config.policy?.failOnWarnings ?? false;

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

    // Generate Markdown summary for Main Agent & User review
    const executiveSummaryMarkdown = this.buildExecutiveSummaryMarkdown({
      status,
      gateDecision,
      filesCount: filesAnalyzed.length,
      blockingCount: blockingViolations.length,
      warningCount: warningViolations.length,
      scanDurationMs,
      blockingViolations,
      warningViolations
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
      summary: isGatePassed
        ? `Quality Gate PASSED cleanly (${filesAnalyzed.length} file(s) scanned, 0 blocking issues).`
        : `Quality Gate FAILED: ${blockingViolations.length} blocking violation(s) detected.`,
      telemetry: {
        files_analyzed: filesAnalyzed.length,
        scan_duration_ms: scanDurationMs,
        blocking_count: blockingViolations.length,
        warning_count: warningViolations.length,
        layer_distribution: layerDistribution
      },
      executive_summary_markdown: executiveSummaryMarkdown,
      violations: violations.map(v => ({
        id: v.id,
        file: v.file,
        line: v.line,
        rule: v.rule,
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
    filesCount,
    blockingCount,
    warningCount,
    scanDurationMs,
    blockingViolations,
    warningViolations
  }) {
    const icon = status === 'PASS' ? '✅' : '❌';
    let md = `### ${icon} Architecture Quality Gate: **${status}**\n\n`;
    md += `- **Gate Decision:** \`${gateDecision}\`\n`;
    md += `- **Files Checked:** ${filesCount} (Scanned in ${scanDurationMs}ms)\n`;
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
      md += `> [!NOTE]\n> All analyzed files strictly adhere to the Canonical Architecture Flow:\n> \`Controller -> FormRequest -> DTO -> Action -> optional Service -> Repository -> Model -> Database\`\n`;
    }

    return md;
  }

  /**
   * Build ready-to-dispatch prompt for MiMo
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

    prompt += `INSTRUCTIONS FOR MIMO:\n`;
    prompt += `- Do NOT put database queries or Model calls in Controllers.\n`;
    prompt += `- Do NOT inject HTTP Request objects into Repositories.\n`;
    prompt += `- Do NOT bypass module boundaries by importing another module's internal classes.\n`;
    prompt += `- Output only the corrected, production-ready code for the affected classes.\n`;

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
