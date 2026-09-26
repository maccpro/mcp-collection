/**
 * @file git-diff-analyzer.js
 * @description Parses Git diffs to extract modified files, changed line ranges,
 * and identified symbol alterations (functions, methods, classes, and migrations).
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export class GitDiffAnalyzer {
  /**
   * Extract changes from a git repository or raw diff string.
   * @param {Object} params
   * @param {string} [params.repo_path] - Root directory of the git repo
   * @param {string} [params.raw_diff] - Direct raw diff string if provided
   * @param {boolean} [params.staged_only=false] - Only analyze git staged changes
   * @param {string} [params.target_branch='HEAD'] - Compare against target branch/commit
   * @returns {Object} Structured diff breakdown with affected files and symbols
   */
  static analyze(params = {}) {
    let diffText = params.raw_diff || '';
    const repoPath = params.repo_path || process.cwd();

    if (!diffText && repoPath) {
      diffText = this._getGitDiff(repoPath, params.staged_only, params.target_branch);
    }

    if (!diffText || diffText.trim() === '') {
      return {
        has_changes: false,
        files: [],
        summary: { added: 0, modified: 0, deleted: 0 }
      };
    }

    const parsedFiles = this._parseDiff(diffText, repoPath);

    return {
      has_changes: parsedFiles.length > 0,
      total_files_changed: parsedFiles.length,
      files: parsedFiles,
      summary: {
        added: parsedFiles.filter(f => f.status === 'added').length,
        modified: parsedFiles.filter(f => f.status === 'modified').length,
        deleted: parsedFiles.filter(f => f.status === 'deleted').length
      }
    };
  }

  /**
   * Run git diff CLI command safely
   */
  static _getGitDiff(repoPath, stagedOnly, targetBranch) {
    try {
      const gitCmd = stagedOnly
        ? 'git diff --cached --unified=3'
        : `git diff ${targetBranch || 'HEAD'} --unified=3`;
      return execSync(gitCmd, { cwd: repoPath, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      // Fallback: try unstaged diff if HEAD fails
      try {
        return execSync('git diff', { cwd: repoPath, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
      } catch (e) {
        return '';
      }
    }
  }

  /**
   * Parse unified diff output
   */
  static _parseDiff(diffText, repoPath) {
    const fileChunks = diffText.split(/^diff --git /m).filter(c => c.trim().length > 0);
    const files = [];

    for (const chunk of fileChunks) {
      const lines = chunk.split('\n');
      const headerLine = lines[0] || '';
      const match = headerLine.match(/a\/(.+?)\s+b\/(.+)/);
      if (!match) continue;

      const oldPath = match[1];
      const newPath = match[2];

      let status = 'modified';
      if (chunk.includes('new file mode')) status = 'added';
      if (chunk.includes('deleted file mode')) status = 'deleted';

      const changedHunks = [];
      const changedSymbols = [];
      const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/gm;
      let hunkMatch;

      while ((hunkMatch = hunkRegex.exec(chunk)) !== null) {
        const oldStart = parseInt(hunkMatch[1], 10);
        const newStart = parseInt(hunkMatch[3], 10);
        const headingContext = (hunkMatch[5] || '').trim();

        changedHunks.push({
          old_start: oldStart,
          new_start: newStart,
          context: headingContext
        });

        // Extract function/method if in heading context
        const funcMatch = headingContext.match(/(?:function\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+))/i);
        if (funcMatch) {
          const sym = funcMatch[1] || funcMatch[2];
          if (!changedSymbols.includes(sym)) {
            changedSymbols.push(sym);
          }
        }
      }

      // Check modified lines for method definitions or DB schema calls
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const m = line.match(/(?:public|protected|private)?\s+function\s+([a-zA-Z0-9_]+)\s*\(/i);
          if (m && !changedSymbols.includes(m[1])) {
            changedSymbols.push(m[1]);
          }

          // Schema column change
          const schemaMatch = line.match(/\$table->([a-zA-Z0-9_]+)\s*\(\s*['"]([a-zA-Z0-9_]+)['"]/i);
          if (schemaMatch) {
            changedSymbols.push(`col:${schemaMatch[2]}`);
          }
        }
      }

      const fileCategory = this._categorizeFile(newPath);

      files.push({
        path: newPath,
        old_path: oldPath,
        status,
        category: fileCategory,
        hunks_count: changedHunks.length,
        changed_symbols: changedSymbols
      });
    }

    return files;
  }

  /**
   * Categorize Laravel / PHP architecture layer
   */
  static _categorizeFile(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.includes('/Controllers/')) return 'controller';
    if (normalized.includes('/Models/')) return 'model';
    if (normalized.includes('/Services/')) return 'service';
    if (normalized.includes('/Actions/')) return 'action';
    if (normalized.includes('/Repositories/')) return 'repository';
    if (normalized.includes('/Requests/')) return 'form_request';
    if (normalized.includes('/Events/')) return 'event';
    if (normalized.includes('/Listeners/')) return 'listener';
    if (normalized.includes('/Jobs/')) return 'job';
    if (normalized.includes('/migrations/')) return 'migration';
    if (normalized.includes('/routes/')) return 'routes';
    if (normalized.includes('/tests/')) return 'test';
    if (normalized.includes('config/')) return 'config';
    return 'general';
  }
}

export default GitDiffAnalyzer;
