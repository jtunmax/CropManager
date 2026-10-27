import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { TreeFeature } from '@/services/featureService';
import { TREE_TYPE_LABELS, REASON_LABELS } from '@/constants/trees';

// Brand palette (matches the app's forest theme)
const GREEN_DARK: [number, number, number] = [30, 61, 12];    // #1e3d0c
const GREEN: [number, number, number] = [45, 80, 22];         // #2d5016
const GREEN_MID: [number, number, number] = [74, 124, 44];
const GREEN_PALE: [number, number, number] = [242, 247, 236];
const AMBER: [number, number, number] = [217, 158, 30];
const RED: [number, number, number] = [185, 60, 50];
const GRAY: [number, number, number] = [110, 110, 110];
const GRAY_LIGHT: [number, number, number] = [180, 180, 180];
const INK: [number, number, number] = [35, 35, 35];

// Impact factors (per tree per year, commonly cited estimates)
const CO2_KG_PER_TREE_YEAR = 21;
const O2_KG_PER_TREE_YEAR = 118;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface StatusBucket {
  label: string;
  count: number;
  color: [number, number, number];
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'alive': return 'Alive & Healthy';
    case 'planted': return 'Newly Planted';
    case 'needs_care': return 'Needs Care';
    case 'dead': return 'Dead / Replaced';
    default: return 'Unknown';
  }
}

function treeTypeLabel(value: string): string {
  return TREE_TYPE_LABELS[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : 'Unknown');
}

