export const mockAwsData = {
  iam: {
    summary: {
      AccountMFAEnabled: 1,
      AccountAccessKeysPresent: 0,
    },
    passwordPolicy: {
      MinimumPasswordLength: 14,
      RequireSymbols: true,
      RequireNumbers: true,
      RequireUppercaseCharacters: true,
      RequireLowercaseCharacters: true,
      AllowUsersToChangePassword: true,
      ExpirePasswords: true,
      MaxPasswordAge: 90,
      PasswordReusePrevention: 24,
      HardExpiry: false,
    },
    accessKeys: [
      {
        UserName: 'ci-bot',
        AccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        Status: 'Active',
        CreateDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        DaysOld: 30,
      },
    ],
  },
  s3: {
    publicAccessBlock: {
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    },
    buckets: [
      {
        name: 'acme-production-data',
        publicAccessBlock: true,
        encrypted: true,
        kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/acme-s3-key',
      },
      {
        name: 'acme-audit-logs',
        publicAccessBlock: true,
        encrypted: true,
        kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/acme-audit-key',
      },
    ],
  },
  cloudtrail: {
    trails: [
      {
        Name: 'acme-organization-audit-trail',
        IsMultiRegionTrail: true,
        LogFileValidationEnabled: true,
        IncludeGlobalServiceEvents: true,
        Status: {
          IsLogging: true,
          LatestDeliveryTime: new Date().toISOString(),
        },
      },
    ],
  },
  ec2: {
    ebsEncryptionByDefault: true,
    securityGroups: [
      {
        GroupId: 'sg-0123456789abcdef0',
        GroupName: 'production-alb-sg',
        IpPermissions: [
          {
            FromPort: 443,
            ToPort: 443,
            IpProtocol: 'tcp',
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
          },
          {
            FromPort: 80,
            ToPort: 80,
            IpProtocol: 'tcp',
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
          },
        ],
      },
      {
        GroupId: 'sg-0987654321fedcba0',
        GroupName: 'internal-database-sg',
        IpPermissions: [
          {
            FromPort: 5432,
            ToPort: 5432,
            IpProtocol: 'tcp',
            IpRanges: [{ CidrIp: '10.0.0.0/16' }],
          },
        ],
      },
    ],
  },
  rds: {
    instances: [
      {
        DBInstanceIdentifier: 'acme-prod-db',
        StorageEncrypted: true,
        KmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/acme-rds-key',
        Engine: 'postgres',
        DBInstanceStatus: 'available',
      },
    ],
  },
};
