/**
 * @file health-checker.js
 * @description Real-Time Provider Diagnostics and Latency Benchmark.
 * Checks connectivity, environment configurations, and live response latency
 * across configured primary, fallback, and local AI providers.
 */

import { ProviderEngine } from './provider-engine.js';

export class HealthChecker {
  /**
   * Benchmark and test provider connectivity
   * @param {object} options Options including provider filter and test_call flag
   */
  static async check(options = {}) {
    const doTestCall = options.test_call !== false;
    const targetProvider = options.provider || 'all';

    const results = {
      timestamp: new Date().toISOString(),
      primary: {
        name: 'Primary Provider',
        url: process.env.BACKEND_API_URL || process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions',
        model: process.env.BACKEND_MODEL || process.env.MIMO_MODEL || 'mimo-v2.6-pro',
        configured: Boolean(
          (process.env.BACKEND_API_KEY || process.env.MIMO_API_KEY) &&
          !(process.env.BACKEND_API_KEY || process.env.MIMO_API_KEY).includes('your_actual_api_key_here')
        ),
        status: 'unknown',
        latency_ms: null,
        error: null
      },
      fallback: {
        name: 'Fallback Provider',
        url: process.env.BACKEND_FALLBACK_API_URL || process.env.MIMO_FALLBACK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
        model: process.env.BACKEND_FALLBACK_MODEL || process.env.MIMO_FALLBACK_MODEL || 'deepseek-v4-flash',
        configured: Boolean(
          (process.env.BACKEND_FALLBACK_API_KEY || process.env.MIMO_FALLBACK_API_KEY) &&
          !(process.env.BACKEND_FALLBACK_API_KEY || process.env.MIMO_FALLBACK_API_KEY).includes('your_fallback_api_key_here')
        ),
        status: 'unknown',
        latency_ms: null,
        error: null
      },
      local: {
        name: 'Local Provider (Ollama / Gateway)',
        url: process.env.BACKEND_LOCAL_API_URL || 'http://localhost:11434/v1/chat/completions',
        model: process.env.BACKEND_LOCAL_MODEL || 'deepseek-coder-v2:latest',
        configured: true,
        status: 'unknown',
        latency_ms: null,
        error: null
      }
    };

    if (!doTestCall) {
      results.primary.status = results.primary.configured ? 'ready' : 'unconfigured';
      results.fallback.status = results.fallback.configured ? 'ready' : 'unconfigured';
      results.local.status = 'ready';
      return results;
    }

    const testPing = async (providerType) => {
      const messages = [{ role: 'user', content: 'Say "OK" and nothing else.' }];
      const startTime = Date.now();
      try {
        const res = await ProviderEngine.complete(messages, {
          provider: providerType,
          max_tokens: 5,
          retries: 0,
          timeout_ms: 10000
        });
        return {
          status: 'online',
          latency_ms: Date.now() - startTime,
          response: res.content.trim(),
          error: null
        };
      } catch (err) {
        return {
          status: 'offline',
          latency_ms: Date.now() - startTime,
          response: null,
          error: err.message
        };
      }
    };

    if (targetProvider === 'all' || targetProvider === 'primary') {
      if (results.primary.configured) {
        const testRes = await testPing('primary');
        results.primary.status = testRes.status;
        results.primary.latency_ms = testRes.latency_ms;
        results.primary.error = testRes.error;
      } else {
        results.primary.status = 'unconfigured';
      }
    }

    if (targetProvider === 'all' || targetProvider === 'fallback') {
      if (results.fallback.configured) {
        const testRes = await testPing('fallback');
        results.fallback.status = testRes.status;
        results.fallback.latency_ms = testRes.latency_ms;
        results.fallback.error = testRes.error;
      } else {
        results.fallback.status = 'unconfigured';
      }
    }

    if (targetProvider === 'local') {
      const testRes = await testPing('local');
      results.local.status = testRes.status;
      results.local.latency_ms = testRes.latency_ms;
      results.local.error = testRes.error;
    }

    return results;
  }
}
