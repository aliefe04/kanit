import type { CheckContext, CheckResult } from '../../core/types.js';

export function isAwsMockMode(context: CheckContext): boolean {
  if (context.mock || process.env.KANIT_MOCK === '1' || process.env.NODE_ENV === 'test') {
    return true;
  }
  // If no AWS credentials or profile are found, fallback to mock mode unless strict is requested
  const hasCreds = Boolean(
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_PROFILE ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
  );
  return !hasCreds;
}

export function getAwsRegion(context: CheckContext): string {
  return context.awsRegion || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
}

export type CheckOutput = Omit<CheckResult, 'id' | 'title' | 'provider' | 'severity' | 'frameworks' | 'timestamp' | 'durationMs'>;
