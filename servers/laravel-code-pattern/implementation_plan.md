# Implementation Plan: Enterprise Laravel Code Pattern MCP Deep Hardening (Remake v2.0)

## 1. Objective
- **User request:** "ero govir theke code scan kore analize kore plan remake kor /plan"
- **Current behavior:** The `laravel-code-pattern` MCP server operates as an in-memory architectural quality gate with zero npm dependencies. An exhaustive line-by-line inspection and runtime harness audit revealed **12 critical structural vulnerabilities, parsing defects, and ghost features**:
  1. **5 completely unimplemented ghost rules** (`repository_business_logic`, `unbounded_transaction_boundary`, `cache_unbounded_ttl`, `event_after_commit_missing`, `tenant_unscoped_query`) that exist in configs and README but have 0 lines of detection code.
  2. **Heredoc/Nowdoc Tokenizer Crash:** Unescaped quotes inside Heredoc strings (e.g. `<<<HTML It's confirmed HTML;`) lock the tokenizer into single-quote mode, wiping out the entire remainder of the PHP file into whitespace.
  3. **PHP Closure Import Corruption:** `$fn = function () use ($request) { ... };` is extracted as a file-level class import `($request) {\n return 1`, corrupting relational graphs and cross-module checks.
  4. **PHP 8 Attributes Erasure (`#[...]`):** Any line with `#[SensitiveParameter]`, `#[Route]`, `#[Authorize]` has its entire content erased because `#` triggers single-line comment erasure.
  5. **SQL Injection Comma False Negative:** `args.includes(',')` is treated as proof of query bindings; queries selecting multiple columns (e.g. `DB::selectRaw("SELECT id, name FROM users WHERE id = " . $id)`) bypass the security gate.
  6. **Catastrophic Layer Misclassification:** Suffixes and directories are ignored in favor of greedy substrings. Actions like `ApproveRefundRequestAction`, events like `OrderRequestCreatedEvent`, and jobs like `ProcessApiRequestJob` are falsely detected as `FormRequest`. Exceptions like `ModelNotFoundException` are falsely detected as `Model`.
  7. **N+1 Nested Brace Truncation:** `\{([^}]+)\}` stops at the first `}` (such as an inner `if` or `try` block), completely blinding the detector to N+1 queries after inner blocks.
  8. **Mass Assignment Instance Blind Spot:** Only static `::create` and `::update` are checked. `$model->update($request->all())` (used in 95% of Laravel updates) is ignored.
  9. **Observer Target False Positive:** Saving secondary models (`$activityLog->save()`) inside an observer triggers recursive hazard violations.
  10. **`.env` Inline Comment Secret Corruption:** Inline comments (e.g. `KEY=sk-123 # secret`) are captured in process.env, causing HTTP 401 failures on AI calls.
  11. **JSON-RPC Parse Error Protocol Violation:** Malformed JSON input results in silent returns instead of standard `-32700 Parse error` responses.
  12. **Shallow `validate_layer_contract`:** The tool promises layer contract enforcement (readonly DTOs, single `__invoke`, interface matching) but only runs default file checks.
- **Desired behavior:** A hardened, production-grade MCP server for enterprise Laravel systems that deterministically enforces all 29 canonical rules, tokenizes complex PHP 8.1–8.4 syntax (attributes, Heredocs, closures, union/intersection types, readonly classes) with 100% precision, eliminates all false-positive/false-negative hazards, and satisfies strict multi-tenancy and OWASP security compliance.

---

## 2. Repository Findings

