export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CheckStatus = 'PASS' | 'FAIL' | 'MANUAL' | 'ERROR' | 'SKIPPED';

export type Provider = 'github' | 'aws';

export type Framework = 'SOC2' | 'ISO27001';

export interface CheckRemediation {
  summary: string;
  cliCommand?: string;
  terraform?: string;
  docsUrl?: string;
}

export interface CheckContext {
  mock?: boolean;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  awsRegion?: string;
  awsProfile?: string;
  customOptions?: Record<string, unknown>;
}

export interface CheckResult {
  id: string;
  title: string;
  provider: Provider;
  severity: Severity;
  frameworks: Record<Framework, string[]>;
  status: CheckStatus;
  message: string;
  evidence: Record<string, unknown>;
  remediation?: CheckRemediation;
  timestamp: string;
  durationMs: number;
}

export interface CheckDefinition {
  id: string;
  title: string;
  description: string;
  provider: Provider;
  frameworks: Record<Framework, string[]>;
  severity: Severity;
  run: (context: CheckContext) => Promise<Omit<CheckResult, 'id' | 'title' | 'provider' | 'severity' | 'frameworks' | 'timestamp' | 'durationMs'>>;
}

export interface AuditSummary {
  total: number;
  passed: number;
  failed: number;
  manual: number;
  errors: number;
  skipped: number;
  score: number; // 0 - 100
  frameworkScores: Record<Framework, number>;
  evidenceSha256: string;
  scanDurationMs: number;
  timestamp: string;
  results: CheckResult[];
  metadata: {
    version: string;
    targetProvider?: Provider;
    targetFramework?: Framework;
    mockMode: boolean;
  };
}

export interface KanitConfig {
  version?: string;
  github?: {
    owner?: string;
    repo?: string;
    tokenEnv?: string;
  };
  aws?: {
    region?: string;
    profile?: string;
    regions?: string[];
  };
  checks?: {
    include?: string[];
    exclude?: string[];
    severityThreshold?: Severity;
  };
  reporting?: {
    outputDir?: string;
    formats?: Array<'terminal' | 'json' | 'markdown' | 'html' | 'pdf'>;
  };
}
