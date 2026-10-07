import type { AuditSummary } from '../core/types.js';

export function formatJson(summary: AuditSummary, pretty: boolean = true): string {
  const payload = {
    schemaVersion: 'kanit-audit-v1',
    evidenceIntegrity: {
      algorithm: 'SHA-256',
      hash: summary.evidenceSha256,
    },
    audit: summary,
  };

  return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
}
