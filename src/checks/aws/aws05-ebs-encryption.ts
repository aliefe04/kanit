import { EC2Client, GetEbsEncryptionByDefaultCommand } from '@aws-sdk/client-ec2';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws05: CheckDefinition = {
  id: 'AWS-05',
  title: 'Default EBS Volume Encryption',
  description: 'Ensure EBS volume encryption by default is enabled in the active AWS region.',
  provider: 'aws',
  severity: 'HIGH',
  frameworks: {
    SOC2: ['CC6.1', 'CC6.7'],
    ISO27001: ['A.8.24'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'EBS encryption by default is enabled.',
        evidence: {
          EbsEncryptionByDefault: mockAwsData.ec2.ebsEncryptionByDefault,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Enable EBS encryption by default.',
          cliCommand: 'aws ec2 enable-ebs-encryption-by-default',
          terraform: `resource "aws_ebs_encryption_by_default" "example" {
  enabled = true
}`,
          docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSEncryption.html#encryption-by-default',
        },
      };
    }

    try {
      const ec2 = new EC2Client({ region: getAwsRegion(context) });
      const res = await ec2.send(new GetEbsEncryptionByDefaultCommand({}));
      const enabled = Boolean(res.EbsEncryptionByDefault);

      if (enabled) {
        return {
          status: 'PASS',
          message: 'EBS encryption by default is active in this region.',
          evidence: {
            EbsEncryptionByDefault: true,
            region: getAwsRegion(context),
          },
        };
      }

      return {
        status: 'FAIL',
        message: `EBS encryption by default is DISABLED in region ${getAwsRegion(context)}.`,
        evidence: {
          EbsEncryptionByDefault: false,
          region: getAwsRegion(context),
        },
        remediation: {
          summary: 'Enable default EBS encryption to ensure all new EBS volumes are encrypted at rest.',
          cliCommand: 'aws ec2 enable-ebs-encryption-by-default',
          docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSEncryption.html#encryption-by-default',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect EBS default encryption: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
