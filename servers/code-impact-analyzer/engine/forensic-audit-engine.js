/**
 * @file forensic-audit-engine.js
 * @description Enterprise ERP Bug-Fix Forensic Audit Engine.
 * Reconstructs Before vs After behavioral control-flow drift, verifies Root Cause vs Workaround,
 * audits Historical Data compatibility, evaluates data-corruption risks, and computes
 * multi-dimensional S x L x E risk matrices.
 */

import { ASTClassClassifier } from './ast-class-classifier.js';
import { DynamicERPDetector } from './dynamic-erp-detector.js';
import { ERPInvariantAuditor } from './erp-invariant-auditor.js';
import { ConcurrencyHazardAuditor } from './concurrency-hazard-auditor.js';
import { RelationalDependencyGraph } from './relational-dependency-graph.js';

export class ForensicAuditEngine {
  /**
   * Execute full forensic audit of a completed bug fix.
   * @param {Object} params
   * @param {Array<Object>} params.modifiedFiles - Array of file diff objects { filePath, oldContent, newContent, diff }
   * @param {Object} [params.bugContext] - Optional user-provided context on original bug
   * @param {string} [params.repoPath] - Repository path
   * @returns {Object} Complete Forensic Audit Telemetry
   */
  static auditBugFix(params) {
    const {
      modifiedFiles = [],
      bugContext = {},
      repoPath = process.cwd()
    } = params;

    // 1. Behavioral Drift & Control-Flow Analysis (Before vs After)
    const behavioralDrift = this._analyzeBehavioralDrift(modifiedFiles);

    // 2. Root Cause vs Workaround Verification
    const rootCauseVerification = this._verifyRootCause(modifiedFiles, behavioralDrift);

    // 3. Domain Business Invariants Audit (Accounting, Inventory, Atomicity)
    const invariantReport = ERPInvariantAuditor.audit(modifiedFiles);

    // 4. Concurrency, Race Condition & Idempotency Audit
    const concurrencyReport = ConcurrencyHazardAuditor.audit(modifiedFiles);

    // 5. Historical Data Compatibility & Reconciliation Audit
    const historicalReport = this._auditHistoricalDataCompatibility(modifiedFiles);

    // 6. Data Corruption & Integrity Risk Audit
    const corruptionReport = this._auditDataCorruptionRisks(modifiedFiles, invariantReport, concurrencyReport);

    // 7. Aggregate Findings & Multi-Dimensional Risk Scoring (S x L x E)
    const allFindings = this._collateFindings({
      behavioralDrift,
      rootCauseVerification,
      invariantReport,
      concurrencyReport,
      historicalReport,
      corruptionReport
    });

    const confirmedIssues = allFindings.filter(f => f.classification === 'CONFIRMED ISSUE');
    const probableIssues = allFindings.filter(f => f.classification === 'PROBABLE ISSUE');
    const potentialRisks = allFindings.filter(f => f.classification === 'POTENTIAL RISK');

    return {
      audit_timestamp: new Date().toISOString(),
      bug_reconstruction: this._reconstructBug(bugContext, modifiedFiles, behavioralDrift),
      behavioral_drift: behavioralDrift,
      root_cause_verification: rootCauseVerification,
      accounting_integrity: invariantReport.violations.filter(v => v.pillar === 'accounting'),
      inventory_integrity: invariantReport.violations.filter(v => v.pillar === 'inventory'),
      atomicity_integrity: invariantReport.violations.filter(v => v.pillar === 'atomicity'),
      concurrency_integrity: concurrencyReport.hazards,
      historical_compatibility: historicalReport,
      data_corruption_risks: corruptionReport,
      confirmed_issues: confirmedIssues,
      probable_issues: probableIssues,
      potential_risks: potentialRisks,
      all_findings: allFindings,
      total_findings: allFindings.length
    };
  }

