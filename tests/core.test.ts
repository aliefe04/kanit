import { describe, it, expect } from 'vitest';
import { canonicalizeJson, hashEvidence, verifyEvidenceHash } from '../src/core/crypto.js';
import { CheckRegistry } from '../src/core/registry.js';
import { ComplianceEngine } from '../src/core/engine.js';
import { loadConfig, getDefaultConfig } from '../src/core/config.js';
import type { CheckDefinition } from '../src/core/types.js';

describe('Evidence Crypto & Integrity', () => {
  it('should canonicalize JSON deterministically regardless of key order', () => {
    const obj1 = { b: 2, a: 1, nested: { z: 'last', c: 'first' } };
    const obj2 = { nested: { c: 'first', z: 'last' }, a: 1, b: 2 };
    expect(canonicalizeJson(obj1)).toBe(canonicalizeJson(obj2));
  });

  it('should compute SHA-256 evidence hash and verify match', () => {
    const evidence = { user: 'admin', mfa: true, keys: [1, 2, 3] };
    const hash = hashEvidence(evidence);
    expect(hash).toHaveLength(64);
    expect(verifyEvidenceHash(evidence, hash)).toBe(true);

    const tampered = { user: 'admin', mfa: false, keys: [1, 2, 3] };
    expect(verifyEvidenceHash(tampered, hash)).toBe(false);
  });
});

describe('Check Registry', () => {
  it('should register and filter checks by provider and framework', () => {
    const registry = new CheckRegistry();

    const dummyCheck1: CheckDefinition = {
      id: 'TEST-01',
      title: 'Test Check 1',
      description: 'Test Check 1 Description',
      provider: 'github',
      severity: 'HIGH',
      frameworks: { SOC2: ['CC6.1'], ISO27001: [] },
      run: async () => ({
        status: 'PASS',
        message: 'OK',
        evidence: {},
      }),
    };

    const dummyCheck2: CheckDefinition = {
      id: 'TEST-02',
      title: 'Test Check 2',
      description: 'Test Check 2 Description',
      provider: 'aws',
      severity: 'LOW',
      frameworks: { SOC2: [], ISO27001: ['A.8.1'] },
      run: async () => ({
        status: 'FAIL',
        message: 'Failed',
        evidence: {},
      }),
    };

    registry.register(dummyCheck1);
    registry.register(dummyCheck2);

    expect(registry.getAll()).toHaveLength(2);
    expect(registry.get('TEST-01')).toBe(dummyCheck1);
    expect(registry.filter({ provider: 'github' })).toHaveLength(1);
    expect(registry.filter({ framework: 'ISO27001' })).toHaveLength(1);
    expect(registry.filter({ severity: 'HIGH' })).toHaveLength(1);
  });
});

describe('Compliance Engine', () => {
  it('should run checks, aggregate scores, and generate SHA-256 evidence digest', async () => {
    const registry = new CheckRegistry();

    registry.register({
      id: 'C-PASS',
      title: 'Pass Check',
      description: 'Pass Check Description',
      provider: 'aws',
      severity: 'HIGH',
      frameworks: { SOC2: ['CC6.1'], ISO27001: [] },
      run: async () => ({
        status: 'PASS',
        message: 'Pass message',
        evidence: { passing: true },
      }),
    });

    registry.register({
      id: 'C-FAIL',
      title: 'Fail Check',
      description: 'Fail Check Description',
      provider: 'aws',
      severity: 'MEDIUM',
      frameworks: { SOC2: ['CC6.2'], ISO27001: [] },
      run: async () => ({
        status: 'FAIL',
        message: 'Fail message',
        evidence: { passing: false },
      }),
    });

    const engine = new ComplianceEngine(registry);
    const summary = await engine.run();

    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.score).toBeLessThan(100);
    expect(summary.evidenceSha256).toHaveLength(64);
  });
});

describe('Configuration Loader', () => {
  it('should return valid default config', () => {
    const config = getDefaultConfig();
    expect(config.aws?.region).toBe('us-east-1');
    expect(config.reporting?.formats).toContain('terminal');
  });
});
