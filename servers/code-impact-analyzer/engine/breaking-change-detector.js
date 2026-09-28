/**
 * @file breaking-change-detector.js
 * @description Advanced Neuro-Symbolic Breaking Change Detector for PHP, Laravel & Full-Stack Systems.
 * Analyzes code modifications for backward-incompatible breaking changes:
 * signature mutations, missing default arguments, method deletions/renames,
 * visibility narrowing, return type mutations, abstract additions, and interface contract violations.
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

    // Only PHP source files have PHP class contracts and signatures
    if (file_path && !file_path.endsWith('.php')) {
      return {
        success: true,
        file: file_path,
        is_backward_compatible: true,
        severity: 'SAFE',
        breaking_changes_count: 0,
        breaking_changes: [],
        violations: []
      };
    }

    const breakingIssues = [];

    if (old_code && new_code) {
      // 1. Detect Method Parameter Signature Breaking Changes
      this._checkMethodSignatures(old_code, new_code, breakingIssues);

      // 2. Detect Removed or Renamed Public / Protected Methods
      this._checkMethodRemovals(old_code, new_code, breakingIssues);

      // 3. Detect Visibility Reductions (e.g. public -> protected/private)
      this._checkVisibilityReductions(old_code, new_code, breakingIssues);

      // 4. Detect Return Type Narrowing / Mutations
      this._checkReturnTypeMutations(old_code, new_code, breakingIssues);

      // 5. Detect Newly Added Abstract Methods in Classes
      this._checkAbstractMethodAdditions(file_path, old_code, new_code, breakingIssues);

      // 6. Detect Interface Contract Violations
      this._checkInterfaceAdditions(file_path, old_code, new_code, breakingIssues);

      // 7. Detect Public Constant Removals
      this._checkConstantRemovals(old_code, new_code, breakingIssues);

      // 8. Detect Public Property Removals
      this._checkPropertyRemovals(old_code, new_code, breakingIssues);
    }

    const isBreaking = breakingIssues.length > 0;

    return {
      success: true,
      file: file_path,
      is_backward_compatible: !isBreaking,
      severity: isBreaking ? 'CRITICAL' : 'SAFE',
      breaking_changes_count: breakingIssues.length,
      breaking_changes: breakingIssues,
      violations: breakingIssues
    };
  }

  /**
   * Check if method parameters were added without default values
   */
  static _checkMethodSignatures(oldCode, newCode, issues) {
    const methodRegex = /(?:public|protected)\s+(?:static\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;

    const oldMethods = new Map();
    let m;
    while ((m = methodRegex.exec(oldCode)) !== null) {
      oldMethods.set(m[1], this._parseParams(m[2]));
    }

    const newMethodRegex = /(?:public|protected)\s+(?:static\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
    while ((m = newMethodRegex.exec(newCode)) !== null) {
      const methodName = m[1];
      const newParams = this._parseParams(m[2]);

      if (oldMethods.has(methodName)) {
        const oldParams = oldMethods.get(methodName);

        // If new params count is greater than old params count
        if (newParams.length > oldParams.length) {
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
   * Check if public or protected methods were removed or renamed
   */
  static _checkMethodRemovals(oldCode, newCode, issues) {
    // Only check if oldCode represents a class or interface definition
    if (!oldCode.includes('class ') && !oldCode.includes('trait ') && !oldCode.includes('interface ')) return;

    const methodRegex = /(public|protected)\s+(?:static\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
    const oldMethods = new Map();
    let m;
    while ((m = methodRegex.exec(oldCode)) !== null) {
      // Exclude magic lifecycle methods that can be safely removed if no-op
      if (!['__construct', '__destruct', '__clone'].includes(m[2])) {
        oldMethods.set(m[2], m[1]);
      }
    }

    const newMethods = new Set();
    const newMethodRegex = /(?:public|protected|private)\s+(?:static\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
    while ((m = newMethodRegex.exec(newCode)) !== null) {
      newMethods.add(m[1]);
    }

    for (const [methodName, visibility] of oldMethods.entries()) {
      if (!newMethods.has(methodName)) {
        issues.push({
          type: visibility === 'public' ? 'PUBLIC_METHOD_REMOVED' : 'PROTECTED_METHOD_REMOVED',
          method: methodName,
          description: `${visibility.toUpperCase()} method '${methodName}()' was removed or renamed. External callers or inheriting classes will throw fatal Error.`,
          remediation: `Keep '${methodName}()' with a deprecation notice and delegate to the new implementation.`
        });
      }
    }
  }

  /**
   * Check if method visibility was narrowed (e.g. public -> protected, protected -> private)
   */
  static _checkVisibilityReductions(oldCode, newCode, issues) {
    const methodRegex = /(public|protected)\s+(?:static\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
    const oldVisibilities = new Map();
    let m;
    while ((m = methodRegex.exec(oldCode)) !== null) {
      oldVisibilities.set(m[2], m[1]);
    }

    const newMethodRegex = /(public|protected|private)\s+(?:static\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
    while ((m = newMethodRegex.exec(newCode)) !== null) {
      const methodName = m[2];
      const newVisibility = m[1];

      if (oldVisibilities.has(methodName)) {
        const oldVisibility = oldVisibilities.get(methodName);
        if (
          (oldVisibility === 'public' && (newVisibility === 'protected' || newVisibility === 'private')) ||
          (oldVisibility === 'protected' && newVisibility === 'private')
        ) {
          issues.push({
            type: 'METHOD_VISIBILITY_REDUCED',
            method: methodName,
            description: `Method '${methodName}()' visibility reduced from '${oldVisibility}' to '${newVisibility}'. Existing external callers will throw Error.`,
            remediation: `Retain '${oldVisibility}' visibility or deprecate gracefully.`
          });
        }
      }
    }
  }

  /**
   * Check if return type declaration was mutated or narrowed
   */
  static _checkReturnTypeMutations(oldCode, newCode, issues) {
    const returnTypeRegex = /(?:public|protected)\s+function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:\s*([?a-zA-Z0-9_|\\]+)/g;
    const oldReturns = new Map();
    let m;
    while ((m = returnTypeRegex.exec(oldCode)) !== null) {
      oldReturns.set(m[1], m[2].trim());
    }

    while ((m = returnTypeRegex.exec(newCode)) !== null) {
      const methodName = m[1];
      const newReturn = m[2].trim();

      if (oldReturns.has(methodName)) {
        const oldReturn = oldReturns.get(methodName);
        // If old was nullable (e.g. ?User or string|null) and new removed nullability
        if (oldReturn.startsWith('?') && !newReturn.startsWith('?') && !newReturn.includes('null')) {
          issues.push({
            type: 'RETURN_TYPE_MUTATED',
            method: methodName,
            description: `Method '${methodName}()' return type narrowed from nullable '${oldReturn}' to non-nullable '${newReturn}'. Callers expecting nullable values or overrides will violate LSP.`,
            remediation: `Preserve return type compatibility or maintain '${oldReturn}'.`
          });
        } else if (oldReturn !== newReturn && !newReturn.includes(oldReturn.replace('?', ''))) {
          issues.push({
            type: 'RETURN_TYPE_MUTATED',
            method: methodName,
            description: `Method '${methodName}()' return type changed from '${oldReturn}' to incompatible '${newReturn}'.`,
            remediation: `Ensure return type remains compatible with existing callers and contracts.`
          });
        }
      }
    }
  }

  /**
   * Check if new abstract methods were added to an abstract class
   */
  static _checkAbstractMethodAdditions(filePath, oldCode, newCode, issues) {
    if (!oldCode.includes('abstract class ') && !newCode.includes('abstract class ')) return;

    const abstractRegex = /abstract\s+(?:public|protected)\s+function\s+([a-zA-Z0-9_]+)\s*\(/g;
    const oldAbstracts = new Set();
    let m;
    while ((m = abstractRegex.exec(oldCode)) !== null) {
      oldAbstracts.add(m[1]);
    }

    while ((m = abstractRegex.exec(newCode)) !== null) {
      if (!oldAbstracts.has(m[1])) {
        issues.push({
          type: 'ABSTRACT_METHOD_ADDED',
          method: m[1],
          description: `New abstract method '${m[1]}()' added to abstract class. All existing child classes must implement this method or will fail to instantiate.`,
          remediation: `Provide a default concrete implementation in the base class instead of declaring it abstract, or update all subclasses.`
        });
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
   * Check if public constants were deleted
   */
  static _checkConstantRemovals(oldCode, newCode, issues) {
    const constRegex = /(?:public\s+)?const\s+([a-zA-Z0-9_]+)/g;
    let m;
    while ((m = constRegex.exec(oldCode)) !== null) {
      const constName = m[1];
      if (!newCode.includes(`const ${constName}`)) {
        issues.push({
          type: 'PUBLIC_CONSTANT_REMOVED',
          constant: constName,
          description: `Constant '${constName}' was removed or renamed. External callers accessing this constant will crash.`,
          remediation: `Keep '${constName}' with @deprecated annotation until all callers are migrated.`
        });
      }
    }
  }

  /**
   * Check if public properties were deleted
   */
  static _checkPropertyRemovals(oldCode, newCode, issues) {
    if (!oldCode.includes('class ') && !oldCode.includes('trait ')) return;

    const propRegex = /public\s+(?:readonly\s+)?(?:[?a-zA-Z0-9_|\\]+\s+)?\$([a-zA-Z0-9_]+)\s*[;=]/g;
    let m;
    while ((m = propRegex.exec(oldCode)) !== null) {
      const propName = m[1];
      const newPropRegex = new RegExp(`public\\s+(?:readonly\\s+)?(?:[?a-zA-Z0-9_|\\\\]+\\s+)?\\$${propName}\\s*[;=]`);
      if (!newPropRegex.test(newCode)) {
        issues.push({
          type: 'PUBLIC_PROPERTY_REMOVED',
          property: propName,
          description: `Public property '$${propName}' was removed, renamed, or made private/protected. Direct property accesses will fail.`,
          remediation: `Retain public property '$${propName}' or use __get() magic method for backward compatibility.`
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
