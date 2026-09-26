/**
 * @file ast-class-classifier.js
 * @description Zero-hardcode structural AST class classifier.
 * Categorizes code entities by their class inheritance (extends), contracts (implements),
 * traits (use), and method signatures rather than relying on folder path strings.
 */

export class ASTClassClassifier {
  /**
   * Classify a PHP / JS code file by structural AST signatures.
   * @param {string} content - Source code content
   * @param {string} [filePath] - Optional relative path for supplementary context
   * @returns {Object} Structural classification report
   */
  static classify(content = '', filePath = '') {
    if (!content || content.trim() === '') {
      return { category: 'unknown', traits: [], contracts: [], parent_class: null, is_async_queue: false };
    }

    const parentClass = this._extractParentClass(content);
    const contracts = this._extractImplementedContracts(content);
    const traits = this._extractUsedTraits(content);

    let category = 'general';
    let isAsyncQueue = false;
    let isTenantAware = false;
    let isDatabaseEntity = false;

    // 1. Eloquent Models & Database Entities
    if (
      parentClass === 'Model' ||
      parentClass === 'Authenticatable' ||
      parentClass === 'Pivot' ||
      traits.includes('HasFactory') ||
      traits.includes('SoftDeletes') ||
      content.includes('protected $fillable') ||
      content.includes('protected $table')
    ) {
      category = 'model';
      isDatabaseEntity = true;
    }

    // 2. Queue Jobs & Asynchronous Workers
    if (
      contracts.includes('ShouldQueue') ||
      contracts.includes('ShouldBeUnique') ||
      contracts.includes('ShouldBeUniqueUntilProcessing') ||
      traits.includes('Queueable') ||
      traits.includes('InteractsWithQueue')
    ) {
      category = 'job';
      isAsyncQueue = true;
    }

    // 3. Form Requests / Validation
    if (parentClass === 'FormRequest' || content.includes('public function rules()')) {
      category = 'form_request';
    }

    // 4. Events
    if (
      (traits.includes('Dispatchable') && !traits.includes('Queueable')) ||
      contracts.includes('ShouldBroadcast') ||
      parentClass === 'Event'
    ) {
      category = 'event';
    }

    // 5. Listeners
    if (
      content.includes('public function handle(') &&
      !content.includes('Closure $next') &&
      category !== 'job' &&
      category !== 'middleware'
    ) {
      // Check if handle receives an event
      const handleParamMatch = content.match(/public\s+function\s+handle\s*\(\s*([a-zA-Z0-9_]+)\s+\$/);
      if (handleParamMatch && handleParamMatch[1] && !['Request', 'Command'].includes(handleParamMatch[1])) {
        category = 'listener';
      }
    }

    // 6. Controllers
    if (
      parentClass === 'Controller' ||
      parentClass === 'BaseController' ||
      content.includes('extends Controller') ||
      (content.includes('public function __invoke(') && content.includes('$request'))
    ) {
      category = 'controller';
    }

    // 7. Middleware
    if (
      content.includes('Closure $next') ||
      content.includes('implements Middleware')
    ) {
      category = 'middleware';
    }

    // 8. Migrations
    if (
      parentClass === 'Migration' ||
      content.includes('extends Migration') ||
      content.includes('Schema::create(') ||
      content.includes('Schema::table(')
    ) {
      category = 'migration';
      isDatabaseEntity = true;
    }

    // 9. Invokable Actions (Clean Architecture / Single Purpose)
    if (
      category === 'general' &&
      content.includes('public function __invoke(')
    ) {
      category = 'action';
    }

    // 10. Services & Repositories
    if (category === 'general') {
      if (contracts.some(c => c.endsWith('RepositoryInterface')) || content.includes('class ') && content.includes('Repository')) {
        category = 'repository';
      } else if (content.includes('class ') && content.includes('Service')) {
        category = 'service';
      }
    }

    // Check Multi-Tenant Awareness
    if (
      traits.includes('BelongsToTenant') ||
      content.includes('tenant_id') ||
      content.includes('TenantScope') ||
      content.includes('forTenant')
    ) {
      isTenantAware = true;
    }

    return {
      category,
      parent_class: parentClass,
      contracts,
      traits,
      is_async_queue: isAsyncQueue,
      is_tenant_aware: isTenantAware,
      is_database_entity: isDatabaseEntity
    };
  }

  static _extractParentClass(content) {
    const match = content.match(/class\s+[a-zA-Z0-9_]+\s+extends\s+([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }

  static _extractImplementedContracts(content) {
    const match = content.match(/class\s+[a-zA-Z0-9_]+(?:\s+extends\s+[a-zA-Z0-9_]+)?\s+implements\s+([^{]+)/);
    if (!match || !match[1]) return [];
    return match[1].split(',').map(c => c.trim().replace(/^\\/, ''));
  }

  static _extractUsedTraits(content) {
    const traits = [];
    const traitRegex = /use\s+([a-zA-Z0-9_,\s\\]+);/g;
    let m;

    while ((m = traitRegex.exec(content)) !== null) {
      // Exclude namespace imports at top of file
      const beforeMatch = content.slice(0, m.index);
      if (beforeMatch.includes('class ') || beforeMatch.includes('trait ')) {
        const traitNames = m[1].split(',');
        for (const t of traitNames) {
          const clean = t.trim().split('\\').pop();
          if (clean && !traits.includes(clean)) {
            traits.push(clean);
          }
        }
      }
    }

    return traits;
  }
}

export default ASTClassClassifier;
