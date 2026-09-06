import { IAMClient, GetAccountPasswordPolicyCommand } from '@aws-sdk/client-iam';
import type { CheckDefinition } from '../../core/types.js';
import { type CheckOutput, getAwsRegion, isAwsMockMode } from './common.js';
import { mockAwsData } from './mock.js';

export const aws07: CheckDefinition = {
  id: 'AWS-07',
  title: 'IAM Password Policy Enforcement',
  description: 'Ensure IAM account password policy enforces length (>=14), complexity, and expiration/reuse limits.',
  provider: 'aws',
  severity: 'MEDIUM',
  frameworks: {
    SOC2: ['CC6.1'],
    ISO27001: ['A.5.17', 'A.8.5'],
  },
  async run(context): Promise<CheckOutput> {
    if (isAwsMockMode(context)) {
      return {
        status: 'PASS',
        message: 'Strong IAM password policy is enforced (length >= 14, symbols, numbers, uppercase, lowercase).',
        evidence: {
          policy: mockAwsData.iam.passwordPolicy,
          verifiedVia: 'mock-data',
        },
        remediation: {
          summary: 'Set a compliant IAM password policy.',
          cliCommand: 'aws iam update-account-password-policy --minimum-password-length 14 --require-symbols --require-numbers --require-uppercase-characters --require-lowercase-characters --max-password-age 90 --password-reuse-prevention 24',
          docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html',
        },
      };
    }

    try {
      const iam = new IAMClient({ region: getAwsRegion(context) });
      const res = await iam.send(new GetAccountPasswordPolicyCommand({}));
      const policy = res.PasswordPolicy;

      if (!policy) {
        return {
          status: 'FAIL',
          message: 'No IAM password policy is set on this account!',
          evidence: {},
          remediation: {
            summary: 'Create a password policy with minimum length >= 14 and complexity requirements.',
            cliCommand: 'aws iam update-account-password-policy --minimum-password-length 14 --require-symbols --require-numbers --require-uppercase-characters --require-lowercase-characters',
          },
        };
      }

      const minLength = (policy.MinimumPasswordLength ?? 0) >= 14;
      const symbols = Boolean(policy.RequireSymbols);
      const numbers = Boolean(policy.RequireNumbers);
      const upper = Boolean(policy.RequireUppercaseCharacters);
      const lower = Boolean(policy.RequireLowercaseCharacters);

      const compliant = minLength && symbols && numbers && upper && lower;

      if (compliant) {
        return {
          status: 'PASS',
          message: 'IAM password policy meets SOC 2 / ISO 27001 requirements.',
          evidence: {
            MinimumPasswordLength: policy.MinimumPasswordLength,
            RequireSymbols: policy.RequireSymbols,
            RequireNumbers: policy.RequireNumbers,
            RequireUppercaseCharacters: policy.RequireUppercaseCharacters,
            RequireLowercaseCharacters: policy.RequireLowercaseCharacters,
            MaxPasswordAge: policy.MaxPasswordAge,
          },
        };
      }

      return {
        status: 'FAIL',
        message: 'IAM password policy does not satisfy minimum complexity or length requirements.',
        evidence: {
          MinimumPasswordLength: policy.MinimumPasswordLength,
          RequireSymbols: policy.RequireSymbols,
          RequireNumbers: policy.RequireNumbers,
          RequireUppercaseCharacters: policy.RequireUppercaseCharacters,
          RequireLowercaseCharacters: policy.RequireLowercaseCharacters,
        },
        remediation: {
          summary: 'Update password policy to require >= 14 chars with mixed case, numbers, and symbols.',
          cliCommand: 'aws iam update-account-password-policy --minimum-password-length 14 --require-symbols --require-numbers --require-uppercase-characters --require-lowercase-characters',
        },
      };
    } catch (err: unknown) {
      return {
        status: 'FAIL',
        message: `No IAM password policy configured: ${err instanceof Error ? err.message : String(err)}`,
        evidence: { error: String(err) },
      };
    }
  },
};
