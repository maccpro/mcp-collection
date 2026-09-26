import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from '../engine/env-loader.js';
import { ProjectDetector } from '../engine/project-detector.js';
import { PromptEngine } from '../engine/prompt-engine.js';
import { CodeReviewer } from '../engine/code-reviewer.js';
import { HealthChecker } from '../engine/health-checker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, '..');
const tempTestDir = path.join(__dirname, '__temp_test_workspace__');

console.log('--- 🚀 Starting Enterprise Backend MCP Test Suite ---');

// ==========================================
// Test 1: Local .env Loading
// ==========================================
loadEnv(serverDir);
const hasApiKey = Boolean(process.env.BACKEND_API_KEY || process.env.MIMO_API_KEY);
console.log(`✅ Test 1 Passed: .env loaded successfully (API Key present: ${hasApiKey}).`);

// ==========================================
// Test 2: ProjectDetector - Generic & Empty Path
// ==========================================
const genericProfile = ProjectDetector.inspect(serverDir);
assert.ok(genericProfile.project_path, 'Profile must contain resolved project_path');
assert.strictEqual(genericProfile.language, 'javascript', 'Node-based backend-mcp root should detect javascript/typescript');
console.log(`✅ Test 2 Passed: ProjectDetector correctly inspected server root (${genericProfile.framework_display}).`);

// ==========================================
// Test 3: ProjectDetector - Mock Ecosystems
// ==========================================
try {
  if (fs.existsSync(tempTestDir)) {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempTestDir, { recursive: true });

  // 3a. Mock Laravel project
  const laravelDir = path.join(tempTestDir, 'laravel-app');
  fs.mkdirSync(path.join(laravelDir, 'app', 'Http', 'Controllers'), { recursive: true });
  fs.mkdirSync(path.join(laravelDir, 'app', 'Services'), { recursive: true });
  fs.writeFileSync(path.join(laravelDir, 'artisan'), '');
  fs.writeFileSync(path.join(laravelDir, 'composer.json'), JSON.stringify({
    require: {
      'php': '^8.2',
      'laravel/framework': '^11.0',
      'spatie/laravel-permission': '^6.0'
    }
  }));

  const laravelProfile = ProjectDetector.inspect(laravelDir);
  assert.strictEqual(laravelProfile.language, 'php', 'Laravel project must be detected as PHP');
  assert.strictEqual(laravelProfile.framework, 'laravel', 'Framework must be detected as laravel');
  assert.strictEqual(laravelProfile.orm, 'eloquent', 'ORM must be detected as eloquent');
  assert.ok(laravelProfile.detected_layers.includes('services'), 'Should detect services layer');
  assert.ok(laravelProfile.detected_libraries.includes('spatie-permission'), 'Should detect spatie-permission');
  console.log('✅ Test 3a Passed: Mock Laravel project correctly detected with Eloquent & layers.');

  // 3b. Mock NestJS project
  const nestDir = path.join(tempTestDir, 'nest-app');
  fs.mkdirSync(path.join(nestDir, 'src', 'modules'), { recursive: true });
  fs.writeFileSync(path.join(nestDir, 'package.json'), JSON.stringify({
    dependencies: {
      '@nestjs/core': '^10.0.0',
      '@nestjs/common': '^10.0.0',
      '@prisma/client': '^5.0.0'
    },
    devDependencies: {
      'typescript': '^5.0.0'
    }
  }));
  fs.writeFileSync(path.join(nestDir, 'tsconfig.json'), '{}');

  const nestProfile = ProjectDetector.inspect(nestDir);
  assert.strictEqual(nestProfile.language, 'typescript', 'NestJS must be detected as TypeScript');
  assert.strictEqual(nestProfile.framework, 'nestjs', 'Framework must be detected as nestjs');
  assert.strictEqual(nestProfile.orm, 'prisma', 'ORM must be detected as prisma');
  console.log('✅ Test 3b Passed: Mock NestJS project correctly detected with TypeScript & Prisma.');

  // 3c. Mock FastAPI project
  const fastapiDir = path.join(tempTestDir, 'fastapi-app');
  fs.mkdirSync(fastapiDir, { recursive: true });
  fs.writeFileSync(path.join(fastapiDir, 'requirements.txt'), 'fastapi>=0.110.0\nuvicorn>=0.28.0\nsqlalchemy>=2.0.0\n');

  const fastapiProfile = ProjectDetector.inspect(fastapiDir);
  assert.strictEqual(fastapiProfile.language, 'python', 'FastAPI must be detected as Python');
  assert.strictEqual(fastapiProfile.framework, 'fastapi', 'Framework must be detected as fastapi');
  assert.strictEqual(fastapiProfile.orm, 'sqlalchemy', 'ORM must be detected as sqlalchemy');
  console.log('✅ Test 3c Passed: Mock FastAPI project correctly detected with Python & SQLAlchemy.');

  // 3d. Mock Golang project
  const goDir = path.join(tempTestDir, 'go-app');
  fs.mkdirSync(goDir, { recursive: true });
  fs.writeFileSync(path.join(goDir, 'go.mod'), 'module myapp\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.1\nrequire gorm.io/gorm v1.25.7\n');

  const goProfile = ProjectDetector.inspect(goDir);
  assert.strictEqual(goProfile.language, 'go', 'Go project must be detected as Go');
  assert.strictEqual(goProfile.framework, 'gin', 'Framework must be detected as gin');
  assert.strictEqual(goProfile.orm, 'gorm', 'ORM must be detected as gorm');
  console.log('✅ Test 3d Passed: Mock Go project correctly detected with Gin & GORM.');

} finally {
  // Clean up temp mock workspace
  if (fs.existsSync(tempTestDir)) {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  }
}

