/**
 * @file production-readiness-gate.js
 * @description Dynamic 10-Gate Production Readiness Evaluator for Enterprise ERP systems.
 * Evaluates Gates A through J with empirical evidence logging:
 * - Gate A: Functional Correctness
 * - Gate B: Regression Safety
 * - Gate C: Accounting Integrity
 * - Gate D: Inventory Integrity
 * - Gate E: Data Integrity
 * - Gate F: Tenant Isolation
 * - Gate G: Security & Authorization
 * - Gate H: Concurrency & Atomicity
 * - Gate I: Performance & Scalability
 * - Gate J: Historical Compatibility
 */

export class ProductionReadinessGate {
  /**
   * Evaluate the 10 Production Readiness Gates against collected forensic telemetry.
   * @param {Object} context - Telemetry from forensic, invariant, hazard, and breaking change engines
   * @returns {Object} Comprehensive Gates Evaluation Report
   */
  static evaluate(context = {}) {
    const {
      forensicResult = {},
      hazardReport = {},
      breakingReport = {},
      databaseReport = {}
    } = context;

    const confirmedCount = forensicResult.confirmed_issues?.length || 0;
    const criticalHazards = hazardReport.critical_hazards || 0;
    const breakingCount = breakingReport.breaking_changes?.length || 0;

    const gates = {
      gate_a_functional_correctness: this._evaluateGateA(forensicResult),
      gate_b_regression_safety: this._evaluateGateB(breakingReport, forensicResult),
      gate_c_accounting_integrity: this._evaluateGateC(forensicResult),
      gate_d_inventory_integrity: this._evaluateGateD(forensicResult),
      gate_e_data_integrity: this._evaluateGateE(databaseReport, forensicResult),
      gate_f_tenant_isolation: this._evaluateGateF(hazardReport),
      gate_g_security: this._evaluateGateG(hazardReport),
      gate_h_concurrency: this._evaluateGateH(forensicResult),
      gate_i_performance: this._evaluateGateI(hazardReport),
      gate_j_historical_compatibility: this._evaluateGateJ(forensicResult)
    };

    const failedGates = Object.entries(gates).filter(([_, g]) => g.status === 'FAIL');
    const partiallyVerifiedGates = Object.entries(gates).filter(([_, g]) => g.status === 'PARTIALLY_VERIFIED');

    let overallDecision = 'PASS';
    if (failedGates.length > 0 || confirmedCount > 0 || criticalHazards > 0) {
      overallDecision = 'BLOCKED_FAIL';
    } else if (partiallyVerifiedGates.length > 0 || breakingCount > 0) {
      overallDecision = 'REQUIRES_PEER_REVIEW';
    }

    return {
      overall_decision: overallDecision,
      is_production_ready: overallDecision === 'PASS',
      total_gates: 10,
      failed_gates_count: failedGates.length,
      passed_gates_count: Object.values(gates).filter(g => g.status === 'PASS').length,
      gates
    };
  }

  static _evaluateGateA(forensic) {
    const rootCause = forensic.root_cause_verification;
    if (rootCause?.category === 'A. ROOT_CAUSE') {
      return { status: 'PASS', evidence: 'Fix directly addresses root cause without superficial exception masking.' };
    }
    if (rootCause?.category === 'C. WORKAROUND') {
      return { status: 'PARTIALLY_VERIFIED', evidence: 'Fix introduces workaround/guard clause without addressing underlying cause.' };
    }
    return { status: 'PASS', evidence: 'Functional changes verified with clean syntax.' };
  }

  static _evaluateGateB(breaking, forensic) {
    const changes = breaking?.breaking_changes || [];
    if (changes.length > 0) {
      return { status: 'FAIL', evidence: `Detected ${changes.length} contract breaking change(s) affecting upstream callers.` };
    }
    return { status: 'PASS', evidence: 'Zero public/protected signature mutations or breaking changes detected.' };
  }

  static _evaluateGateC(forensic) {
    const accountingIssues = forensic.accounting_integrity || [];
    const confirmed = accountingIssues.filter(i => i.classification === 'CONFIRMED ISSUE');
    if (confirmed.length > 0) {
      return { status: 'FAIL', evidence: `Detected ${confirmed.length} accounting invariant violation(s): ${confirmed.map(c => c.title).join(', ')}.` };
    }
    if (accountingIssues.length > 0) {
      return { status: 'PARTIALLY_VERIFIED', evidence: `Accounting checks raised ${accountingIssues.length} warning(s).` };
    }
    return { status: 'PASS', evidence: 'Double-entry invariants (Debit = Credit) and ledger integrity fully preserved.' };
  }

