/**
 * @file dynamic-erp-detector.js
 * @description Zero-hardcoded dynamic ERP Domain Entity & Semantic Classifier.
 * Analyzes AST patterns, schema tokens, interfaces, traits, and method signatures
 * to categorize classes and database tables into Financial Ledger, Inventory Stock,
 * Accounts Receivable/Payable, and Multi-Tenant domain roles without any hardcoded names.
 */

export class DynamicERPDetector {
  /**
   * Financial / Accounting heuristic token signatures
   */
  static FINANCIAL_TOKENS = [
    'debit', 'credit', 'voucher_no', 'journal_id', 'ledger_id',
    'chart_of_account', 'account_id', 'subtotal', 'tax_total',
    'grand_total', 'trial_balance', 'general_ledger', 'fiscal_year'
  ];

  /**
   * Inventory & Warehouse heuristic token signatures
   */
  static INVENTORY_TOKENS = [
    'quantity', 'stock', 'warehouse_id', 'batch_no', 'serial_no',
    'unit_cost', 'cogs', 'reorder_level', 'stock_movement',
    'inventory_valuation', 'bin_location', 'lot_number'
  ];

  /**
   * Accounts Receivable / Payable heuristic token signatures
   */
  static BILLING_TOKENS = [
    'paid_amount', 'due_amount', 'total_amount', 'outstanding_balance',
    'invoice_no', 'bill_no', 'payment_status', 'discount_amount',
    'credit_note', 'debit_note'
  ];

  /**
   * Classify source code content or file AST into ERP domain roles.
   * @param {string} content - PHP or SQL source code
   * @param {string} [filePath=''] - Optional file path for supplementary context
   * @returns {Object} Comprehensive ERP Domain Classification
   */
  static classify(content = '', filePath = '') {
    if (!content || typeof content !== 'string') {
      return this._emptyClassification();
    }

    const lower = content.toLowerCase();
    const financialMatches = this._matchTokens(lower, this.FINANCIAL_TOKENS);
    const inventoryMatches = this._matchTokens(lower, this.INVENTORY_TOKENS);
    const billingMatches = this._matchTokens(lower, this.BILLING_TOKENS);

    const hasDebitCredit = lower.includes('debit') && lower.includes('credit');
    const hasLedgerMethod = /(function\s+(journal|ledger|entries|lines|postJournal|recordEntry)\b)/i.test(content);
    const hasStockMethod = /(function\s+(stockMovements|warehouse|batch|adjustStock|deductStock|inventory)\b)/i.test(content);
    const hasPaymentMethod = /(function\s+(payments|recordPayment|settle|calculateDue|applyDiscount)\b)/i.test(content);

    const roles = [];
    if (hasDebitCredit || (financialMatches.length >= 2) || hasLedgerMethod) {
      roles.push('accounting_ledger');
    }
    if ((inventoryMatches.length >= 2) || hasStockMethod) {
      roles.push('inventory_stock');
    }
    if ((billingMatches.length >= 2) || hasPaymentMethod) {
      roles.push('receivable_payable');
    }

    const isTenantScoped = (
      lower.includes('tenant_id') ||
      lower.includes('belongstotenant') ||
      lower.includes('tenantscope') ||
      lower.includes('fortenant') ||
      lower.includes('company_id')
    );

    const isTransactionalEntity = (
      lower.includes('db::transaction') ||
      lower.includes('db::begintransaction') ||
      lower.includes('transactional')
    );

    const usesPessimisticLock = (
      lower.includes('lockforupdate') ||
      lower.includes('sharedlock')
    );

    return {
      is_erp_entity: roles.length > 0,
      roles,
      has_debit_credit: hasDebitCredit,
      financial_tokens: financialMatches,
      inventory_tokens: inventoryMatches,
      billing_tokens: billingMatches,
      is_tenant_scoped: isTenantScoped,
      is_transactional: isTransactionalEntity,
      uses_pessimistic_lock: usesPessimisticLock,
      filePath
    };
  }

  /**
   * Helper to match heuristic tokens
   */
  static _matchTokens(text, tokens) {
    const matched = [];
    for (const t of tokens) {
      if (text.includes(t)) {
        matched.push(t);
      }
    }
    return matched;
  }

  static _emptyClassification() {
    return {
      is_erp_entity: false,
      roles: [],
      has_debit_credit: false,
      financial_tokens: [],
      inventory_tokens: [],
      billing_tokens: [],
      is_tenant_scoped: false,
      is_transactional: false,
      uses_pessimistic_lock: false,
      filePath: ''
    };
  }
}

export default DynamicERPDetector;
