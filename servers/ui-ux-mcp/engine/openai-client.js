/**
 * Resilient OpenAI-Compatible Completions Client
 * Compatible with OpenAI, Xiaomi MiMo, DeepSeek, OpenRouter, Groq, and local gateways.
 */

export class OpenAIClient {
  /**
   * Execute chat completion against an OpenAI-compatible endpoint
   */
  static async callProvider(apiUrl, apiKey, model, messages, options = {}) {
    const isModernOpenAI = apiUrl.includes('api.openai.com') || (model && (model.startsWith('o1') || model.startsWith('o3') || model.includes('gpt-5')));
    const tokenLimit = options.max_tokens || 4096;

    const buildPayload = (useMaxCompletionTokens, omitTemperature = false) => {
      const p = {
        model,
        messages,
        stream: false
      };
      if (!omitTemperature && !isModernOpenAI && options.temperature !== undefined) {
        p.temperature = options.temperature;
      }
      if (useMaxCompletionTokens) {
        p.max_completion_tokens = tokenLimit;
      } else {
        p.max_tokens = tokenLimit;
      }
      return p;
    };

    let useMaxCompletionTokens = isModernOpenAI;
    let payload = buildPayload(useMaxCompletionTokens, isModernOpenAI);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'api-key': apiKey
    };

    let response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Resilient Auto-Retry if parameter unsupported
      if (errorText.includes('max_tokens') && errorText.includes('max_completion_tokens')) {
        useMaxCompletionTokens = !useMaxCompletionTokens;
        payload = buildPayload(useMaxCompletionTokens, true);
        response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      } else if (errorText.includes('temperature')) {
        // Temperature unsupported or only default (1) supported
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
        throw new Error(`OpenAI-compatible API request failed (${response.status} ${response.statusText}): ${retryError}`);
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
   * Complete a prompt with automatic fallback support
   */
  static async complete(messages, options = {}) {
    const apiKey = process.env.UI_UX_API_KEY;
    const apiUrl = process.env.UI_UX_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions';
    const model = process.env.UI_UX_MODEL || 'mimo-v2.6-pro';

    // 1. Attempt Primary Provider
    if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_api_key_here')) {
      try {
        const content = await this.callProvider(apiUrl, apiKey, model, messages, options);
        return {
          content,
          provider: 'primary',
          model
        };
      } catch (primaryErr) {
        const fallbackKey = process.env.UI_UX_FALLBACK_API_KEY;
        if (!fallbackKey || fallbackKey.trim() === '') {
          throw new Error(`Primary UI/UX AI provider failed (${primaryErr.message}) and no UI_UX_FALLBACK_API_KEY is configured.`);
        }
        // Proceed to fallback
      }
    }

    // 2. Attempt Fallback Provider
    const fallbackKey = process.env.UI_UX_FALLBACK_API_KEY;
    if (!fallbackKey || fallbackKey.trim() === '') {
      throw new Error('UI_UX_API_KEY is not set or invalid, and no fallback provider is configured. Please set UI_UX_API_KEY in .env.');
    }

    const fallbackUrl = process.env.UI_UX_FALLBACK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const fallbackModel = process.env.UI_UX_FALLBACK_MODEL || 'deepseek-v4-flash';

    const fallbackContent = await this.callProvider(fallbackUrl, fallbackKey, fallbackModel, messages, options);
    return {
      content: fallbackContent,
      provider: 'fallback',
      model: fallbackModel
    };
  }
}
