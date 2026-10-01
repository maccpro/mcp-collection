/**
 * @file erp-invariant-auditor.js
 * @description Dynamic ERP Business-Invariant Auditor.
 * Enforces fundamental mathematical and operational invariants across
 * double-entry accounting (Debit = Credit), perpetual inventory conservation equations,
 * accounts receivable/payable formulas, and transactional atomicity boundaries.
 */

import { DynamicERPDetector } from './dynamic-erp-detector.js';

export class ERPInvariantAuditor {
  /**
   * Audit source code and diffs for ERP business invariant violations.
   * @param {Array<Object>} modifiedFiles - Array of file diff objects { filePath, oldContent, newContent, diff }
   * @param {Object} [options] - Configuration thresholds
   * @returns {Object} Comprehensive invariant audit report
   */
  static audit(modifiedFiles = [], options = {}) {
    const violations = [];
    const invariantsChecked = {
      accounting_double_entry: 0,
      inventory_stock_conservation: 0,
      receivable_payable_integrity: 0,
      transaction_atomicity: 0
    };

    for (const file of modifiedFiles) {
      const { filePath = '', newContent = '', diff = '' } = file;
      if (!newContent && !diff) continue;

      const codeToCheck = diff || newContent;
      const erpClassification = DynamicERPDetector.classify(newContent, filePath);

      // 1. Double-Entry Accounting Invariant (Debit = Credit)
      invariantsChecked.accounting_double_entry++;
      const accountingViolations = this._auditAccountingInvariants(filePath, codeToCheck, newContent, erpClassification);
      violations.push(...accountingViolations);

      // 2. Inventory Stock Conservation Equation
      invariantsChecked.inventory_stock_conservation++;
      const inventoryViolations = this._auditInventoryInvariants(filePath, codeToCheck, newContent, erpClassification);
      violations.push(...inventoryViolations);

      // 3. Accounts Receivable / Payable Integrity
      invariantsChecked.receivable_payable_integrity++;
      const billingViolations = this._auditBillingInvariants(filePath, codeToCheck, newContent, erpClassification);
      violations.push(...billingViolations);

      // 4. Transaction Atomicity & Rollback Safety
      invariantsChecked.transaction_atomicity++;
      const atomicityViolations = this._auditTransactionAtomicity(filePath, codeToCheck, newContent, erpClassification);
      violations.push(...atomicityViolations);
    }

    const confirmedIssues = violations.filter(v => v.classification === 'CONFIRMED ISSUE');
    const probableIssues = violations.filter(v => v.classification === 'PROBABLE ISSUE');
    const potentialRisks = violations.filter(v => v.classification === 'POTENTIAL RISK');

    return {
      status: confirmedIssues.length === 0 ? 'PASS' : 'FAIL',
      total_violations: violations.length,
      confirmed_count: confirmedIssues.length,
      probable_count: probableIssues.length,
      potential_count: potentialRisks.length,
      invariants_checked: invariantsChecked,
      violations,
      has_accounting_hazard: violations.some(v => v.pillar === 'accounting'),
      has_inventory_hazard: violations.some(v => v.pillar === 'inventory')
    };
  }

