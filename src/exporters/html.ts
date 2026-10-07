import type { AuditSummary } from '../core/types.js';

export function formatHtml(summary: AuditSummary): string {
  const failedResults = summary.results.filter(
    (r) => r.status === 'FAIL' || r.status === 'ERROR'
  );

  const rows = summary.results
    .map((r) => {
      const statusBadge =
        r.status === 'PASS'
          ? '<span class="badge badge-pass">PASS</span>'
          : r.status === 'FAIL'
          ? '<span class="badge badge-fail">FAIL</span>'
          : r.status === 'MANUAL'
          ? '<span class="badge badge-manual">MANUAL</span>'
          : `<span class="badge">${r.status}</span>`;

      const severityBadge = `<span class="badge badge-${r.severity.toLowerCase()}">${r.severity}</span>`;

      const soc2 = (r.frameworks.SOC2 || []).map((c) => `<span class="tag">SOC2:${c}</span>`).join(' ');
      const iso = (r.frameworks.ISO27001 || []).map((c) => `<span class="tag">ISO:${c}</span>`).join(' ');

      return `
      <tr>
        <td><code>${r.id}</code></td>
        <td>${statusBadge}</td>
        <td>${severityBadge}</td>
        <td class="title-cell">${escapeHtml(r.title)}</td>
        <td>${soc2} ${iso}</td>
        <td>${r.durationMs}ms</td>
      </tr>
    `;
    })
    .join('');

  const remediationCards = failedResults
    .map((f) => {
      const cliBlock = f.remediation?.cliCommand
        ? `<pre><code>$ ${escapeHtml(f.remediation.cliCommand)}</code></pre>`
        : '';
      const tfBlock = f.remediation?.terraform
        ? `<pre><code>${escapeHtml(f.remediation.terraform)}</code></pre>`
        : '';
      const docLink = f.remediation?.docsUrl
        ? `<p><a href="${f.remediation.docsUrl}" target="_blank" rel="noopener">Documentation Reference &rarr;</a></p>`
        : '';

      return `
      <div class="card card-fail">
        <div class="card-header">
          <span class="badge badge-fail">${f.id}</span>
          <h3>${escapeHtml(f.title)}</h3>
          <span class="badge badge-${f.severity.toLowerCase()}">${f.severity}</span>
        </div>
        <p class="finding-reason"><strong>Observation:</strong> ${escapeHtml(f.message)}</p>
        ${f.remediation?.summary ? `<p class="remediation-step"><strong>Remediation:</strong> ${escapeHtml(f.remediation.summary)}</p>` : ''}
        ${cliBlock}
        ${tfBlock}
        ${docLink}
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanit Continuous Compliance Audit Report</title>
  <style>
    :root {
      --bg: #09090b;
      --card-bg: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --accent: #6366f1;
      --pass: #10b981;
      --fail: #ef4444;
      --manual: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .logo {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.05em;
    }
    .logo span { color: var(--accent); }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #3f3f46;
    }
    .badge-pass { background: #064e3b; color: #6ee7b7; border: 1px solid #047857; }
    .badge-fail { background: #7f1d1d; color: #fca5a5; border: 1px solid #b91c1c; }
    .badge-manual { background: #78350f; color: #fde68a; border: 1px solid #b45309; }
    .badge-critical { background: #991b1b; color: #fff; }
    .badge-high { background: #b91c1c; color: #fff; }
    .badge-medium { background: #b45309; color: #fff; }
    .badge-low { background: #1e3a8a; color: #fff; }
    .tag {
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #d4d4d8;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      font-size: 0.75rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
    }
    .metric-title { font-size: 0.85rem; color: var(--text-muted); }
    .metric-value { font-size: 2rem; font-weight: 700; margin-top: 0.25rem; }
    .table-container {
      overflow-x: auto;
      margin: 2rem 0;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    th, td { padding: 0.9rem 1.2rem; border-bottom: 1px solid var(--border); }
    th { background: #27272a; color: #e4e4e7; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    .title-cell { font-weight: 500; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.25rem;
    }
    .card-fail { border-left: 4px solid var(--fail); }
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    pre {
      background: #000;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 0.75rem 0;
      font-size: 0.85rem;
      color: #22c55e;
      border: 1px solid #27272a;
    }
    a { color: #818cf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer {
      margin-top: 3rem;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    @media print {
      body { background: #fff; color: #000; }
      .card, .table-container, .metric-card { border-color: #ccc; }
      pre { background: #f4f4f5; color: #000; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div class="logo">KAN<span>IT</span></div>
        <div>
          <span class="badge badge-pass">Continuous Compliance</span>
        </div>
      </div>
      <p style="color: var(--text-muted); margin-top: 0.5rem;">Automated SOC 2 & ISO 27001 Evidence Audit Snapshot</p>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">Overall Compliance</div>
          <div class="metric-value" style="color: ${summary.score >= 80 ? 'var(--pass)' : 'var(--fail)'};">${summary.score}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">SOC 2 Score</div>
          <div class="metric-value">${summary.frameworkScores.SOC2}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">ISO 27001 Score</div>
          <div class="metric-value">${summary.frameworkScores.ISO27001}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Passed / Total</div>
          <div class="metric-value">${summary.passed} / ${summary.total}</div>
        </div>
      </div>
    </header>

    <section>
      <h2>Control Matrix</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Title</th>
              <th>Framework Controls</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>

    ${
      failedResults.length > 0
        ? `<section style="margin-top: 2.5rem;">
            <h2>Actionable Remediations (${failedResults.length})</h2>
            <div style="margin-top: 1rem;">
              ${remediationCards}
            </div>
           </section>`
        : ''
    }

    <footer>
      <div>Evidence SHA-256: <code>${summary.evidenceSha256}</code></div>
      <div>Generated at ${summary.timestamp}</div>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
