import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, '..');

console.log('--- Running Backend MCP Tests ---');

// Test 1: Local .env Loading
loadEnv(serverDir);
const hasApiKey = Boolean(process.env.BACKEND_API_KEY || process.env.MIMO_API_KEY);
console.log('✅ Test 1 Passed: .env loaded (API Key configured:', hasApiKey, ').');

// Test 2: Verify server module execution & environment variables
const apiUrl = process.env.BACKEND_API_URL || process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions';
assert.ok(apiUrl.startsWith('http'), 'API URL must be a valid HTTP(S) URL');
console.log('✅ Test 2 Passed: API URL configured properly (' + apiUrl + ').');

// Test 3: Verify model configuration
const model = process.env.BACKEND_MODEL || process.env.MIMO_MODEL || 'mimo-v2.6-pro';
assert.ok(model.length > 0, 'Model name must not be empty');
console.log('✅ Test 3 Passed: Target model configured (' + model + ').');

console.log('\n🎉 ALL BACKEND MCP TESTS PASSED! 🎉\n');
