import { EC2Client, DescribeSecurityGroupsCommand } from '@aws-sdk/client-ec2';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

const RISKY_PORTS = [22, 3389, 5432, 3306, 27017, 6379];

export const aws08: CheckDefinition = {
  id: 'AWS-08',
  title: 'Security Group Ingress Restrictions',
  description: 'Ensure security groups do not allow unrestricted ingress (0.0.0.0/0) to administrative or database ports (22, 3389, 5432, 3306).',
  provider: 'aws',
  severity: 'CRITICAL',
  frameworks: {
    SOC2: ['CC6.6', 'CC6.7'],
    ISO27001: ['A.8.20', 'A.8.22'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'No security groups expose administrative or database ports to 0.0.0.0/0.',
        evidence: {
          securityGroupsAudited: mockAwsData.ec2.securityGroups.length,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Revoke 0.0.0.0/0 ingress rules for SSH (22), RDP (3389), PostgreSQL (5432), and MySQL (3306).',
          cliCommand: 'aws ec2 revoke-security-group-ingress --group-id <SG_ID> --protocol tcp --port <PORT> --cidr 0.0.0.0/0',
          docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/authorizing-access-to-an-instance.html',
        },
      };
    }

    try {
      const ec2 = new EC2Client({ region: getAwsRegion(context) });
      const res = await ec2.send(new DescribeSecurityGroupsCommand({}));
      const groups = res.SecurityGroups || [];

      const violations: Array<{ groupId: string; groupName?: string; port: number; cidr: string }> = [];

      for (const sg of groups) {
        for (const rule of sg.IpPermissions || []) {
          const fromPort = rule.FromPort ?? 0;
          const toPort = rule.ToPort ?? 65535;

          const isRisky = RISKY_PORTS.some((p) => p >= fromPort && p <= toPort);
          if (!isRisky) continue;

          for (const ipRange of rule.IpRanges || []) {
            if (ipRange.CidrIp === '0.0.0.0/0') {
              violations.push({
                groupId: sg.GroupId || 'unknown',
                groupName: sg.GroupName,
                port: fromPort,
                cidr: ipRange.CidrIp,
              });
            }
          }
        }
      }

      if (violations.length === 0) {
        return {
          status: 'PASS',
          message: `All ${groups.length} security groups have safe ingress rules.`,
          evidence: {
            totalGroups: groups.length,
          },
        };
      }

      return {
        status: 'FAIL',
        message: `Found ${violations.length} unrestricted ingress rules on sensitive ports!`,
        evidence: {
          violations,
        },
        remediation: {
          summary: 'Revoke public ingress on administrative/database ports and restrict to private VPN/CIDR.',
          cliCommand: `aws ec2 revoke-security-group-ingress --group-id ${violations[0].groupId} --protocol tcp --port ${violations[0].port} --cidr 0.0.0.0/0`,
        },
      };
    } catch (err: unknown) {
      return {
        status: 'ERROR',
        message: `Failed to inspect security groups: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
