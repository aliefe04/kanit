import boxen from 'boxen';
import chalk from 'chalk';
import Table from 'cli-table3';
import type { AuditSummary, CheckResult, Severity } from '../core/types.js';

function formatSeverity(severity: Severity): string {
  switch (severity) {
    case 'CRITICAL':
      return chalk.bgRed.white.bold(` ${severity} `);
    case 'HIGH':
      return chalk.red.bold(severity);
    case 'MEDIUM':
      return chalk.yellow(severity);
    case 'LOW':
      return chalk.blue(severity);
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case 'PASS':
      return chalk.green.bold(' PASS ');
    case 'FAIL':
      return chalk.bgRed.white.bold(' FAIL ');
    case 'MANUAL':
      return chalk.bgYellow.black(' MANUAL ');
    case 'ERROR':
      return chalk.bgMagenta.white(' ERROR ');
    case 'SKIPPED':
      return chalk.gray(' SKIPPED ');
    default:
      return status;
  }
}

function renderScoreMeter(score: number): string {
  const barLength = 24;
  const filledLength = Math.round((score / 100) * barLength);
  const emptyLength = barLength - filledLength;

  let colorFn = chalk.red;
  if (score >= 90) colorFn = chalk.green;
  else if (score >= 70) colorFn = chalk.yellow;

  const bar = colorFn('█'.repeat(filledLength)) + chalk.gray('░'.repeat(emptyLength));
  return `${bar} ${colorFn.bold(score + '%')}`;
}

export function formatTerminal(summary: AuditSummary): string {
  const lines: string[] = [];

  const bannerText = `${chalk.bold.hex('#6366F1')('KANIT')} ${chalk.gray('— Continuous Compliance Engine (SOC 2 & ISO 27001)')}\n` +
    `Scan Timestamp : ${chalk.white(summary.timestamp)}\n` +
    `Overall Score  : ${renderScoreMeter(summary.score)}\n` +
    `SOC 2 Score    : ${chalk.cyan(summary.frameworkScores.SOC2 + '%')}   ISO 27001 Score: ${chalk.cyan(summary.frameworkScores.ISO27001 + '%')}\n` +
    `Evidence Hash  : ${chalk.hex('#10B981')(summary.evidenceSha256.substring(0, 16))}... (${chalk.gray('SHA-256')})`;

  lines.push(
    boxen(bannerText, {
      padding: 1,
      margin: 0,
      borderStyle: 'round',
      borderColor: 'magenta',
    })
  );

  // Summary Table
  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Status'),
      chalk.bold('Severity'),
      chalk.bold('Title'),
      chalk.bold('Controls'),
      chalk.bold('Duration'),
    ],
    colWidths: [10, 11, 12, 38, 22, 10],
    wordWrap: true,
  });

  for (const r of summary.results) {
    const controls = [
      ...(r.frameworks.SOC2 || []).map((c) => `SOC2:${c}`),
      ...(r.frameworks.ISO27001 || []).map((c) => `ISO:${c}`),
    ].join(' ');

    table.push([
      chalk.cyan.bold(r.id),
      formatStatus(r.status),
      formatSeverity(r.severity),
      r.title,
      chalk.gray(controls),
      `${r.durationMs}ms`,
    ]);
  }

  lines.push(table.toString());

  // Failures & Warnings Detail
  const failedResults = summary.results.filter(
    (r) => r.status === 'FAIL' || r.status === 'ERROR'
  );

  if (failedResults.length > 0) {
    lines.push('\n' + chalk.bold.red(`🚨 Failed Checks & Remediation (${failedResults.length}):\n`));
    for (const f of failedResults) {
      lines.push(`${chalk.bgRed.white.bold(` ${f.id} `)} ${chalk.bold(f.title)} (${formatSeverity(f.severity)})`);
      lines.push(`  ${chalk.red('Reason:')} ${f.message}`);
      if (f.remediation) {
        lines.push(`  ${chalk.yellow('Remediation:')} ${f.remediation.summary}`);
        if (f.remediation.cliCommand) {
          lines.push(`  ${chalk.gray('$')} ${chalk.cyan(f.remediation.cliCommand)}`);
        }
        if (f.remediation.docsUrl) {
          lines.push(`  ${chalk.blue('Docs:')} ${f.remediation.docsUrl}`);
        }
      }
      lines.push('');
    }
  } else {
    lines.push('\n' + chalk.bold.green('✨ All compliance controls passed successfully!\n'));
  }

  const statBar = `Passed: ${chalk.green.bold(summary.passed)} | ` +
    `Failed: ${chalk.red.bold(summary.failed)} | ` +
    `Manual: ${chalk.yellow.bold(summary.manual)} | ` +
    `Errors: ${chalk.magenta.bold(summary.errors)} | ` +
    `Total: ${chalk.bold(summary.total)} | ` +
    `Time: ${summary.scanDurationMs}ms`;

  lines.push(statBar);

  return lines.join('\n');
}
