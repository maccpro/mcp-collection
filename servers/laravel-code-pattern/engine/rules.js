/**
 * @file rules.js
 * @description Architectural Rule Definitions & Comprehensive Evaluator.
 * Evaluates parsed PHP AST/tokens against 20+ enterprise quality gate rules across:
 * Canonical Flow, Security, Multi-Tenancy, Performance, and Relational Boundaries.
 */

export const RULE_DEFINITIONS = {
  // --- Canonical Flow & Layer Rules ---
  controller_direct_model: {
    id: 'controller_direct_model',
    name: 'No Direct Model in Controller',
    category: 'CanonicalFlow',
    severity: 'ERROR',
    description: 'Controllers must never import or query Eloquent Models directly. Flow requires FormRequest -> DTO -> Action -> Repository.',
    fix: 'Remove Model usage from Controller. Delegate orchestration to an Action or Service layer.'
  },
  controller_direct_db: {
    id: 'controller_direct_db',
    name: 'No Direct DB Facade in Controller',
    category: 'CanonicalFlow',
    severity: 'ERROR',
    description: 'Controllers must never execute raw database queries or use the DB facade directly.',
    fix: 'Encapsulate database queries inside a dedicated Repository implementation.'
  },
  controller_business_logic: {
    id: 'controller_business_logic',
    name: 'Keep Controllers Thin',
    category: 'CanonicalFlow',
    severity: 'WARNING',
    description: 'Controllers should only handle HTTP concerns: validate with FormRequest, map to DTO, call Action, return Response/Resource.',
    fix: 'Extract domain logic, calculations, and multi-step conditionals into single-purpose Action classes.'
  },
  controller_unauthorized_mutation: {
    id: 'controller_unauthorized_mutation',
    name: 'Unauthorized State Mutation in Controller',
    category: 'Security',
    severity: 'ERROR',
    description: 'State-mutating controller methods (store, update, destroy) must enforce authorization via FormRequest or Policy checks.',
    fix: 'Inject a dedicated FormRequest with authorize() or invoke $this->authorize(...) / Gate::authorize(...).'
  },
  sql_injection_raw_exposure: {
    id: 'sql_injection_raw_exposure',
    name: 'Raw SQL Injection Risk Detected',
    category: 'Security',
    severity: 'CRITICAL',
    description: 'Unescaped variable concatenation or interpolation detected in raw SQL expression (DB::raw, whereRaw, etc.).',
    fix: 'Use parameterized query bindings (e.g. DB::raw("status = ?", [$status]) or whereRaw("id = ?", [$id])) instead of string concatenation.'
  },
  mass_assignment_unguarded: {
    id: 'mass_assignment_unguarded',
    name: 'Unguarded Mass Assignment',
    category: 'Security',
    severity: 'WARNING',
    description: 'Unvalidated $request->all() or $request->input() passed directly to Model::create() or update().',
    fix: 'Use $request->validated() from a FormRequest or pass validated properties through a typed DTO.'
  },
  form_request_persistence: {
    id: 'form_request_persistence',
    name: 'No Persistence in FormRequest',
    category: 'CanonicalFlow',
    severity: 'ERROR',
    description: 'FormRequest classes must only validate and authorize data, never persist records to the database.',
    fix: 'Remove database write/update calls from FormRequest. Pass validated data via DTO to an Action.'
  },
  form_request_business_logic: {
    id: 'form_request_business_logic',
    name: 'No Heavy Business Logic in FormRequest',
    category: 'CanonicalFlow',
    severity: 'WARNING',
    description: 'FormRequest should only contain validation rules, messages, attributes, and input sanitization.',
    fix: 'Keep FormRequest focused on validation rules and authorization checks.'
  },
  dto_persistence: {
    id: 'dto_persistence',
    name: 'DTO Must Be Pure and Immutable',
    category: 'CanonicalFlow',
    severity: 'ERROR',
    description: 'Data Transfer Objects (DTO) must never perform database persistence or access data layers.',
    fix: 'Make DTO a pure data container with typed readonly properties and fromRequest() factory methods.'
  },
  repository_http_dependency: {
    id: 'repository_http_dependency',
    name: 'No HTTP Dependencies in Repository',
    category: 'CanonicalFlow',
    severity: 'ERROR',
    description: 'Repositories must never import or depend on Illuminate\\Http\\Request, Response, Session, or Cookie.',
    fix: 'Pass explicit primitive types, domain values, or DTOs to repository methods instead of HTTP Request objects.'
  },
  repository_business_logic: {
    id: 'repository_business_logic',
    name: 'No Domain Business Logic in Repository',
    category: 'CanonicalFlow',
    severity: 'WARNING',
    description: 'Repositories must solely handle data storage and query retrieval, not domain business rules.',
    fix: 'Move business rules, state transitions, and price/tax calculations into Domain Actions or Services.'
  },
  repository_missing_interface: {
    id: 'repository_missing_interface',
    name: 'Repository Must Implement Interface (DIP)',
    category: 'Relational',
    severity: 'WARNING',
    description: 'Repository must implement a corresponding RepositoryInterface / Contract to uphold Dependency Inversion Principle.',
    fix: 'Define a RepositoryInterface (e.g. InvoiceRepositoryInterface) and implement it in this Repository.'
  },
  action_too_large: {
    id: 'action_too_large',
    name: 'Action Must Be Single-Purpose',
    category: 'CanonicalFlow',
    severity: 'WARNING',
    description: 'Action classes must represent a single use case (single public method, preferably __invoke).',
    fix: 'Keep Actions focused on one single operation. Split auxiliary methods into separate Actions.'
  },
  action_http_dependency: {
    id: 'action_http_dependency',
    name: 'No HTTP Request Dependency in Action',
    category: 'CanonicalFlow',
    severity: 'ERROR',
    description: 'Action classes should be decoupled from the HTTP transport layer and receive typed DTOs or primitives instead of Request.',
    fix: 'Remove Illuminate\\Http\\Request from Action parameters and pass a typed DTO.'
  },
  service_too_large: {
    id: 'service_too_large',
    name: 'Service Class Exceeds Size Threshold',
    category: 'CanonicalFlow',
    severity: 'WARNING',
    description: 'Service classes exceeding size thresholds indicate mixed responsibilities.',
    fix: 'Refactor bloated services into discrete, single-purpose Action classes.'
  },
  cross_module_internal_dependency: {
    id: 'cross_module_internal_dependency',
    name: 'Cross-Module Boundary Isolation',
    category: 'Relational',
    severity: 'ERROR',
    description: 'Modules must not bypass boundaries by importing another module\'s internal Model, Repository, or Action directly.',
    fix: 'Communicate across modules via Contracts/Interfaces, Events, or published DTOs.'
  },
  tenant_migration_misplacement: {
    id: 'tenant_migration_misplacement',
    name: 'Tenant Migration Misplacement',
    category: 'MultiTenancy',
    severity: 'ERROR',
    description: 'Tenant-specific table schema detected in central migration directory, or central table in tenant directory.',
    fix: 'Move tenant migrations to database/migrations/tenant/ or ensure central migrations manage central tables only.'
  },
  tenant_unscoped_query: {
    id: 'tenant_unscoped_query',
    name: 'Unscoped Multi-Tenant Query',
    category: 'MultiTenancy',
    severity: 'ERROR',
    description: 'Multi-tenant scoped model queried without tenant scope or BelongsToTenant trait in a multi-tenant context.',
    fix: 'Apply BelongsToTenant trait or add explicit tenant_id scoping to prevent cross-tenant data leakage.'
  },
  n_plus_one_loop_query: {
    id: 'n_plus_one_loop_query',
    name: 'Potential N+1 Query in Loop',
    category: 'Performance',
    severity: 'WARNING',
    description: 'Database query or relationship call detected inside a loop (foreach/while).',
    fix: 'Eager load relationships before the loop using with(...) or perform batch querying outside the loop.'
  },
  unbounded_transaction_boundary: {
    id: 'unbounded_transaction_boundary',
    name: 'Missing Transaction Boundary on Multi-Table Mutations',
    category: 'Reliability',
    severity: 'WARNING',
    description: 'Multiple database mutations across models without enclosing DB::transaction().',
    fix: 'Wrap multi-table mutations in DB::transaction(function() { ... }) to ensure atomic consistency.'
  },
  circular_dependency_detected: {
    id: 'circular_dependency_detected',
    name: 'Circular Dependency Detected',
    category: 'Relational',
    severity: 'ERROR',
    description: 'Circular dependency detected between classes in the relational graph.',
    fix: 'Decouple dependencies using Interfaces, Contracts, or domain Events.'
  }
};

