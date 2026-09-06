# KANIT — Continuous Compliance Engine Master Plan

> **Positioning:** "1-Command Continuous Compliance for High-Growth Startups & Security Teams."  
> **Core Value:** Replace $15,000/year compliance platforms (Vanta, Drata) with an open-source, local-first CLI and automated evidence collection workflow for SOC 2 (Security Criteria) & ISO 27001.

---

## 1. Repository Ecosystem Architecture

The Kanit ecosystem is structured into two dedicated, decoupled repositories:

1. **`aliefe04/kanit`** *(This Repository)*:
   - The open-source continuous compliance engine and CLI.
   - Built with strict TypeScript, Node.js, `tsup`, Vitest.
   - Executable via `npx kanit scan` / `kanit audit`.
   - Includes 17 automated controls (AWS & GitHub), SHA-256 evidence integrity hashing, multi-format exporters (Terminal, JSON, Markdown, HTML, pure JS PDF), remediation engine, and GitHub Action.

2. **`aliefe04/getkanit-landing`** *(Landing Page & Distribution)*:
   - Hosted at `https://github.com/aliefe04/getkanit-landing`.
   - React 18 + Vite + Tailwind CSS v4 + Framer Motion.
   - Docker Compose deployment with Cloudflare Tunnel (`cloudflared`) and self-hosted privacy-preserving Umami analytics for VPS deployment.

---

## 2. Directory Layout (`kanit`)

```
kanit/
├── action.yml                          # GitHub Action definition for CI/CD compliance gating
├── Dockerfile                          # Multi-stage container build for pipelines
├── kanit.config.json                   # Sample configuration file
├── package.json                        # CLI package manifest (bin: kanit)
├── tsup.config.ts                      # Fast bundler config (ESM, CJS, DTS, Shebang)
├── tsconfig.json                       # Strict TypeScript configuration
├── src/
│   ├── bin/
│   │   └── kanit.ts                    # Shebang CLI launcher
│   ├── cli.ts                          # Commander CLI setup (scan, fix, export, init)
│   ├── index.ts                        # Programmatic SDK exports
│   ├── core/
│   │   ├── types.ts                    # Control, Evidence, Framework, Severity types
│   │   ├── registry.ts                 # Check registration & query engine
│   │   ├── engine.ts                   # Concurrent runner, weighted compliance scoring
│   │   ├── crypto.ts                   # Canonical JSON & SHA-256 evidence hashing
│   │   └── config.ts                   # Configuration loader and defaults
│   ├── checks/
│   │   ├── github/                     # GitHub Security & Branch Protection checks
│   │   │   ├── gh01-org-2fa.ts
│   │   │   ├── gh02-branch-protection.ts
│   │   │   ├── gh03-approving-reviews.ts
│   │   │   ├── gh04-prevent-force-pushes.ts
│   │   │   ├── gh05-signed-commits.ts
│   │   │   ├── gh06-dependabot-secrets.ts
│   │   │   └── gh07-dismiss-stale-approvals.ts
│   │   └── aws/                        # AWS Cloud & IAM Security checks
│   │       ├── aws01-root-mfa.ts
│   │       ├── aws02-no-root-keys.ts
│   │       ├── aws03-s3-public-access.ts
│   │       ├── aws04-cloudtrail.ts
│   │       ├── aws05-ebs-encryption.ts
│   │       ├── aws06-rds-encryption.ts
│   │       ├── aws07-password-policy.ts
│   │       ├── aws08-sg-ingress.ts
│   │       ├── aws09-access-key-rotation.ts
│   │       └── aws10-s3-encryption.ts
│   ├── remediation/
│   │   ├── rules.ts                    # Actionable CLI, Terraform, and manual fixes
│   │   └── engine.ts                   # Remediation lookup and display engine
│   └── exporters/
│       ├── terminal.ts                 # Rich ANSI scorecards, meters & badges
│       ├── json.ts                     # Canonical auditor JSON with SHA-256 hash
│       ├── markdown.ts                 # Auditor-ready compliance report (SOC 2 / ISO 27001)
│       ├── html.ts                     # Standalone dark-mode responsive HTML report
│       └── pdf.ts                      # High-res PDF generated via pure JS pdf-lib
└── tests/
    ├── core.test.ts                    # Engine, scoring, registry, crypto tests
    ├── checks.test.ts                  # Check execution and mock integration tests
    └── exporters.test.ts               # Terminal, JSON, Markdown, HTML, PDF export tests
```

---

## 3. Compliance Control Matrix

