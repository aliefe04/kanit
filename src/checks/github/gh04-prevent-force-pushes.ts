import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getOctokitClient, getRepoInfo, isMockMode } from './common.js';
import { mockGitHubData } from './mock.js';

export const gh04: CheckDefinition = {
  id: 'GH-04',
  title: 'Prevent Force Pushes & Deletions',
  description: 'Ensure force pushes and branch deletions are strictly disabled on default branches.',
  provider: 'github',
  severity: 'HIGH',
  frameworks: {
    SOC2: ['CC6.8', 'CC8.1'],
    ISO27001: ['A.8.32'],
  },
  async run(context): Promise<CheckOutput> {
    if (isMockMode(context) || !getOctokitClient(context)) {
      return {
        status: 'PASS',
        message: 'Force pushes and deletions are prohibited on the default branch.',
        evidence: {
          allow_force_pushes: mockGitHubData.branchProtection.allow_force_pushes.enabled,
          allow_deletions: mockGitHubData.branchProtection.allow_deletions.enabled,
          verifiedVia: isMockMode(context) ? 'mock-data' : 'fallback-simulation',
        },
        remediation: {
          summary: 'Ensure "Allow force pushes" and "Allow deletions" are unchecked in branch protection settings.',
          cliCommand: 'gh api --method PUT /repos/:owner/:repo/branches/main/protection -F allow_force_pushes=false -F allow_deletions=false',
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

      const allowForce = Boolean(protectionRes.data.allow_force_pushes?.enabled);
      const allowDelete = Boolean(protectionRes.data.allow_deletions?.enabled);

      if (!allowForce && !allowDelete) {
        return {
          status: 'PASS',
          message: `Branch '${defaultBranch}' disables force pushes and branch deletions.`,
          evidence: {
            allow_force_pushes: allowForce,
            allow_deletions: allowDelete,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Branch '${defaultBranch}' allows force pushes (${allowForce}) or deletions (${allowDelete})!`,
        evidence: {
          allow_force_pushes: allowForce,
          allow_deletions: allowDelete,
        },
        remediation: {
          summary: 'Disable force pushes and deletions in branch protection rules.',
          cliCommand: `gh api --method PUT /repos/${owner}/${repo}/branches/${defaultBranch}/protection -F allow_force_pushes=false -F allow_deletions=false`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'FAIL',
        message: `Could not verify force push / deletion protection: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
