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

    const apiKey = process.env.LARAVEL_PATTERN_API_KEY || process.env.MIMO_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        status: 'SKIPPED',
        reason: 'No API key configured for AI reviewer (LARAVEL_PATTERN_API_KEY or MIMO_API_KEY).'
      };
    }

    const apiUrl = process.env.LARAVEL_PATTERN_API_URL || process.env.MIMO_API_URL || 'https://token-plan-sgp.xiaomimimo.com/v1/chat/completions';
    const primaryModel = process.env.LARAVEL_PATTERN_MODEL || aiConfig.model || 'mimo-v2.6-pro';
    const fallbackModel = process.env.LARAVEL_PATTERN_FALLBACK_MODEL || aiConfig.fallback_model || 'deepseek-v4-flash';
    const fallbackApiKey = process.env.LARAVEL_PATTERN_FALLBACK_API_KEY || apiKey;
    const fallbackApiUrl = process.env.LARAVEL_PATTERN_FALLBACK_API_URL || apiUrl;
    const thinkingEnabled = process.env.LARAVEL_PATTERN_THINKING === 'enabled';

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

    if (thinkingEnabled) {
      payload.thinking = { type: 'enabled' };
    }

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
        const fallbackResult = await this.callApi(fallbackApiUrl, fallbackApiKey, payload);
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

  /**
   * Live Clean Architecture Auto-Remediation via Xiaomi MiMo
   */
  static async remediate({ filePath, code, violations = [], prompt = '', config = {} }) {
    const apiKey = process.env.LARAVEL_PATTERN_API_KEY || process.env.MIMO_API_KEY || process.env.BACKEND_API_KEY;
    if (!apiKey) {
      throw new Error('No API key configured for MiMo remediation (LARAVEL_PATTERN_API_KEY or MIMO_API_KEY).');
    }

    const apiUrl = process.env.LARAVEL_PATTERN_API_URL || process.env.MIMO_API_URL || 'https://token-plan-sgp.xiaomimimo.com/v1/chat/completions';
    const primaryModel = process.env.LARAVEL_PATTERN_MODEL || 'mimo-v2.6-pro';
    const fallbackModel = process.env.LARAVEL_PATTERN_FALLBACK_MODEL || 'deepseek-v4-flash';
    const fallbackApiKey = process.env.LARAVEL_PATTERN_FALLBACK_API_KEY || apiKey;
    const fallbackApiUrl = process.env.LARAVEL_PATTERN_FALLBACK_API_URL || apiUrl;

    const systemPrompt = `You are a Principal Software Architect and Laravel Clean Architecture Refactoring Engine.
You receive non-compliant PHP code and its architectural violations.
Your task is to refactor the code according to the canonical flow:
Controller -> FormRequest -> DTO -> Action -> Service (optional) -> RepositoryInterface -> Repository -> Model -> Database.
Enforce Dependency Inversion Principle, single responsibility, and OWASP security standards.
Output strictly the refactored code and an executive explanation in JSON format:
{
  "refactored_classes": [
    {
      "file": "path/to/Class.php",
      "layer": "Controller|Action|DTO|FormRequest|RepositoryInterface|Repository",
      "code": "<?php ... complete code ..."
    }
  ],
  "architecture_summary": "Concise explanation of refactorings made",
  "resolved_violations": ["rule_1", "rule_2"]
}`;

    const userPrompt = `File: ${filePath}\n\nOriginal Code:\n\`\`\`php\n${code}\n\`\`\`\n\nViolations detected:\n${JSON.stringify(violations, null, 2)}\n\nRemediation Instructions:\n${prompt}`;

    const payload = {
      model: primaryModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    };

    if (process.env.LARAVEL_PATTERN_THINKING === 'enabled') {
      payload.thinking = { type: 'enabled' };
    }

    try {
      return await this.callApi(apiUrl, apiKey, payload, 30000);
    } catch (primaryErr) {
      payload.model = fallbackModel;
      return await this.callApi(fallbackApiUrl, fallbackApiKey, payload, 30000);
    }
  }

  static async callApi(url, key, body, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'api-key': key
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      let content = data.choices?.[0]?.message?.content || '{}';

      // Resiliently strip markdown code blocks
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      } else if (content.includes('```')) {
        content = content.replace(/```\s*/g, '').trim();
      }

      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.substring(firstBrace, lastBrace + 1);
      }
      return JSON.parse(content);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
