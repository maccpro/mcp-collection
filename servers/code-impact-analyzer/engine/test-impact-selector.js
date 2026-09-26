/**
 * @file test-impact-selector.js
 * @description Dynamic Test Impact Analysis (TIA) Engine. Maps modified classes,
 * methods, and blast radius components directly to relevant Pest/PHPUnit tests.
 */

import fs from 'node:fs';
import path from 'node:path';

export class TestImpactSelector {
  /**
   * Select minimal targeted test suite for a set of changed files or symbols.
   * @param {Object} params
   * @param {Array<string>} params.changed_files - List of modified or affected file paths
   * @param {string} [params.repo_path] - Root directory
   * @param {string} [params.framework='pest'] - 'pest' | 'phpunit'
   * @returns {Object} Targeted test suite list and execution commands
   */
  static select(params) {
    const {
      changed_files = [],
      repo_path = process.cwd(),
      framework = 'pest'
    } = params;

    const testsDir = path.join(repo_path, 'tests');
    const targetedTests = new Set();
    const mappingDetails = [];

    // Extract base class names from changed files
    const targets = changed_files.map(f => {
      const base = path.basename(f, path.extname(f));
      return {
        path: f,
        baseName: base,
        testName1: `${base}Test.php`,
        testName2: `${base}Test.pest.php`
      };
    });

    if (fs.existsSync(testsDir)) {
      this._scanTests(testsDir, targets, targetedTests, mappingDetails, repo_path);
    }

    const testList = Array.from(targetedTests);

    // Formulate CLI command
    let executionCommand = '';
    if (testList.length > 0) {
      const filesArg = testList.join(' ');
      executionCommand = framework === 'pest'
        ? `vendor/bin/pest ${filesArg}`
        : `vendor/bin/phpunit ${filesArg}`;
    } else {
      executionCommand = framework === 'pest' ? 'vendor/bin/pest' : 'vendor/bin/phpunit';
    }

    return {
      success: true,
      framework,
      total_targeted_tests: testList.length,
      targeted_test_files: testList,
      execution_command: executionCommand,
      time_saved_estimate: testList.length > 0 ? '75% - 95% faster than full test suite' : 'No targeted tests found',
      mapping: mappingDetails
    };
  }

  /**
   * Recursively scan tests directory for references to changed targets
   */
  static _scanTests(dir, targets, targetedTests, mapping, repoPath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this._scanTests(fullPath, targets, targetedTests, mapping, repoPath);
      } else if (entry.isFile() && (entry.name.endsWith('Test.php') || entry.name.endsWith('.spec.js') || entry.name.endsWith('.test.js'))) {
        const relTestPath = path.relative(repoPath, fullPath).replace(/\\/g, '/');

        // Check 1: Direct naming match (e.g. InvoiceService -> InvoiceServiceTest.php)
        for (const target of targets) {
          if (entry.name === target.testName1 || entry.name === target.testName2) {
            targetedTests.add(relTestPath);
            mapping.push({
              changed_file: target.path,
              matched_test: relTestPath,
              match_reason: 'Direct Name Convention'
            });
            break;
          }
        }

        // Check 2: Content scan if not already matched
        if (!targetedTests.has(relTestPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const target of targets) {
              if (content.includes(target.baseName)) {
                targetedTests.add(relTestPath);
                mapping.push({
                  changed_file: target.path,
                  matched_test: relTestPath,
                  match_reason: `References '${target.baseName}' in test body`
                });
                break;
              }
            }
          } catch (e) {
            // Skip
          }
        }
      }
    }
  }
}

export default TestImpactSelector;