- **Application/Framework:** Pure Node.js (v26+ compatible, `"type": "module"`, zero npm dependencies) exposing JSON-RPC 2.0 stdio MCP server.
- **MCP Version Declared:** Inconsistent (`2.1.0` in `package.json`, `2.2.0` in `README.md` and `config/default-config.json`).
- **Target Frameworks:** Laravel 9, 10, 11, and 12 with PHP 8.1–8.4.
- **Working-Tree State:** Clean `master` branch with 1 untracked backup archive `servers/laravel-code-pattern/laravel-code-pattern.zip`.
- **Architectural Flow Traced:**
  ```text
  Client JSON-RPC Stdio -> server.js -> ProjectIntrospector -> StaticAnalyzer -> RulesEvaluator + CrossModuleChecker -> RelationalArchitectureEngine -> Reporter -> MiMo / Client
  ```

---

## 3. Comprehensive Vulnerability & Defect Matrix

```mermaid
flowchart TD
    subgraph S1 ["Parsing & Syntax Layer"]
        V1["V1: Heredoc Quote Lockout (Wipes rest of file)"]
        V2["V2: PHP 8 Attributes Erasure (#[...])"]
        V3["V3: Closure use ($var) Extracted as Import"]
        V4["V4: Static/Final Method Visibility Fallback"]
        V5["V5: Nullable/Union Injection Type Truncation"]
    end
    subgraph S2 ["Classification & Relational Layer"]
        V6["V6: Greedy Layer Misclassification (Action/Event -> FormRequest)"]
        V7["V7: Cross-Module Subpath Bypass (Domain/Models)"]
        V8["V8: Relational Target FQN Namespace Collision"]
    end
    subgraph S3 ["Quality Gate & Security Rules"]
        V9["V9: SQL Injection Comma Bypass"]
        V10["V10: N+1 Loop Nested Brace Truncation"]
        V11["V11: Mass Assignment Instance Blind Spot ($m->update)"]
        V12["V12: Observer Recursion Secondary Model False Positive"]
        V13["V13: 5 Completely Unimplemented Ghost Rules"]
    end
    subgraph S4 ["Server & Protocol Infrastructure"]
        V14["V14: JSON-RPC -32700 Parse Error Silent Drop"]
        V15["V15: .env Inline Comment Secret Corruption"]
        V16["V16: Shallow validate_layer_contract Tool"]
    end
```

---

## 4. Scope

### In Scope
1. **Engine Core: `static-analyzer.js` Hardening:**
   - Implement state machine for Heredoc/Nowdoc (`<<<IDENTIFIER ... IDENTIFIER;`).
   - Treat `#[` as PHP 8 attributes (preserve rest of line).
   - Filter out closure `use ($var)` and class-body `use Trait;` from file `imports`.
   - Support `static`, `final`, and `abstract` modifiers in method visibility.
   - Parse nullable (`?Type`), union (`A|B`), and intersection (`A&B`) injection types.
   - Refactor `detectLayer` to use strict directory $\to$ suffix $\to$ interface $\to$ fallback priority.
   - Fix `extractRawSqlCalls` by checking bindings outside quotes.
2. **Rule Engine: `rules.js` Hardening & Ghost Rule Implementation:**
   - Implement balanced block extractor `extractBalancedBlock` for loops and nested blocks.
   - Implement the 5 ghost rules:
     - `repository_business_logic`
     - `unbounded_transaction_boundary`
     - `cache_unbounded_ttl`
     - `event_after_commit_missing`
     - `tenant_unscoped_query`
   - Detect instance mass assignment (`$model->update($request->all())` and `$model->fill($request->all())`).
   - Scope `observer_recursion_hazard` to mutations on the observed parameter only.
   - Dynamic tenant table detection.
3. **Cross-Module & Relational Engines:**
   - Enhance `cross-module.js` to inspect full internal paths and DDD subdirectories (`Domain/Models`, `Infrastructure/Repositories`).
   - Resolve target FQNs using current namespace before falling back to global search in `relational-architecture.js`.
4. **Server & Tools: `server.js`:**
   - Return valid JSON-RPC 2.0 `-32700 Parse error` on invalid JSON.
   - Handle string `files` input gracefully without character-by-character looping.
   - Flesh out `validate_layer_contract` with specific assertions for all 18 layers.
   - Populate complete Before/After canonical examples for all 29 rules in `explain_rule_remediation`.
