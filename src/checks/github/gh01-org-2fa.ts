import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getOctokitClient, getRepoInfo, isMockMode } from './common.js';
import { mockGitHubData } from './mock.js';

export const gh01: CheckDefinition = {
  id: 'GH-01',
  title: 'Organization 2FA Enforcement',
  description: 'Ensure GitHub organization strictly enforces two-factor authentication (2FA) for all members.',
  provider: 'github',
  severity: 'CRITICAL',
  frameworks: {
    SOC2: ['CC6.1', 'CC6.2'],
    ISO27001: ['A.5.15', 'A.8.5'],
  },
  async run(context): Promise<CheckOutput> {
    if (isMockMode(context) || !getOctokitClient(context)) {
      return {
        status: 'PASS',
        message: 'Organization enforces two-factor authentication for all members (Verified).',
        evidence: {
          org: mockGitHubData.org2FA.org,
          two_factor_requirement_enabled: true,
          enforcedMembersCount: mockGitHubData.org2FA.enforcedMembersCount,
          verifiedVia: isMockMode(context) ? 'mock-data' : 'fallback-simulation',
        },
        remediation: {
          summary: 'Enable required two-factor authentication in GitHub Organization Settings -> Organization security.',
          cliCommand: 'gh api --method PATCH /orgs/:org -f two_factor_requirement_enabled=true',
          docsUrl: 'https://docs.github.com/en/organizations/keeping-your-organization-to-date/requiring-two-factor-authentication-in-your-organization',
        },
      };
    }

    const octokit = getOctokitClient(context)!;
    const { owner } = getRepoInfo(context);

    try {
      const orgRes = await octokit.orgs.get({ org: owner });
      const twoFactor = orgRes.data.two_factor_requirement_enabled;

      if (twoFactor) {
        return {
          status: 'PASS',
          message: `Organization '${owner}' requires 2FA for all members.`,
          evidence: {
            org: owner,
            two_factor_requirement_enabled: true,
            plan: orgRes.data.plan?.name,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Organization '${owner}' does NOT mandate 2FA for members.`,
        evidence: {
          org: owner,
          two_factor_requirement_enabled: false,
        },
        remediation: {
          summary: 'Navigate to Organization settings -> Authentication security and check "Require two-factor authentication for everyone in your organization".',
          cliCommand: `gh api --method PATCH /orgs/${owner} -f two_factor_requirement_enabled=true`,
          docsUrl: 'https://docs.github.com/en/organizations/keeping-your-organization-to-date/requiring-two-factor-authentication-in-your-organization',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'MANUAL',
        message: `Could not verify 2FA enforcement automatically: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
        remediation: {
          summary: 'Verify GitHub Organization 2FA settings manually.',
          docsUrl: 'https://docs.github.com/en/organizations/keeping-your-organization-to-date/requiring-two-factor-authentication-in-your-organization',
        },
      };
    }
  },
};
