/**
 * @file cross-module.js
 * @description Cross-Module Boundary Isolation Checker.
 * Enforces strict boundaries between modules in modular Laravel apps (app/Modules/* or Modules/*).
 * Prevents direct coupling to internal Models, Repositories, Actions, and Services across modules.
 */

export class CrossModuleChecker {
  /**
   * Check for cross-module boundary violations
   * @param {object} parsed 
   * @param {object} config 
   * @returns {object[]} Array of violations
   */
  static check(parsed, config = {}) {
    const violations = [];
    const currentModule = parsed.moduleName;
    if (!currentModule) {
      return violations; // Not part of a specific module
    }

    const ruleSeverity = config.architecture?.rules?.cross_module_internal_dependency || 'ERROR';

    for (const imp of parsed.imports) {
      // Check if import targets another module: App\Modules\<OtherModule>\... or Modules\<OtherModule>\...
      const otherModuleMatch = imp.classPath.match(/^(?:App\\Modules|Modules)\\([^\\]+)\\(.+)$/i);
      if (!otherModuleMatch) {
        continue;
      }

      const otherModule = otherModuleMatch[1];
      const targetSubPath = otherModuleMatch[2]; // e.g. "Models\Order" or "Contracts\OrderInterface"

      if (otherModule.toLowerCase() === currentModule.toLowerCase()) {
        continue; // Internal import within the same module is allowed
      }

      // Check if the target path contains internal forbidden layers (including in DDD subdirectories like Domain\Models)
      const forbiddenInternals = ['models', 'repositories', 'actions', 'services', 'http'];
      const pathSegments = targetSubPath.toLowerCase().split(/[\\/]/);
      const isPublicContract = pathSegments.includes('contracts') || pathSegments.includes('events') || pathSegments.includes('dtos');
      const violatingSegment = pathSegments.find(seg => forbiddenInternals.includes(seg));

      if (violatingSegment && !isPublicContract) {
        violations.push({
          id: `VIO-MOD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          file: parsed.filePath,
          fileName: parsed.fileName,
          line: imp.line,
          rule: 'cross_module_internal_dependency',
          category: 'Relational',
          severity: ruleSeverity,
          layer: parsed.layer,
          snippet: imp.statement,
          message: `Cross-module boundary violation: Module "${currentModule}" directly imports internal class "${imp.classPath}" of Module "${otherModule}".`,
          fix: `Do not import ${otherModule}'s internal ${violatingSegment}. Expose and import via ${otherModule}\\Contracts\\ or publish domain Events.`
        });
      }
    }

    return violations;
  }
}