  /**
   * 1. Accounting Invariants (Debit = Credit, Ledger Reversals, Precision Drift)
   */
  static _auditAccountingInvariants(filePath, codeToCheck, fullContent, erp) {
    const issues = [];
    const lower = codeToCheck.toLowerCase();

    // Check for asymmetric Debit without Credit or vice versa
    const writesDebit = /(?:'debit'|"debit"|->debit)\s*=>?\s*[^,;\n]+/i.test(codeToCheck);
    const writesCredit = /(?:'credit'|"credit"|->credit)\s*=>?\s*[^,;\n]+/i.test(codeToCheck);

    if (writesDebit && !writesCredit && !codeToCheck.includes('credit')) {
      issues.push({
        pillar: 'accounting',
        rule: 'ACCOUNTING_ASYMMETRIC_JOURNAL_ENTRY',
        classification: 'CONFIRMED ISSUE',
        severity: 5,
        likelihood: 5,
        exposure: 4,
        file: filePath,
        title: 'Asymmetric Journal Entry (Debit without Credit)',
        description: 'Code writes or mutates debit balance without posting a corresponding balancing credit. Violates double-entry fundamental invariant (Debit = Credit).',
        remediation: 'Ensure every journal voucher creates balanced debit and credit ledger rows within a DB::transaction block.'
      });
    } else if (writesCredit && !writesDebit && !codeToCheck.includes('debit')) {
      issues.push({
        pillar: 'accounting',
        rule: 'ACCOUNTING_ASYMMETRIC_JOURNAL_ENTRY',
        classification: 'CONFIRMED ISSUE',
        severity: 5,
        likelihood: 5,
        exposure: 4,
        file: filePath,
        title: 'Asymmetric Journal Entry (Credit without Debit)',
        description: 'Code writes or mutates credit balance without posting a corresponding balancing debit. Violates double-entry fundamental invariant (Debit = Credit).',
        remediation: 'Ensure every journal voucher creates balanced debit and credit ledger rows within a DB::transaction block.'
      });
    }

    // Check for hard delete of accounting records instead of reversal entries
    const hardDeletesLedger = /(?:->where\(.*(?:voucher|journal|ledger|invoice|payment).*\)->delete\(\)|(?:[a-zA-Z0-9_]*(?:Journal|Ledger|Voucher|Payment|Invoice)[a-zA-Z0-9_]*)::(?:destroy\(|(?:find|where).*(?:->delete\(\)|destroy\()))/i.test(codeToCheck);
    if (hardDeletesLedger && !codeToCheck.includes('SoftDeletes')) {
      issues.push({
        pillar: 'accounting',
        rule: 'ACCOUNTING_HARD_DELETE_PROHIBITED',
        classification: 'PROBABLE ISSUE',
        severity: 5,
        likelihood: 4,
        exposure: 4,
        file: filePath,
        title: 'Direct Deletion of Financial / Ledger Record',
        description: 'Detected direct database record deletion on financial ledger entities. Standard GAAP/IFRS bookkeeping requires reversal postings rather than hard database deletes.',
        remediation: 'Implement a void/reversal entry mechanism (Credit note / Reverse Journal) to preserve audit trails.'
      });
    }

    // Check for rounding accumulation drift in calculations
    const loopsWithRounding = /(?:foreach|for|while)\s*\(.*\{[\s\S]*?round\s*\([\s\S]*?\}[\s\S]*?\$\w+\s*\+=/i.test(codeToCheck);
    if (loopsWithRounding) {
      issues.push({
        pillar: 'accounting',
        rule: 'ACCOUNTING_ROUNDING_ACCUMULATION_DRIFT',
        classification: 'POTENTIAL RISK',
        severity: 3,
        likelihood: 4,
        exposure: 3,
        file: filePath,
        title: 'Premature Line-Item Rounding in Total Accumulation',
        description: 'Found round() calls inside iterative item accumulation loops. Early rounding before summation causes accumulated 1-cent rounding drift in financial totals.',
        remediation: 'Sum exact high-precision decimal values and apply final round() only to the grand total.'
      });
    }

    return issues;
  }

  /**
   * 2. Inventory Invariants (Stock Movement Coupling, Negative Stock, Serial/Batch)
   */
  static _auditInventoryInvariants(filePath, codeToCheck, fullContent, erp) {
    const issues = [];
    const lower = codeToCheck.toLowerCase();

    // Check for direct stock decrements without a stock movement ledger record
    const decrementsStock = /(?:->decrement\s*\(\s*['"](?:quantity|stock|qty|on_hand)['"]|(?:->quantity|->stock|->qty)\s*-=)/i.test(codeToCheck);
    const createsStockMovement = /(?:StockMovement|InventoryTransaction|StockLedger|StockEntry|InventoryLog)::create/i.test(codeToCheck) ||
                                 /(?:stockMovements\(\)->create|recordStockMovement)/i.test(codeToCheck);

    if (decrementsStock && !createsStockMovement && !codeToCheck.includes('StockMovement')) {
      issues.push({
        pillar: 'inventory',
        rule: 'INVENTORY_UNLOGGED_STOCK_MUTATION',
        classification: 'CONFIRMED ISSUE',
        severity: 4,
        likelihood: 5,
        exposure: 4,
        file: filePath,
        title: 'Unlogged Inventory Mutation (Stock Ledger Desynchronization)',
        description: 'Stock quantity is decremented directly without recording an accompanying StockMovement or InventoryTransaction ledger entry. Breaches perpetual stock conservation equation.',
        remediation: 'Always dispatch or persist a StockMovement audit record whenever inventory quantity increments or decrements.'
      });
    }

    // Check for unguarded decrements that allow negative stock
    const unguardedDecrement = /(?:->decrement\s*\(\s*['"](?:quantity|stock|qty)['"]\s*,\s*[^)]+\))/i.test(codeToCheck) &&
                               !codeToCheck.includes("where('quantity'") &&
                               !codeToCheck.includes('where("quantity"') &&
                               !codeToCheck.includes('where(\'stock\'');

    if (unguardedDecrement && !codeToCheck.includes('allow_negative_stock')) {
      issues.push({
        pillar: 'inventory',
        rule: 'INVENTORY_NEGATIVE_STOCK_HAZARD',
        classification: 'PROBABLE ISSUE',
        severity: 4,
        likelihood: 4,
        exposure: 4,
        file: filePath,
        title: 'Unguarded Inventory Decrement (Negative Stock Vulnerability)',
        description: 'Inventory is decremented without a defensive atomic check (where quantity >= $qty). High-frequency concurrent orders may drive stock below zero.',
        remediation: 'Add a defensive boundary check or database check constraint: ->where("quantity", ">=", $amount)->decrement("quantity", $amount).'
      });
    }

    return issues;
  }

  /**
   * 3. Accounts Receivable / Payable Invariants (Overpayment & Due Integrity)
   */
  static _auditBillingInvariants(filePath, codeToCheck, fullContent, erp) {
    const issues = [];

    // Check for payment recording without overpayment boundary check
    const recordsPayment = /(?:->paid_amount\s*\+=|->increment\s*\(\s*['"]paid_amount['"]|recordPayment)/i.test(codeToCheck);
    const checksMaxDue = /(?:due_amount|total_amount|outstanding)/i.test(codeToCheck) &&
                         /(?:if\s*\(.*(?:paid|amount).*(?:>|<).*total|validate)/i.test(codeToCheck);

    if (recordsPayment && !checksMaxDue && !codeToCheck.includes('overpayment')) {
      issues.push({
        pillar: 'billing',
        rule: 'BILLING_UNCHECKED_OVERPAYMENT',
        classification: 'POTENTIAL RISK',
        severity: 3,
        likelihood: 3,
        exposure: 3,
        file: filePath,
        title: 'Unchecked Payment Mutation (Overpayment / Negative Due Risk)',
        description: 'Payment is credited or accumulated against an invoice/bill without defensive validation preventing paid_amount from exceeding total_amount.',
        remediation: 'Validate payment amounts against outstanding due balance: if ($payment > $invoice->due_amount) throw new OverpaymentException().'
      });
    }

    return issues;
  }

  /**
   * 4. Transaction Atomicity & Safe Rollbacks
   */
  static _auditTransactionAtomicity(filePath, codeToCheck, fullContent, erp) {
    const issues = [];

    // Detect multiple state-changing saves without DB::transaction
    const saveMatches = codeToCheck.match(/(?:->save\(\)|::create\(|->update\()/g) || [];
    const hasDBTransaction = codeToCheck.includes('DB::transaction') ||
                             codeToCheck.includes('DB::beginTransaction') ||
                             fullContent.includes('DB::transaction');

    if (saveMatches.length >= 2 && !hasDBTransaction && erp.is_erp_entity) {
      issues.push({
        pillar: 'atomicity',
        rule: 'ATOMICITY_NON_TRANSACTIONAL_MULTI_WRITE',
        classification: 'PROBABLE ISSUE',
        severity: 4,
        likelihood: 4,
        exposure: 4,
        file: filePath,
        title: 'Multi-Entity Mutation Outside Database Transaction',
        description: `Found ${saveMatches.length} database mutation calls across ERP entities without an enclosing DB::transaction block. An unexpected failure between operations will leave orphaned partial records.`,
        remediation: 'Wrap multi-table mutations inside DB::transaction(function() { ... }) to ensure atomic commit or clean rollback.'
      });
    }

    // Detect swallowed exceptions in transaction contexts
    const swallowedCatch = /catch\s*\(\s*(?:\\?Exception|\\?Throwable)\s*\$\w+\s*\)\s*\{\s*(?:Log::error|\/\/|return|null;|\})/i.test(codeToCheck);
    if (swallowedCatch && (codeToCheck.includes('DB::') || codeToCheck.includes('save('))) {
      issues.push({
        pillar: 'atomicity',
        rule: 'ATOMICITY_SWALLOWED_EXCEPTION_HAZARD',
        classification: 'CONFIRMED ISSUE',
        severity: 5,
        likelihood: 4,
        exposure: 4,
        file: filePath,
        title: 'Swallowed Exception in Transactional Code Path',
        description: 'Exception caught and swallowed (logged without re-throwing or explicit DB::rollBack()). Causes silent partial failures and prevents transaction rollback.',
        remediation: 'Ensure DB::rollBack() is invoked in catch blocks or allow exceptions to bubble through DB::transaction.'
      });
    }

    return issues;
  }
}

export default ERPInvariantAuditor;
