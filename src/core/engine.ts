import { hashEvidence } from './crypto.js';
import type { CheckRegistry } from './registry.js';
import type {
  AuditSummary,
  CheckContext,
  CheckResult,
  Framework,
  Provider,
  Severity,
} from './types.js';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export interface EngineRunOptions {
  provider?: Provider;
  framework?: Framework;
  severity?: Severity;
  includeIds?: string[];
  excludeIds?: string[];
  concurrency?: number;
  context?: CheckContext;
}

export class ComplianceEngine {
  constructor(private registry: CheckRegistry) {}

  async run(options: EngineRunOptions = {}): Promise<AuditSummary> {
    const startTime = Date.now();
    const checks = this.registry.filter({
      provider: options.provider,
      framework: options.framework,
      severity: options.severity,
      includeIds: options.includeIds,
      excludeIds: options.excludeIds,
    });

    const concurrency = Math.max(1, options.concurrency ?? 5);
    const context: CheckContext = options.context ?? {};
    const results: CheckResult[] = [];

    // Worker pool execution
    let cursor = 0;
    const executeWorker = async () => {
      while (cursor < checks.length) {
        const index = cursor++;
        const check = checks[index];
        const checkStart = Date.now();
        try {
          const outcome = await check.run(context);
          results.push({
            id: check.id,
            title: check.title,
            provider: check.provider,
            severity: check.severity,
            frameworks: check.frameworks,
            status: outcome.status,
            message: outcome.message,
            evidence: outcome.evidence,
            remediation: outcome.remediation,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - checkStart,
          });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          results.push({
            id: check.id,
            title: check.title,
            provider: check.provider,
            severity: check.severity,
            frameworks: check.frameworks,
            status: 'ERROR',
            message: `Check execution failed: ${errorMessage}`,
            evidence: { error: errorMessage },
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - checkStart,
          });
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, checks.length) }, () => executeWorker());
    await Promise.all(workers);

    // Deterministic sort results by ID
    results.sort((a, b) => a.id.localeCompare(b.id));

    const total = results.length;
    let passed = 0;
    let failed = 0;
    let manual = 0;
    let errors = 0;
    let skipped = 0;

    let totalWeight = 0;
    let earnedWeight = 0;

    const frameworkWeights: Record<Framework, { total: number; earned: number }> = {
      SOC2: { total: 0, earned: 0 },
      ISO27001: { total: 0, earned: 0 },
    };

    for (const r of results) {
      if (r.status === 'PASS') passed++;
      else if (r.status === 'FAIL') failed++;
      else if (r.status === 'MANUAL') manual++;
      else if (r.status === 'ERROR') errors++;
      else if (r.status === 'SKIPPED') skipped++;

      // Scoring calculations
      if (r.status === 'PASS' || r.status === 'FAIL' || r.status === 'ERROR') {
        const weight = SEVERITY_WEIGHTS[r.severity];
        totalWeight += weight;
        if (r.status === 'PASS') {
          earnedWeight += weight;
        }

        for (const [fw, controls] of Object.entries(r.frameworks) as [Framework, string[]][]) {
          if (controls && controls.length > 0 && frameworkWeights[fw]) {
            frameworkWeights[fw].total += weight;
            if (r.status === 'PASS') {
              frameworkWeights[fw].earned += weight;
            }
          }
        }
      }
    }

    const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

    const frameworkScores: Record<Framework, number> = {
      SOC2: frameworkWeights.SOC2.total > 0
        ? Math.round((frameworkWeights.SOC2.earned / frameworkWeights.SOC2.total) * 100)
        : 100,
      ISO27001: frameworkWeights.ISO27001.total > 0
        ? Math.round((frameworkWeights.ISO27001.earned / frameworkWeights.ISO27001.total) * 100)
        : 100,
    };

    // Calculate tamper-evident SHA-256 hash
    const evidenceSha256 = hashEvidence({
      results: results.map((r) => ({
        id: r.id,
        status: r.status,
        evidence: r.evidence,
      })),
      timestamp: new Date().toISOString(),
    });

    return {
      total,
      passed,
      failed,
      manual,
      errors,
      skipped,
      score: overallScore,
      frameworkScores,
      evidenceSha256,
      scanDurationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      results,
      metadata: {
        version: '0.1.0',
        targetProvider: options.provider,
        targetFramework: options.framework,
        mockMode: Boolean(options.context?.mock),
      },
    };
  }
}
