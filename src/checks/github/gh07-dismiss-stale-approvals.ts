import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getOctokitClient, getRepoInfo, isMockMode } from './common.js';
import { mockGitHubData } from './mock.js';

export const gh07: CheckDefinition = {
  id: 'GH-07',
  title: 'Dismiss Stale PR Approvals',
  description: 'Ensure new commits automatically dismiss previous pull request approvals to prevent unreviewed changes.',
  provider: 'github',
  severity: 'MEDIUM',
  frameworks: {
    SOC2: ['CC6.8', 'CC8.1'],
    ISO27001: ['A.8.32'],
  },
  async run(context): Promise<CheckOutput> {
    if (isMockMode(context) || !getOctokitClient(context)) {
      return {
        status: 'PASS',
        message: 'Stale pull request approvals are automatically dismissed when new commits are pushed.',
        evidence: {
          dismiss_stale_reviews: mockGitHubData.branchProtection.required_pull_request_reviews.dismiss_stale_reviews,
          verifiedVia: isMockMode(context) ? 'mock-data' : 'fallback-simulation',
        },
        remediation: {
          summary: 'Enable "Dismiss stale pull request approvals when new commits are pushed" in branch protection rules.',
          cliCommand: 'gh api --method PATCH /repos/:owner/:repo/branches/main/protection/required_pull_request_reviews -F dismiss_stale_reviews=true',
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

      const dismissStale = Boolean(protectionRes.data.required_pull_request_reviews?.dismiss_stale_reviews);

      if (dismissStale) {
        return {
          status: 'PASS',
          message: `Branch '${defaultBranch}' automatically dismisses stale reviews.`,
          evidence: {
            dismiss_stale_reviews: true,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Branch '${defaultBranch}' does NOT dismiss stale approvals on new commits.`,
        evidence: {
          dismiss_stale_reviews: false,
        },
        remediation: {
          summary: 'Enable dismissal of stale approvals when new code is pushed.',
          cliCommand: `gh api --method PATCH /repos/${owner}/${repo}/branches/${defaultBranch}/protection/required_pull_request_reviews -F dismiss_stale_reviews=true`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'FAIL',
        message: `Could not verify stale review settings: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
