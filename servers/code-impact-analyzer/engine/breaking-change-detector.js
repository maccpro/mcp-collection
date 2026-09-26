/**
 * @file breaking-change-detector.js
 * @description Analyzes code modifications for backward-incompatible breaking changes,
 * signature mutations, missing default arguments, and interface contract violations.
 */

export class BreakingChangeDetector {
  /**
   * Detect breaking changes between old and new code snippets.
   * @param {Object} params
   * @param {string} [params.file_path] - Path of modified file
   * @param {string} [params.old_code] - Code before change
   * @param {string} [params.new_code] - Code after change
   * @param {Array<Object>} [params.diff_hunks] - Diff hunks if available
   * @returns {Object} Detected breaking changes and compatibility status
   */
  static detect(params) {
    const { file_path = 'file.php', old_code = '', new_code = '' } = params;

    const breakingIssues = [];

    if (old_code && new_code) {
      // 1. Detect Method Signature Breaking Changes
      this._checkMethodSignatures(old_code, new_code, breakingIssues);

      // 2. Detect Interface Contract Violations
      this._checkInterfaceAdditions(file_path, old_code, new_code, breakingIssues);

      // 3. Detect Public Property / Constant Removals
      this._checkConstantRemovals(old_code, new_code, breakingIssues);
    }

    const isBreaking = breakingIssues.length > 0;

    return {
      success: true,
      file: file_path,
      is_backward_compatible: !isBreaking,
      severity: isBreaking ? 'CRITICAL' : 'SAFE',
      breaking_changes_count: breakingIssues.length,
      violations: breakingIssues
    };
  }

  /**
   * Check if method parameters were added without default values
   */
  static _checkMethodSignatures(oldCode, newCode, issues) {
    const methodRegex = /public\s+function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;

    const oldMethods = new Map();
    let m;
    while ((m = methodRegex.exec(oldCode)) !== null) {
      oldMethods.set(m[1], this._parseParams(m[2]));
    }

    const newMethodRegex = /public\s+function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
    while ((m = newMethodRegex.exec(newCode)) !== null) {
      const methodName = m[1];
      const newParams = this._parseParams(m[2]);

      if (oldMethods.has(methodName)) {
        const oldParams = oldMethods.get(methodName);

        // If new params count is greater than old params count
        if (newParams.length > oldParams.length) {
          // Check if any newly added parameter lacks a default value
          for (let i = oldParams.length; i < newParams.length; i++) {
            if (!newParams[i].has_default) {
              issues.push({
                type: 'REQUIRED_PARAMETER_ADDED',
                method: methodName,
                parameter: newParams[i].name,
                description: `Method '${methodName}()' added required parameter '${newParams[i].name}' without default value. Existing call sites will throw ArgumentCountError.`,
                remediation: `Provide a default value (e.g. $${newParams[i].name} = null) or overload safely.`
              });
            }
          }
        }
      }
    }
  }

  /**
   * Check if an Interface had new methods added
   */
  static _checkInterfaceAdditions(filePath, oldCode, newCode, issues) {
    if (!filePath.includes('Interface') && !oldCode.includes('interface ')) return;

    const methodRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
    const oldMethods = new Set();
    let m;
    while ((m = methodRegex.exec(oldCode)) !== null) {
      oldMethods.add(m[1]);
    }

    const newMethodRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
    while ((m = newMethodRegex.exec(newCode)) !== null) {
      if (!oldMethods.has(m[1])) {
        issues.push({
          type: 'INTERFACE_METHOD_ADDED',
          method: m[1],
          description: `New method '${m[1]}()' was added to an Interface. All implementing classes must be updated immediately or PHP will throw a fatal error.`,
          remediation: `Check all implementing classes and implement '${m[1]}()' before deploying.`
        });
      }
    }
  }

  /**
   * Check if public constants or properties were deleted
   */
  static _checkConstantRemovals(oldCode, newCode, issues) {
    const constRegex = /public\s+const\s+([a-zA-Z0-9_]+)/g;
    let m;
    while ((m = constRegex.exec(oldCode)) !== null) {
      const constName = m[1];
      if (!newCode.includes(`const ${constName}`)) {
        issues.push({
          type: 'PUBLIC_CONSTANT_REMOVED',
          constant: constName,
          description: `Public constant '${constName}' was removed or renamed. External callers accessing this constant will crash.`,
          remediation: `Keep '${constName}' with @deprecated annotation until all callers are migrated.`
        });
      }
    }
  }

  /**
   * Parse parameters string into structured items
   */
  static _parseParams(paramString) {
    if (!paramString || paramString.trim() === '') return [];
    return paramString.split(',').map(p => {
      const trimmed = p.trim();
      const parts = trimmed.split('=');
      const paramPart = parts[0].trim();
      const hasDefault = parts.length > 1;
      const nameMatch = paramPart.match(/\$([a-zA-Z0-9_]+)/);
      return {
        name: nameMatch ? nameMatch[1] : trimmed,
        has_default: hasDefault
      };
    });
  }
}

export default BreakingChangeDetector;
