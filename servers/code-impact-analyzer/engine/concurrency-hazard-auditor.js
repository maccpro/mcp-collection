/**
 * @file concurrency-hazard-auditor.js
 * @description Dynamic Concurrency, Race Condition & Idempotency Auditor.
 * Detects lost updates in read-modify-write patterns, missing pessimistic row locks (lockForUpdate),
 * missing idempotency tokens on financial/webhook callbacks, and non-atomic state mutations.
 */

export class ConcurrencyHazardAuditor {
  /**
   * Audit modified files for concurrency and idempotency hazards.
   * @param {Array<Object>} modifiedFiles - Array of file diff objects { filePath, oldContent, newContent, diff }
   * @returns {Object} Concurrency hazard report
   */
  static audit(modifiedFiles = []) {
    const hazards = [];

    for (const file of modifiedFiles) {
      const { filePath = '', newContent = '', diff = '' } = file;
      if (!newContent && !diff) continue;

      const codeToCheck = diff || newContent;

      // 1. Read-Modify-Write without lockForUpdate() on balance or stock
      const rmwHazard = this._detectReadModifyWriteHazard(filePath, codeToCheck, newContent);
      if (rmwHazard) hazards.push(rmwHazard);

      // 2. Missing Idempotency on Payment / Webhook Callbacks
      const idempotencyHazard = this._detectMissingIdempotencyHazard(filePath, codeToCheck, newContent);
      if (idempotencyHazard) hazards.push(idempotencyHazard);

      // 3. TOCTOU (Time-Of-Check to Time-Of-Use) Race Condition Window
      const toctouHazard = this._detectTOCTOUHazard(filePath, codeToCheck, newContent);
      if (toctouHazard) hazards.push(toctouHazard);

      // 4. Queued Financial Worker Missing ShouldBeUnique
      const uniqueJobHazard = this._detectNonUniqueFinancialJob(filePath, codeToCheck, newContent);
      if (uniqueJobHazard) hazards.push(uniqueJobHazard);
    }

    const criticalCount = hazards.filter(h => h.severity === 'CRITICAL').length;
    const highCount = hazards.filter(h => h.severity === 'HIGH').length;

    return {
      status: criticalCount > 0 ? 'CRITICAL_HAZARDS' : (highCount > 0 ? 'HIGH_HAZARDS' : 'SAFE'),
      total_hazards: hazards.length,
      critical_hazards: criticalCount,
      high_hazards: highCount,
      hazards
    };
  }

