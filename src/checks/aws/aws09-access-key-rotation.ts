import {
  IAMClient,
  ListUsersCommand,
  ListAccessKeysCommand,
} from '@aws-sdk/client-iam';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const aws09: CheckDefinition = {
  id: 'AWS-09',
  title: 'IAM Access Key Rotation',
  description: 'Ensure IAM user access keys are rotated at least every 90 days.',
  provider: 'aws',
  severity: 'MEDIUM',
  frameworks: {
    SOC2: ['CC6.1', 'CC6.2'],
    ISO27001: ['A.5.15', 'A.8.5'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'All IAM user access keys are within the 90-day rotation threshold.',
        evidence: {
          accessKeys: mockAwsData.iam.accessKeys,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Rotate any IAM access keys older than 90 days and deactivate unused keys.',
          cliCommand: 'aws iam create-access-key --user-name <USER> && aws iam update-access-key --user-name <USER> --access-key-id <OLD_KEY> --status Inactive',
          docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_RotateAccessKey',
        },
      };
    }

    try {
      const iam = new IAMClient({ region: getAwsRegion(context) });
      const usersRes = await iam.send(new ListUsersCommand({}));
      const users = usersRes.Users || [];

      const oldKeys: Array<{ user: string; keyId: string; ageDays: number }> = [];
      const now = Date.now();

      for (const user of users) {
        if (!user.UserName) continue;
        const keysRes = await iam.send(
          new ListAccessKeysCommand({ UserName: user.UserName })
        );
        for (const meta of keysRes.AccessKeyMetadata || []) {
          if (meta.Status === 'Active' && meta.CreateDate) {
            const ageMs = now - new Date(meta.CreateDate).getTime();
            if (ageMs > NINETY_DAYS_MS) {
              oldKeys.push({
                user: user.UserName,
                keyId: meta.AccessKeyId || 'unknown',
                ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
              });
            }
          }
        }
      }

      if (oldKeys.length === 0) {
        return {
          status: 'PASS',
          message: 'All active IAM access keys are younger than 90 days.',
          evidence: {
            usersAudited: users.length,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Found ${oldKeys.length} active IAM access key(s) exceeding the 90-day rotation policy!`,
        evidence: {
          oldKeys,
        },
        remediation: {
          summary: 'Rotate or revoke IAM access keys older than 90 days.',
          cliCommand: `aws iam update-access-key --user-name ${oldKeys[0].user} --access-key-id ${oldKeys[0].keyId} --status Inactive`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect IAM access key rotation: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