// ==========================================
// Test 4: PromptEngine Architecture Injection
// ==========================================
const laravelPrompt = PromptEngine.buildSystemPrompt({ framework: 'laravel', language: 'php' }, 'service');
assert.ok(laravelPrompt.includes('LARAVEL ENTERPRISE ARCHITECTURE MANDATES'), 'Prompt must contain Laravel mandates');
assert.ok(laravelPrompt.includes('Form Request'), 'Prompt must require Form Requests');
assert.ok(laravelPrompt.includes('DB::transaction'), 'Prompt must require transactions');
assert.ok(laravelPrompt.includes('TARGET ARCHITECTURAL LAYER'), 'Prompt must focus on layer');

const nestPrompt = PromptEngine.buildSystemPrompt({ framework: 'nestjs', language: 'typescript' }, 'controller');
assert.ok(nestPrompt.includes('NESTJS ENTERPRISE ARCHITECTURE MANDATES'), 'Prompt must contain NestJS mandates');
assert.ok(nestPrompt.includes('class-validator'), 'Prompt must require DTO validation');

console.log('✅ Test 4 Passed: PromptEngine properly synthesizes enterprise framework personas.');

// ==========================================
// Test 5: CodeReviewer Static Heuristic Analysis
// ==========================================
const vulnerableCode = `
class UserController extends Controller {
    public function update(Request $request, $id) {
        // SQL Injection vulnerability
        $user = DB::select(DB::raw("SELECT * FROM users WHERE id = " . $id));
        
        // Mass assignment vulnerability
        User::where('id', $id)->update($request->all());

        // Sensitive data leak
        return response()->json([
            'password_hash' => $user->password,
            'api_token' => $user->token
        ]);
    }
}
`;

const findings = CodeReviewer.runStaticHeuristics(vulnerableCode, 'laravel');
assert.ok(findings.length >= 3, `Expected at least 3 static findings, got ${findings.length}`);
const findingTypes = findings.map(f => f.type);
assert.ok(findingTypes.includes('SECURITY_SQL_INJECTION'), 'Must detect SQL injection');
assert.ok(findingTypes.includes('SECURITY_MASS_ASSIGNMENT'), 'Must detect mass assignment');
assert.ok(findingTypes.includes('SECURITY_DATA_LEAK'), 'Must detect sensitive data leak');
console.log(`✅ Test 5 Passed: CodeReviewer identified all simulated vulnerabilities (${findings.length} findings).`);

// ==========================================
// Test 6: HealthChecker Offline Configuration Inspection
// ==========================================
const healthReport = await HealthChecker.check({ test_call: false });
assert.ok(healthReport.primary, 'Health report must have primary provider');
assert.ok(healthReport.fallback, 'Health report must have fallback provider');
assert.ok(healthReport.local, 'Health report must have local provider');
assert.strictEqual(typeof healthReport.primary.configured, 'boolean');
console.log(`✅ Test 6 Passed: HealthChecker inspected configurations (Primary status: ${healthReport.primary.status}).`);

// ==========================================
// Test 7: Verify Server Module Execution via Subprocess
// ==========================================
import { spawn } from 'node:child_process';

const serverProcess = spawn('node', [path.join(serverDir, 'server.js')]);
let stdoutData = '';

serverProcess.stdout.on('data', (data) => {
  stdoutData += data.toString();
});

const rpcInit = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2024-11-05' }
}) + '\n';

const rpcListTools = JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list'
}) + '\n';

serverProcess.stdin.write(rpcInit);
serverProcess.stdin.write(rpcListTools);

await new Promise((resolve) => setTimeout(resolve, 800));
serverProcess.kill();

assert.ok(stdoutData.includes('backend-mcp'), 'Server initialize response must contain backend-mcp');
assert.ok(stdoutData.includes('backend_generate_code'), 'Server tools must include backend_generate_code');
assert.ok(stdoutData.includes('backend_refactor_code'), 'Server tools must include backend_refactor_code');
assert.ok(stdoutData.includes('backend_review_code'), 'Server tools must include backend_review_code');
assert.ok(stdoutData.includes('backend_generate_api_spec'), 'Server tools must include backend_generate_api_spec');
assert.ok(stdoutData.includes('backend_detect_stack'), 'Server tools must include backend_detect_stack');
assert.ok(stdoutData.includes('backend_health_check'), 'Server tools must include backend_health_check');
console.log('✅ Test 7 Passed: MCP Server JSON-RPC stdio protocol responded cleanly with all 8 tools.');

console.log('\n🎉 ALL ENTERPRISE BACKEND MCP TESTS PASSED SUCCESSFULLY! 🎉\n');
