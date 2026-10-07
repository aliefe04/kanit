import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws06: CheckDefinition = {
  id: 'AWS-06',
  title: 'RDS Storage Encryption',
  description: 'Ensure all RDS DB instances have KMS-backed storage encryption enabled.',
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
        message: 'All RDS database instances are encrypted at rest with AWS KMS.',
        evidence: {
          instances: mockAwsData.rds.instances,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Enable storage encryption when creating RDS instances or migrate unencrypted instances via snapshot copy.',
          docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html',
        },
      };
    }

    try {
      const rds = new RDSClient({ region: getAwsRegion(context) });
      const res = await rds.send(new DescribeDBInstancesCommand({}));
      const instances = res.DBInstances || [];

      const unencrypted: string[] = [];
      const audited: string[] = [];

      for (const db of instances) {
        const id = db.DBInstanceIdentifier || 'unknown-id';
        audited.push(id);
        if (!db.StorageEncrypted) {
          unencrypted.push(id);
        }
      }

      if (unencrypted.length === 0) {
        return {
          status: 'PASS',
          message: `All ${audited.length} RDS instances have storage encryption enabled.`,
          evidence: {
            auditedInstances: audited,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Found ${unencrypted.length} RDS instance(s) lacking storage encryption: ${unencrypted.join(', ')}`,
        evidence: {
          unencryptedInstances: unencrypted,
          totalAudited: audited.length,
        },
        remediation: {
          summary: 'Take a snapshot of the unencrypted RDS instance, copy the snapshot with encryption enabled, and restore from the encrypted snapshot.',
          docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect RDS storage encryption: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
