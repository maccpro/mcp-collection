#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load local .env if present
loadEnv(__dirname);

const API_URL = process.env.BACKEND_API_URL || process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions';
const MODEL = process.env.BACKEND_MODEL || process.env.MIMO_MODEL || 'mimo-v2.6-pro';

const TOOL_SCHEMA = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'Detailed instructions on what application backend code, API, algorithm, or logic to write, refactor, or fix.'
    },
    context: {
      type: 'string',
      description: 'Optional background code, relevant file snippets, or database schema context.'
    },
    system_prompt: {
      type: 'string',
      description: 'Optional system prompt override. Defaults to a dedicated application code generator persona.'
    },
    thinking_enabled: {
      type: 'boolean',
      description: 'Whether to enable model deep thinking/reasoning. Default is true.'
    },
    max_tokens: {
      type: 'number',
      description: 'Maximum completion tokens to generate. Default is 4096.'
    }
  },
  required: ['prompt']
};

const TOOLS = [
  {
    name: 'backend_generate_code',
    description: 'Enterprise backend application code, business logic, API, classes, and algorithm generator with automatic fallback support. Note: Architecture, DevOps/Docker/Nginx/Shell, testing/TDD, and log analysis are exclusively handled by the primary Antigravity agent.',
    inputSchema: TOOL_SCHEMA
  },
  {
    name: 'mimo_generate_code',
    description: 'Backward-compatible alias for backend_generate_code powered by Xiaomi MiMo or OpenAI-compatible backend model.',
    inputSchema: TOOL_SCHEMA
  }
];

async function callSingleProvider(apiUrl, apiKey, model, messages, maxTokens, thinking) {
  const payload = {
    model: model,
    messages,
    max_completion_tokens: maxTokens,
    stream: false
  };

  if (thinking) {
    payload.thinking = thinking;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status} ${response.statusText}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices && data.choices[0];
  if (!choice || !choice.message) {
    throw new Error(`Invalid response structure from API: ${JSON.stringify(data)}`);
  }

  return choice.message.content || '';
}

async function callBackendApi(messages, options = {}) {
  const apiKey = process.env.BACKEND_API_KEY || process.env.MIMO_API_KEY;
  const isThinkingExplicitlyDisabled = process.env.BACKEND_THINKING === 'disabled' || process.env.MIMO_THINKING === 'disabled' || options.thinking_enabled === false;
  const thinkingSetting = isThinkingExplicitlyDisabled ? 'disabled' : (process.env.BACKEND_THINKING || process.env.MIMO_THINKING || 'enabled');
  const thinking = { type: thinkingSetting === 'disabled' ? 'disabled' : 'enabled' };
  const maxTokens = options.max_tokens || 4096;

  const apiUrl = process.env.BACKEND_API_URL || process.env.MIMO_API_URL || API_URL;
  const model = process.env.BACKEND_MODEL || process.env.MIMO_MODEL || MODEL;

  // 1. Attempt Primary Backend API
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('YOUR_API_KEY') && !apiKey.includes('YOUR_MIMO_API_KEY')) {
    try {
      return await callSingleProvider(apiUrl, apiKey, model, messages, maxTokens, thinking);
    } catch (primaryErr) {
      const fallbackApiKey = process.env.BACKEND_FALLBACK_API_KEY || process.env.MIMO_FALLBACK_API_KEY;
      if (!fallbackApiKey || fallbackApiKey.trim() === '') {
        throw new Error(`Primary backend request failed (${primaryErr.message}) and no fallback API key is configured.`);
      }
      // Log/continue to fallback
    }
  }

  // 2. Fallback Provider (e.g. DeepSeek or OpenAI-compatible)
  const fallbackApiKey = process.env.BACKEND_FALLBACK_API_KEY || process.env.MIMO_FALLBACK_API_KEY;
  if (!fallbackApiKey || fallbackApiKey.trim() === '') {
    throw new Error('BACKEND_API_KEY (or MIMO_API_KEY) is not set or invalid, and no fallback provider is configured. Please configure .env or environment variables.');
  }

  const fallbackUrl = process.env.BACKEND_FALLBACK_API_URL || process.env.MIMO_FALLBACK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  const fallbackModel = process.env.BACKEND_FALLBACK_MODEL || process.env.MIMO_FALLBACK_MODEL || 'deepseek-v4-flash';

  return await callSingleProvider(fallbackUrl, fallbackApiKey, fallbackModel, messages, maxTokens, null);
}

async function handleToolCall(name, args) {
  if (name === 'backend_generate_code' || name === 'mimo_generate_code') {
    const systemPrompt = args.system_prompt || 'You are a dedicated backend application code writer and logic implementer. Your sole duty is to write clean, secure, performant application code and business logic based on the architecture provided by Antigravity. Strictly output production-ready code with minimal surrounding chatter.';
    
    let userContent = args.prompt;
    if (args.context) {
      userContent = `Context / Existing Code:\n\`\`\`\n${args.context}\n\`\`\`\n\nTask Instructions:\n${args.prompt}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await callBackendApi(messages, {
      thinking_enabled: args.thinking_enabled,
      max_tokens: args.max_tokens
    });

    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (err) {
    return;
  }

  const { id, method, params } = message;

  if (id === undefined || id === null) {
    return;
  }

  try {
    switch (method) {
      case 'initialize':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'backend-mcp',
              version: '1.0.0'
            }
          }
        });
        break;

      case 'tools/list':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        });
        break;

      case 'tools/call':
        if (!params || !params.name) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Missing tool name parameter'
            }
          });
          return;
        }

        try {
          const toolResult = await handleToolCall(params.name, params.arguments || {});
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: toolResult
          });
        } catch (err) {
          sendResponse({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Tool execution failed: ${err.message}`
                }
              ]
            }
          });
        }
        break;

      case 'ping':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {}
        });
        break;

      default:
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method '${method}' not found`
          }
        });
        break;
    }
  } catch (err) {
    sendResponse({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${err.message}`
      }
    });
  }
});
