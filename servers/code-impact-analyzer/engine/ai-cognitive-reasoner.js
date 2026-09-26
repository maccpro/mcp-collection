/**
 * @file ai-cognitive-reasoner.js
 * @description Neuro-Symbolic Cognitive Reasoning Engine for Code Impact Analysis.
 * Bridges deterministic AST & Symbol Graph analysis with LLM cognitive reasoning.
 * Supports OpenAI, MiMo, DeepSeek, Groq, and Ollama with 100% resilient offline fallback.
 */

export class AICognitiveReasoner {
  /**
   * Synthesize impact analysis results into an executive cognitive verdict.
   * @param {Object} analysisContext - Unified context containing blast radius, breaking changes, hazards, tests
   * @param {Object} [options] - Model, provider, temperature, and thinking depth options
   * @returns {Promise<Object>} Executive cognitive verdict
   */
  static async reason(analysisContext = {}, options = {}) {
    const config = this._resolveConfig(options);

    // If AI reasoning is explicitly disabled or no API key is available, execute offline cognitive synthesis
    if (!config.enabled || !config.apiKey) {
      return this._executeDeterministicOfflineSynthesis(analysisContext);
    }

    try {
      return await this._callLLMReasoner(analysisContext, config);
    } catch (err) {
      // Graceful fallback to deterministic offline synthesis on network/API failure
      const offlineResult = this._executeDeterministicOfflineSynthesis(analysisContext);
      offlineResult.ai_fallback_reason = `AI Provider request failed (${err.message}). Defaulted to deterministic symbolic synthesis.`;
      return offlineResult;
    }
  }

  /**
   * Resolve provider, base URL, and credentials dynamically from environment
   */
  static _resolveConfig(options = {}) {
    const enabled = options.enabled ?? (process.env.CIA_AI_ENABLED !== 'false');
    const apiKey = options.apiKey ||
                   process.env.CIA_API_KEY ||
                   process.env.MIMO_API_KEY ||
                   process.env.OPENAI_API_KEY ||
                   process.env.DEEPSEEK_API_KEY ||
                   process.env.GROQ_API_KEY ||
                   null;

    let apiBase = options.apiBase || process.env.CIA_API_BASE;
    let model = options.model || process.env.CIA_MODEL;

    // Detect thinking configuration
    const thinkingEnv = process.env.CIA_THINKING || process.env.MIMO_THINKING || '';
    const thinkingEnabled = options.thinking !== undefined
      ? Boolean(options.thinking)
      : (thinkingEnv.toLowerCase() === 'enabled' || thinkingEnv === 'true');

    // Detect provider
    let provider = options.provider || process.env.CIA_AI_PROVIDER || 'auto';

    if (provider === 'auto') {
      if (apiBase?.includes('xiaomimimo') || model?.includes('mimo') || process.env.MIMO_API_KEY) {
        provider = 'mimo';
        apiBase = apiBase || 'https://token-plan-sgp.xiaomimimo.com/v1';
        model = model || 'mimo-v2.6-pro';
      } else if (process.env.DEEPSEEK_API_KEY) {
        provider = 'deepseek';
        apiBase = apiBase || 'https://api.deepseek.com/v1';
        model = model || 'deepseek-chat';
      } else if (process.env.GROQ_API_KEY) {
        provider = 'groq';
        apiBase = apiBase || 'https://api.groq.com/openai/v1';
        model = model || 'llama-3.3-70b-versatile';
      } else {
        provider = 'openai';
        apiBase = apiBase || 'https://api.openai.com/v1';
        model = model || 'gpt-4o-mini';
      }
    }

    return {
      enabled,
      apiKey,
      apiBase: apiBase?.replace(/\/+$/, '') || 'https://api.openai.com/v1',
      model,
      provider,
      thinking: thinkingEnabled ? 'enabled' : 'disabled',
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? (thinkingEnabled ? 4096 : 1200)
    };
  }

