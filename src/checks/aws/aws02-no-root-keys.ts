import { IAMClient, GetAccountSummaryCommand } from '@aws-sdk/client-iam';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws02: CheckDefinition = {
  id: 'AWS-02',
  title: 'No Active Root Access Keys',
  description: 'Ensure no long-term access keys exist for the AWS root account.',
  provider: 'aws',
  severity: 'CRITICAL',
  frameworks: {
    SOC2: ['CC6.1', 'CC6.3'],
    ISO27001: ['A.5.15', 'A.8.5'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'No active access keys exist for the root user account.',
        evidence: {
          AccountAccessKeysPresent: mockAwsData.iam.summary.AccountAccessKeysPresent,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Delete all root account access keys immediately and use IAM roles instead.',
          cliCommand: 'aws iam delete-access-key --access-key-id <KEY_ID>',
          docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html',
        },
      };
    }

    try {
      const iam = new IAMClient({ region: getAwsRegion(context) });
      const summaryRes = await iam.send(new GetAccountSummaryCommand({}));
      const keysPresent = summaryRes.SummaryMap?.AccountAccessKeysPresent ?? 0;

      if (keysPresent === 0) {
        return {
          status: 'PASS',
          message: 'Zero root access keys found.',
          evidence: {
            AccountAccessKeysPresent: 0,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Detected ${keysPresent} active access key(s) on the root account!`,
        evidence: {
          AccountAccessKeysPresent: keysPresent,
        },
        remediation: {
          summary: 'Delete root access keys. Use IAM users or temporary role credentials.',
          cliCommand: 'aws iam delete-access-key --access-key-id <KEY_ID>',
          docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect root access keys: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
