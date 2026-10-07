import { Octokit } from '@octokit/rest';
import type { CheckContext, CheckResult } from '../../core/types.js';

export function getOctokitClient(context: CheckContext): Octokit | null {
  const token = context.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return null;
  return new Octokit({ auth: token });
}

export function getRepoInfo(context: CheckContext): { owner: string; repo: string } {
  const envRepo = process.env.GITHUB_REPOSITORY;
  let owner = context.githubOwner || process.env.GITHUB_ORG || '';
  let repo = context.githubRepo || '';

  if (!owner && !repo && envRepo) {
    const parts = envRepo.split('/');
    if (parts.length === 2) {
      owner = parts[0];
      repo = parts[1];
    }
  }

  return {
    owner: owner || 'default-owner',
    repo: repo || 'default-repo',
  };
}

export function isMockMode(context: CheckContext): boolean {
  return Boolean(context.mock || process.env.KANIT_MOCK === '1' || process.env.NODE_ENV === 'test');
}

export type CheckOutput = Omit<CheckResult, 'id' | 'title' | 'provider' | 'severity' | 'frameworks' | 'timestamp' | 'durationMs'>;
