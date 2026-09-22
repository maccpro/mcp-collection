/**
 * Static PHP Source Code Analyzer (Zero-dependency)
 * Analyzes PHP files, tokenizes structures, detects architectural layers,
 * and maintains exact line-number mapping.
 */

export class StaticAnalyzer {
  /**
   * Preprocesses code by replacing comment characters with spaces,
   * preserving exact line numbers and column offsets.
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

      // Inside single-line comment // or #
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

      // Inside string literal
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

      // Check comments start
      if (char === '/' && nextChar === '*') {
        inMultiComment = true;
        result += '  ';
        i += 2;
        continue;
      }

      if ((char === '/' && nextChar === '/') || char === '#') {
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
   * Parse a PHP file structure
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
    const pathModuleMatch = normalizedPath.match(/app\/Modules\/([^\/]+)/i);
    if (pathModuleMatch) {
      moduleName = pathModuleMatch[1];
    } else {
      const nsModuleMatch = namespace.match(/App\\Modules\\([^\\]+)/i);
      if (nsModuleMatch) {
        moduleName = nsModuleMatch[1];
      }
    }

    // 3. Extract Imports (use ...;) with line numbers
    const imports = [];
    const useRegex = /\buse\s+([^;]+);/gi;
    let match;
    while ((match = useRegex.exec(cleanCode)) !== null) {
      const fullStatement = match[1].trim();
      const lineNum = cleanCode.substring(0, match.index).split('\n').length;
      
      // Support multiple grouped or comma imports
      const parts = fullStatement.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
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

    // 4. Class / Interface / Trait Declaration
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

    // 5. Determine Architecture Layer
    const layer = this.detectLayer(normalizedPath, namespace, className, extendsClass, implementsInterfaces);

    // 6. Extract Methods and Public Method Count
    const methods = this.extractMethods(cleanCode, lines);

    return {
      filePath: normalizedPath,
      fileName: normalizedPath.split('/').pop(),
      namespace,
      moduleName,
      className,
      classType,
      extendsClass,
      implementsInterfaces,
      layer,
      imports,
      methods,
      lines,
      cleanCode,
      totalLines: lines.length
    };
  }

  /**
   * Determine canonical architectural layer
   */
  static detectLayer(filePath, namespace, className, extendsClass, implementsInterfaces) {
    const target = `${filePath} ${namespace} ${className} ${extendsClass || ''}`.toLowerCase();

    if (target.includes('controller') || filePath.includes('/controllers/')) {
      return 'Controller';
    }
    if (target.includes('request') || filePath.includes('/requests/')) {
      return 'FormRequest';
    }
    if (target.includes('dto') || filePath.includes('/dtos/')) {
      return 'DTO';
    }
    if (target.includes('action') || filePath.includes('/actions/')) {
      return 'Action';
    }
    if (target.includes('service') || filePath.includes('/services/')) {
      return 'Service';
    }
    if (target.includes('repository') || filePath.includes('/repositories/')) {
      return 'Repository';
    }
    if (target.includes('model') || filePath.includes('/models/')) {
      return 'Model';
    }

    return 'Other';
  }

  /**
   * Extract methods with visibility and line count
   */
  static extractMethods(cleanCode, rawLines) {
    const methods = [];
    const methodRegex = /\b(public|protected|private)?\s+function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/gi;
    let match;

    while ((match = methodRegex.exec(cleanCode)) !== null) {
      const visibility = match[1] || 'public';
      const name = match[2];
      const params = match[3];
      const startIndex = match.index;
      const startLine = cleanCode.substring(0, startIndex).split('\n').length;

      // Locate method body start '{'
      const openBraceIndex = cleanCode.indexOf('{', startIndex + match[0].length);
      let endLine = startLine;
      let bodyLinesCount = 0;

      if (openBraceIndex !== -1) {
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
      }

      methods.push({
        name,
        visibility,
        params,
        startLine,
        endLine,
        linesCount: bodyLinesCount
      });
    }

    return methods;
  }
}
