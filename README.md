# Kanit 🛡️

> Production-ready open-source continuous compliance engine for **SOC 2** and **ISO 27001**. Evaluates real AWS infrastructure and GitHub repositories, verifies evidence integrity using SHA-256 digests, provides automated remediation instructions, and exports auditor-ready reports in Terminal, JSON, Markdown, HTML, and pure JavaScript PDF.

---

## Key Features

- **SOC 2 & ISO 27001 Control Mapping**: Every check maps directly to Trust Services Criteria (`CC6.1`–`CC8.1`) and ISO/IEC 27001:2022 clauses (`A.5`–`A.8`).
- **Real SDKs with Deterministic Mock Fallback**: Production `@aws-sdk/client-*` and `@octokit/rest` integrations that run offline with `--mock` or `KANIT_MOCK=1` when credentials are absent.
- **Tamper-Evident SHA-256 Audit Trail**: Canonicalized JSON evidence hashing ensures auditor verification.
- **Pure JavaScript PDF Generation**: Built with `pdf-lib` without any native binaries, Puppeteer, or canvas dependencies.
- **Automated Remediation Engine**: Concrete AWS CLI, GitHub CLI, and Terraform definitions for every failing control.
- **CI/CD Native**: GitHub Action composite workflow and sub-second CLI scan evaluation.

---

## Installation

```bash
# Run instantly with zero install
npx @aliefe04/kanit scan --mock

# Or install globally
npm install -g @aliefe04/kanit
kanit scan --mock
```

---

## Usage

### Quick Scan (Demo / Mock Mode)
```bash
kanit scan --mock
```

### Full Audit Against Real AWS & GitHub
Ensure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `GITHUB_TOKEN` are in your environment:
```bash
kanit scan --format terminal
```

### Generate Auditor Reports
```bash
# Export PDF Report
kanit scan --mock --format pdf --output compliance-audit.pdf

# Export Markdown Report for PR / Issue comments
kanit scan --mock --format markdown --output AUDIT.md

# Export JSON for SIEM / Data Lakes
kanit scan --mock --format json --output audit.json

# Export HTML Dashboard
kanit scan --mock --format html --output report.html
```

### CI/CD Quality Gate
Fail pipeline if compliance drops below 90% or if any CRITICAL issue is detected:
```bash
kanit scan --fail-under 90 --fail-on-severity CRITICAL
```

### Remediating Findings
```bash
# View all failed controls and their remediation plans
kanit fix --mock

# View specific remediation guide and Terraform snippet
kanit fix AWS-03
kanit fix GH-02
```

---

## Supported Checks

| ID | Provider | Title | Severity | Framework Controls |
|---|---|---|---|---|
| `GH-01` | GitHub | Organization MFA Enforcement | CRITICAL | SOC 2: CC6.1, ISO 27001: A.5.15 |
| `GH-02` | GitHub | Branch Protection Enabled | HIGH | SOC 2: CC8.1, ISO 27001: A.8.28 |
| `GH-03` | GitHub | Pull Request Approvals Required | HIGH | SOC 2: CC8.1, ISO 27001: A.8.32 |
| `GH-04` | GitHub | Prohibit Force Pushes & Deletion | HIGH | SOC 2: CC8.1, ISO 27001: A.8.28 |
| `GH-05` | GitHub | Signed Commit Verification | MEDIUM | SOC 2: CC8.1, ISO 27001: A.8.28 |
| `GH-06` | GitHub | Dependabot & Secret Scanning | HIGH | SOC 2: CC7.1, ISO 27001: A.8.8 |
| `GH-07` | GitHub | Dismiss Stale Approvals on Push | MEDIUM | SOC 2: CC8.1, ISO 27001: A.8.32 |
| `AWS-01` | AWS | Root Account MFA Active | CRITICAL | SOC 2: CC6.1, ISO 27001: A.5.15 |
| `AWS-02` | AWS | No Root Account Access Keys | CRITICAL | SOC 2: CC6.1, ISO 27001: A.5.15 |
| `AWS-03` | AWS | S3 Block Public Access Enabled | CRITICAL | SOC 2: CC6.6, ISO 27001: A.8.20 |
| `AWS-04` | AWS | Multi-Region CloudTrail Active | HIGH | SOC 2: CC7.2, ISO 27001: A.8.15 |
| `AWS-05` | AWS | Default EBS Volume Encryption | HIGH | SOC 2: CC6.7, ISO 27001: A.8.24 |
| `AWS-06` | AWS | RDS Storage Encryption Enabled | HIGH | SOC 2: CC6.7, ISO 27001: A.8.24 |
| `AWS-07` | AWS | Strong Password Policy Enforced | MEDIUM | SOC 2: CC6.1, ISO 27001: A.5.17 |
| `AWS-08` | AWS | No Open Security Group Ingress | HIGH | SOC 2: CC6.6, ISO 27001: A.8.20 |
| `AWS-09` | AWS | IAM Access Key Rotation (≤ 90d) | MEDIUM | SOC 2: CC6.1, ISO 27001: A.5.15 |
| `AWS-10` | AWS | S3 Bucket Server-Side Encryption | HIGH | SOC 2: CC6.7, ISO 27001: A.8.24 |

---

## Configuration (`kanit.config.json`)

```json
{
  "frameworks": ["SOC2", "ISO27001"],
  "providers": {
    "github": {
      "org": "my-org",
      "repo": "my-repo"
    },
    "aws": {
      "region": "us-east-1"
    }
  },
  "thresholds": {
    "minScore": 80,
    "failOnSeverity": "CRITICAL"
  },
  "mock": false
}
```

---

## GitHub Action

```yaml
name: Continuous Compliance

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * *' # Daily scan

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          format: markdown
          output: compliance-report.md
          fail-under: 85
          fail-on-severity: CRITICAL
          mock: true
```

---

## Testing

```bash
npm run build
npm test
```

---

## License

MIT