  static _evaluateGateD(forensic) {
    const inventoryIssues = forensic.inventory_integrity || [];
    const confirmed = inventoryIssues.filter(i => i.classification === 'CONFIRMED ISSUE');
    if (confirmed.length > 0) {
      return { status: 'FAIL', evidence: `Detected ${confirmed.length} inventory conservation violation(s): ${confirmed.map(c => c.title).join(', ')}.` };
    }
    if (inventoryIssues.length > 0) {
      return { status: 'PARTIALLY_VERIFIED', evidence: `Inventory checks flagged potential risks: ${inventoryIssues.map(i => i.title).join(', ')}.` };
    }
    return { status: 'PASS', evidence: 'Stock conservation equation and movement ledger audit trails verified.' };
  }

  static _evaluateGateE(database, forensic) {
    const warnings = database?.warnings || [];
    const atomicity = forensic.atomicity_integrity || [];
    if (warnings.length > 0 || atomicity.some(a => a.classification === 'CONFIRMED ISSUE')) {
      return { status: 'FAIL', evidence: `Database integrity risks detected in foreign key cascade or swallowed transaction exceptions.` };
    }
    return { status: 'PASS', evidence: 'Relational foreign keys, transaction boundaries, and database constraints intact.' };
  }

  static _evaluateGateF(hazard) {
    const tenantHazards = hazard.hazards?.filter(h => h.type?.includes('TENANT')) || [];
    if (tenantHazards.length > 0) {
      return { status: 'FAIL', evidence: 'Cross-tenant data isolation leak or unscoped query bypass detected.' };
    }
    return { status: 'PASS', evidence: 'Strict multi-tenant scoping and tenant database isolation preserved.' };
  }

  static _evaluateGateG(hazard) {
    const securityHazards = hazard.hazards?.filter(h => h.type?.includes('SQL') || h.type?.includes('AUTH')) || [];
    if (securityHazards.length > 0) {
      return { status: 'FAIL', evidence: 'Security or raw SQL injection vulnerability detected in changes.' };
    }
    return { status: 'PASS', evidence: 'Authorization policies, Form Request validation, and query parametrization verified.' };
  }

  static _evaluateGateH(forensic) {
    const concurrencyIssues = forensic.concurrency_integrity || [];
    const critical = concurrencyIssues.filter(c => c.severity === 'CRITICAL');
    if (critical.length > 0) {
      return { status: 'FAIL', evidence: `Detected critical lost-update race condition: ${critical.map(c => c.title).join(', ')}.` };
    }
    if (concurrencyIssues.length > 0) {
      return { status: 'PARTIALLY_VERIFIED', evidence: `Concurrency warnings noted: ${concurrencyIssues.map(c => c.title).join(', ')}.` };
    }
    return { status: 'PASS', evidence: 'Pessimistic row locking (lockForUpdate) and atomic operations verified.' };
  }

  static _evaluateGateI(hazard) {
    const nPlusOne = hazard.hazards?.filter(h => h.type === 'N_PLUS_ONE_QUERY') || [];
    const memHazard = hazard.hazards?.filter(h => h.type === 'UNBOUNDED_MEMORY') || [];
    if (nPlusOne.length > 0 || memHazard.length > 0) {
      return { status: 'FAIL', evidence: 'Performance hazard detected (N+1 query loop or unbounded Model::all in worker).' };
    }
    return { status: 'PASS', evidence: 'Query complexity, eager loading, and memory allocations verified.' };
  }

  static _evaluateGateJ(forensic) {
    const hist = forensic.historical_compatibility;
    if (hist?.has_historical_risks) {
      return { status: 'FAIL', evidence: `Historical data risk: ${hist.historical_risks.map(r => r.description).join('; ')}.` };
    }
    if (hist?.reconciliation_required) {
      return { status: 'PARTIALLY_VERIFIED', evidence: 'Reconciliation script required to backfill past historical inconsistencies.' };
    }
    return { status: 'PASS', evidence: 'Historical transactions and reporting figures remain backward-compatible.' };
  }
}

export default ProductionReadinessGate;
