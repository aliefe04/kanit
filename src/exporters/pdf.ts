import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import type { AuditSummary, CheckResult } from '../core/types.js';

export async function generatePdfReport(summary: AuditSummary): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28; // A4 standard width (pt)
  const PAGE_HEIGHT = 841.89; // A4 standard height (pt)
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(heightNeeded: number): PDFPage {
    if (y - heightNeeded < MARGIN) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    return currentPage;
  }

  // Header Banner
  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 55,
    width: CONTENT_WIDTH,
    height: 55,
    color: rgb(0.05, 0.07, 0.12),
  });

  currentPage.drawText('KANIT COMPLIANCE AUDIT REPORT', {
    x: MARGIN + 16,
    y: y - 26,
    size: 16,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  currentPage.drawText('Continuous Compliance Assessment • SOC 2 & ISO 27001', {
    x: MARGIN + 16,
    y: y - 44,
    size: 9,
    font: helvetica,
    color: rgb(0.65, 0.7, 0.8),
  });

  y -= 75;

  // Metadata Box
  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 75,
    width: CONTENT_WIDTH,
    height: 75,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  currentPage.drawText('Audit Summary & Evidence Verification', {
    x: MARGIN + 12,
    y: y - 18,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  currentPage.drawText(`Date & Time: ${summary.timestamp}`, {
    x: MARGIN + 12,
    y: y - 34,
    size: 9,
    font: helvetica,
    color: rgb(0.2, 0.25, 0.35),
  });

  currentPage.drawText(
    `Overall Score: ${summary.score}%   |   SOC 2: ${summary.frameworkScores.SOC2}%   |   ISO 27001: ${summary.frameworkScores.ISO27001}%`,
    {
      x: MARGIN + 12,
      y: y - 48,
      size: 9,
      font: helveticaBold,
      color: summary.score >= 80 ? rgb(0.06, 0.55, 0.3) : rgb(0.8, 0.2, 0.2),
    }
  );

  const hashSnippet = summary.evidenceSha256.length > 55
    ? summary.evidenceSha256.substring(0, 52) + '...'
    : summary.evidenceSha256;

  currentPage.drawText(`Evidence SHA-256: ${hashSnippet}`, {
    x: MARGIN + 12,
    y: y - 62,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  });

  y -= 95;

  // Metrics Row
  const boxWidth = (CONTENT_WIDTH - 24) / 4;
  const metrics = [
    { label: 'Passed', val: `${summary.passed}`, color: rgb(0.06, 0.55, 0.3) },
    { label: 'Failed', val: `${summary.failed}`, color: rgb(0.8, 0.2, 0.2) },
    { label: 'Manual', val: `${summary.manual}`, color: rgb(0.85, 0.55, 0.1) },
    { label: 'Total Controls', val: `${summary.total}`, color: rgb(0.2, 0.25, 0.35) },
  ];

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    const bx = MARGIN + i * (boxWidth + 8);
    currentPage.drawRectangle({
      x: bx,
      y: y - 40,
      width: boxWidth,
      height: 40,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.88, 0.9, 0.94),
      borderWidth: 1,
    });
    currentPage.drawText(m.label, {
      x: bx + 8,
      y: y - 16,
      size: 8,
      font: helvetica,
      color: rgb(0.45, 0.5, 0.55),
    });
    currentPage.drawText(m.val, {
      x: bx + 8,
      y: y - 32,
      size: 13,
      font: helveticaBold,
      color: m.color,
    });
  }

  y -= 60;

  // Table Header
  ensureSpace(40);
  currentPage.drawText('Control Evaluation Matrix', {
    x: MARGIN,
    y: y,
    size: 12,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  y -= 16;

  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 18,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.92, 0.94, 0.97),
  });

  currentPage.drawText('ID', { x: MARGIN + 4, y: y - 13, size: 8, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
  currentPage.drawText('Status', { x: MARGIN + 60, y: y - 13, size: 8, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
  currentPage.drawText('Severity', { x: MARGIN + 115, y: y - 13, size: 8, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
  currentPage.drawText('Title', { x: MARGIN + 170, y: y - 13, size: 8, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
  currentPage.drawText('Frameworks', { x: MARGIN + 390, y: y - 13, size: 8, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
  y -= 22;

  // Render Table Rows
  for (let idx = 0; idx < summary.results.length; idx++) {
    const r = summary.results[idx];
    ensureSpace(20);

    const rowBg = idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.98, 0.99);
    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 16,
      width: CONTENT_WIDTH,
      height: 16,
      color: rowBg,
    });

    let statusColor = rgb(0.06, 0.55, 0.3);
    if (r.status === 'FAIL') statusColor = rgb(0.8, 0.2, 0.2);
    else if (r.status === 'MANUAL') statusColor = rgb(0.85, 0.55, 0.1);

    currentPage.drawText(r.id, { x: MARGIN + 4, y: y - 12, size: 8, font: helveticaBold, color: rgb(0.1, 0.15, 0.2) });
    currentPage.drawText(r.status, { x: MARGIN + 60, y: y - 12, size: 8, font: helveticaBold, color: statusColor });
    currentPage.drawText(r.severity, { x: MARGIN + 115, y: y - 12, size: 7.5, font: helvetica, color: rgb(0.3, 0.35, 0.4) });

    const titleSnippet = r.title.length > 46 ? r.title.substring(0, 43) + '...' : r.title;
    currentPage.drawText(titleSnippet, { x: MARGIN + 170, y: y - 12, size: 8, font: helvetica, color: rgb(0.1, 0.15, 0.2) });

    const fwk = [
      ...(r.frameworks.SOC2 || []).map((c) => `SOC2:${c}`),
      ...(r.frameworks.ISO27001 || []).map((c) => `ISO:${c}`),
    ].join(', ');
    const fwkSnippet = fwk.length > 25 ? fwk.substring(0, 22) + '...' : fwk;
    currentPage.drawText(fwkSnippet, { x: MARGIN + 390, y: y - 12, size: 7.5, font: helvetica, color: rgb(0.4, 0.45, 0.5) });

    y -= 17;
  }

  // Failed Controls & Remediation Section
  const failedResults = summary.results.filter(
    (r) => r.status === 'FAIL' || r.status === 'ERROR'
  );

  if (failedResults.length > 0) {
    ensureSpace(60);
    y -= 15;
    currentPage.drawText(`Remediation Requirements (${failedResults.length} Items)`, {
      x: MARGIN,
      y: y,
      size: 11,
      font: helveticaBold,
      color: rgb(0.8, 0.2, 0.2),
    });
    y -= 18;

    for (const f of failedResults) {
      ensureSpace(50);
      currentPage.drawRectangle({
        x: MARGIN,
        y: y - 42,
        width: CONTENT_WIDTH,
        height: 42,
        color: rgb(0.99, 0.97, 0.97),
        borderColor: rgb(0.92, 0.8, 0.8),
        borderWidth: 1,
      });

      currentPage.drawText(`[${f.id}] ${f.title} (${f.severity})`, {
        x: MARGIN + 8,
        y: y - 13,
        size: 8.5,
        font: helveticaBold,
        color: rgb(0.7, 0.1, 0.1),
      });

      const msgSnippet = f.message.length > 85 ? f.message.substring(0, 82) + '...' : f.message;
      currentPage.drawText(`Reason: ${msgSnippet}`, {
        x: MARGIN + 8,
        y: y - 25,
        size: 7.5,
        font: helvetica,
        color: rgb(0.2, 0.25, 0.3),
      });

      const remSummary = f.remediation?.summary || 'Review and remediate according to standard policy.';
      const remSnippet = remSummary.length > 85 ? remSummary.substring(0, 82) + '...' : remSummary;
      currentPage.drawText(`Action: ${remSnippet}`, {
        x: MARGIN + 8,
        y: y - 36,
        size: 7.5,
        font: helvetica,
        color: rgb(0.1, 0.35, 0.2),
      });

      y -= 48;
    }
  }

  // Auditor Attestation Footer
  ensureSpace(70);
  y -= 15;
  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 55,
    width: CONTENT_WIDTH,
    height: 55,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  currentPage.drawText('Auditor Sign-off & Verification', {
    x: MARGIN + 12,
    y: y - 16,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  currentPage.drawText('Auditor Signature: _____________________________________   Date: _______________', {
    x: MARGIN + 12,
    y: y - 36,
    size: 8,
    font: helvetica,
    color: rgb(0.35, 0.4, 0.45),
  });

  return await pdfDoc.save();
}