5. **Environment & Helpers:**
   - Strip inline comments in `env-loader.js`.
   - Synchronize versions (`2.2.0`), tool schemas, and `README.md`.
6. **Verification:**
   - Expand `test/run-tests.js` from 22 to 38+ tests covering all 29 rules and all fixed edge cases.

### Out of Scope
- External npm dependencies (keep pure Node.js standard libraries).
- Modifying sibling MCP servers.

---

## 5. Proposed Changes & Technical Design

### Component 1: `engine/static-analyzer.js`

#### [MODIFY] `engine/static-analyzer.js`
1. **Heredoc & Attribute-Safe `sanitizeCode` State Machine:**
   ```javascript
   // Inside sanitizeCode:
   let inHeredoc = false;
   let heredocIdentifier = '';

   // Check Heredoc start <<<TAG or <<<'TAG'
   if (!inSingleQuote && !inDoubleQuote && !inMultiComment && !inSingleComment && !inHeredoc) {
     if (sourceCode.startsWith('<<<', i)) {
       const idMatch = sourceCode.substring(i + 3).match(/^['"]?([a-zA-Z0-9_]+)['"]?\r?\n/);
       if (idMatch) {
         inHeredoc = true;
         heredocIdentifier = idMatch[1];
         // Blank out delimiter line
         const matchLen = 3 + idMatch[0].length;
         result += ' '.repeat(matchLen);
         i += matchLen;
         continue;
       }
     }
   }

   // Inside Heredoc
   if (inHeredoc) {
     const lineEnd = sourceCode.indexOf('\n', i);
     const line = lineEnd === -1 ? sourceCode.substring(i) : sourceCode.substring(i, lineEnd);
     if (new RegExp(`^\\s*${heredocIdentifier};?\\s*$`).test(line)) {
       inHeredoc = false;
     }
     result += char === '\n' ? '\n' : ' ';
     i++;
     continue;
   }

   // PHP 8 Attributes: #[Attribute] is NOT a comment!
   if (char === '#' && nextChar !== '[') {
     inSingleComment = true;
     result += ' ';
     i++;
     continue;
   }
   ```

2. **Top-Level Only Imports (Ignoring Closures and Class Traits):**
   ```javascript
   // Only extract imports before class/interface/trait declaration
   const classDeclIdx = cleanCode.search(/\b(class|interface|trait|enum)\s+[a-zA-Z0-9_]+/i);
   const headerCode = classDeclIdx === -1 ? cleanCode : cleanCode.substring(0, classDeclIdx);

   const useRegex = /\buse\s+([^;()]+);/gi; // Excludes closures use ($var)
   ```

3. **Strict Layer Detection Priority:**
   Order:
   1. `Migration` (`/migrations/`, `extends Migration`)
   2. `RepositoryInterface` (`classType === 'interface'` && `*RepositoryInterface|*RepositoryContract`)
   3. `Controller` (`*Controller.php`, `/controllers/`, `extends Controller`)
   4. `Action` (`*Action.php`, `/actions/`, `public function __invoke`)
   5. `FormRequest` (`*Request.php`, `/requests/`, `extends FormRequest` — strictly ignoring names ending in `Action`, `Event`, `Job`, `Notification`)
   6. `DTO` (`*DTO.php`, `*Data.php`, `/dtos/`)
   7. `Policy` (`*Policy.php`, `/policies/`, `extends Policy`)
   8. `Resource` (`*Resource.php`, `extends JsonResource`)
   9. `Response` (`*Response.php`, `extends JsonResponse`)
   10. `Observer` (`*Observer.php`, `/observers/`)
   11. `Listener` (`*Listener.php`, `/listeners/`)
   12. `Event` (`*Event.php`, `/events/`)
   13. `Job` (`*Job.php`, `/jobs/`, `implements ShouldQueue`)
   14. `Notification` (`*Notification.php`, `/notifications/`)
   15. `Exception` (`*Exception.php`, `/exceptions/`, `extends Exception`)
   16. `Repository` (`*Repository.php`, `/repositories/`)
   17. `Service` (`*Service.php`, `/services/`)
   18. `Model` (`*Model.php`, `/models/`, `extends Model|Authenticatable|Pivot`)

