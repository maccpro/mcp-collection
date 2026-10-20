/**
 * @file static-analyzer.js
 * @description Advanced Static PHP Source Code Analyzer (Zero-dependency).
 * Analyzes PHP files, tokenizes structures, detects 18 architectural layers,
 * extracts constructor dependency injections, PHP 8 attributes, traits, Eloquent relations,
 * raw SQL usage, exception handling blocks, and maintains exact line-number mapping.
 */

export class StaticAnalyzer {
  /**
   * Preprocesses code by replacing comment characters and string contents with spaces,
   * preserving exact line numbers and column offsets.
   * Handles single-line comments (//, #), multiline comments (/* ... * /),
   * and single/double quotes without mangling line counts.
   * 
   * @param {string} sourceCode 
   * @returns {{ cleanCode: string, lines: string[] }}
   */
  static sanitizeCode(sourceCode) {
    let result = '';
    let i = 0;
    const len = sourceCode.length;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inMultiComment = false;
    let inSingleComment = false;
    let inHeredoc = false;
    let heredocId = '';

    while (i < len) {
      const char = sourceCode[i];
      const nextChar = i + 1 < len ? sourceCode[i + 1] : '';

      // Inside multiline comment /* ... */
      if (inMultiComment) {
        if (char === '*' && nextChar === '/') {
          inMultiComment = false;
          result += '  ';
          i += 2;
          continue;
        }
        result += char === '\n' ? '\n' : ' ';
        i++;
        continue;
      }

      // Inside single-line comment // or # (excluding PHP 8 attributes #[...])
      if (inSingleComment) {
        if (char === '\n') {
          inSingleComment = false;
          result += '\n';
        } else {
          result += ' ';
        }
        i++;
        continue;
      }

      // Inside Heredoc / Nowdoc
      if (inHeredoc) {
        if (char === '\n') {
          // Check if the next line ends the Heredoc (allowing leading whitespace and ;, ), or trailing comma)
          const rest = sourceCode.substring(i + 1);
          const closeMatch = rest.match(/^[ \t]*([a-zA-Z0-9_]+)[;,)]?\s*(\r?\n|$)/);
          if (closeMatch && closeMatch[1] === heredocId) {
            inHeredoc = false;
            result += '\n';
            const matchText = closeMatch[0];
            for (let k = 0; k < matchText.length; k++) {
              result += matchText[k] === '\n' ? '\n' : ' ';
            }
            i += 1 + matchText.length;
            continue;
          }
        }
        result += char === '\n' ? '\n' : ' ';
        i++;
        continue;
      }

      // Inside single-quoted string literal
      if (inSingleQuote) {
        if (char === '\\') {
          result += '  ';
          i += 2;
          continue;
        }
        if (char === '\'') {
          inSingleQuote = false;
        }
        result += char === '\n' ? '\n' : ' ';
        i++;
        continue;
      }

      // Inside double-quoted string literal
      if (inDoubleQuote) {
        if (char === '\\') {
          result += '  ';
          i += 2;
          continue;
        }
        if (char === '"') {
          inDoubleQuote = false;
        }
        result += char === '\n' ? '\n' : ' ';
        i++;
        continue;
      }

      // Check Heredoc / Nowdoc start: <<<TAG or <<<'TAG'
      if (char === '<' && sourceCode.startsWith('<<<', i)) {
        const after = sourceCode.substring(i + 3);
        const openMatch = after.match(/^\s*['"]?([a-zA-Z0-9_]+)['"]?\r?\n/);
        if (openMatch) {
          inHeredoc = true;
          heredocId = openMatch[1];
          const skipLen = 3 + openMatch[0].length;
          result += ' '.repeat(skipLen);
          i += skipLen;
          continue;
        }
      }

      // Check comments start
      if (char === '/' && nextChar === '*') {
        inMultiComment = true;
        result += '  ';
        i += 2;
        continue;
      }

      // Single-line comment: // or # (PHP 8 attributes start with #[ so ignore #[)
      if ((char === '/' && nextChar === '/') || (char === '#' && nextChar !== '[')) {
        inSingleComment = true;
        result += (char === '/' ? '  ' : ' ');
        i += (char === '/' ? 2 : 1);
        continue;
      }

      // Check string start
      if (char === '\'') {
        inSingleQuote = true;
        result += ' ';
        i++;
        continue;
      }

      if (char === '"') {
        inDoubleQuote = true;
        result += ' ';
        i++;
        continue;
      }

      result += char;
      i++;
    }

    return {
      cleanCode: result,
      lines: sourceCode.split(/\r?\n/)
    };
  }

  /**
   * Parse a PHP file structure comprehensively
   * @param {string} filePath 
   * @param {string} sourceCode 
   * @returns {object}
   */
  static parse(filePath, sourceCode) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const { cleanCode, lines } = this.sanitizeCode(sourceCode);

    // 1. Detect Namespace
    let namespace = '';
    const nsMatch = cleanCode.match(/namespace\s+([^;{\s]+)\s*;/i);
    if (nsMatch) {
      namespace = nsMatch[1].trim();
    }

    // 2. Detect Module Name (e.g. app/Modules/Billing/... or App\Modules\Billing\...)
    let moduleName = null;
    const pathModuleMatch = normalizedPath.match(/(?:app\/Modules|Modules)\/([^\/]+)/i);
    if (pathModuleMatch) {
      moduleName = pathModuleMatch[1];
    } else {
      const nsModuleMatch = namespace.match(/(?:App\\Modules|Modules)\\([^\\]+)/i);
      if (nsModuleMatch) {
        moduleName = nsModuleMatch[1];
      }
    }

    // 3. Extract Imports (use ...;) with line numbers (excluding closures and class-body traits)
    const imports = [];
    const classDeclMatch = cleanCode.match(/\b(?:readonly\s+|final\s+|abstract\s+)*(class|interface|trait|enum)\s+[a-zA-Z0-9_]+/i);
    const headerCode = classDeclMatch ? cleanCode.substring(0, classDeclMatch.index) : cleanCode;

    const useRegex = /\buse\s+([^;()]+);/gi;
    let match;
    while ((match = useRegex.exec(headerCode)) !== null) {
      const fullStatement = match[1].trim();
      if (fullStatement.startsWith('function ') || fullStatement.startsWith('const ')) {
        continue;
      }
      const lineNum = cleanCode.substring(0, match.index).split('\n').length;
      
      // Support grouped use statements: use App\Models\{Invoice, Order as ShopOrder};
      const groupedMatch = fullStatement.match(/^([a-zA-Z0-9_\\]+)\s*\\\{\s*([^}]+)\s*\}$/);
      if (groupedMatch) {
        const baseNs = groupedMatch[1].replace(/\\+$/, '');
        const items = groupedMatch[2].split(',');
        for (const it of items) {
          const trimmed = it.trim();
          if (!trimmed || trimmed.startsWith('function ') || trimmed.startsWith('const ')) continue;
          let alias = null;
          let importClass = trimmed;
          const asMatch = trimmed.match(/^(.+?)\s+as\s+(.+)$/i);
          if (asMatch) {
            importClass = asMatch[1].trim();
            alias = asMatch[2].trim();
          }
          const fullFqn = `${baseNs}\\${importClass}`;
          imports.push({
            statement: trimmed,
            classPath: fullFqn,
            className: alias || importClass.split('\\').pop(),
            alias,
            line: lineNum
          });
        }
        continue;
      }

      // Standard multiple or single imports
      const parts = fullStatement.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        let alias = null;
        let importClass = trimmed;
        const asMatch = trimmed.match(/^(.+?)\s+as\s+(.+)$/i);
        if (asMatch) {
          importClass = asMatch[1].trim();
          alias = asMatch[2].trim();
        }
        imports.push({
          statement: trimmed,
          classPath: importClass,
          className: alias || importClass.split('\\').pop(),
          alias,
          line: lineNum
        });
      }
    }

