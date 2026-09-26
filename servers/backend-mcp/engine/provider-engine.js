/**
 * @file provider-engine.js
 * @description Enterprise Multi-Provider Resilient AI Completion Engine.
 * Features:
 * - Provider cascade: Primary (Xiaomi MiMo / Custom) -> Fallback (DeepSeek / Groq) -> Local (Ollama)
 * - OpenAI-compatible, Anthropic, and Gemini endpoint compatibility
 * - Exponential backoff retry with jitter on 429 rate-limits & 5xx server errors
 * - AbortController timeout protection
 * - Automatic parameter resilience (max_completion_tokens vs max_tokens, temperature adjustment for reasoning models)
 * - Stderr diagnostics isolation (leaves stdout 100% clean for JSON-RPC)
 */

export class ProviderEngine {
  /**
   * Sleep helper with jitter
   */
  static async sleep(ms) {
    const jitter = Math.floor(Math.random() * 200);
    return new Promise(resolve => setTimeout(resolve, ms + jitter));
  }

  /**
   * Standardized error logging to stderr
   */
  static logDiagnostic(message) {
    process.stderr.write(`[backend-mcp] ${message}\n`);
  }

  /**
   * Execute chat completion against an OpenAI-compatible endpoint with retries and resilience
   */
  static async callOpenAICompatible(apiUrl, apiKey, model, messages, options = {}) {
    const maxRetries = options.retries !== undefined ? options.retries : 2;
    const timeoutMs = options.timeout_ms || parseInt(process.env.BACKEND_TIMEOUT_MS, 10) || 90000;
    const isReasoningModel = (model && (model.startsWith('o1') || model.startsWith('o3') || model.includes('reasoner') || model.includes('gpt-5')));
    const tokenLimit = options.max_tokens || 4096;

    let useMaxCompletionTokens = isReasoningModel;
    let omitTemperature = isReasoningModel;

    const buildPayload = (useMaxCompTokens, omitTemp) => {
      const p = {
        model,
        messages,
        stream: false
      };

      if (!omitTemp && options.temperature !== undefined) {
        p.temperature = options.temperature;
      }

      if (useMaxCompTokens) {
        p.max_completion_tokens = tokenLimit;
      } else {
        p.max_tokens = tokenLimit;
      }

      // Handle thinking parameter
      if (options.thinking_enabled !== undefined) {
        p.thinking = { type: options.thinking_enabled ? 'enabled' : 'disabled' };
      } else if (process.env.BACKEND_THINKING || process.env.MIMO_THINKING) {
        const setting = process.env.BACKEND_THINKING || process.env.MIMO_THINKING;
        p.thinking = { type: setting === 'disabled' ? 'disabled' : 'enabled' };
      }

      return p;
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiKey && apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['api-key'] = apiKey; // Support Azure and custom gateways
    }

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        let payload = buildPayload(useMaxCompletionTokens, omitTemperature);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();

          // Parameter resilience: auto-switch between max_tokens and max_completion_tokens
          if (errorText.includes('max_tokens') && errorText.includes('max_completion_tokens')) {
            useMaxCompletionTokens = !useMaxCompletionTokens;
            payload = buildPayload(useMaxCompletionTokens, true);
            const retryRes = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            });
            if (retryRes.ok) {
              const data = await retryRes.json();
              return data.choices?.[0]?.message?.content || '';
            }
          }

          // Parameter resilience: temperature rejected
          if (errorText.includes('temperature') || errorText.includes('unsupported value')) {
            omitTemperature = true;
            payload = buildPayload(useMaxCompletionTokens, true);
            const retryRes = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            });
            if (retryRes.ok) {
              const data = await retryRes.json();
              return data.choices?.[0]?.message?.content || '';
            }
          }

          // Handle rate limit (429) or transient server errors (500, 502, 503, 504)
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            attempt++;
            const backoff = Math.pow(2, attempt) * 1000;
            this.logDiagnostic(`HTTP ${response.status} from ${model}. Retrying attempt ${attempt}/${maxRetries} after ${backoff}ms...`);
            await this.sleep(backoff);
            continue;
          }

          throw new Error(`API error (${response.status} ${response.statusText}): ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices && data.choices[0];
        if (!choice || !choice.message) {
          throw new Error(`Invalid response structure from API: ${JSON.stringify(data)}`);
        }

        return choice.message.content || '';
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.name === 'AbortError') {
          throw new Error(`Request to ${apiUrl} timed out after ${timeoutMs}ms.`);
        }

        if (attempt < maxRetries) {
          attempt++;
          const backoff = Math.pow(2, attempt) * 1000;
          this.logDiagnostic(`Request failed (${err.message}). Retrying attempt ${attempt}/${maxRetries} after ${backoff}ms...`);
          await this.sleep(backoff);
        } else {
          break;
        }
      }
    }

    throw lastError || new Error(`Failed to complete request after ${maxRetries} retries.`);
  }

  /**
   * Execute chat completion against Anthropic Messages API
   */
  static async callAnthropic(apiUrl, apiKey, model, messages, options = {}) {
    const timeoutMs = options.timeout_ms || 90000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Extract system message if present
      let systemPrompt = '';
      const anthropicMessages = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt = msg.content;
        } else {
          anthropicMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          });
        }
      }

      const payload = {
        model,
        messages: anthropicMessages,
        max_tokens: options.max_tokens || 4096
      };

      if (systemPrompt) {
        payload.system = systemPrompt;
      }
      if (options.temperature !== undefined) {
        payload.temperature = options.temperature;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const contentBlock = data.content?.[0];
      return contentBlock?.text || '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Resolve active provider configuration and execute completion with automatic cascade
   * @param {Array} messages Conversation messages array
   * @param {object} options Per-request execution options
   * @returns {Promise<{content: string, provider: string, model: string, duration_ms: number}>}
   */
  static async complete(messages, options = {}) {
    const startTime = Date.now();

    // 1. Primary Provider Configuration
    const primaryKey = process.env.BACKEND_API_KEY ||
      process.env.MIMO_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.DEEPSEEK_API_KEY;

    const primaryUrl = process.env.BACKEND_API_URL ||
      process.env.MIMO_API_URL ||
      'https://api.xiaomimimo.com/v1/chat/completions';

    const primaryModel = options.model ||
      process.env.BACKEND_MODEL ||
      process.env.MIMO_MODEL ||
      'mimo-v2.6-pro';

    // 2. Attempt Primary Provider if valid key is set
    const isMockOrEmptyKey = !primaryKey ||
      primaryKey.trim() === '' ||
      primaryKey.includes('your_actual_api_key_here') ||
      primaryKey.includes('YOUR_API_KEY');

    if (!isMockOrEmptyKey && options.provider !== 'fallback' && options.provider !== 'local') {
      try {
        let content;
        if (primaryUrl.includes('anthropic.com')) {
          content = await this.callAnthropic(primaryUrl, primaryKey, primaryModel, messages, options);
        } else {
          content = await this.callOpenAICompatible(primaryUrl, primaryKey, primaryModel, messages, options);
        }

        return {
          content,
          provider: 'primary',
          model: primaryModel,
          duration_ms: Date.now() - startTime
        };
      } catch (primaryErr) {
        this.logDiagnostic(`Primary provider (${primaryModel}) failed: ${primaryErr.message}. Attempting fallback cascade...`);
      }
    }

    // 3. Fallback Provider Configuration (DeepSeek / Groq / OpenRouter)
    const fallbackKey = process.env.BACKEND_FALLBACK_API_KEY ||
      process.env.MIMO_FALLBACK_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    const fallbackUrl = process.env.BACKEND_FALLBACK_API_URL ||
      process.env.MIMO_FALLBACK_API_URL ||
      'https://api.deepseek.com/v1/chat/completions';

    const fallbackModel = process.env.BACKEND_FALLBACK_MODEL ||
      process.env.MIMO_FALLBACK_MODEL ||
      'deepseek-v4-flash';

    const isFallbackKeyValid = fallbackKey &&
      fallbackKey.trim() !== '' &&
      !fallbackKey.includes('your_fallback_api_key_here') &&
      !fallbackKey.includes('YOUR_FALLBACK');

    if (isFallbackKeyValid && options.provider !== 'local') {
      try {
        const fallbackContent = await this.callOpenAICompatible(fallbackUrl, fallbackKey, fallbackModel, messages, options);
        return {
          content: fallbackContent,
          provider: 'fallback',
          model: fallbackModel,
          duration_ms: Date.now() - startTime
        };
      } catch (fallbackErr) {
        this.logDiagnostic(`Fallback provider (${fallbackModel}) failed: ${fallbackErr.message}.`);
      }
    }

    // 4. Local / Offline Provider (Ollama / LocalAI)
    const localUrl = process.env.BACKEND_LOCAL_API_URL || 'http://localhost:11434/v1/chat/completions';
    const localModel = process.env.BACKEND_LOCAL_MODEL || 'deepseek-coder-v2:latest';

    if (options.provider === 'local' || !isFallbackKeyValid) {
      try {
        this.logDiagnostic(`Attempting local provider at ${localUrl}...`);
        const localContent = await this.callOpenAICompatible(localUrl, '', localModel, messages, { ...options, retries: 0, timeout_ms: 10000 });
        return {
          content: localContent,
          provider: 'local',
          model: localModel,
          duration_ms: Date.now() - startTime
        };
      } catch (localErr) {
        // Continue to final error
      }
    }

    throw new Error(
      'All backend AI providers failed or are unconfigured. Please configure BACKEND_API_KEY (or MIMO_API_KEY) or BACKEND_FALLBACK_API_KEY in .env.'
    );
  }
}
