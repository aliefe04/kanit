import { existsSync, readFileSync, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ComplianceEngine } from './core/engine.js';
import { CheckRegistry, globalRegistry } from './core/registry.js';
import { loadConfig, getDefaultConfig } from './core/config.js';
import { githubChecks } from './checks/github/index.js';
import { awsChecks } from './checks/aws/index.js';
import { RemediationEngine } from './remediation/engine.js';
import {
  formatTerminal,
  formatJson,
  formatMarkdown,
  formatHtml,
  generatePdfReport,
} from './exporters/index.js';
import type {
  AuditSummary,
  CheckContext,
  CheckResult,
  Framework,
  KanitConfig,
  Provider,
  Severity,
} from './core/types.js';

function registerAllChecks(registry: CheckRegistry = globalRegistry): void {
  for (const check of githubChecks) {
    registry.register(check);
  }
  for (const check of awsChecks) {
    registry.register(check);
  }
}

export function createCli(): Command {
  const program = new Command();

  program
    .name('kanit')
    .description('Kanit — Open Source Continuous Compliance Engine (SOC 2 & ISO 27001)')
    .version('0.1.0');

  program
    .command('scan')
    .alias('audit')
    .description('Run compliance checks across AWS and GitHub infrastructure')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--mock', 'Run in mock/offline mode with deterministic test data', false)
    .option('-f, --format <format>', 'Output format: terminal, json, markdown, html, pdf', 'terminal')
    .option('-o, --output <file>', 'Output file path (required for pdf, optional for others)')
    .option('--fail-under <score>', 'Exit with error if overall compliance score is below this number')
    .option('--fail-on-severity <severity>', 'Exit with error if any failure has severity at or above (LOW, MEDIUM, HIGH, CRITICAL)')
    .option('--min-severity <severity>', 'Filter checks to execute by minimum severity')
    .option('-p, --provider <provider>', 'Filter by provider (aws, github)')
    .option('--framework <framework>', 'Filter by framework (SOC2, ISO27001)')
    .option('--strict', 'Fail immediately if credentials are missing instead of falling back to mock', false)
    .action(async (options) => {
      try {
        registerAllChecks();

        const config = loadConfig(options.config);
        const isMock = Boolean(options.mock || process.env.KANIT_MOCK === '1');

        const spinner = ora({
          text: 'Initializing compliance audit engine...',
          isSilent: options.format === 'json',
        }).start();

        const engine = new ComplianceEngine(globalRegistry);

        spinner.text = 'Evaluating compliance controls against infrastructure...';

        const checkContext: CheckContext = {
          mock: isMock,
          githubOwner: config.github?.owner,
          githubRepo: config.github?.repo,
          githubToken: config.github?.tokenEnv ? process.env[config.github.tokenEnv] : process.env.GITHUB_TOKEN,
          awsRegion: config.aws?.region,
          awsProfile: config.aws?.profile,
        };

        const summary = await engine.run({
          provider: options.provider as Provider | undefined,
          framework: options.framework as Framework | undefined,
          severity: options.minSeverity as Severity | undefined,
          context: checkContext,
        });

        spinner.stop();

        const format = (options.format || 'terminal').toLowerCase();

        if (format === 'terminal') {
          console.log(formatTerminal(summary));
          if (options.output) {
            await fs.writeFile(options.output, formatTerminal(summary), 'utf-8');
          }
        } else if (format === 'json') {
          const jsonOut = formatJson(summary);
          if (options.output) {
            await fs.writeFile(options.output, jsonOut, 'utf-8');
          } else {
            console.log(jsonOut);
          }
        } else if (format === 'markdown' || format === 'md') {
          const mdOut = formatMarkdown(summary);
          if (options.output) {
            await fs.writeFile(options.output, mdOut, 'utf-8');
          } else {
            console.log(mdOut);
          }
        } else if (format === 'html') {
          const htmlOut = formatHtml(summary);
          if (options.output) {
            await fs.writeFile(options.output, htmlOut, 'utf-8');
          } else {
            console.log(htmlOut);
          }
        } else if (format === 'pdf') {
          const targetFile = options.output || 'kanit-compliance-report.pdf';
          const pdfBytes = await generatePdfReport(summary);
          await fs.writeFile(targetFile, Buffer.from(pdfBytes));
          console.log(chalk.green(`\n✓ PDF compliance report generated: ${targetFile}\n`));
        } else {
          console.error(chalk.red(`Unsupported format: ${format}. Use terminal, json, markdown, html, or pdf.`));
          process.exit(1);
        }

        // Evaluate exit conditions
        if (options.failUnder) {
          const threshold = parseFloat(options.failUnder);
          if (!isNaN(threshold) && summary.score < threshold) {
            console.error(
              chalk.red(`\n✖ Compliance score ${summary.score}% is below required threshold of ${threshold}%`)
            );
            process.exit(1);
          }
        }

        if (options.failOnSeverity) {
          const targetSev = (options.failOnSeverity as string).toUpperCase() as Severity;
          const severityRanks: Record<Severity, number> = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
          };
          const targetRank = severityRanks[targetSev] || 0;

          const hasBlockingFailure = summary.results.some(
            (r: CheckResult) =>
              (r.status === 'FAIL' || r.status === 'ERROR') &&
              severityRanks[r.severity] >= targetRank
          );

          if (hasBlockingFailure) {
            console.error(
              chalk.red(`\n✖ Audit failed due to violations at or above severity ${targetSev}`)
            );
            process.exit(1);
          }
        }
      } catch (err: unknown) {
        console.error(chalk.red(`Fatal error during audit execution: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  program
    .command('fix')
    .alias('remediate')
    .description('View actionable remediation guidance and automated CLI/Terraform fixes')
    .argument('[checkId]', 'Specific check ID to remediate (e.g. AWS-01 or GH-02)')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--mock', 'Run mock scan to detect failures before planning remediation', false)
    .action(async (checkId, options) => {
      registerAllChecks();
      const remediationEngine = new RemediationEngine();

      if (checkId) {
        const plan = remediationEngine.getPlanForCheckId(checkId.toUpperCase());
        if (!plan) {
          console.error(chalk.red(`Unknown check ID: ${checkId}`));
          process.exit(1);
        }

        console.log(chalk.bold.hex('#6366F1')(`\nRemediation Plan for [${plan.checkId}] ${plan.title}\n`));
        console.log(`${chalk.bold('Summary:')} ${plan.remediation.summary}\n`);
        console.log(chalk.bold('Actionable Steps:'));
        for (let i = 0; i < plan.steps.length; i++) {
          console.log(`  ${i + 1}. ${plan.steps[i]}`);
        }

        if (plan.remediation.cliCommand) {
          console.log(`\n${chalk.bold('CLI Command:')}`);
          console.log(chalk.cyan(`  ${plan.remediation.cliCommand}`));
        }

        if (plan.remediation.terraform) {
          console.log(`\n${chalk.bold('Terraform Definition:')}`);
          console.log(chalk.gray(plan.remediation.terraform));
        }

        if (plan.remediation.docsUrl) {
          console.log(`\n${chalk.bold('Documentation:')}`);
          console.log(chalk.blue(`  ${plan.remediation.docsUrl}`));
        }
        console.log('');
        return;
      }

      // If no checkId provided, run a scan and list remediation for all failures
      const config = loadConfig(options.config);
      const engine = new ComplianceEngine(globalRegistry);
      const summary = await engine.run({
        context: {
          mock: true,
          githubOwner: config.github?.owner,
          githubRepo: config.github?.repo,
        },
      });

      const plans = remediationEngine.getPlansForFailedChecks(summary);

      if (plans.length === 0) {
        console.log(chalk.green('\n✓ No failed controls detected. All checks compliant!\n'));
        return;
      }

      console.log(chalk.bold.yellow(`\nIdentified ${plans.length} controls requiring remediation:\n`));
      for (const p of plans) {
        console.log(`${chalk.bgRed.white.bold(` ${p.checkId} `)} ${chalk.bold(p.title)}`);
        console.log(`  ${chalk.cyan('Action:')} ${p.remediation.summary}`);
        if (p.remediation.cliCommand) {
          console.log(`  ${chalk.gray('$')} ${p.remediation.cliCommand}`);
        }
        console.log('');
      }
    });

  program
    .command('export')
    .description('Export compliance results to JSON, Markdown, HTML, or PDF')
    .requiredOption('-f, --format <format>', 'Target format: json, markdown, html, pdf')
    .requiredOption('-o, --output <file>', 'Output target filepath')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--mock', 'Use mock data', false)
    .action(async (options) => {
      registerAllChecks();
      const config = loadConfig(options.config);
      const engine = new ComplianceEngine(globalRegistry);
      const summary = await engine.run({
        context: {
          mock: true,
          githubOwner: config.github?.owner,
          githubRepo: config.github?.repo,
        },
      });

      const format = options.format.toLowerCase();
      const target = options.output;

      if (format === 'json') {
        await fs.writeFile(target, formatJson(summary), 'utf-8');
      } else if (format === 'markdown' || format === 'md') {
        await fs.writeFile(target, formatMarkdown(summary), 'utf-8');
      } else if (format === 'html') {
        await fs.writeFile(target, formatHtml(summary), 'utf-8');
      } else if (format === 'pdf') {
        const pdfBytes = await generatePdfReport(summary);
        await fs.writeFile(target, Buffer.from(pdfBytes));
      } else {
        console.error(chalk.red(`Invalid export format: ${format}`));
        process.exit(1);
      }

      console.log(chalk.green(`Successfully exported compliance report to ${target}`));
    });

  program
    .command('init')
    .description('Initialize a new kanit.config.json configuration template')
    .option('-p, --path <path>', 'Config output path', 'kanit.config.json')
    .action(async (options) => {
      const targetPath = resolve(process.cwd(), options.path);
      const defaultConfig = getDefaultConfig();
      await fs.writeFile(targetPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      console.log(chalk.green(`✓ Initialized configuration at ${targetPath}`));
    });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const cli = createCli();
  await cli.parseAsync(argv);
}
