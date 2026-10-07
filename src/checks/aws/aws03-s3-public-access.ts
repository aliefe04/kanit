import {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws03: CheckDefinition = {
  id: 'AWS-03',
  title: 'S3 Public Access Block',
  description: 'Ensure S3 buckets have Block Public Access settings enabled at account or bucket levels.',
  provider: 'aws',
  severity: 'CRITICAL',
  frameworks: {
    SOC2: ['CC6.1', 'CC6.6', 'CC6.7'],
    ISO27001: ['A.5.15', 'A.8.12'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'All S3 buckets enforce S3 Block Public Access configurations.',
        evidence: {
          publicAccessBlock: mockAwsData.s3.publicAccessBlock,
          bucketsAudited: mockAwsData.s3.buckets.map((b) => b.name),
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Enable S3 Block Public Access on all S3 buckets.',
          cliCommand: 'aws s3api put-public-access-block --bucket <BUCKET> --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"',
          terraform: `resource "aws_s3_bucket_public_access_block" "example" {
  bucket = aws_s3_bucket.example.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
          docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html',
        },
      };
    }

    try {
      const s3 = new S3Client({ region: getAwsRegion(context) });
      const bucketsRes = await s3.send(new ListBucketsCommand({}));
      const buckets = bucketsRes.Buckets || [];

      const openBuckets: string[] = [];
      const auditedBuckets: string[] = [];

      for (const bucket of buckets) {
        if (!bucket.Name) continue;
        auditedBuckets.push(bucket.Name);
        try {
          const blockRes = await s3.send(
            new GetPublicAccessBlockCommand({ Bucket: bucket.Name })
          );
          const conf = blockRes.PublicAccessBlockConfiguration;
          const isProtected =
            conf?.BlockPublicAcls &&
            conf?.BlockPublicPolicy &&
            conf?.IgnorePublicAcls &&
            conf?.RestrictPublicBuckets;

          if (!isProtected) {
            openBuckets.push(bucket.Name);
          }
        } catch {
          openBuckets.push(bucket.Name);
        }
      }

      if (openBuckets.length === 0) {
        return {
          status: 'PASS',
          message: `All ${auditedBuckets.length} audited S3 buckets have Block Public Access active.`,
          evidence: {
            auditedCount: auditedBuckets.length,
            auditedBuckets,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Found ${openBuckets.length} S3 bucket(s) without full Public Access Block!`,
        evidence: {
          openBuckets,
          totalAudited: auditedBuckets.length,
        },
        remediation: {
          summary: 'Enable S3 Public Access Block for all flagged buckets.',
          cliCommand: `aws s3api put-public-access-block --bucket ${openBuckets[0]} --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect S3 Public Access Block: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
