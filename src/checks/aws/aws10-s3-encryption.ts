import {
  S3Client,
  ListBucketsCommand,
  GetBucketEncryptionCommand,
} from '@aws-sdk/client-s3';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws10: CheckDefinition = {
  id: 'AWS-10',
  title: 'S3 Bucket Server-Side Encryption (SSE)',
  description: 'Ensure S3 buckets have default Server-Side Encryption (SSE-S3 or SSE-KMS) enabled.',
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
        message: 'All S3 buckets have Server-Side Encryption (SSE) enabled.',
        evidence: {
          buckets: mockAwsData.s3.buckets.map((b) => ({ name: b.name, encrypted: b.encrypted })),
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Enable default SSE-KMS or SSE-S3 encryption for all S3 buckets.',
          cliCommand: 'aws s3api put-bucket-encryption --bucket <BUCKET> --server-side-encryption-configuration \'{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]}\'',
          docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html',
        },
      };
    }

    try {
      const s3 = new S3Client({ region: getAwsRegion(context) });
      const bucketsRes = await s3.send(new ListBucketsCommand({}));
      const buckets = bucketsRes.Buckets || [];

      const unencrypted: string[] = [];
      const audited: string[] = [];

      for (const bucket of buckets) {
        if (!bucket.Name) continue;
        audited.push(bucket.Name);
        try {
          const encRes = await s3.send(
            new GetBucketEncryptionCommand({ Bucket: bucket.Name })
          );
          const rules = encRes.ServerSideEncryptionConfiguration?.Rules || [];
          if (rules.length === 0) {
            unencrypted.push(bucket.Name);
          }
        } catch {
          // If ServerSideEncryptionConfigurationNotFoundError is thrown, bucket lacks encryption
          unencrypted.push(bucket.Name);
        }
      }

      if (unencrypted.length === 0) {
        return {
          status: 'PASS',
          message: `All ${audited.length} S3 bucket(s) have default encryption configured.`,
          evidence: {
            auditedBuckets: audited,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Found ${unencrypted.length} S3 bucket(s) without default server-side encryption!`,
        evidence: {
          unencryptedBuckets: unencrypted,
          totalAudited: audited.length,
        },
        remediation: {
          summary: 'Enable default encryption on all unencrypted S3 buckets.',
          cliCommand: `aws s3api put-bucket-encryption --bucket ${unencrypted[0]} --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect S3 bucket encryption: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