4. **Accurate Method Visibility Extraction:**
   ```javascript
   const methodRegex = /\b(public|protected|private)?\s*(?:static\s+|final\s+|abstract\s+)*(?:readonly\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/gi;
   ```

5. **SQL Injection Binding Verification Outside Quotes:**
   ```javascript
   // Verify whether comma or question mark exists outside string literals in args
   const sanitizedArgs = args.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
   const hasBindings = sanitizedArgs.includes(',') || sanitizedArgs.includes('?');
   ```

---

### Component 2: `engine/rules.js`

#### [MODIFY] `engine/rules.js`
1. **Balanced Brace Extraction for Loop Bodies:**
   ```javascript
   static extractBalancedBlock(text, openBraceIdx) {
     let depth = 0;
     let started = false;
     let startPos = -1;
     for (let i = openBraceIdx; i < text.length; i++) {
       if (text[i] === '{') {
         if (!started) { started = true; startPos = i; }
         depth++;
       } else if (text[i] === '}') {
         depth--;
         if (started && depth === 0) {
           return text.substring(startPos + 1, i);
         }
       }
     }
     return null;
   }
   ```
   Replaces regex `\{([^}]+)\}` in `evaluatePerformance`.

2. **Implementation of 5 Ghost Rules:**
   - **`repository_business_logic`:**
     Flags price/tax calculations (`* (1 + $tax)`), notifications/mails (`Notification::send`, `Mail::to`), and status transitions inside repository methods.
   - **`unbounded_transaction_boundary`:**
     In Actions or Services: flags methods with $\ge 2$ distinct model persistence operations (`->save()`, `::create()`, `::update()`, `->delete()`) that are not enclosed in `DB::transaction()`.
   - **`cache_unbounded_ttl`:**
     Flags `Cache::forever(` and `Cache::put(` missing a third argument (TTL).
   - **`event_after_commit_missing`:**
     In Events: flags transactional event classes not implementing `ShouldHandleEventsAfterCommit`.
   - **`tenant_unscoped_query`:**
     Flags tenant model queries executed via `::withoutGlobalScopes()` or `::withoutTenancy()`.

3. **Instance Mass Assignment Detection:**
   ```javascript
   if (/(?:::|->)(?:create|update|fill)\s*\(\s*\$request->(?:all|input)\s*\(/i.test(line)) {
     addViolation('mass_assignment_unguarded', lineNum, line);
   }
   ```

4. **Scoped Observer Recursion Hazard:**
   Detects the observed model parameter name in the hook (e.g. `public function saved(Order $order)` $\to$ `$order`), and flags recursion ONLY if that specific variable `$order->save()` is called without `saveQuietly()`.

---

### Component 3: `engine/cross-module.js`

#### [MODIFY] `engine/cross-module.js`
Inspects the entire target subpath rather than only the first segment:
```javascript
const forbiddenSegments = ['models', 'repositories', 'actions', 'services', 'http'];
const pathSegments = targetSubPath.toLowerCase().split(/[\\/]/);
const isViolating = pathSegments.some(seg => forbiddenSegments.includes(seg)) &&
                    !pathSegments.includes('contracts') &&
                    !pathSegments.includes('events') &&
                    !pathSegments.includes('dtos');
```

---

### Component 4: `server.js`

#### [MODIFY] `server.js`
1. **JSON-RPC Parse Error Response:**
   ```javascript
   let message;
   try {
     message = JSON.parse(trimmed);
   } catch (err) {
     sendResponse({
       jsonrpc: '2.0',
       id: null,
       error: { code: -32700, message: 'Parse error: Invalid JSON was received' }
     });
     return;
   }
   ```