### GitHub Controls
| ID | Title | Severity | Frameworks |
|---|---|---|---|
| `GH-01` | Organization 2FA Enforcement | CRITICAL | SOC 2 (CC6.1, CC6.2), ISO 27001 (A.5.15, A.8.5) |
| `GH-02` | Default Branch Protection | HIGH | SOC 2 (CC6.8, CC8.1), ISO 27001 (A.8.28, A.8.32) |
| `GH-03` | Mandatory Code Review (>=1 Approver) | HIGH | SOC 2 (CC6.8, CC8.1), ISO 27001 (A.8.28, A.8.32) |
| `GH-04` | Force Pushes & Deletions Prohibited | HIGH | SOC 2 (CC6.8, CC8.1), ISO 27001 (A.8.32) |
| `GH-05` | Signed Commits Enforced | MEDIUM | SOC 2 (CC6.8), ISO 27001 (A.8.28) |
| `GH-06` | Dependabot Alerts & Secret Scanning | HIGH | SOC 2 (CC7.1, CC8.1), ISO 27001 (A.8.8, A.8.28) |
| `GH-07` | Dismiss Stale PR Approvals | MEDIUM | SOC 2 (CC6.8, CC8.1), ISO 27001 (A.8.32) |

### AWS Cloud Controls
| ID | Title | Severity | Frameworks |
|---|---|---|---|
| `AWS-01` | Root Account MFA Enforced | CRITICAL | SOC 2 (CC6.1, CC6.2), ISO 27001 (A.5.15, A.8.5) |
| `AWS-02` | Zero Active Root Access Keys | CRITICAL | SOC 2 (CC6.1, CC6.3), ISO 27001 (A.5.15, A.8.5) |
| `AWS-03` | S3 Block Public Access (Account & Bucket) | CRITICAL | SOC 2 (CC6.1, CC6.6, CC6.7), ISO 27001 (A.5.15, A.8.12) |
| `AWS-04` | Multi-Region CloudTrail with Validation | HIGH | SOC 2 (CC7.2, CC7.3), ISO 27001 (A.8.15, A.8.17) |
| `AWS-05` | Default EBS Volume Encryption | HIGH | SOC 2 (CC6.1, CC6.7), ISO 27001 (A.8.24) |
| `AWS-06` | RDS Storage Encryption with KMS | HIGH | SOC 2 (CC6.1, CC6.7), ISO 27001 (A.8.24) |
| `AWS-07` | IAM Password Policy Enforcement | MEDIUM | SOC 2 (CC6.1), ISO 27001 (A.5.17, A.8.5) |
| `AWS-08` | Security Groups Restricting Sensitive Ingress | HIGH | SOC 2 (CC6.6), ISO 27001 (A.8.20, A.8.22) |
| `AWS-09` | IAM Access Key Rotation (<90 days) | MEDIUM | SOC 2 (CC6.1, CC6.3), ISO 27001 (A.5.17, A.8.5) |
| `AWS-10` | S3 Bucket Server-Side Encryption (SSE) | HIGH | SOC 2 (CC6.1, CC6.7), ISO 27001 (A.8.24) |

---

## 4. Key Capabilities & Invariants

1. **Tamper-Evident Evidence Collection:**
   - Every scan computes a deterministic, canonical SHA-256 hash across all check results, timestamps, and collected evidence parameters.
   - Auditors can verify that evidence files have not been modified post-generation.

2. **Zero-Friction Offline/Mock Mode:**
   - Running `kanit scan --mock` executes all 17 checks against realistic mock data.
   - Enables instant developer onboarding, CI pipeline tests, and sales engineering demos without requiring live production AWS or GitHub tokens.

3. **Multi-Format Export Pipeline:**
   - **Terminal:** ANSI color-coded summary table, progress meters, and violation summaries.
   - **JSON:** Auditor schema with `evidenceSha256` integrity block.
   - **Markdown:** Formatted compliance dossier ready for auditor review.
   - **HTML:** Standalone, responsive dark-mode report with interactive filters and print-ready CSS.
   - **PDF:** Native, zero-dependency PDF rendering via `pdf-lib`.

4. **Remediation Playbooks:**
   - `kanit fix <checkId>` gives engineers immediate copy-paste CLI commands, Terraform/OpenTofu snippets, and AWS/GitHub console instructions.

5. **CI/CD Integration:**
   - Native GitHub Action (`action.yml`) with automated compliance threshold enforcement (`--ci` mode returns exit code 1 on failure).
   - Dockerfile for GitLab CI, CircleCI, Jenkins, and Kubernetes runners.
