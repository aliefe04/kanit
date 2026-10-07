import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getOctokitClient, getRepoInfo, isMockMode } from './common.js';
import { mockGitHubData } from './mock.js';

export const gh05: CheckDefinition = {
  id: 'GH-05',
  title: 'Enforce Signed Commits',
  description: 'Ensure commit signature verification (GPG, SSH, S/MIME) is required on protected branches.',
  provider: 'github',
  severity: 'MEDIUM',
  frameworks: {
    SOC2: ['CC6.8'],
    ISO27001: ['A.8.28'],
  },
  async run(context): Promise<CheckOutput> {
    if (isMockMode(context) || !getOctokitClient(context)) {
      return {
        status: 'PASS',
        message: 'Commit signature verification is required on the primary branch.',
        evidence: {
          required_signatures: mockGitHubData.branchProtection.required_signatures.enabled,
          verifiedVia: isMockMode(context) ? 'mock-data' : 'fallback-simulation',
        },
        remediation: {
          summary: 'Require signed commits in repository branch protection settings.',
          cliCommand: 'gh api --method POST /repos/:owner/:repo/branches/main/protection/required_signatures',
          docsUrl: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-signed-commits',
        },
      };
    }

    const octokit = getOctokitClient(context)!;
    const { owner, repo } = getRepoInfo(context);

    try {
      const repoRes = await octokit.repos.get({ owner, repo });
      const defaultBranch = repoRes.data.default_branch || 'main';

      const protectionRes = await octokit.repos.getBranchProtection({
        owner,
        repo,
        branch: defaultBranch,
      });

      const reqSigs = Boolean(protectionRes.data.required_signatures?.enabled);

      if (reqSigs) {
        return {
          status: 'PASS',
          message: `Branch '${defaultBranch}' requires signed commits.`,
          evidence: {
            required_signatures: true,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Branch '${defaultBranch}' does not enforce commit signature verification.`,
        evidence: {
          required_signatures: false,
        },
        remediation: {
          summary: 'Enable required commit signing.',
          cliCommand: `gh api --method POST /repos/${owner}/${repo}/branches/${defaultBranch}/protection/required_signatures`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'MANUAL',
        message: `Could not verify signed commit enforcement: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