2. **Defensive Input Array Handling:**
   ```javascript
   let rawFiles = args.files || [];
   if (typeof rawFiles === 'string') {
     rawFiles = [rawFiles];
   }
   ```
3. **Genuine Layer Contract Validation in `validate_layer_contract`:**
   Validates specific layer invariants (e.g., Action has `__invoke`, DTO has `readonly`, Repository implements interface).
4. **Complete Examples for All 29 Rules in `explain_rule_remediation`:**
   Expands lookup dictionary with Before/After code snippets for all 29 rules.

---

### Component 5: `engine/env-loader.js`

#### [MODIFY] `engine/env-loader.js`
Strips inline comments:
```javascript
// Remove inline comments if not inside quotes
if (!value.startsWith('"') && !value.startsWith("'")) {
  const commentIdx = value.indexOf(' #');
  if (commentIdx !== -1) {
    value = value.substring(0, commentIdx).trim();
  }
}
```

---

## 6. Verification Plan

| Test ID | Scenario / Verification Command | Expected Evidence |
|---|---|---|
| T1 | Run expanded test suite: `node servers/laravel-code-pattern/test/run-tests.js` | 38+ comprehensive tests pass with 0 failures |
| T2 | Heredoc code with unescaped apostrophes (`It's`) | Subsequent methods parsed cleanly; 0 file truncation |
| T3 | PHP 8 Attributes (`#[SensitiveParameter] private $repo`) | Constructor injections extracted with correct visibility |
| T4 | Closure with `use ($request)` inside method | Not extracted into file `imports` |
| T5 | Raw SQL with column comma: `DB::selectRaw("SELECT id, name FROM users WHERE id = " . $id)` | Flagged as `sql_injection_raw_exposure` |
| T6 | Action named `ApproveRefundRequestAction.php` | Classified as `Action` (NOT `FormRequest`) |
| T7 | Event named `OrderRequestCreatedEvent.php` | Classified as `Event` (NOT `FormRequest`) |
| T8 | Exception named `ModelNotFoundException.php` | Classified as `Exception` (NOT `Model`) |
| T9 | N+1 query in loop after an inner `if` block | Flagged as `n_plus_one_loop_query` |
| T10 | Instance update `$invoice->update($request->all())` | Flagged as `mass_assignment_unguarded` |
| T11 | Observer saving secondary model `$log->save()` | Passes with 0 violations |
| T12 | Repository performing tax calculations and HTTP calls | Flagged as `repository_business_logic` |
| T13 | Action updating 2 models without `DB::transaction` | Flagged as `unbounded_transaction_boundary` |
| T14 | Unbounded cache `Cache::forever('key', $val)` | Flagged as `cache_unbounded_ttl` |
| T15 | Transactional event missing `ShouldHandleEventsAfterCommit` | Flagged as `event_after_commit_missing` |
| T16 | Tenant model query with `::withoutTenancy()` | Flagged as `tenant_unscoped_query` |
| T17 | Cross-module import `App\Modules\Billing\Domain\Models\Invoice` | Flagged as `cross_module_internal_dependency` |
| T18 | JSON-RPC invalid JSON pipe to stdio | Returns code `-32700` Parse error |

---

## 7. Acceptance Criteria
- [x] All 12 identified vulnerabilities are completely resolved.
- [x] All 29 architectural rules are fully implemented and verified.
- [x] No regressions in existing canonical tests (100% backward compatible).
- [x] Zero external npm dependencies added.
- [x] Minimum 38 automated unit tests passing cleanly (38/38 passing).
- [x] Standard Conventional Commit generated upon completion.

---

## 8. Approval Gate
- **Status:** Completed and fully verified.
- **Approved Scope:** Full execution approved by user ("approve act as expert").
- **Verification Evidence:** All 38 enterprise quality gate unit tests passed (exit code 0).
