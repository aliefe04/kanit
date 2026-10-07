import {
  CloudTrailClient,
  DescribeTrailsCommand,
  GetTrailStatusCommand,
} from '@aws-sdk/client-cloudtrail';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws04: CheckDefinition = {
  id: 'AWS-04',
  title: 'Multi-Region CloudTrail Enabled',
  description: 'Ensure at least one multi-region CloudTrail trail is active with log file validation enabled.',
  provider: 'aws',
  severity: 'HIGH',
  frameworks: {
    SOC2: ['CC7.2', 'CC7.3'],
    ISO27001: ['A.8.15', 'A.8.17'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'Multi-region CloudTrail is configured and actively recording events with log validation.',
        evidence: {
          trails: mockAwsData.cloudtrail.trails,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Enable CloudTrail in all regions with log file validation enabled.',
          cliCommand: 'aws cloudtrail create-trail --name audit-trail --s3-bucket-name <BUCKET> --is-multi-region-trail --enable-log-file-validation',
          docsUrl: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html',
        },
      };
    }

    try {
      const ct = new CloudTrailClient({ region: getAwsRegion(context) });
      const trailsRes = await ct.send(new DescribeTrailsCommand({ includeShadowTrails: false }));
      const trails = trailsRes.trailList || [];

      let compliantTrailFound = false;
      const auditedTrails: Array<Record<string, unknown>> = [];

      for (const trail of trails) {
        if (!trail.Name) continue;
        let isLogging = false;
        try {
          const statusRes = await ct.send(new GetTrailStatusCommand({ Name: trail.Name }));
          isLogging = Boolean(statusRes.IsLogging);
        } catch {
          // ignore status read errors
        }

        const isMulti = Boolean(trail.IsMultiRegionTrail);
        const hasValidation = Boolean(trail.LogFileValidationEnabled);

        auditedTrails.push({
          name: trail.Name,
          isMultiRegion: isMulti,
          logValidation: hasValidation,
          isLogging,
        });

        if (isMulti && hasValidation && isLogging) {
          compliantTrailFound = true;
          break;
        }
      }

      if (compliantTrailFound) {
        return {
          status: 'PASS',
          message: 'Found active multi-region CloudTrail with log validation enabled.',
          evidence: {
            auditedTrails,
          },
        };
      }

      return {
        status: 'FAIL',
        message: 'No active multi-region CloudTrail with log file validation was found.',
        evidence: {
          auditedTrails,
        },
        remediation: {
          summary: 'Create or update a CloudTrail trail to be multi-region and enable log file validation.',
          cliCommand: 'aws cloudtrail update-trail --name <TRAIL> --is-multi-region-trail --enable-log-file-validation',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect CloudTrail: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
