import type { AuditSummary, CheckResult } from '../core/types.js';
import { getRemediationPlan, type RemediationPlan, REMEDIATION_RULES } from './rules.js';

export class RemediationEngine {
  getPlansForFailedChecks(summary: AuditSummary): RemediationPlan[] {
    const failed = summary.results.filter(
      (r) => r.status === 'FAIL' || r.status === 'ERROR'
    );
    return failed.map((r) => getRemediationPlan(r));
  }

  getPlanForCheckId(checkId: string, result?: CheckResult): RemediationPlan | null {
    const rule = REMEDIATION_RULES[checkId];
    if (!rule && !result) return null;

    if (result) {
      return getRemediationPlan(result);
    }

    return {
      checkId,
      title: checkId,
      severity: 'HIGH',
      status: 'FAIL',
      remediation: rule!.defaultRemediation,
      steps: rule!.steps,
    };
  }
}
