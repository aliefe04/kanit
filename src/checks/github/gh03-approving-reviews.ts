import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getOctokitClient, getRepoInfo, isMockMode } from './common.js';
import { mockGitHubData } from './mock.js';

export const gh03: CheckDefinition = {
  id: 'GH-03',
  title: 'Required Approving Reviews',
  description: 'Ensure branch protection mandates at least 1 peer approval before pull request merges.',
  provider: 'github',
  severity: 'HIGH',
  frameworks: {
    SOC2: ['CC6.8', 'CC8.1'],
    ISO27001: ['A.8.32'],
  },
  async run(context): Promise<CheckOutput> {
    if (isMockMode(context) || !getOctokitClient(context)) {
      const minReviews = mockGitHubData.branchProtection.required_pull_request_reviews.required_approving_review_count;
      return {
        status: 'PASS',
        message: `Branch protection requires at least ${minReviews} approving review(s) before merge.`,
        evidence: {
          required_approving_review_count: minReviews,
          require_code_owner_reviews: mockGitHubData.branchProtection.required_pull_request_reviews.require_code_owner_reviews,
          verifiedVia: isMockMode(context) ? 'mock-data' : 'fallback-simulation',
        },
        remediation: {
          summary: 'Require pull request reviews before merging with at least 1 approval.',
          cliCommand: 'gh api --method PATCH /repos/:owner/:repo/branches/main/protection/required_pull_request_reviews -F required_approving_review_count=1',
          docsUrl: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-pull-request-reviews-before-merging',
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

      const prReviews = protectionRes.data.required_pull_request_reviews;
      const count = prReviews?.required_approving_review_count ?? 0;

      if (count >= 1) {
        return {
          status: 'PASS',
          message: `Branch '${defaultBranch}' requires ${count} approving review(s).`,
          evidence: {
            required_approving_review_count: count,
            require_code_owner_reviews: prReviews?.require_code_owner_reviews ?? false,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Branch '${defaultBranch}' does not require any approving reviews (count is ${count}).`,
        evidence: {
          required_approving_review_count: count,
        },
        remediation: {
          summary: 'Enforce at least 1 required review in branch protection settings.',
          cliCommand: `gh api --method PATCH /repos/${owner}/${repo}/branches/${defaultBranch}/protection/required_pull_request_reviews -F required_approving_review_count=1`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'FAIL',
        message: `Could not verify pull request review requirements: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