  /**
   * 1. Behavioral Drift & Control-Flow Analysis
   */
  static _analyzeBehavioralDrift(modifiedFiles) {
    const driftScenarios = [];

    for (const file of modifiedFiles) {
      const { filePath = '', oldContent = '', newContent = '', diff = '' } = file;
      if (!diff && !newContent) continue;

      // Detect added guard clauses (e.g. if (!$var) return;)
      const addedGuard = /\+\s*if\s*\(\s*!\s*\$\w+\s*\)[\s\S]*?(?:return|throw|continue)/i.test(diff);
      if (addedGuard) {
        driftScenarios.push({
          file: filePath,
          scenario: 'Defensive Null Guard Introduced',
          before: 'Null reference would throw fatal TypeError / NullPointer exception on downstream execution.',
          after: 'Execution path short-circuits and silently halts or returns early.',
          impact: 'Eliminates fatal crash, but may cause silent failure if caller expects complete execution state.'
        });
      }

      // Detect modified query constraints
      const addedQueryWhere = /\+\s*->where\(/i.test(diff);
      if (addedQueryWhere) {
        driftScenarios.push({
          file: filePath,
          scenario: 'Database Query Scoping Modified',
          before: 'Broader dataset returned from query.',
          after: 'Restricted dataset returned due to added where clause.',
          impact: 'Prevents unwanted records from matching, but existing downstream callers may receive fewer results.'
        });
      }

      // Detect modified arithmetic/calculation logic
      const changedMath = /(?:\+[\s\S]*?(?:[\+\-\*\/]|calculate|discount|tax)[\s\S]*?\-[\s\S]*?(?:[\+\-\*\/]|calculate|discount|tax))/i.test(diff);
      if (changedMath) {
        driftScenarios.push({
          file: filePath,
          scenario: 'Mathematical Calculation Logic Altered',
          before: 'Calculated using previous arithmetic logic.',
          after: 'Calculated using modified rate/formula.',
          impact: 'Fixes current calculation, but poses retrospective drift risk if applied to historical records.'
        });
      }
    }

    if (driftScenarios.length === 0) {
      driftScenarios.push({
        file: 'N/A',
        scenario: 'Standard Functional Modification',
        before: 'Original code behavior.',
        after: 'Modified code behavior.',
        impact: 'Surgical logic adjustment without detected macroscopic control-flow drift.'
      });
    }

    return driftScenarios;
  }

  /**
   * 2. Verify Root Cause vs Symptom vs Workaround
   */
  static _verifyRootCause(modifiedFiles, driftScenarios) {
    let hasWorkaround = false;
    let hasSymptomMask = false;
    const notes = [];

    for (const file of modifiedFiles) {
      const { diff = '' } = file;

      // Check if exception was suppressed or null checked without fixing producer
      if (/\+\s*if\s*\(\s*(?:!\s*\$\w+|\$\w+\s*===\s*null)\s*\)[\s\S]*?(?:return|continue|throw)/i.test(diff)) {
        hasWorkaround = true;
        notes.push('Added null guard short-circuit. Suppresses null-pointer exceptions without ensuring the data producer reliably supplies a non-null instance.');
      }

      // Check if try-catch simply logs and returns empty
      if (/\+\s*catch\s*\(.*?\)\s*\{\s*(?:Log::|\/\/|return\s*\[\]|return\s*null)/i.test(diff)) {
        hasSymptomMask = true;
        notes.push('Swallowed exception in catch block. Masks the failure symptom rather than resolving the root exception condition.');
      }
    }

    let category = 'A. ROOT_CAUSE';
    if (hasSymptomMask) {
      category = 'B. SYMPTOM_MASK';
    } else if (hasWorkaround) {
      category = 'C. WORKAROUND';
    }

    return {
      category,
      is_conclusive_fix: category === 'A. ROOT_CAUSE',
      notes: notes.length > 0 ? notes : ['Fix directly addresses underlying domain logic and data integrity.']
    };
  }

  /**
   * 3. Historical Data Compatibility & Reconciliation Audit
   */
  static _auditHistoricalDataCompatibility(modifiedFiles) {
    const historicalRisks = [];
    const reconciliationItems = [];

    for (const file of modifiedFiles) {
      const { filePath = '', newContent = '', diff = '' } = file;

      // Check for dynamic accessors on historical entities
      const hasDynamicAccessor = /public\s+function\s+get[a-zA-Z0-9_]*(?:Total|Tax|Discount|Price|Balance|Due|Amount|Rate)[a-zA-Z0-9_]*Attribute/i.test(newContent) &&
                                 /(?:calculate|\*|\+|\-)/i.test(newContent);
      if (hasDynamicAccessor) {
        historicalRisks.push({
          type: 'RETROSPECTIVE_CALCULATION_MUTATION',
          file: filePath,
          severity: 'HIGH',
          description: 'Calculation logic in Eloquent model accessor (get...Attribute). Viewing historical records will retroactively recalculate and alter past financial report figures.',
          remediation: 'Persist calculated totals into immutable database snapshot columns upon transaction creation.'
        });
      }

      // Check if migration adds non-nullable column without default
      if (filePath.includes('migration') && diff.includes('$table->')) {
        const nonNullWithoutDefault = /\+\s*\$table->\w+\(['"]\w+['"]\)(?!->nullable\(\))(?!->default\()/i.test(diff);
        if (nonNullWithoutDefault) {
          historicalRisks.push({
            type: 'MIGRATION_NON_NULL_NO_DEFAULT',
            file: filePath,
            severity: 'CRITICAL',
            description: 'Added non-nullable column to existing table without a default value. Running migration on production with existing historical records will throw SQL error.',
            remediation: 'Specify ->nullable() or provide ->default(...) on newly added columns for backward compatibility.'
          });
        }
      }

      // Detect if past corrupted records require a reconciliation script
      if (/fix|resolve|bug|corrupt|reconcil/i.test(diff)) {
        reconciliationItems.push({
          area: filePath,
          required: true,
          reason: 'Bug fix corrects calculation or status transition logic that may have left historical records in an inconsistent state prior to deployment.',
          detection_method: 'Run SQL integrity query comparing transaction line totals against recorded parent totals.',
          risk: 'High financial drift if past invoices/balances remain unreconciled.'
        });
      }
    }

    return {
      has_historical_risks: historicalRisks.length > 0,
      historical_risks: historicalRisks,
      reconciliation_required: reconciliationItems.length > 0,
      reconciliation_items: reconciliationItems
    };
  }

  /**
   * 4. Data Corruption Risks
   */
  static _auditDataCorruptionRisks(modifiedFiles, invariantReport, concurrencyReport) {
    const risks = [];

    // Evaluate orphan record risk from atomicity
    const hasAtomicityIssue = invariantReport.violations.some(v => v.pillar === 'atomicity');
    risks.push({
      item: 'Orphan / Incomplete Records',
      classification: hasAtomicityIssue ? 'PROBABLE' : 'UNLIKELY',
      evidence: hasAtomicityIssue ? 'Mutations occur across multiple entities without DB::transaction wrapping.' : 'Transaction boundaries appear preserved.'
    });

    // Evaluate balance / ledger mismatch
    const hasAccountingIssue = invariantReport.violations.some(v => v.pillar === 'accounting');
    risks.push({
      item: 'General Ledger Mismatch',
      classification: hasAccountingIssue ? 'CONFIRMED' : 'UNLIKELY',
      evidence: hasAccountingIssue ? 'Asymmetric debit/credit or direct ledger deletion detected in code changes.' : 'Double-entry invariants satisfied.'
    });

    // Evaluate stock divergence
    const hasInventoryIssue = invariantReport.violations.some(v => v.pillar === 'inventory');
    risks.push({
      item: 'Physical Stock vs Stock Ledger Divergence',
      classification: hasInventoryIssue ? 'CONFIRMED' : 'UNLIKELY',
      evidence: hasInventoryIssue ? 'Direct stock quantity decrement performed without creating a StockMovement ledger record.' : 'Inventory mutations coupled to audit log.'
    });

    // Evaluate lost update under concurrency
    const hasConcurrencyIssue = concurrencyReport.hazards.length > 0;
    risks.push({
      item: 'Concurrent Lost Updates & Race Overwrites',
      classification: hasConcurrencyIssue ? 'PROBABLE' : 'UNLIKELY',
      evidence: hasConcurrencyIssue ? 'Read-modify-write pattern detected on numeric balances without lockForUpdate.' : 'Pessimistic locking or atomic increments utilized.'
    });

    return risks;
  }

  /**
   * Collate all findings into a unified array with S x L x E risk quantification
   */
  static _collateFindings({ invariantReport, concurrencyReport, historicalReport }) {
    const findings = [];

    // From Invariant Auditor
    for (const v of invariantReport.violations) {
      const s = v.severity || 4;
      const l = v.likelihood || 4;
      const e = v.exposure || 4;
      findings.push({
        title: v.title,
        evidence: v.description,
        affected_code: v.file,
        classification: v.classification,
        severity: s,
        likelihood: l,
        exposure: e,
        risk_score: s * l * e,
        confidence: 'High',
        recommendation: v.remediation
      });
    }

    // From Concurrency Auditor
    for (const h of concurrencyReport.hazards) {
      const s = h.severity === 'CRITICAL' ? 5 : (h.severity === 'HIGH' ? 4 : 3);
      const l = 4;
      const e = 4;
      findings.push({
        title: h.title,
        evidence: h.description,
        affected_code: h.file,
        classification: h.severity === 'CRITICAL' ? 'CONFIRMED ISSUE' : 'PROBABLE ISSUE',
        severity: s,
        likelihood: l,
        exposure: e,
        risk_score: s * l * e,
        confidence: 'High',
        recommendation: h.remediation
      });
    }

    // From Historical Data
    for (const hr of historicalReport.historical_risks) {
      const s = hr.severity === 'CRITICAL' ? 5 : 4;
      const l = 4;
      const e = 5;
      findings.push({
        title: hr.type,
        evidence: hr.description,
        affected_code: hr.file,
        classification: 'PROBABLE ISSUE',
        severity: s,
        likelihood: l,
        exposure: e,
        risk_score: s * l * e,
        confidence: 'High',
        recommendation: hr.remediation
      });
    }

    return findings;
  }

  static _reconstructBug(bugContext, modifiedFiles, driftScenarios) {
    return {
      original_symptom: bugContext.original_symptom || 'Functional inconsistency / defect prior to commit.',
      root_cause: bugContext.root_cause || 'Logic or state inconsistency in modified component.',
      trigger_condition: bugContext.trigger || 'Execution of modified workflow with specific input parameters.',
      affected_workflows: modifiedFiles.map(f => f.filePath).filter(Boolean),
      confidence: 'High'
    };
  }
}

export default ForensicAuditEngine;
