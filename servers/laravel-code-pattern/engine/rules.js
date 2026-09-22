/**
 * Architectural Rule Definitions & Evaluator
 * Evaluates parsed PHP AST/tokens against the 11 canonical quality gate rules.
 */

export const RULE_DEFINITIONS = {
  controller_direct_model: {
    id: 'controller_direct_model',
    name: 'No Direct Model in Controller',
    severity: 'ERROR',
    description: 'Controllers must never import or query Eloquent Models directly. Flow requires FormRequest -> DTO -> Action -> Repository.',
    fix: 'Remove Model usage from Controller. Delegate orchestration to an Action or Service layer.'
  },
  controller_direct_db: {
    id: 'controller_direct_db',
    name: 'No Direct DB Facade in Controller',
    severity: 'ERROR',
    description: 'Controllers must never execute raw database queries or use the DB facade directly.',
    fix: 'Encapsulate database queries inside a dedicated Repository implementation.'
  },
  controller_business_logic: {
    id: 'controller_business_logic',
    name: 'Keep Controllers Thin',
    severity: 'WARNING',
    description: 'Controllers should only handle HTTP concerns: validate with FormRequest, map to DTO, call Action, return Response/Resource.',
    fix: 'Extract domain logic, calculations, and multi-step conditionals into single-purpose Action classes.'
  },
  form_request_persistence: {
    id: 'form_request_persistence',
    name: 'No Persistence in FormRequest',
    severity: 'ERROR',
    description: 'FormRequest classes must only validate and authorize data, never persist records to the database.',
    fix: 'Remove database write/update calls from FormRequest. Pass validated data via DTO to an Action.'
  },
  form_request_business_logic: {
    id: 'form_request_business_logic',
    name: 'No Heavy Business Logic in FormRequest',
    severity: 'WARNING',
    description: 'FormRequest should only contain validation rules, messages, attributes, and input sanitization.',
    fix: 'Keep FormRequest focused on validation rules and authorization checks.'
  },
  dto_persistence: {
    id: 'dto_persistence',
    name: 'DTO Must Be Pure and Immutable',
    severity: 'ERROR',
    description: 'Data Transfer Objects (DTO) must never perform database persistence or access data layers.',
    fix: 'Make DTO a pure data container with typed readonly properties and fromRequest() factory methods.'
  },
  repository_http_dependency: {
    id: 'repository_http_dependency',
    name: 'No HTTP Dependencies in Repository',
    severity: 'ERROR',
    description: 'Repositories must never import or depend on Illuminate\\Http\\Request, Response, Session, or Cookie.',
    fix: 'Pass explicit primitive types, domain values, or DTOs to repository methods instead of HTTP Request objects.'
  },
  repository_business_logic: {
    id: 'repository_business_logic',
    name: 'No Domain Business Logic in Repository',
    severity: 'WARNING',
    description: 'Repositories must solely handle data storage and query retrieval, not domain business rules.',
    fix: 'Move business rules, state transitions, and price/tax calculations into Domain Actions or Services.'
  },
  action_too_large: {
    id: 'action_too_large',
    name: 'Action Must Be Single-Purpose',
    severity: 'WARNING',
    description: 'Action classes must represent a single use case (single public method, preferably __invoke).',
    fix: 'Keep Actions focused on one single operation. Split auxiliary methods into separate Actions.'
  },
  service_too_large: {
    id: 'service_too_large',
    name: 'Service Class Exceeds Size Threshold',
    severity: 'WARNING',
    description: 'Service classes exceeding size thresholds indicate mixed responsibilities.',
    fix: 'Refactor bloated services into discrete, single-purpose Action classes.'
  },
  cross_module_internal_dependency: {
    id: 'cross_module_internal_dependency',
    name: 'Cross-Module Boundary Isolation',
    severity: 'ERROR',
    description: 'Modules must not bypass boundaries by importing another module\'s internal Model, Repository, or Action directly.',
    fix: 'Communicate across modules via Contracts/Interfaces, Events, or published DTOs.'
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

    const addViolation = (ruleId, line, snippet, messageOverride = null) => {
      const def = RULE_DEFINITIONS[ruleId];
      if (!def) return;
      const severity = getSeverity(ruleId, def.severity);
      violations.push({
        id: `VIO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        file: parsed.filePath,
        fileName: parsed.fileName,
        line: line || 1,
        rule: ruleId,
        severity,
        layer: parsed.layer,
        snippet: snippet ? snippet.trim() : '',
        message: messageOverride || def.description,
        fix: def.fix
      });
    };

    // 1. Controller Layer Checks
    if (parsed.layer === 'Controller') {
      // Check 1.1: controller_direct_model
      // Check imports
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

      // Check inline model queries like User::where, Invoice::create, etc.
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
          // Exclude known non-model facades/helpers
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
      }

      // Check 1.2: controller_business_logic
      for (const method of parsed.methods) {
        if (method.linesCount > 35) {
          addViolation(
            'controller_business_logic',
            method.startLine,
            `function ${method.name}() [${method.linesCount} lines]`,
            `Controller method ${method.name} is too large (${method.linesCount} lines). Offload logic to Action classes.`
          );
        }
      }
    }

    // 2. FormRequest Layer Checks
    if (parsed.layer === 'FormRequest') {
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

    // 3. DTO Layer Checks
    if (parsed.layer === 'DTO') {
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

    // 4. Repository Layer Checks
    if (parsed.layer === 'Repository') {
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

    // 5. Action Layer Checks
    if (parsed.layer === 'Action') {
      // Check public methods count: action_too_large (Actions must be single-purpose)
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

    // 6. Service Layer Checks
    if (parsed.layer === 'Service') {
      if (parsed.totalLines > 350) {
        addViolation(
          'service_too_large',
          1,
          `Total Lines: ${parsed.totalLines}`,
          `Service class is too large (${parsed.totalLines} lines > 350 lines). Split into domain Action classes.`
        );
      }
    }

    return violations;
  }
}
