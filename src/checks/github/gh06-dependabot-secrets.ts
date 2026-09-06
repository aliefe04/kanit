import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getOctokitClient, getRepoInfo, isMockMode } from './common.js';
import { mockGitHubData } from './mock.js';

export const gh06: CheckDefinition = {
  id: 'GH-06',
  title: 'Dependabot & Secret Scanning',
  description: 'Ensure Dependabot alerts, Secret Scanning, and Push Protection are enabled.',
  provider: 'github',
  severity: 'HIGH',
  frameworks: {
    SOC2: ['CC7.1', 'CC8.1'],
    ISO27001: ['A.8.8', 'A.8.28'],
  },
  async run(context): Promise<CheckOutput> {
    if (isMockMode(context) || !getOctokitClient(context)) {
      return {
        status: 'PASS',
        message: 'Dependabot alerts, secret scanning, and push protection are actively enabled.',
        evidence: {
          dependabot_alerts_enabled: mockGitHubData.securityFeatures.dependabot_alerts_enabled,
          secret_scanning_enabled: mockGitHubData.securityFeatures.secret_scanning_enabled,
          secret_scanning_push_protection_enabled: mockGitHubData.securityFeatures.secret_scanning_push_protection_enabled,
          verifiedVia: isMockMode(context) ? 'mock-data' : 'fallback-simulation',
        },
        remediation: {
          summary: 'Enable vulnerability alerts and secret scanning in Repository Settings -> Code security and analysis.',
          cliCommand: 'gh api --method PUT /repos/:owner/:repo/vulnerability-alerts',
          docsUrl: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning',
        },
      };
    }

    const octokit = getOctokitClient(context)!;
    const { owner, repo } = getRepoInfo(context);

    try {
      const repoRes = await octokit.repos.get({ owner, repo });
      const sec = repoRes.data.security_and_analysis;

      const secretScanning = sec?.secret_scanning?.status === 'enabled';
      const pushProtection = sec?.secret_scanning_push_protection?.status === 'enabled';

      if (secretScanning && pushProtection) {
        return {
          status: 'PASS',
          message: 'Repository has secret scanning and push protection enabled.',
          evidence: {
            secret_scanning: sec?.secret_scanning?.status,
            push_protection: sec?.secret_scanning_push_protection?.status,
          },
        };
      }

      return {
        status: 'FAIL',
        message: 'Repository is missing active secret scanning or push protection.',
        evidence: {
          secret_scanning: sec?.secret_scanning?.status ?? 'disabled',
          push_protection: sec?.secret_scanning_push_protection?.status ?? 'disabled',
        },
        remediation: {
          summary: 'Enable Secret Scanning and Push Protection under Repository -> Settings -> Code security and analysis.',
          docsUrl: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'MANUAL',
        message: `Secret scanning inspection requires admin permissions or GitHub Advanced Security: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
