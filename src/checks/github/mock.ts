export const mockGitHubData = {
  org2FA: {
    enabled: true,
    two_factor_requirement_enabled: true,
    org: 'acme-corp',
    enforcedMembersCount: 42,
  },
  branchProtection: {
    branch: 'main',
    protected: true,
    required_status_checks: {
      strict: true,
      contexts: ['continuous-integration/build', 'test'],
    },
    enforce_admins: {
      enabled: true,
    },
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
      required_approving_review_count: 2,
    },
    restrictions: null,
    allow_force_pushes: {
      enabled: false,
    },
    allow_deletions: {
      enabled: false,
    },
    required_signatures: {
      enabled: true,
    },
  },
  securityFeatures: {
    dependabot_alerts_enabled: true,
    secret_scanning_enabled: true,
    secret_scanning_push_protection_enabled: true,
  },
};
