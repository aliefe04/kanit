import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KanitConfig } from './types.js';

export function loadConfig(customPath?: string): KanitConfig {
  const targetPath = customPath ? resolve(customPath) : resolve(process.cwd(), 'kanit.config.json');

  if (!existsSync(targetPath)) {
    return getDefaultConfig();
  }

  try {
    const raw = readFileSync(targetPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultConfig(),
      ...parsed,
    };
  } catch (err) {
    console.warn(`Warning: Could not parse configuration at ${targetPath}:`, err);
    return getDefaultConfig();
  }
}

export function getDefaultConfig(): KanitConfig {
  return {
    version: '1.0',
    github: {
      owner: process.env.GITHUB_REPOSITORY_OWNER || process.env.GITHUB_ORG || '',
      repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || '',
      tokenEnv: 'GITHUB_TOKEN',
    },
    aws: {
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
      profile: process.env.AWS_PROFILE || 'default',
      regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    },
    checks: {
      include: [],
      exclude: [],
      severityThreshold: 'LOW',
    },
    reporting: {
      outputDir: './reports',
      formats: ['terminal', 'json'],
    },
  };
}