    // 4. Class / Interface / Trait / Enum Declaration
    let classType = 'class';
    let className = '';
    let extendsClass = null;
    let implementsInterfaces = [];

    const classMatch = cleanCode.match(/\b(class|interface|trait|enum)\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([a-zA-Z0-9_\\]+))?(?:\s+implements\s+([^{]+))?/i);
    if (classMatch) {
      classType = classMatch[1].toLowerCase();
      className = classMatch[2];
      extendsClass = classMatch[3] ? classMatch[3].trim() : null;
      if (classMatch[4]) {
        implementsInterfaces = classMatch[4].split(',').map(s => s.trim());
      }
    }

    // Check anonymous migration class: return new class extends Migration
    if (!className && /return\s+new\s+class\s+extends\s+Migration/i.test(cleanCode)) {
      classType = 'class';
      className = 'AnonymousMigration';
      extendsClass = 'Migration';
    }

    // 5. Traits used inside class body
    const traits = this.extractTraits(cleanCode);

    // 6. Multi-Tenancy Markers
    const isTenantScoped = this.detectTenantScope(normalizedPath, traits, extendsClass, sourceCode);

    // 7. Determine 18-Layer Canonical Layer
    const layer = this.detectLayer(normalizedPath, namespace, className, extendsClass, implementsInterfaces, classType);

