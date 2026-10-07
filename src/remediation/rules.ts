import type { CheckRemediation, CheckResult } from '../core/types.js';

export interface RemediationPlan {
  checkId: string;
  title: string;
  severity: string;
  status: string;
  remediation: CheckRemediation;
  steps: string[];
}

export const REMEDIATION_RULES: Record<string, { steps: string[]; defaultRemediation: CheckRemediation }> = {
  'GH-01': {
    steps: [
      'Log into GitHub as an Organization Owner.',
      'Go to Organization Settings -> Security -> Authentication security.',
      'Under "Two-factor authentication", check "Require two-factor authentication for everyone in your organization".',
      'Click Save and notify organization members.',
    ],
    defaultRemediation: {
      summary: 'Enforce two-factor authentication organization-wide.',
      cliCommand: 'gh api --method PATCH /orgs/:org -f two_factor_requirement_enabled=true',
      docsUrl: 'https://docs.github.com/en/organizations/keeping-your-organization-to-date/requiring-two-factor-authentication-in-your-organization',
    },
  },
  'GH-02': {
    steps: [
      'Open Repository Settings -> Branches.',
      'Under Branch protection rules, click "Add rule".',
      'Set Branch name pattern to "main" (or your default branch).',
      'Check "Require a pull request before merging" and "Do not allow bypassing the above settings".',
      'Save changes.',
    ],
    defaultRemediation: {
      summary: 'Enable branch protection on the primary production branch.',
      cliCommand: 'gh api --method PUT /repos/:owner/:repo/branches/main/protection -f enforce_admins=true',
      terraform: `resource "github_branch_protection" "main" {
  repository_id = github_repository.repo.node_id
  pattern       = "main"
  enforce_admins = true
}`,
      docsUrl: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches',
    },
  },
  'GH-03': {
    steps: [
      'Open Repository Settings -> Branches -> Edit rule for default branch.',
      'Under "Require a pull request before merging", ensure "Require approvals" is checked.',
      'Set "Required number of approvals before merging" to 1 or higher.',
      'Save changes.',
    ],
    defaultRemediation: {
      summary: 'Mandate peer code review before pull request merges.',
      cliCommand: 'gh api --method PATCH /repos/:owner/:repo/branches/main/protection/required_pull_request_reviews -F required_approving_review_count=1',
      docsUrl: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches',
    },
  },
  'GH-04': {
    steps: [
      'Navigate to Repository Settings -> Branches -> Edit branch protection rule.',
      'Ensure "Allow force pushes" is unchecked.',
      'Ensure "Allow deletions" is unchecked.',
      'Save changes.',
    ],
    defaultRemediation: {
      summary: 'Prohibit force pushes and branch deletions on protected branches.',
      cliCommand: 'gh api --method PUT /repos/:owner/:repo/branches/main/protection -F allow_force_pushes=false -F allow_deletions=false',
    },
  },
  'GH-05': {
    steps: [
      'Navigate to Repository Settings -> Branches -> Edit branch protection rule.',
      'Check "Require signed commits".',
      'Ensure engineers configure GPG or SSH signing in local git configs.',
    ],
    defaultRemediation: {
      summary: 'Require GPG/SSH commit signature verification.',
      cliCommand: 'gh api --method POST /repos/:owner/:repo/branches/main/protection/required_signatures',
      docsUrl: 'https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification',
    },
  },
  'GH-06': {
    steps: [
      'Go to Repository Settings -> Code security and analysis.',
      'Enable "Dependabot alerts" and "Dependabot security updates".',
      'Enable "Secret scanning" and "Push protection".',
    ],
    defaultRemediation: {
      summary: 'Enable Dependabot alerts, Secret Scanning, and Push Protection.',
      cliCommand: 'gh api --method PUT /repos/:owner/:repo/vulnerability-alerts',
      docsUrl: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning',
    },
  },
  'GH-07': {
    steps: [
      'Go to Repository Settings -> Branches -> Edit branch protection rule.',
      'Check "Dismiss stale pull request approvals when new commits are pushed".',
      'Save changes.',
    ],
    defaultRemediation: {
      summary: 'Automatically dismiss pull request approvals when new commits are pushed.',
      cliCommand: 'gh api --method PATCH /repos/:owner/:repo/branches/main/protection/required_pull_request_reviews -F dismiss_stale_reviews=true',
    },
  },
  'AWS-01': {
    steps: [
      'Log into the AWS Management Console with your Root account credentials.',
      'Click on your account name in top right -> Security Credentials.',
      'Under "Multi-factor authentication (MFA)", click "Assign MFA device".',
      'Select Authenticator app or FIDO2 security key and complete setup.',
    ],
    defaultRemediation: {
      summary: 'Enable hardware or virtual MFA for the AWS root account.',
      docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
    },
  },
  'AWS-02': {
    steps: [
      'Log into AWS as root.',
      'Navigate to IAM -> Security Credentials -> Access keys.',
      'Locate any active or inactive root access keys.',
      'Delete the access keys. Use IAM users or IAM Identity Center roles instead.',
    ],
    defaultRemediation: {
      summary: 'Permanently remove all root account access keys.',
      cliCommand: 'aws iam delete-access-key --access-key-id <KEY_ID>',
      docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html',
    },
  },
  'AWS-03': {
    steps: [
      'Open Amazon S3 Console -> Block Public Access settings for this account.',
      'Click Edit, check "Block all public access", and confirm changes.',
      'For individual buckets, navigate to Bucket Permissions -> Block public access and enable all four settings.',
    ],
    defaultRemediation: {
      summary: 'Enable S3 Block Public Access across account and buckets.',
      cliCommand: 'aws s3api put-public-access-block --bucket <BUCKET> --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"',
      terraform: `resource "aws_s3_bucket_public_access_block" "block" {
  bucket                  = aws_s3_bucket.main.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
      docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html',
    },
  },
  'AWS-04': {
    steps: [
      'Open AWS CloudTrail Console -> Trails -> Create trail.',
      'Enter trail name, select "Apply trail to all regions".',
      'Enable "Log file validation" under Additional settings.',
      'Select or create an S3 bucket with KMS encryption.',
      'Start logging.',
    ],
    defaultRemediation: {
      summary: 'Enable multi-region CloudTrail with log validation.',
      cliCommand: 'aws cloudtrail create-trail --name audit-trail --s3-bucket-name <BUCKET> --is-multi-region-trail --enable-log-file-validation',
      terraform: `resource "aws_cloudtrail" "trail" {
  name                          = "audit-trail"
  s3_bucket_name                = aws_s3_bucket.audit.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
}`,
      docsUrl: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html',
    },
  },
  'AWS-05': {
    steps: [
      'Open Amazon EC2 Console in your target region.',
      'Under "EC2 Dashboard", select "Data protection and security".',
      'Click "Manage" under "Always encrypt new EBS volumes".',
      'Check "Always encrypt new EBS volumes" and select default KMS key.',
    ],
    defaultRemediation: {
      summary: 'Enable default EBS volume encryption in the AWS region.',
      cliCommand: 'aws ec2 enable-ebs-encryption-by-default',
      terraform: `resource "aws_ebs_encryption_by_default" "example" {
  enabled = true
}`,
      docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSEncryption.html#encryption-by-default',
    },
  },
  'AWS-06': {
    steps: [
      'Identify unencrypted RDS instances.',
      'Create a snapshot of the unencrypted RDS database.',
      'Copy the DB snapshot, choosing "Enable encryption" and selecting a KMS key.',
      'Restore a new RDS instance from the encrypted snapshot.',
      'Switch application traffic to the encrypted database instance.',
    ],
    defaultRemediation: {
      summary: 'Migrate unencrypted RDS databases to KMS-encrypted instances.',
      docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html',
    },
  },
  'AWS-07': {
    steps: [
      'Open IAM Console -> Account settings.',
      'Under "Password policy", click "Set password policy".',
      'Set minimum password length to 14 or higher.',
      'Require at least one uppercase, lowercase, number, and non-alphanumeric character.',
      'Enable password expiration (90 days) and prevent reuse (24 passwords).',
    ],
    defaultRemediation: {
      summary: 'Enforce strong IAM account password policy.',
      cliCommand: 'aws iam update-account-password-policy --minimum-password-length 14 --require-symbols --require-numbers --require-uppercase-characters --require-lowercase-characters --max-password-age 90 --password-reuse-prevention 24',
      docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html',
    },
  },
  'AWS-08': {
    steps: [
      'Open EC2 Console -> Security Groups.',
      'Locate flagged security group IDs.',
      'In Inbound rules, edit rules for ports 22, 3389, 5432, 3306.',
      'Remove 0.0.0.0/0 or ::/0 and restrict to specific office CIDRs or private VPNs.',
    ],
    defaultRemediation: {
      summary: 'Remove 0.0.0.0/0 ingress on administrative and database ports.',
      cliCommand: 'aws ec2 revoke-security-group-ingress --group-id <SG_ID> --protocol tcp --port <PORT> --cidr 0.0.0.0/0',
      docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/authorizing-access-to-an-instance.html',
    },
  },
  'AWS-09': {
    steps: [
      'Open IAM Console -> Users.',
      'For users with keys > 90 days old, generate a new secondary access key.',
      'Deploy the new access key to consuming applications/pipelines.',
      'Deactivate the old access key.',
      'Once verified, delete the old access key.',
    ],
    defaultRemediation: {
      summary: 'Rotate IAM user access keys older than 90 days.',
      cliCommand: 'aws iam update-access-key --user-name <USER> --access-key-id <OLD_KEY> --status Inactive',
      docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_RotateAccessKey',
    },
  },
  'AWS-10': {
    steps: [
      'Open Amazon S3 Console -> Buckets.',
      'Select the unencrypted bucket -> Properties tab.',
      'Under "Default encryption", click Edit.',
      'Select "Server-side encryption with Amazon S3 managed keys (SSE-S3)" or AWS KMS.',
      'Save changes.',
    ],
    defaultRemediation: {
      summary: 'Enable default SSE-S3 or SSE-KMS encryption on all S3 buckets.',
      cliCommand: 'aws s3api put-bucket-encryption --bucket <BUCKET> --server-side-encryption-configuration \'{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}\'',
      terraform: `resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.example.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}`,
      docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html',
    },
  },
};

export function getRemediationPlan(result: CheckResult): RemediationPlan {
  const rule = REMEDIATION_RULES[result.id];
  const remediation = result.remediation || rule?.defaultRemediation || {
    summary: `Remediate ${result.id} (${result.title})`,
  };

  return {
    checkId: result.id,
    title: result.title,
    severity: result.severity,
    status: result.status,
    remediation,
    steps: rule?.steps || [remediation.summary],
  };
}
