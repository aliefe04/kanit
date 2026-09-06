import { IAMClient, GetAccountSummaryCommand } from '@aws-sdk/client-iam';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws01: CheckDefinition = {
  id: 'AWS-01',
  title: 'Root Account MFA Enforcement',
  description: 'Ensure Multi-Factor Authentication (MFA) is enabled for the AWS root account.',
  provider: 'aws',
  severity: 'CRITICAL',
  frameworks: {
    SOC2: ['CC6.1', 'CC6.2'],
    ISO27001: ['A.5.15', 'A.8.5'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'Root account Multi-Factor Authentication (MFA) is actively enabled.',
        evidence: {
          AccountMFAEnabled: mockAwsData.iam.summary.AccountMFAEnabled === 1,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Log in as root user and configure a hardware or virtual MFA device under Security Credentials.',
          docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
        },
      };
    }

    try {
      const iam = new IAMClient({ region: getAwsRegion(context) });
      const summaryRes = await iam.send(new GetAccountSummaryCommand({}));
      const mfaEnabled = summaryRes.SummaryMap?.AccountMFAEnabled === 1;

      if (mfaEnabled) {
        return {
          status: 'PASS',
          message: 'Root account MFA is enabled.',
          evidence: {
            AccountMFAEnabled: true,
          },
        };
      }

      return {
        status: 'FAIL',
        message: 'Root account does NOT have MFA enabled! Immediate compliance and security risk.',
        evidence: {
          AccountMFAEnabled: false,
        },
        remediation: {
          summary: 'Enable hardware or virtual MFA for the AWS root account immediately.',
          docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect AWS IAM root MFA: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
