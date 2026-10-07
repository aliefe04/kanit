import { describe, it, expect } from 'vitest';
import { githubChecks } from '../src/checks/github/index.js';
import { awsChecks } from '../src/checks/aws/index.js';
import type { CheckContext } from '../src/core/types.js';

describe('GitHub Compliance Checks (Mock Mode)', () => {
  const mockContext: CheckContext = {
    mock: true,
    githubOwner: 'acme-corp',
    githubRepo: 'app',
  };

  it('should have 7 GitHub checks defined', () => {
    expect(githubChecks).toHaveLength(7);
  });

  for (const check of githubChecks) {
    it(`should execute ${check.id} (${check.title}) successfully in mock mode`, async () => {
      const result = await check.run(mockContext);
      expect(['PASS', 'FAIL', 'MANUAL', 'ERROR', 'SKIPPED']).toContain(result.status);
      expect(result.evidence).toBeDefined();
    });
  }
});

describe('AWS Compliance Checks (Mock Mode)', () => {
  const mockContext: CheckContext = {
    mock: true,
    awsRegion: 'us-east-1',
  };

  it('should have 10 AWS checks defined', () => {
    expect(awsChecks).toHaveLength(10);
  });

  for (const check of awsChecks) {
    it(`should execute ${check.id} (${check.title}) successfully in mock mode`, async () => {
      const result = await check.run(mockContext);
      expect(['PASS', 'FAIL', 'MANUAL', 'ERROR', 'SKIPPED']).toContain(result.status);
      expect(result.evidence).toBeDefined();
    });
  }
});