  /**
   * 100% Deterministic Neuro-Symbolic Offline Synthesis (Zero Token Cost, Zero Latency)
   */
  static _executeDeterministicOfflineSynthesis(context = {}) {
    const {
      diffSummary = {},
      blastRadius = {},
      breakingChanges = [],
      hazards = [],
      targetedTests = [],
      databaseImpact = {}
    } = context;

    const riskScore = blastRadius.risk_score ?? 0;
    let verdict = 'APPROVE';
    let gateStatus = 'PASS';
    const actionItems = [];

    // Evaluate Risk Gate
    if (breakingChanges.length > 0 || hazards.some(h => h.severity === 'CRITICAL')) {
      verdict = 'REJECT_BREAKING_CHANGES';
      gateStatus = 'FAIL';
      actionItems.push('Address critical breaking contract changes and runtime hazards before deployment.');
    } else if (riskScore > 65 || hazards.some(h => h.severity === 'HIGH')) {
      verdict = 'REQUIRES_PEER_REVIEW';
      gateStatus = 'WARN';
      actionItems.push('High blast radius or runtime hazards require senior developer approval and end-to-end staging validation.');
    }

    if (targetedTests.length > 0) {
      actionItems.push(`Execute ${targetedTests.length} targeted test suites prioritizing affected caller contracts.`);
    } else if (blastRadius.direct_callers_count > 0) {
      actionItems.push('Zero targeted unit/feature tests discovered for modified symbols. High risk of silent regressions.');
    }

    if (databaseImpact.tables_affected?.length > 0) {
      actionItems.push(`Verify database migrations on tables: ${databaseImpact.tables_affected.join(', ')} with zero-downtime dual-write verification.`);
    }

    return {
      mode: 'deterministic_symbolic_synthesis',
      verdict,
      gate_status: gateStatus,
      risk_score: riskScore,
      summary: `Automated Symbolic Synthesis: Evaluated ${diffSummary.files_changed ?? 0} file(s). Found ${breakingChanges.length} breaking change(s), ${hazards.length} runtime hazard(s), and ${blastRadius.direct_callers_count ?? 0} affected callers across the dependency graph.`,
      architectural_impact: {
        blast_radius_magnitude: riskScore > 60 ? 'HIGH' : (riskScore > 30 ? 'MODERATE' : 'LOW'),
        database_affected_tables: databaseImpact.tables_affected ?? [],
        recommended_action_items: actionItems
      },
      recommended_tests_count: targetedTests.length,
      deployment_readiness: gateStatus === 'PASS' ? 'READY_FOR_CANARY' : (gateStatus === 'WARN' ? 'STAGING_VERIFICATION_REQUIRED' : 'BLOCKED')
    };
  }

  /**
   * LLM Cognitive Reasoner Call via Standard OpenAI-compatible API
   */
  static async _callLLMReasoner(context, config) {
    const prompt = this._buildPrompt(context);

    const payload = {
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an elite Principal Software Architect and Static Impact Intelligence Engine. Analyze AST diffs, symbol graphs, runtime hazards, and database blast radiuses. Output strictly valid JSON matching the specified schema.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    if (config.thinking === 'enabled') {
      payload.thinking = { type: 'enabled' };
    }

    const endpoint = `${config.apiBase}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message || {};
    let content = message.content || '';
    const reasoningTrace = message.reasoning_content || null;

    // Resiliently strip markdown code blocks if returned
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    } else if (content.includes('```')) {
      content = content.replace(/```\s*/g, '').trim();
    }

    const parsed = JSON.parse(content);

    const result = {
      mode: 'ai_cognitive_synthesis',
      provider: config.provider,
      model: config.model,
      thinking_enabled: config.thinking === 'enabled',
      ...parsed
    };

    if (reasoningTrace) {
      result.ai_reasoning_trace = reasoningTrace;
    }

    return result;
  }

  /**
   * Construct concise structural prompt for cognitive reasoning
   */
  static _buildPrompt(context) {
    return `Analyze the following structural impact metadata and return a unified executive JSON verdict.

Diff Summary: ${JSON.stringify(context.diffSummary || {})}
Blast Radius: ${JSON.stringify(context.blastRadius || {})}
Breaking Changes: ${JSON.stringify(context.breakingChanges || [])}
Runtime Hazards: ${JSON.stringify(context.hazards || [])}
Database Impact: ${JSON.stringify(context.databaseImpact || {})}
Targeted Test Count: ${(context.targetedTests || []).length}

Output JSON format:
{
  "verdict": "APPROVE" | "REQUIRES_PEER_REVIEW" | "REJECT_BREAKING_CHANGES",
  "gate_status": "PASS" | "WARN" | "FAIL",
  "risk_score": <number 0-100>,
  "summary": "<concise 2-sentence executive summary>",
  "architectural_impact": {
    "blast_radius_magnitude": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
    "critical_concerns": ["..."],
    "recommended_action_items": ["..."]
  },
  "deployment_readiness": "READY_FOR_CANARY" | "STAGING_VERIFICATION_REQUIRED" | "BLOCKED"
}`;
  }
}

export default AICognitiveReasoner;
