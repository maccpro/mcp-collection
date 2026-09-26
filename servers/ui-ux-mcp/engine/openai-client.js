/**
 * @file openai-client.js
 * @description Enterprise Resilient OpenAI-Compatible Completions Client.
 * Compatible with OpenAI, Xiaomi MiMo, DeepSeek, OpenRouter, Groq, and local LLM gateways.
 * Features automatic multi-provider fallback cascades, modern reasoning model parameter
 * adjustments (o1, o3, gpt-5.6, mimo, deepseek), timeout handling, and graceful degradation.
 */

export class OpenAIClient {
  /**
   * Execute chat completion against an OpenAI-compatible endpoint with timeout and parameter resilience
   */
  static async callProvider(apiUrl, apiKey, model, messages, options = {}) {
    const isModernReasoningModel = apiUrl.includes('api.openai.com') ||
      (model && (model.startsWith('o1') || model.startsWith('o3') || model.includes('gpt-5')));
    const tokenLimit = options.max_tokens || 4096;

    const buildPayload = (useMaxCompletionTokens, omitTemperature = false) => {
      const p = {
        model,
        messages,
        stream: false
      };

      if (!omitTemperature && !isModernReasoningModel && options.temperature !== undefined) {
        p.temperature = options.temperature;
      }

      if (useMaxCompletionTokens) {
        p.max_completion_tokens = tokenLimit;
      } else {
        p.max_tokens = tokenLimit;
      }

      // Pass thinking parameter if explicitly enabled or configured in environment
      if (options.thinking_enabled !== undefined) {
        p.thinking = { type: options.thinking_enabled ? 'enabled' : 'disabled' };
      } else if (process.env.UI_UX_THINKING) {
        p.thinking = { type: process.env.UI_UX_THINKING === 'disabled' ? 'disabled' : 'enabled' };
      }

      return p;
    };

    let useMaxCompletionTokens = isModernReasoningModel;
    let payload = buildPayload(useMaxCompletionTokens, isModernReasoningModel);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'api-key': apiKey
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();

      // Parameter resilience auto-retry: max_tokens vs max_completion_tokens
      if (errorText.includes('max_tokens') && errorText.includes('max_completion_tokens')) {
        useMaxCompletionTokens = !useMaxCompletionTokens;
        payload = buildPayload(useMaxCompletionTokens, true);
        response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      } else if (errorText.includes('temperature') || errorText.includes('unsupported value')) {
        // Temperature unsupported (e.g. o1/o3/gpt-5 models)
        payload = buildPayload(useMaxCompletionTokens, true);
        delete payload.temperature;
        response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const retryError = await response.text();
        throw new Error(`OpenAI-compatible API error (${response.status} ${response.statusText}): ${retryError}`);
      }
    }

    const data = await response.json();
    const choice = data.choices && data.choices[0];
    if (!choice || !choice.message) {
      throw new Error(`Invalid response structure from API: ${JSON.stringify(data)}`);
    }

    return choice.message.content || '';
  }

  /**
   * Complete a prompt with automatic multi-provider fallback support
   */
  static async complete(messages, options = {}) {
    // 1. Resolve Primary Provider with multi-key auto-discovery
    const apiKey = process.env.UI_UX_API_KEY ||
      process.env.BACKEND_API_KEY ||
      process.env.MIMO_API_KEY ||
      process.env.OPENAI_API_KEY;

    const apiUrl = process.env.UI_UX_API_URL ||
      process.env.BACKEND_API_URL ||
      process.env.MIMO_API_URL ||
      'https://api.openai.com/v1/chat/completions';

    const model = process.env.UI_UX_MODEL ||
      process.env.BACKEND_MODEL ||
      process.env.MIMO_MODEL ||
      'gpt-5.6-sol';

    if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_api_key_here') && !apiKey.includes('YOUR_API_KEY')) {
      try {
        const content = await this.callProvider(apiUrl, apiKey, model, messages, options);
        return {
          content,
          provider: 'primary',
          model
        };
      } catch (primaryErr) {
        // Continue to fallback provider
      }
    }

    // 2. Resolve Fallback Provider (DeepSeek / Groq / OpenRouter)
    const fallbackKey = process.env.UI_UX_FALLBACK_API_KEY ||
      process.env.BACKEND_FALLBACK_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    if (!fallbackKey || fallbackKey.trim() === '' || fallbackKey.includes('your_fallback_key')) {
      throw new Error('No valid AI API key configured. Please set UI_UX_API_KEY or BACKEND_API_KEY in .env.');
    }

    const fallbackUrl = process.env.UI_UX_FALLBACK_API_URL ||
      process.env.BACKEND_FALLBACK_API_URL ||
      'https://api.deepseek.com/v1/chat/completions';

    const fallbackModel = process.env.UI_UX_FALLBACK_MODEL ||
      process.env.BACKEND_FALLBACK_MODEL ||
      'deepseek-v4-flash';

    const fallbackContent = await this.callProvider(fallbackUrl, fallbackKey, fallbackModel, messages, options);
    return {
      content: fallbackContent,
      provider: 'fallback',
      model: fallbackModel
    };
  }
}
