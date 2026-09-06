# Kanit Compliance Audit — GitHub Action 🛡️

Continuous **SOC 2 Type II** & **ISO 27001** automated compliance auditing for your AWS and GitHub infrastructure. Built for fast-moving startups and security teams who want zero-telemetry, cryptographic SHA-256 evidence integrity, and instant PR compliance gating.

[![Marketplace](https://img.shields.io/badge/Marketplace-Kanit%20Compliance%20Audit-purple?style=flat-square&logo=github)](https://github.com/marketplace/actions/kanit-compliance-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

---

## Why Kanit in GitHub Actions?

- **100% Local-First & Zero Telemetry**: Scans run entirely inside your GitHub Actions runner. No credentials or architecture metadata are ever sent to an external SaaS server.
- **Cryptographic SHA-256 Evidence**: Generates canonicalized JSON evidence sealed with a deterministic SHA-256 hash that auditors can independently verify.
- **Native Job Summaries**: Automatically embeds a beautifully formatted compliance score and control matrix directly into the `$GITHUB_STEP_SUMMARY` tab of every run.
- **Pull Request Quality Gates**: Enforce `--fail-under 85` or `--fail-on-severity CRITICAL` to prevent infrastructure drift before code hits production.

---

## Quickstart

Add this workflow to `.github/workflows/compliance.yml`:

```yaml
name: Continuous Compliance

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Run daily audit

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  audit:
    name: Audit SOC 2 & ISO 27001
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials (OIDC Recommended)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/KanitAuditRole
          aws-region: us-east-1

      - name: Run Kanit Compliance Audit
        uses: aliefe04/kanit@v1
        with:
          format: markdown
          output: compliance-report.md
          fail-under: 80
          fail-on-severity: CRITICAL
          step-summary: true
        env:
          GITHUB_TOKEN: ${{ secrets.AUDIT_GITHUB_TOKEN }}
```

---

## Action Inputs

| Input | Description | Required | Default |
|---|---|:---:|:---:|
| `format` | Output format (`markdown`, `terminal`, `json`, `html`, `pdf`) | No | `markdown` |
| `output` | Path to save report file | No | `kanit-report.md` |
| `fail-under` | Minimum score (0-100) required to pass CI | No | `80` |
| `fail-on-severity` | Fail pipeline if any check fails at or above severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) | No | `CRITICAL` |
| `mock` | Run in mock/demo mode without live credentials | No | `false` |
| `step-summary` | Automatically publish markdown report to GitHub Step Summary | No | `true` |
| `aws-region` | Target AWS region for security inspection | No | `us-east-1` |
| `github-token` | GitHub access token for org and repo checks | No | `${{ github.token }}` |

---

## Action Outputs

| Output | Description | Example |
|---|---|---|
| `report-path` | Path to the generated compliance report | `compliance-report.md` |
| `compliance-score` | Overall calculated compliance percentage | `94` |
| `evidence-sha256` | SHA-256 hash sealing the audit evidence | `2d28bde6e23e...` |

---

## Automated Pull Request Commenting

Leave a sticky compliance badge and summary directly on pull requests:

```yaml
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('compliance-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### 🛡️ Kanit Compliance Gate\n\n${report}`
            });
```
