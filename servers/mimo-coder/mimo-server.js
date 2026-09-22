#!/usr/bin/env node
import readline from 'node:readline';

const API_URL = process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions';
const MODEL = process.env.MIMO_MODEL || 'mimo-v2.6-pro';

const TOOLS = [
  {
    name: 'mimo_generate_code',
    description: 'Dedicated application code generator powered by Xiaomi MiMo (mimo-v2.6-pro). Generates, refactors, and implements application source code, classes, methods, algorithms, and business logic. Note: Architecture, DevOps/Docker/Nginx/Shell, testing/TDD, and log analysis are exclusively handled by the primary Antigravity agent.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed instructions on what application code to write, refactor, or fix.'
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
          description: 'Whether to enable model deep thinking/reasoning. Default is false.'
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum completion tokens to generate. Default is 4096.'
        }
      },
      required: ['prompt']
    }
  }
];

async function callMiMoApi(messages, options = {}) {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_MIMO_API_KEY')) {
    throw new Error('MIMO_API_KEY is not set or invalid. Please configure your actual API key in mcp_config.json or environment variables.');
  }

  const thinkingSetting = process.env.MIMO_THINKING || (options.thinking_enabled ? 'enabled' : 'disabled');
  const thinking = { type: thinkingSetting === 'enabled' ? 'enabled' : 'disabled' };
  const maxTokens = options.max_tokens || 4096;

  const apiUrl = process.env.MIMO_API_URL || API_URL;
  const model = process.env.MIMO_MODEL || MODEL;

  const payload = {
    model: model,
    messages,
    max_completion_tokens: maxTokens,
    stream: false,
    thinking
  };

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
    throw new Error(`MiMo API request failed (${response.status} ${response.statusText}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices && data.choices[0];
  if (!choice || !choice.message) {
    throw new Error(`Invalid response structure from MiMo API: ${JSON.stringify(data)}`);
  }

  return choice.message.content || '';
}

async function handleToolCall(name, args) {
  if (name === 'mimo_generate_code') {
    const systemPrompt = args.system_prompt || 'You are a dedicated application code writer and logic implementer. Your sole duty is to write clean, secure, performant application code and business logic based on the architecture provided by Antigravity. Strictly output production-ready code with minimal surrounding chatter.';
    
    let userContent = args.prompt;
    if (args.context) {
      userContent = `Context / Existing Code:\n\`\`\`\n${args.context}\n\`\`\`\n\nTask Instructions:\n${args.prompt}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await callMiMoApi(messages, {
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
              name: 'mimo-coder',
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