export class RulesEvaluator {
  /**
   * Run all rules against a parsed file
   * @param {object} parsed 
   * @param {object} config 
   * @returns {object[]} Array of violations
   */
  static evaluate(parsed, config = {}) {
    const violations = [];
    const ruleSeverity = config.architecture?.rules || {};

    const getSeverity = (ruleId, defaultSeverity) => {
      return ruleSeverity[ruleId] || defaultSeverity;
    };

    const addViolation = (ruleId, line, snippet, messageOverride = null, customFix = null) => {
      const def = RULE_DEFINITIONS[ruleId];
      if (!def) return;
      const severity = getSeverity(ruleId, def.severity);
      violations.push({
        id: `VIO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        file: parsed.filePath,
        fileName: parsed.fileName,
        line: line || 1,
        rule: ruleId,
        category: def.category,
        severity,
        layer: parsed.layer,
        snippet: snippet ? snippet.trim() : '',
        message: messageOverride || def.description,
        fix: customFix || def.fix
      });
    };

    // 0. Global Security Checks across all layers
    this.evaluateSecurity(parsed, addViolation);

    // 1. Controller Layer Checks
    if (parsed.layer === 'Controller') {
      this.evaluateController(parsed, addViolation);
    }

    // 2. FormRequest Layer Checks
    if (parsed.layer === 'FormRequest') {
      this.evaluateFormRequest(parsed, addViolation);
    }

    // 3. DTO Layer Checks
    if (parsed.layer === 'DTO') {
      this.evaluateDTO(parsed, addViolation);
    }

    // 4. Repository Layer Checks
    if (parsed.layer === 'Repository') {
      this.evaluateRepository(parsed, addViolation);
    }

    // 5. Action Layer Checks
    if (parsed.layer === 'Action') {
      this.evaluateAction(parsed, addViolation);
    }

    // 6. Service Layer Checks
    if (parsed.layer === 'Service') {
      this.evaluateService(parsed, addViolation);
    }

    // 7. Migration Layer Checks (Multi-Tenancy)
    if (parsed.layer === 'Migration') {
      this.evaluateMigration(parsed, addViolation, config);
    }

    // 8. Performance Checks (N+1 queries in loops)
    this.evaluatePerformance(parsed, addViolation);

    return violations;
  }

  /**
   * Evaluate global security hazards (Raw SQL injections, unvalidated input)
   */
  static evaluateSecurity(parsed, addViolation) {
    // Check raw SQL calls for unescaped concatenation or interpolation
    for (const call of parsed.rawSqlCalls || []) {
      if (call.isRisky) {
        addViolation(
          'sql_injection_raw_exposure',
          call.line,
          call.snippet,
          `Direct variable interpolation or string concatenation inside raw SQL (${call.method}). SQL Injection risk!`,
          'Replace concatenation with query bindings: DB::raw("... ?", [$var]) or whereRaw("column = ?", [$var]).'
        );
      }
    }
  }

  /**
   * Controller layer rules
   */
  static evaluateController(parsed, addViolation) {
    // Check 1: controller_direct_model - Model imports
    for (const imp of parsed.imports) {
      if (/App\\Models\\|App\\Modules\\[^\\]+\\Models\\/i.test(imp.classPath)) {
        addViolation(
          'controller_direct_model',
          imp.line,
          imp.statement,
          `Controller imports Model directly (${imp.className}). Must delegate to FormRequest -> DTO -> Action.`
        );
      }
    }

    // Check lines for inline model calls, DB facade, and mass assignment
    for (let idx = 0; idx < parsed.lines.length; idx++) {
      const line = parsed.lines[idx];
      const lineNum = idx + 1;

      // DB Facade check: controller_direct_db
      if (/\bDB::(table|select|statement|insert|update|delete|raw|unprepared)\b/i.test(line)) {
        addViolation(
          'controller_direct_db',
          lineNum,
          line,
          'Direct DB query execution in Controller. Database queries must be placed in a Repository.'
        );
      }

      // Inline model calls
      const staticModelCall = line.match(/\b([A-Z][a-zA-Z0-9_]*)::(where|find|findOrFail|create|update|first|all|query|paginate)\b/);
      if (staticModelCall) {
        const calledClass = staticModelCall[1];
        const ignoredFacades = ['DB', 'Log', 'Auth', 'Gate', 'Route', 'Cache', 'Event', 'Storage', 'Validator', 'Schema', 'View', 'Response', 'Http', 'Str', 'Arr'];
        if (!ignoredFacades.includes(calledClass)) {
          addViolation(
            'controller_direct_model',
            lineNum,
            line,
            `Direct Eloquent call ${staticModelCall[0]} in Controller. Controllers must not interact with Models.`
          );
        }
      }

      // Mass assignment: create($request->all()) or update($request->all())
      if (/::(create|update)\s*\(\s*\$request->(all|input)\s*\(/i.test(line)) {
        addViolation(
          'mass_assignment_unguarded',
          lineNum,
          line,
          'Unguarded mass assignment: passing raw $request->all() directly to model persistence.',
          'Pass validated data from FormRequest ($request->validated()) or a typed DTO.'
        );
      }
    }

    // Check method sizes and authorization on state-changing methods
    for (const method of parsed.methods) {
      if (method.linesCount > 35) {
        addViolation(
          'controller_business_logic',
          method.startLine,
          `function ${method.name}() [${method.linesCount} lines]`,
          `Controller method ${method.name} is too large (${method.linesCount} lines > 35 lines). Offload logic to Action classes.`
        );
      }

      // Check controller_unauthorized_mutation on store, update, destroy
      const mutationMethods = ['store', 'update', 'destroy'];
      if (mutationMethods.includes(method.name.toLowerCase())) {
        const hasFormRequest = /Request\b/i.test(method.params) && !/\bIlluminate\\Http\\Request\b/i.test(method.params) && !/\bRequest\s+\$request\b/i.test(method.params);
        const hasAuthorizeCall = /\$this->authorize\s*\(|Gate::authorize\s*\(|authorizeResource\s*\(/i.test(method.bodyText || '');
        if (!hasFormRequest && !hasAuthorizeCall) {
          addViolation(
            'controller_unauthorized_mutation',
            method.startLine,
            `public function ${method.name}(${method.params})`,
            `State-changing controller method "${method.name}" has no explicit FormRequest or Policy authorization check.`,
            'Inject a dedicated FormRequest with authorization or invoke $this->authorize(...) / Gate::authorize(...).'
          );
        }
      }
    }
  }

  /**
   * FormRequest layer rules
   */
  static evaluateFormRequest(parsed, addViolation) {
    for (let idx = 0; idx < parsed.lines.length; idx++) {
      const line = parsed.lines[idx];
      const lineNum = idx + 1;

      // form_request_persistence
      if (/->(save|delete|update|create|saveOrFail)\s*\(/i.test(line) || /\bDB::/i.test(line)) {
        addViolation(
          'form_request_persistence',
          lineNum,
          line,
          'Database write or persistence method call detected in FormRequest.'
        );
      }
    }

    // form_request_business_logic
    for (const method of parsed.methods) {
      const allowed = ['authorize', 'rules', 'messages', 'attributes', 'prepareForValidation', 'passedValidation', 'failedValidation'];
      if (!allowed.includes(method.name) && method.visibility === 'public') {
        addViolation(
          'form_request_business_logic',
          method.startLine,
          `public function ${method.name}()`,
          `FormRequest contains unexpected public method ${method.name}(). FormRequest should only handle validation & authorization.`
        );
      }
    }
  }

  /**
   * DTO layer rules
   */
  static evaluateDTO(parsed, addViolation) {
    for (let idx = 0; idx < parsed.lines.length; idx++) {
      const line = parsed.lines[idx];
      const lineNum = idx + 1;

      // dto_persistence
      if (/->(save|delete|update|create|where|find)\s*\(/i.test(line) || /\bDB::/i.test(line)) {
        addViolation(
          'dto_persistence',
          lineNum,
          line,
          'DTO attempting persistence or database query. DTO must remain a pure data container.'
        );
      }
    }
  }

  /**
   * Repository layer rules
   */
  static evaluateRepository(parsed, addViolation) {
    // repository_http_dependency: check imports
    for (const imp of parsed.imports) {
      if (/Illuminate\\Http\\Request|Illuminate\\Http\\Response|Illuminate\\Support\\Facades\\Session|Illuminate\\Support\\Facades\\Cookie/i.test(imp.classPath)) {
        addViolation(
          'repository_http_dependency',
          imp.line,
          imp.statement,
          `Repository depends on HTTP layer (${imp.classPath}). Repositories must be decoupled from HTTP.`
        );
      }
    }

    // Check inline Request injection
    for (const method of parsed.methods) {
      if (/\bRequest\s+\$/i.test(method.params)) {
        addViolation(
          'repository_http_dependency',
          method.startLine,
          `function ${method.name}(${method.params})`,
          `Repository method injects HTTP Request. Pass specific primitives or DTO instead.`
        );
      }
    }
  }

  /**
   * Action layer rules
   */
  static evaluateAction(parsed, addViolation) {
    // Check action_http_dependency: Actions must not depend on HTTP Request
    for (const imp of parsed.imports) {
      if (/Illuminate\\Http\\Request|Illuminate\\Http\\Response/i.test(imp.classPath)) {
        addViolation(
          'action_http_dependency',
          imp.line,
          imp.statement,
          `Action imports HTTP Request (${imp.classPath}). Actions must receive typed DTOs or primitives to remain reusable outside HTTP.`
        );
      }
    }

    // Check action_too_large: public methods count
    const publicMethods = parsed.methods.filter(m => m.visibility === 'public');
    if (publicMethods.length > 1) {
      const methodNames = publicMethods.map(m => m.name).join(', ');
      addViolation(
        'action_too_large',
        publicMethods[1].startLine,
        `Public methods: ${methodNames}`,
        `Action class has ${publicMethods.length} public methods. Actions must be single-purpose (preferably single __invoke method).`
      );
    }

    if (parsed.totalLines > 120) {
      addViolation(
        'action_too_large',
        1,
        `Total Lines: ${parsed.totalLines}`,
        `Action class is too large (${parsed.totalLines} lines > 120 lines). Split complex workflows into composite Actions or Services.`
      );
    }
  }

  /**
   * Service layer rules
   */
  static evaluateService(parsed, addViolation) {
    if (parsed.totalLines > 350) {
      addViolation(
        'service_too_large',
        1,
        `Total Lines: ${parsed.totalLines}`,
        `Service class is too large (${parsed.totalLines} lines > 350 lines). Split into domain Action classes.`
      );
    }
  }

  /**
   * Migration layer rules (Multi-Tenancy Governance)
   */
  static evaluateMigration(parsed, addViolation, config = {}) {
    const isTenantDir = parsed.filePath.includes('/migrations/tenant') || parsed.filePath.includes('/migrations/tenants');
    const content = parsed.sourceCode || parsed.cleanCode || '';

    // Check if migration in central directory alters tenant-specific tables in multi-tenant setup
    if (!isTenantDir && config.multi_tenancy?.enabled) {
      const tenantKeywords = ['tenants_users', 'tenant_orders', 'tenant_invoices'];
      for (const kw of tenantKeywords) {
        if (content.toLowerCase().includes(kw)) {
          addViolation(
            'tenant_migration_misplacement',
            1,
            `Table ${kw}`,
            `Tenant-specific table mutation "${kw}" detected in central migration directory. Must be placed in database/migrations/tenant/.`
          );
        }
      }
    }
  }

  /**
   * Performance checks: detect N+1 queries inside loops
   */
  static evaluatePerformance(parsed, addViolation) {
    for (const method of parsed.methods) {
      const body = method.bodyText || '';
      // Detect foreach (...) { ... Model::find(...) or ->relation() }
      const loopMatch = body.match(/(?:foreach|while)\s*\([^)]+\)\s*\{([^}]+)\}/gi);
      if (loopMatch) {
        for (const loopBody of loopMatch) {
          if (/\b(?:where|find|first|get|all|query)\s*\(/i.test(loopBody) || /\$[a-zA-Z0-9_]+->[a-zA-Z0-9_]+\(\)->(?:where|get|first)/i.test(loopBody)) {
            addViolation(
              'n_plus_one_loop_query',
              method.startLine,
              loopBody.substring(0, 80).replace(/\s+/g, ' '),
              `Database query or relation call inside loop detected in method ${method.name}. Potential N+1 performance hazard.`
            );
          }
        }
      }
    }
  }
}
