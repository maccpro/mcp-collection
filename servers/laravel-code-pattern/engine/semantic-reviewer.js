/**
 * Semantic-Only AI Reviewer (OpenAI/MiMo Compatible)
 * Runs conditionally ONLY when static analysis is clean and semantic risk is detected.
 */

export class SemanticReviewer {
  /**
   * Conduct conditional semantic AI review
   * @param {object} params 
   * @returns {Promise<object|null>}
   */
  static async review({
    isStaticClean,
    semanticRiskDetected = false,
    minimalSnippet = '',
    filePath = '',
    config = {}
  }) {
    const aiConfig = config.ai_reviewer || {};
    if (!aiConfig.enabled) {
      return null;
    }

    // Guardrail: Never call AI if deterministic static check failed
    if (!isStaticClean) {
      return {
        status: 'SKIPPED',
        reason: 'Static analysis found violations; skipping AI reviewer to preserve tokens.'
      };
    }

    // Guardrail: Trigger only when semantic risk is detected
    if (aiConfig.trigger === 'only_when_static_analysis_is_clean_and_semantic_risk_is_detected' && !semanticRiskDetected) {
      return {
        status: 'SKIPPED',
        reason: 'Static analysis is clean and no semantic risk triggers were detected.'
      };
    }

    const apiKey = process.env.MIMO_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        status: 'SKIPPED',
        reason: 'No API key configured for AI reviewer (MIMO_API_KEY or OPENAI_API_KEY).'
      };
    }

    const apiUrl = process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions';
    const primaryModel = aiConfig.model || 'mimo-v2.6-pro';
    const fallbackModel = aiConfig.fallback_model || 'deepseek-v4-flash';

    const systemPrompt = `You are a strict Laravel Clean Architecture Semantic Reviewer.
Evaluate the provided minimal PHP code snippet for subtle semantic risks:
1. Transaction boundary integrity (missing DB::transaction around multi-table mutations).
2. Authorization bypass or missing Policy check before domain mutation.
3. Mass assignment vulnerabilities or unescaped raw expressions.
4. Business logic leaking across layers.
Output a strict JSON object: { "semantic_risk": boolean, "severity": "WARNING"|"ERROR"|"NONE", "issue": string, "fix": string }`;

    const userPrompt = `File: ${filePath}\n\nMinimal Code Context:\n\`\`\`php\n${minimalSnippet}\n\`\`\``;

    const payload = {
      model: primaryModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    };

    try {
      const result = await this.callApi(apiUrl, apiKey, payload);
      return {
        status: 'COMPLETED',
        model_used: primaryModel,
        findings: result
      };
    } catch (primaryErr) {
      // Attempt fallback model
      try {
        payload.model = fallbackModel;
        const fallbackResult = await this.callApi(apiUrl, apiKey, payload);
        return {
          status: 'COMPLETED',
          model_used: fallbackModel,
          fallback_triggered: true,
          findings: fallbackResult
        };
      } catch (fallbackErr) {
        return {
          status: 'ERROR',
          message: `Semantic AI review failed on both primary (${primaryErr.message}) and fallback (${fallbackErr.message})`
        };
      }
    }
  }

  static async callApi(url, key, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'api-key': key
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  }
}
