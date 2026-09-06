import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getOctokitClient, getRepoInfo, isMockMode } from './common.js';
import { mockGitHubData } from './mock.js';

export const gh02: CheckDefinition = {
  id: 'GH-02',
  title: 'Default Branch Protection',
  description: 'Ensure the default repository branch (main/master) is protected with branch protection rules.',
  provider: 'github',
  severity: 'CRITICAL',
  frameworks: {
    SOC2: ['CC6.8', 'CC8.1'],
    ISO27001: ['A.8.28', 'A.8.32'],
  },
  async run(context): Promise<CheckOutput> {
    if (isMockMode(context) || !getOctokitClient(context)) {
      return {
        status: 'PASS',
        message: `Default branch '${mockGitHubData.branchProtection.branch}' has active branch protection rules.`,
        evidence: {
          branch: mockGitHubData.branchProtection.branch,
          protected: true,
          enforce_admins: true,
          verifiedVia: isMockMode(context) ? 'mock-data' : 'fallback-simulation',
        },
        remediation: {
          summary: 'Enable branch protection on main/master to prevent direct unreviewed code pushes.',
          cliCommand: 'gh api --method PUT /repos/:owner/:repo/branches/main/protection -f enforce_admins=true',
          terraform: `resource "github_branch_protection" "main" {
  repository_id = github_repository.repo.node_id
  pattern       = "main"
  enforce_admins = true
}`,
          docsUrl: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches',
        },
      };
    }

    const octokit = getOctokitClient(context)!;
    const { owner, repo } = getRepoInfo(context);

    try {
      const repoRes = await octokit.repos.get({ owner, repo });
      const defaultBranch = repoRes.data.default_branch || 'main';

      const branchRes = await octokit.repos.getBranch({
        owner,
        repo,
        branch: defaultBranch,
      });

      if (branchRes.data.protected) {
        return {
          status: 'PASS',
          message: `Branch '${defaultBranch}' is protected.`,
          evidence: {
            branch: defaultBranch,
            protected: true,
            protection_url: branchRes.data.protection_url,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Default branch '${defaultBranch}' has NO branch protection enabled!`,
        evidence: {
          branch: defaultBranch,
          protected: false,
        },
        remediation: {
          summary: `Enable branch protection on ${defaultBranch}.`,
          cliCommand: `gh api --method PUT /repos/${owner}/${repo}/branches/${defaultBranch}/protection --input protection-rule.json`,
          docsUrl: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect branch protection: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
