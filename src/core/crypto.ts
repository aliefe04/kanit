import { createHash } from 'node:crypto';

/**
 * Produces a deterministic canonical JSON string by sorting object keys recursively.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalizeJson(item)).join(',') + ']';
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Computes a SHA-256 hash over canonicalized evidence for audit tamper-proofing.
 */
export function hashEvidence(evidence: unknown): string {
  const canonical = canonicalizeJson(evidence);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Verifies if evidence matches an existing SHA-256 hash.
 */
export function verifyEvidenceHash(evidence: unknown, expectedHash: string): boolean {
  const computed = hashEvidence(evidence);
  return computed.toLowerCase() === expectedHash.toLowerCase();
}
