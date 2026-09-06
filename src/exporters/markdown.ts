import type { AuditSummary } from '../core/types.js';

export function formatMarkdown(summary: AuditSummary): string {
  const lines: string[] = [];

  lines.push('# Compliance Audit Report — Kanit');
  lines.push('');
  lines.push(`> **Generated:** ${summary.timestamp}  `);
  lines.push(`> **Evidence SHA-256:** \`${summary.evidenceSha256}\`  `);
  lines.push(`> **Overall Compliance Score:** **${summary.score}%**`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| **Overall Score** | **${summary.score}%** |`);
  lines.push(`| **SOC 2 Score** | **${summary.frameworkScores.SOC2}%** |`);
  lines.push(`| **ISO 27001 Score** | **${summary.frameworkScores.ISO27001}%** |`);
  lines.push(`| **Total Checks** | ${summary.total} |`);
  lines.push(`| **Passed** | :white_check_mark: ${summary.passed} |`);
  lines.push(`| **Failed** | :x: ${summary.failed} |`);
  lines.push(`| **Manual / Review** | :warning: ${summary.manual} |`);
  lines.push(`| **Errors** | :interrobang: ${summary.errors} |`);
  lines.push(`| **Duration** | ${summary.scanDurationMs}ms |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Detailed Control Matrix');
  lines.push('');
  lines.push('| ID | Status | Severity | Check Title | Framework Controls |');
  lines.push('|---|:---:|:---:|---|---|');

  for (const r of summary.results) {
    const statusIcon = r.status === 'PASS'
      ? ':white_check_mark: PASS'
      : r.status === 'FAIL'
      ? ':x: **FAIL**'
      : r.status === 'MANUAL'
      ? ':warning: MANUAL'
      : r.status;

    const soc2 = (r.frameworks.SOC2 || []).map((c) => `\`SOC2:${c}\``).join(', ');
    const iso = (r.frameworks.ISO27001 || []).map((c) => `\`ISO:${c}\``).join(', ');
    const controls = [soc2, iso].filter(Boolean).join('; ');

    lines.push(`| \`${r.id}\` | ${statusIcon} | **${r.severity}** | ${r.title} | ${controls} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Findings & Actionable Remediation');
  lines.push('');

  const failed = summary.results.filter(
    (r) => r.status === 'FAIL' || r.status === 'ERROR'
  );

  if (failed.length === 0) {
    lines.push('All security controls met their baseline criteria. No actionable failures detected.');
  } else {
    for (const f of failed) {
      lines.push(`### [${f.id}] ${f.title}`);
      lines.push('');
      lines.push(`- **Status:** ${f.status}`);
      lines.push(`- **Severity:** \`${f.severity}\``);
      lines.push(`- **Observation:** ${f.message}`);
      if (f.remediation) {
        lines.push(`- **Remediation Plan:** ${f.remediation.summary}`);
        if (f.remediation.cliCommand) {
          lines.push('```bash');
          lines.push(f.remediation.cliCommand);
          lines.push('```');
        }
        if (f.remediation.terraform) {
          lines.push('```hcl');
          lines.push(f.remediation.terraform);
          lines.push('```');
        }
        if (f.remediation.docsUrl) {
          lines.push(`- **Reference:** [Documentation](${f.remediation.docsUrl})`);
        }
      }
      lines.push('');
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Auditor Attestation Section');
  lines.push('');
  lines.push('This report was deterministically produced by Kanit Open Source Compliance Engine.');
  lines.push('Evidence authenticity can be verified against the SHA-256 signature above.');
  lines.push('');
  lines.push('- **Auditor Signature:** ________________________________________');
  lines.push('- **Date:** ____________________');
  lines.push('');

  return lines.join('\n');
}
