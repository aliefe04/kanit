import { describe, it, expect } from 'vitest';
import {
  formatTerminal,
  formatJson,
  formatMarkdown,
  formatHtml,
  generatePdfReport,
} from '../src/exporters/index.js';
import type { AuditSummary } from '../src/core/types.js';

describe('Exporters', () => {
  const sampleSummary: AuditSummary = {
    timestamp: '2026-09-06T12:00:00Z',
    score: 85,
    frameworkScores: { SOC2: 88, ISO27001: 82 },
    total: 2,
    passed: 1,
    failed: 1,
    manual: 0,
    errors: 0,
    skipped: 0,
    scanDurationMs: 45,
    evidenceSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    results: [
      {
        id: 'GH-01',
        title: 'Organization MFA Enforcement',
        provider: 'github',
        severity: 'CRITICAL',
        status: 'PASS',
        frameworks: { SOC2: ['CC6.1'], ISO27001: ['A.5.15'] },
        message: 'MFA is enforced',
        durationMs: 15,
        evidence: { twoFactorRequirementEnabled: true },
      },
      {
        id: 'AWS-01',
        title: 'Root Account MFA',
        provider: 'aws',
        severity: 'CRITICAL',
        status: 'FAIL',
        frameworks: { SOC2: ['CC6.1'] },
        message: 'MFA not enabled on root account',
        durationMs: 20,
        evidence: { mfaEnabled: false },
        remediation: {
          summary: 'Enable MFA on root account',
          docsUrl: 'https://docs.aws.amazon.com',
        },
      },
    ],
  };

  it('should format terminal text with ANSI codes and summary stats', () => {
    const text = formatTerminal(sampleSummary);
    expect(text).toContain('KANIT');
    expect(text).toContain('GH-01');
    expect(text).toContain('AWS-01');
    expect(text).toContain('85%');
  });

  it('should format JSON payload with schema and hash integrity', () => {
    const jsonStr = formatJson(sampleSummary);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.schemaVersion).toBe('kanit-audit-v1');
    expect(parsed.evidenceIntegrity.hash).toBe(sampleSummary.evidenceSha256);
    expect(parsed.audit.score).toBe(85);
  });

  it('should format Markdown report with matrix and attestation block', () => {
    const md = formatMarkdown(sampleSummary);
    expect(md).toContain('# Compliance Audit Report — Kanit');
    expect(md).toContain('Auditor Attestation Section');
    expect(md).toContain('`GH-01`');
    expect(md).toContain('`AWS-01`');
  });

  it('should format HTML report with styling and cards', () => {
    const html = formatHtml(sampleSummary);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('KAN<span>IT</span>');
    expect(html).toContain('GH-01');
    expect(html).toContain('AWS-01');
  });

  it('should generate valid PDF bytes using pdf-lib without native bindings', async () => {
    const pdfBytes = await generatePdfReport(sampleSummary);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
    // PDF Magic bytes: %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
  });
});