export function generateImpactReport(trees: TreeFeature[]): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const now = new Date();

  const total = trees.length;
  const healthy = trees.filter((t) => t.status === 'alive' || t.status === 'planted' || !t.status).length;
  const needsCare = trees.filter((t) => t.status === 'needs_care').length;
  const dead = trees.filter((t) => t.status === 'dead').length;
  const healthyPct = total > 0 ? Math.round((healthy / total) * 100) : 0;

  // Age-weighted environmental impact
  const co2Kg = Math.round(trees.reduce((sum, t) => {
    const ageYears = Math.max(0.1, (now.getTime() - new Date(t.submittedDate).getTime()) / (365.25 * 24 * 3600 * 1000));
    return sum + CO2_KG_PER_TREE_YEAR * Math.min(ageYears, 1) * ((t.status === 'dead') ? 0 : 1);
  }, 0));
  const o2Kg = Math.round(co2Kg * (O2_KG_PER_TREE_YEAR / CO2_KG_PER_TREE_YEAR));

  const distinctSpecies = new Set(trees.map((t) => t.treeType).filter(Boolean)).size;
  const distinctPlanters = new Set(trees.map((t) => t.submittedBy || 'Anonymous')).size;

  // ============ HEADER BAND ============
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 0, PAGE_W, 44, 'F');
  doc.setFillColor(...GREEN_MID);
  doc.rect(0, 44, PAGE_W, 1.2, 'F');

  // Simple tree glyph (trunk + canopy circles) as a logo mark
  doc.setFillColor(...GREEN_PALE);
  doc.circle(MARGIN + 5, 14, 4.5, 'F');
  doc.circle(MARGIN + 9.5, 16, 3.5, 'F');
  doc.circle(MARGIN + 3, 17, 3, 'F');
  doc.setFillColor(210, 180, 140);
  doc.rect(MARGIN + 5.4, 17, 1.6, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('Belize Tree Planting Tracker', MARGIN + 15, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 222, 185);
  doc.text('Community Reforestation & Tree Health Report', MARGIN + 15, 23);
  doc.setFontSize(8.5);
  doc.text('Prepared for community partners, NGOs and government agencies', MARGIN + 15, 29.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporting date', PAGE_W - MARGIN, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(format(now, 'MMMM d, yyyy'), PAGE_W - MARGIN, 22, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(200, 222, 185);
  doc.text('Data current as of generation', PAGE_W - MARGIN, 27.5, { align: 'right' });

  let y = 54;

  // ============ KPI CARDS ============
  const kpis: { value: string; label: string }[] = [
    { value: String(total), label: 'Trees recorded' },
    { value: `${healthyPct}%`, label: 'Healthy rate' },
    { value: String(needsCare), label: 'Need care' },
    { value: `${co2Kg.toLocaleString()} kg`, label: 'CO2 offset / yr' },
    { value: `${o2Kg.toLocaleString()} kg`, label: 'O2 produced / yr' },
  ];
  const gap = 4;
  const kpiW = (CONTENT_W - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = MARGIN + i * (kpiW + gap);
    doc.setFillColor(...GREEN_PALE);
    doc.setDrawColor(...GREEN_MID);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, kpiW, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...GREEN_DARK);
    doc.text(kpi.value, x + kpiW / 2, y + 9.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...GRAY);
    doc.text(kpi.label.toUpperCase(), x + kpiW / 2, y + 15.5, { align: 'center' });
  });
  y += 28;

  // ============ SECTION HELPERS ============
  const sectionTitle = (title: string, atY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...GREEN_DARK);
    doc.text(title, MARGIN, atY);
    doc.setDrawColor(...GREEN_MID);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, atY + 1.6, MARGIN + 14, atY + 1.6);
    doc.setDrawColor(...GRAY_LIGHT);
    doc.setLineWidth(0.2);
    doc.line(MARGIN + 15, atY + 1.6, PAGE_W - MARGIN, atY + 1.6);
    return atY + 8;
  };

  // ============ STATUS BREAKDOWN (bar chart) ============
  y = sectionTitle('Tree Health Overview', y);
  const buckets: StatusBucket[] = [
    { label: 'Alive & Healthy', count: trees.filter((t) => t.status === 'alive').length, color: GREEN_MID },
    { label: 'Newly Planted', count: trees.filter((t) => t.status === 'planted' || !t.status).length, color: [140, 190, 100] },
    { label: 'Needs Care', count: needsCare, color: AMBER },
    { label: 'Dead / Replaced', count: dead, color: RED },
  ];
  const barMax = Math.max(...buckets.map((b) => b.count), 1);
  const barAreaW = CONTENT_W - 58;
  buckets.forEach((b, i) => {
    const by = y + i * 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(b.label, MARGIN, by + 3.6);
    // track
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(MARGIN + 40, by, barAreaW, 5, 1, 1, 'F');
    // value bar
    if (b.count > 0) {
      doc.setFillColor(...b.color);
      doc.roundedRect(MARGIN + 40, by, Math.max(2, (b.count / barMax) * barAreaW), 5, 1, 1, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`${b.count} (${total > 0 ? Math.round((b.count / total) * 100) : 0}%)`, PAGE_W - MARGIN, by + 3.8, { align: 'right' });
  });
  y += buckets.length * 8 + 4;

  const avgHealth = trees.filter((t) => t.healthScore != null);
  const avgScore = avgHealth.length > 0
    ? (avgHealth.reduce((s, t) => s + (t.healthScore || 0), 0) / avgHealth.length).toFixed(1)
    : '—';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `Average health score: ${avgScore}/10  ·  ${distinctSpecies} species planted  ·  ${distinctPlanters} community planters contributing`,
    MARGIN, y + 2,
  );
  y += 10;

  // ============ MONTHLY PLANTING TREND (bar chart) ============
  y = sectionTitle('Planting Activity — Last 12 Months', y);
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), count: 0 });
  }
  trees.forEach((t) => {
    const key = format(new Date(t.submittedDate), 'yyyy-MM');
    const m = months.find((mm) => mm.key === key);
    if (m) m.count += 1;
  });
  const chartH = 26;
  const monthMax = Math.max(...months.map((m) => m.count), 1);
  const colW = CONTENT_W / months.length;
  // baseline
  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + chartH, PAGE_W - MARGIN, y + chartH);
  months.forEach((m, i) => {
    const x = MARGIN + i * colW;
    const h = (m.count / monthMax) * (chartH - 4);
    if (m.count > 0) {
      doc.setFillColor(...(i === months.length - 1 ? GREEN : GREEN_MID));
      doc.rect(x + 1.5, y + chartH - h, colW - 3, h, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...INK);
      doc.text(String(m.count), x + colW / 2, y + chartH - h - 1.2, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(m.label, x + colW / 2, y + chartH + 4, { align: 'center' });
  });
  y += chartH + 11;

  // ============ SPECIES TABLE ============
  y = sectionTitle('Species Planted', y);
  const speciesCounts = new Map<string, number>();
  trees.forEach((t) => speciesCounts.set(t.treeType || 'unknown', (speciesCounts.get(t.treeType || 'unknown') || 0) + 1));
  const speciesRows = [...speciesCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => [treeTypeLabel(type), String(count), `${Math.round((count / total) * 100)}%`]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Species', 'Trees', 'Share']],
    body: speciesRows,
    theme: 'striped',
    headStyles: { fillColor: GREEN_DARK, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: INK },
    alternateRowStyles: { fillColor: GREEN_PALE },
    columnStyles: { 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 20 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ============ TOP PLANTERS ============
  if (y > PAGE_H - 60) { doc.addPage(); y = MARGIN + 4; }
  y = sectionTitle('Top Community Planters', y);
  const planterCounts = new Map<string, { count: number; healthy: number }>();
  trees.forEach((t) => {
    const name = t.submittedBy || 'Anonymous';
    const entry = planterCounts.get(name) || { count: 0, healthy: 0 };
    entry.count += 1;
    if (t.status === 'alive' || t.status === 'planted' || !t.status) entry.healthy += 1;
    planterCounts.set(name, entry);
  });
  const planterRows = [...planterCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([name, stats], i) => [`${i + 1}`, name, String(stats.count), `${Math.round((stats.healthy / stats.count) * 100)}%`]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['#', 'Planter', 'Trees', 'Healthy']],
    body: planterRows,
    theme: 'striped',
    headStyles: { fillColor: GREEN_DARK, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: INK },
    alternateRowStyles: { fillColor: GREEN_PALE },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center', cellWidth: 22 }, 3: { halign: 'center', cellWidth: 22 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ============ FULL TREE REGISTRY ============
  if (y > PAGE_H - 60) { doc.addPage(); y = MARGIN + 4; }
  let ry = sectionTitle('Tree Registry', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Complete record of all registered trees as of the reporting date.', MARGIN, ry - 1);

  const registryRows = [...trees]
    .sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime())
    .map((t) => [
      treeTypeLabel(t.treeType),
      statusLabel(t.status),
      t.healthScore != null ? `${t.healthScore}/10` : '—',
      t.submittedBy || 'Anonymous',
      REASON_LABELS[t.reason] || t.reason || '—',
      format(new Date(t.submittedDate), 'MMM d, yyyy'),
      `${t.latitude.toFixed(4)}, ${t.longitude.toFixed(4)}`,
    ]);

  autoTable(doc, {
    startY: ry + 3,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Species', 'Status', 'Health', 'Planted By', 'Reason', 'Date', 'Coordinates']],
    body: registryRows,
    theme: 'striped',
    headStyles: { fillColor: GREEN_DARK, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: INK },
    alternateRowStyles: { fillColor: GREEN_PALE },
    columnStyles: {
      2: { halign: 'center', cellWidth: 14 },
      5: { cellWidth: 22 },
      6: { cellWidth: 30, fontSize: 6.5 },
    },
  });

  // ============ FOOTERS ============
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...GRAY_LIGHT);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Belize Tree Planting Tracker  ·  Community Reforestation Report', MARGIN, PAGE_H - 7.5);
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 7.5, { align: 'right' });
    doc.setTextColor(...GREEN_MID);
    doc.text('Track · Verify · Celebrate', PAGE_W / 2, PAGE_H - 7.5, { align: 'center' });
  }

  return doc.output('blob');
}