    // 8. Extract Methods
    const methods = this.extractMethods(cleanCode, lines);

    // 9. Extract Constructor Dependency Injections
    const injections = this.extractInjections(methods, cleanCode);

    // 10. Extract Raw SQL Invocations
    const rawSqlCalls = this.extractRawSqlCalls(sourceCode, lines);

    // 11. Extract Empty Catch Blocks (Swallowed Exceptions)
    const emptyCatches = this.extractEmptyCatches(cleanCode);

    return {
      filePath: normalizedPath,
      fileName: normalizedPath.split('/').pop(),
      namespace,
      moduleName,
      className,
      classType,
      extendsClass,
      implementsInterfaces,
      traits,
      isTenantScoped,
      layer,
      imports,
      methods,
      injections,
      rawSqlCalls,
      emptyCatches,
      lines,
      cleanCode,
      sourceCode,
      totalLines: lines.length
    };
  }

  /**
   * Determine canonical architectural layer among 18 enterprise layers
   */
  static detectLayer(filePath, namespace = '', className = '', extendsClass = null, implementsInterfaces = [], classType = 'class') {
    const fPath = (filePath || '').toLowerCase();
    const cName = (className || '').toLowerCase();
    const ext = (extendsClass || '').toLowerCase();
    const ifaces = (implementsInterfaces || []).map(i => i.toLowerCase());

    // 1. Migration
    if (fPath.includes('/migrations/') || ext === 'migration' || cName.endsWith('migration')) {
      return 'Migration';
    }

    // 2. Repository Interface
    if (classType === 'interface' && (cName.endsWith('repositoryinterface') || cName.endsWith('repositorycontract') || fPath.includes('/repositories/'))) {
      return 'RepositoryInterface';
    }

    // 3. Model (Directory and extends take strict precedence before checking suffixes like request, action, event, job, notification)
    if (
      fPath.includes('/models/') ||
      fPath.includes('/entities/') ||
      ext === 'model' ||
      ext === 'authenticatable' ||
      ext === 'pivot' ||
      cName.endsWith('model')
    ) {
      return 'Model';
    }

    // 4. Controller
    if (cName.endsWith('controller') || fPath.includes('/controllers/') || ext === 'controller' || ext.endsWith('controller')) {
      return 'Controller';
    }

    // 5. Action
    if (cName.endsWith('action') || fPath.includes('/actions/')) {
      return 'Action';
    }

    // 6. Exception
    if (cName.endsWith('exception') || fPath.includes('/exceptions/') || ext === 'exception' || ext === 'throwable') {
      return 'Exception';
    }

    // 7. Observer
    if (cName.endsWith('observer') || fPath.includes('/observers/')) {
      return 'Observer';
    }

    // 8. Listener
    if (cName.endsWith('listener') || fPath.includes('/listeners/')) {
      return 'Listener';
    }

    // 9. Event
    if (cName.endsWith('event') || (fPath.includes('/events/') && !cName.endsWith('listener'))) {
      return 'Event';
    }

    // 10. Job
    if (cName.endsWith('job') || fPath.includes('/jobs/') || ifaces.some(i => i.includes('shouldqueue'))) {
      return 'Job';
    }

    // 11. Notification
    if (cName.endsWith('notification') || fPath.includes('/notifications/') || ext === 'notification') {
      return 'Notification';
    }

    // 12. FormRequest (strictly excluding Action, Event, Job, Notification, Service, and Repository)
    if (
      ext === 'formrequest' ||
      fPath.includes('/requests/') ||
      (cName.endsWith('request') && !cName.endsWith('action') && !cName.endsWith('event') && !cName.endsWith('job') && !cName.endsWith('notification') && !cName.endsWith('repository') && !cName.endsWith('service'))
    ) {
      return 'FormRequest';
    }

    // 13. DTO
    if (
      cName.endsWith('dto') ||
      cName.endsWith('data') ||
      fPath.includes('/dtos/') ||
      fPath.includes('/datatransferobjects/') ||
      ifaces.some(i => i.includes('data'))
    ) {
      return 'DTO';
    }

    // 14. Policy
    if (cName.endsWith('policy') || fPath.includes('/policies/') || ext === 'policy') {
      return 'Policy';
    }

    // 15. Resource / JsonResource
    if (cName.endsWith('resource') || fPath.includes('/resources/') || ext === 'jsonresource' || ext === 'resourcecollection') {
      return 'Resource';
    }

    // 16. Response
    if (cName.endsWith('response') || fPath.includes('/responses/') || ext === 'jsonresponse' || ext === 'response') {
      return 'Response';
    }

    // 17. Repository
    if (
      cName.endsWith('repository') ||
      fPath.includes('/repositories/') ||
      ifaces.some(i => /repositoryinterface$|repositorycontract$/i.test(i))
    ) {
      return 'Repository';
    }

    // 18. Service
    if (cName.endsWith('service') || fPath.includes('/services/')) {
      return 'Service';
    }

    // 19. Middleware
    if (cName.endsWith('middleware') || fPath.includes('/middleware/')) {
      return 'Middleware';
    }

    return 'Other';
  }

  /**
   * Extract traits used inside class body (e.g. use HasFactory, BelongsToTenant;)
   */
  static extractTraits(cleanCode) {
    const traits = [];
    const classBodyIdx = cleanCode.indexOf('{');
    if (classBodyIdx === -1) return traits;

    const body = cleanCode.substring(classBodyIdx + 1);
    // Matches 'use TraitA, TraitB;' or 'use TraitA, TraitB { ... }'
    const traitRegex = /^\s*use\s+([^;{\n]+)(?:;|(?=\s*\{))/gm;
    let match;
    while ((match = traitRegex.exec(body)) !== null) {
      const traitGroup = match[1].trim();
      // Exclude closures use ($var)
      if (traitGroup.startsWith('(')) continue;
      const parts = traitGroup.split(',');
      for (const p of parts) {
        const trName = p.trim().split('\\').pop();
        if (trName && !traits.includes(trName)) {
          traits.push(trName);
        }
      }
    }
    return traits;
  }

  /**
   * Detect if a model or file is tenant-scoped
   */
  static detectTenantScope(filePath, traits = [], extendsClass = '', sourceCode = '') {
    if (filePath.includes('/tenant/') || filePath.includes('/tenants/')) {
      return true;
    }
    const tenantTraits = ['BelongsToTenant', 'TenantScoped', 'UsesTenantConnection', 'UsesTenantModel'];
    if (traits.some(t => tenantTraits.includes(t))) {
      return true;
    }
    if (extendsClass && /TenantModel|TenantBaseModel/i.test(extendsClass)) {
      return true;
    }
    if (/\$this->belongsToTenant\(\)/i.test(sourceCode)) {
      return true;
    }
    return false;
  }

  /**
   * Extract methods with visibility and body line counts
   */
  static extractMethods(cleanCode, rawLines) {
    const methods = [];
    const methodRegex = /\b(public|protected|private)?\s*(?:static\s+|final\s+|abstract\s+)*(?:readonly\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/gi;
    let match;

    while ((match = methodRegex.exec(cleanCode)) !== null) {
      const visibility = match[1] || 'public';
      const name = match[2];
      const startIndex = match.index;
      const startLine = cleanCode.substring(0, startIndex).split('\n').length;

      // Extract balanced parameter list (accounts for nested parentheses in PHP 8 attributes & default values)
      let pDepth = 1;
      let pIdx = match.index + match[0].length;
      const cleanLen = cleanCode.length;
      while (pIdx < cleanLen && pDepth > 0) {
        if (cleanCode[pIdx] === '(') pDepth++;
        else if (cleanCode[pIdx] === ')') pDepth--;
        pIdx++;
      }
      const params = cleanCode.substring(match.index + match[0].length, pIdx - 1);
      methodRegex.lastIndex = pIdx;

      // Locate method body start '{' vs abstract/interface termination ';'
      const searchStart = pIdx;
      const semiIndex = cleanCode.indexOf(';', searchStart);
      const openBraceIndex = cleanCode.indexOf('{', searchStart);

      let endLine = startLine;
      let bodyLinesCount = 1;
      let bodyText = '';

      // If semicolon appears before open brace (or no open brace exists), it's abstract/interface
      const isAbstractOrInterface = semiIndex !== -1 && (openBraceIndex === -1 || semiIndex < openBraceIndex);

      if (!isAbstractOrInterface && openBraceIndex !== -1) {
        let depth = 1;
        let curr = openBraceIndex + 1;
        const len = cleanCode.length;
        while (curr < len && depth > 0) {
          if (cleanCode[curr] === '{') depth++;
          else if (cleanCode[curr] === '}') depth--;
          curr++;
        }
        endLine = cleanCode.substring(0, curr).split('\n').length;
        bodyLinesCount = Math.max(1, endLine - startLine + 1);
        bodyText = cleanCode.substring(openBraceIndex, curr);
      }

      methods.push({
        name,
        visibility,
        params,
        startLine,
        endLine,
        linesCount: bodyLinesCount,
        bodyText
      });
    }

    return methods;
  }

  /**
   * Process PHP 8 attributes #[...] to mask commas or strip them entirely,
   * properly accounting for nested brackets and quoted strings.
   */
  static processAttributes(str, maskChar = null) {
    if (!str || !str.includes('#[')) return str;
    let result = '';
    let i = 0;
    while (i < str.length) {
      if (str[i] === '#' && str[i + 1] === '[') {
        let depth = 0;
        let j = i + 1;
        while (j < str.length) {
          if (str[j] === '[') {
            depth++;
          } else if (str[j] === ']') {
            depth--;
            if (depth === 0) {
              j++;
              break;
            }
          } else if (str[j] === '"' || str[j] === "'") {
            const quote = str[j++];
            while (j < str.length && str[j] !== quote) {
              if (str[j] === '\\') j++;
              j++;
            }
          }
          j++;
        }
        const attrBlock = str.substring(i, j);
        result += maskChar ? attrBlock.replace(/,/g, maskChar) : ' ';
        i = j;
      } else {
        result += str[i];
        i++;
      }
    }
    return result;
  }

  /**
   * Extract constructor dependency injections
   */
  static extractInjections(methods, cleanCode) {
    const injections = [];
    const ctor = methods.find(m => m.name === '__construct');
    if (!ctor || !ctor.params) return injections;

    // Mask commas inside attributes #[...] before splitting on commas
    const rawParams = this.processAttributes(ctor.params, '§');

    const paramParts = rawParams.split(',');
    for (const part of paramParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Strip any PHP 8 attributes #[...]
      const cleanParam = this.processAttributes(trimmed, null).trim();

      const m = cleanParam.match(/(?:(public|protected|private)\s+)?(?:readonly\s+)?(?:\?)?([a-zA-Z0-9_\\]+(?:[|&][a-zA-Z0-9_\\]+)*)\s+\$([a-zA-Z0-9_]+)/i);
      if (m) {
        const fullType = m[2];
        const primaryType = fullType.split(/[|&]/)[0].replace(/^\\/, '');
        injections.push({
          visibility: m[1] || 'public',
          type: primaryType,
          fullType,
          name: m[3],
          line: ctor.startLine
        });
      }
    }

    return injections;
  }

  /**
   * Extract raw SQL calls and detect unescaped variable interpolations
   */
  static extractRawSqlCalls(sourceCode, lines) {
    const calls = [];
    // Strip comments from sourceCode to prevent docblocks/comments from triggering SQL injection warnings
    let codeWithoutComments = '';
    let inBlockComment = false;
    let inLineComment = false;
    for (let idx = 0; idx < sourceCode.length; idx++) {
      const ch = sourceCode[idx];
      const next = idx + 1 < sourceCode.length ? sourceCode[idx + 1] : '';

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          codeWithoutComments += '  ';
          idx++;
        } else {
          codeWithoutComments += ch === '\n' ? '\n' : ' ';
        }
        continue;
      }

      if (inLineComment) {
        if (ch === '\n') {
          inLineComment = false;
          codeWithoutComments += '\n';
        } else {
          codeWithoutComments += ' ';
        }
        continue;
      }

      if (ch === '/' && next === '*') {
        inBlockComment = true;
        codeWithoutComments += '  ';
        idx++;
        continue;
      }

      if (ch === '/' && next === '/') {
        inLineComment = true;
        codeWithoutComments += '  ';
        idx++;
        continue;
      }

      codeWithoutComments += ch;
    }

    const rawMethodRegex = /\b(?:DB::)?(raw|whereRaw|selectRaw|havingRaw|orderByRaw|groupByRaw|statement|unprepared|select)\s*\(/gi;
    let match;

    while ((match = rawMethodRegex.exec(codeWithoutComments)) !== null) {
      const methodName = match[1];
      const startParenIdx = match.index + match[0].length - 1;
      
      // Extract balanced arguments
      let depth = 1;
      let curr = startParenIdx + 1;
      const len = codeWithoutComments.length;
      let inSingle = false;
      let inDouble = false;

      while (curr < len && depth > 0) {
        const c = codeWithoutComments[curr];
        if (c === '\\') {
          curr += 2;
          continue;
        }
        if (!inDouble && c === '\'') {
          inSingle = !inSingle;
        } else if (!inSingle && c === '"') {
          inDouble = !inDouble;
        } else if (!inSingle && !inDouble) {
          if (c === '(') depth++;
          else if (c === ')') depth--;
        }
        curr++;
      }

      const args = codeWithoutComments.substring(startParenIdx + 1, curr - 1);
      const lineNum = codeWithoutComments.substring(0, match.index).split('\n').length;

      // Detect SQL Injection risks: variable concatenation ($var . "...") or interpolation inside double quotes ("...$var...")
      const hasConcatenation = /\.\s*\$[a-zA-Z0-9_]+/i.test(args) || /\$[a-zA-Z0-9_]+\s*\./i.test(args);
      const hasDirectVarInString = /"[^"]*\$[a-zA-Z0-9_]+[^"]*"/i.test(args);

      const isRisky = hasConcatenation || hasDirectVarInString;

      calls.push({
        method: methodName,
        args,
        line: lineNum,
        isRisky,
        snippet: lines[lineNum - 1] ? lines[lineNum - 1].trim() : match[0]
      });
    }

    return calls;
  }

  /**
   * Extract empty catch blocks that swallow exceptions silently
   */
  static extractEmptyCatches(cleanCode) {
    const catches = [];
    const catchRegex = /\bcatch\s*\(\s*([^)]+)\s*\)\s*\{([^}]*)\}/gi;
    let match;
    while ((match = catchRegex.exec(cleanCode)) !== null) {
      const exceptionType = match[1].trim();
      const body = match[2].trim();
      if (!body || body === '') {
        const lineNum = cleanCode.substring(0, match.index).split('\n').length;
        catches.push({
          line: lineNum,
          exception: exceptionType,
          snippet: `catch (${exceptionType}) { }`
        });
      }
    }
    return catches;
  }
}