  /**
   * Detect Read-Modify-Write patterns on sensitive balances without locks
   */
  static _detectReadModifyWriteHazard(filePath, codeToCheck, fullContent) {
    const isBalanceOrStock = /(?:balance|stock|quantity|qty|paid_amount|due_amount|credit_limit|points)\s*(?:\+=|-=|\*=|\/=)/i.test(codeToCheck);
    const hasSave = /(?:->save\(\)|->update\()/i.test(codeToCheck);
    const hasLock = /(?:lockForUpdate|sharedLock|::increment|::decrement|->increment\s*\(|->decrement\s*\(|Cache::lock)/i.test(codeToCheck) ||
                    /(?:lockForUpdate|sharedLock)/i.test(fullContent);

    if (isBalanceOrStock && hasSave && !hasLock) {
      return {
        type: 'CONCURRENCY_LOST_UPDATE_RACE',
        severity: 'CRITICAL',
        risk_score: 5 * 4 * 4, // S=5, L=4, E=4 = 80
        file: filePath,
        title: 'Read-Modify-Write Race Condition (Missing lockForUpdate)',
        description: 'Numeric balance or inventory quantity is read into memory, modified, and saved without a pessimistic row lock (lockForUpdate) or atomic database operation. Under concurrent POS/API bursts, lost updates and ledger corruption will occur.',
        remediation: 'Use Model::where(...)->lockForUpdate()->first() within a DB::transaction, or utilize atomic database increments: Model::where(...)->increment("balance", $amount).'
      };
    }

    return null;
  }

  /**
   * Detect missing idempotency guards in payment or webhook processors
   */
  static _detectMissingIdempotencyHazard(filePath, codeToCheck, fullContent) {
    const isWebhookOrPayment = /(?:webhook|callback|ipn|processPayment|handlePayment|checkout|charge)/i.test(filePath) ||
                               /(?:function\s+(?:handleWebhook|webhook|callback|processPayment|charge|capture))/i.test(codeToCheck);

    const hasStateChange = /(?:create\(|save\(|update\(|increment|decrement)/i.test(codeToCheck);
    const hasIdempotency = /(?:idempotency|transaction_id|reference_id|event_id|already_processed|status\s*===?\s*['"]completed['"]|Cache::lock|unique)/i.test(codeToCheck) ||
                           /(?:idempotency|Cache::lock)/i.test(fullContent);

    if (isWebhookOrPayment && hasStateChange && !hasIdempotency) {
      return {
        type: 'IDEMPOTENCY_MISSING_GUARD',
        severity: 'HIGH',
        risk_score: 4 * 4 * 4, // S=4, L=4, E=4 = 64
        file: filePath,
        title: 'Missing Idempotency Guard in Webhook / Payment Processor',
        description: 'Payment or webhook execution modifies system state without verifying an idempotency key, unique transaction reference, or atomic distributed lock. Network retries will cause duplicate payments or double balance credits.',
        remediation: 'Implement an Idempotency-Key validation check or acquire an atomic lock: Cache::lock("payment:".$txId, 10)->block(5, function() { ... }).'
      };
    }

    return null;
  }

  /**
   * Detect Time-Of-Check to Time-Of-Use (TOCTOU) race conditions
   */
  static _detectTOCTOUHazard(filePath, codeToCheck, fullContent) {
    const checksCondition = /(?:if\s*\(.*(?:\$balance|\$stock|\$quantity|\$qty|->stock|->quantity)\s*(?:>=|>|<=|<))/i.test(codeToCheck);
    const performsActionLater = /(?:->decrement\s*\(|->save\(\)|::create\()/i.test(codeToCheck);
    const hasLock = /(?:lockForUpdate|sharedLock|Cache::lock)/i.test(codeToCheck) || /(?:lockForUpdate)/i.test(fullContent);

    if (checksCondition && performsActionLater && !hasLock) {
      return {
        type: 'CONCURRENCY_TOCTOU_RACE',
        severity: 'HIGH',
        risk_score: 4 * 4 * 3, // S=4, L=4, E=3 = 48
        file: filePath,
        title: 'TOCTOU Race Condition (Check-Then-Act without Lock)',
        description: 'Balance or stock availability is evaluated in an if-condition before performing mutation, but the record is not locked. Another concurrent request can consume the resource between the check and the update.',
        remediation: 'Hold an exclusive database row lock (lockForUpdate()) during the check-and-act window.'
      };
    }

    return null;
  }

  /**
   * Detect queued financial/billing jobs that omit ShouldBeUnique
   */
  static _detectNonUniqueFinancialJob(filePath, codeToCheck, fullContent) {
    const isJob = fullContent.includes('ShouldQueue') || fullContent.includes('implements ShouldQueue');
    const isFinancial = /(?:Invoice|Payment|Billing|Ledger|Payroll|StockTransfer)/i.test(filePath) ||
                        /(?:Invoice|Payment|Billing|Ledger|Payroll)/i.test(fullContent);
    const isUnique = fullContent.includes('ShouldBeUnique') || fullContent.includes('ShouldBeUniqueUntilProcessing');

    if (isJob && isFinancial && !isUnique) {
      return {
        type: 'CONCURRENCY_DUPLICATE_JOB_HAZARD',
        severity: 'MEDIUM',
        risk_score: 3 * 3 * 3, // S=3, L=3, E=3 = 27
        file: filePath,
        title: 'Financial Asynchronous Worker Lacks Unique Queue Constraint',
        description: 'Queue job performs financial or billing operations without implementing ShouldBeUnique. Duplicate job dispatches (e.g. from event retries or webhooks) will execute concurrently.',
        remediation: 'Implement ShouldBeUnique or ShouldBeUniqueUntilProcessing on the queued Job class with a deterministic uniqueId().'
      };
    }

    return null;
  }
}

export default ConcurrencyHazardAuditor;
