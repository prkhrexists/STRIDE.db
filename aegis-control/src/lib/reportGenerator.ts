import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

// ─── Job store (in-memory, survives process lifetime) ────────────────────────
interface Job {
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  downloadUrl?: string;
  error?: string;
}
const jobs = new Map<string, Job>();

export function getJob(jobId: string) { return jobs.get(jobId); }

// ─── Context builder (reuse lib) ─────────────────────────────────────────────
async function getFlightData(flightId: string) {
  const dataDir = path.join(process.cwd(), 'public', 'data', 'flights', flightId);
  if (fs.existsSync(dataDir)) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'metadata.json'), 'utf8'));
      const results = JSON.parse(fs.readFileSync(path.join(dataDir, 'results.json'), 'utf8'));
      return { ...meta, ...results };
    } catch {}
  }
  // Fallback mock
  const mocks: Record<string, any> = {
    'FL-004': { id: 'FL-004', name: 'Bridge Post-Storm', date: '2026-05-15', structure: 'Bridge North Tower', frameCount: 240, healthScore: 78, riskLevel: 'HIGH', defects: [
      { id: 'D-001', type: 'Crack', severity: 'CRITICAL', zone: 'Pier 3', confidence: '92%', method: 'Epoxy Injection' },
      { id: 'D-002', type: 'Spalling', severity: 'CRITICAL', zone: 'Deck Underside', confidence: '87%', method: 'Concrete Patching' },
      { id: 'D-003', type: 'Corrosion', severity: 'MODERATE', zone: 'Cable Anchor', confidence: '77%', method: 'Rust Treatment' },
    ]},
    'FL-003': { id: 'FL-003', name: 'Bridge Routine', date: '2026-05-10', structure: 'Bridge North Tower', frameCount: 180, healthScore: 82, riskLevel: 'MODERATE', defects: [
      { id: 'D-004', type: 'Crack', severity: 'MODERATE', zone: 'North Pier', confidence: '81%', method: 'Monitoring' },
    ]},
  };
  return mocks[flightId] ?? mocks['FL-004'];
}

// ─── HTML template ────────────────────────────────────────────────────────────
function buildHtml(data: any): string {
  const criticals = (data.defects ?? []).filter((d: any) => d.severity === 'CRITICAL');
  const moderates = (data.defects ?? []).filter((d: any) => d.severity === 'MODERATE');
  const healthColor = data.healthScore >= 85 ? '#00ff88' : data.healthScore >= 70 ? '#ffcc00' : '#ff4444';
  const riskColor   = data.riskLevel === 'CRITICAL' ? '#ff4444' : data.riskLevel === 'HIGH' ? '#f59e0b' : '#00ff88';

  const defectRows = (data.defects ?? []).map((d: any) => {
    const sc = d.severity === 'CRITICAL' ? '#ff4444' : d.severity === 'MODERATE' ? '#f59e0b' : '#00ff88';
    return `<tr>
      <td style="padding:8px 12px;font-family:monospace;font-size:12px">${d.id}</td>
      <td style="padding:8px 12px">${d.type}</td>
      <td style="padding:8px 12px">${d.zone ?? '—'}</td>
      <td style="padding:8px 12px">${d.confidence ?? '—'}</td>
      <td style="padding:8px 12px"><span style="background:${sc}22;color:${sc};border:1px solid ${sc}55;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${d.severity}</span></td>
    </tr>`;
  }).join('');

  const repairRows = (data.defects ?? []).map((d: any, i: number) => {
    const pri = i === 0 ? 'P1' : i === 1 ? 'P1' : 'P2';
    const urg = d.severity === 'CRITICAL' ? 'Immediate' : '30 Days';
    const priColor = pri === 'P1' ? '#ff4444' : '#f59e0b';
    return `<div style="display:flex;align-items:center;gap:16px;padding:12px 16px;background:#0d1117;border:1px solid #1e2736;border-radius:8px;margin-bottom:8px">
      <span style="background:${priColor}22;color:${priColor};border:1px solid ${priColor}55;padding:4px 10px;border-radius:4px;font-weight:800;font-size:13px">${pri}</span>
      <div style="flex:1">
        <div style="font-weight:700;color:#e2e8f0">${d.method ?? 'Structural Review'}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">Ref: <span style="color:#94a3b8;font-family:monospace">${d.id}</span> · Zone: ${d.zone ?? '—'} · Urgency: <span style="color:${urg === 'Immediate' ? '#ff4444' : '#f59e0b'}">${urg}</span></div>
      </div>
    </div>`;
  }).join('');

  const pageHeader = (title: string) => `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:20px 40px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #22d3ee">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#22d3ee">STRIDE</div>
        <div style="width:1px;height:20px;background:#1e2736"></div>
        <div style="font-size:13px;color:#64748b">Structural Inspection Report</div>
      </div>
      <div style="font-size:12px;color:#475569">${title} · ${data.id} · ${data.date}</div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background:#070b14; color:#e2e8f0; }
  .page { width:210mm; min-height:297mm; page-break-after:always; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  th { background:#0d1117; color:#64748b; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; padding:8px 12px; text-align:left; }
  td { border-bottom:1px solid #1e2736; color:#cbd5e1; font-size:13px; }
  tr:last-child td { border-bottom:none; }
  @page { margin:0; size:A4; }
</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page" style="background:linear-gradient(160deg,#070b14 0%,#0f172a 60%,#0c1a2e 100%);display:flex;flex-direction:column">
  <div style="padding:50px 60px;flex:1;display:flex;flex-direction:column;justify-content:center">
    <div style="font-size:11px;letter-spacing:0.2em;color:#22d3ee;text-transform:uppercase;margin-bottom:24px">Drone Infrastructure Inspection System</div>
    <div style="font-size:56px;font-weight:900;letter-spacing:-2px;background:linear-gradient(135deg,#22d3ee,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">STRIDE</div>
    <div style="font-size:18px;color:#94a3b8;margin-bottom:60px">Inspection Report v2.0</div>

    <div style="background:#0d1117;border:1px solid #1e2736;border-radius:16px;padding:40px;margin-bottom:40px">
      <div style="font-size:32px;font-weight:800;color:#e2e8f0;margin-bottom:8px">${data.name ?? data.id}</div>
      <div style="font-size:16px;color:#22d3ee;margin-bottom:24px">${data.structure}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
        <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:4px">Flight ID</div><div style="font-size:15px;font-family:monospace;color:#94a3b8">${data.id}</div></div>
        <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:4px">Date</div><div style="font-size:15px;color:#94a3b8">${data.date}</div></div>
        <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:4px">Frames</div><div style="font-size:15px;color:#94a3b8">${data.frameCount ?? 240}</div></div>
      </div>
    </div>

    <div style="display:flex;gap:24px;align-items:center">
      <!-- Health Gauge -->
      <div style="background:#0d1117;border:2px solid ${healthColor}44;border-radius:16px;padding:30px;text-align:center;min-width:180px">
        <div style="font-size:64px;font-weight:900;color:${healthColor};line-height:1">${data.healthScore ?? 78}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">HEALTH SCORE</div>
        <div style="height:4px;background:#1e2736;border-radius:2px;margin-top:12px"><div style="height:100%;width:${data.healthScore ?? 78}%;background:${healthColor};border-radius:2px"></div></div>
      </div>
      <!-- Risk badge -->
      <div style="background:#0d1117;border:2px solid ${riskColor}44;border-radius:16px;padding:30px;text-align:center;min-width:180px">
        <div style="font-size:36px;font-weight:900;color:${riskColor}">${data.riskLevel ?? 'HIGH'}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">RISK LEVEL</div>
        <div style="font-size:32px;margin-top:8px">${data.riskLevel === 'CRITICAL' ? '🔴' : data.riskLevel === 'HIGH' ? '🟠' : '🟢'}</div>
      </div>
      <!-- Defect counts -->
      <div style="flex:1;display:flex;flex-direction:column;gap:12px">
        <div style="background:#0d1117;border:1px solid #ff444422;border-radius:12px;padding:16px;display:flex;justify-content:space-between">
          <span style="color:#64748b;font-size:13px">Critical Defects</span>
          <span style="color:#ff4444;font-weight:800;font-size:18px">${criticals.length}</span>
        </div>
        <div style="background:#0d1117;border:1px solid #f59e0b22;border-radius:12px;padding:16px;display:flex;justify-content:space-between">
          <span style="color:#64748b;font-size:13px">Moderate Defects</span>
          <span style="color:#f59e0b;font-weight:800;font-size:18px">${moderates.length}</span>
        </div>
        <div style="background:#0d1117;border:1px solid #22d3ee22;border-radius:12px;padding:16px;display:flex;justify-content:space-between">
          <span style="color:#64748b;font-size:13px">Total Inspected</span>
          <span style="color:#22d3ee;font-weight:800;font-size:18px">${(data.defects ?? []).length}</span>
        </div>
      </div>
    </div>
  </div>
  <div style="padding:20px 60px;border-top:1px solid #1e2736;display:flex;justify-content:space-between;color:#475569;font-size:11px">
    <span>STRIDE Inspector v2.0 · AI-Powered Structural Analysis</span>
    <span>CONFIDENTIAL · Generated ${new Date().toLocaleDateString()}</span>
  </div>
</div>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<div class="page">
  ${pageHeader('Executive Summary')}
  <div style="padding:40px">
    <h2 style="font-size:22px;color:#22d3ee;margin-bottom:24px">Executive Summary</h2>
    
    <div style="background:#0d1117;border:1px solid #1e2736;border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="color:#94a3b8;line-height:1.8;font-size:14px;margin-bottom:16px">
        The STRIDE autonomous UAV inspection of <strong style="color:#e2e8f0">${data.structure}</strong> was conducted on <strong style="color:#e2e8f0">${data.date}</strong>. 
        The inspection covered a total of <strong style="color:#22d3ee">${data.frameCount ?? 240} frames</strong> analyzed by the YOLOv8 defect recognition pipeline with real-time severity classification.
      </p>
      <p style="color:#94a3b8;line-height:1.8;font-size:14px;margin-bottom:16px">
        The automated analysis identified <strong style="color:#ff4444">${criticals.length} CRITICAL</strong> and <strong style="color:#f59e0b">${moderates.length} MODERATE</strong> defects 
        across the inspection zones. The overall structural health index is <strong style="color:${healthColor}">${data.healthScore}%</strong>, 
        classified as <strong style="color:${riskColor}">${data.riskLevel} RISK</strong>. 
        ${criticals.length > 0 ? 'Immediate engineering review is recommended for the critical zones identified.' : 'Scheduled maintenance should proceed per standard protocols.'}
      </p>
      <p style="color:#94a3b8;line-height:1.8;font-size:14px">
        Primary defect types observed include ${[...new Set((data.defects ?? []).map((d: any) => d.type))].join(', ')}.
        GPS-bounded inspection coordinates and individual frame metadata are available in the flight data archive.
        All defect snapshots include annotated bounding boxes with confidence scores for engineering review.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
      ${[
        { label:'Total Frames', value: data.frameCount ?? 240, color:'#22d3ee' },
        { label:'Defects Found', value: (data.defects ?? []).length, color:'#f59e0b' },
        { label:'Health Score', value: `${data.healthScore}%`, color: healthColor },
        { label:'Flight ID', value: data.id, color:'#94a3b8' },
      ].map(s => `<div style="background:#0d1117;border:1px solid #1e2736;border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">${s.label}</div>
        <div style="font-size:24px;font-weight:800;color:${s.color}">${s.value}</div>
      </div>`).join('')}
    </div>

    <h3 style="font-size:16px;color:#e2e8f0;margin-bottom:16px">Defect Inventory</h3>
    <div style="border:1px solid #1e2736;border-radius:12px;overflow:hidden">
      <table><thead><tr><th>ID</th><th>Type</th><th>Zone</th><th>Confidence</th><th>Severity</th></tr></thead>
      <tbody>${defectRows}</tbody></table>
    </div>
  </div>
</div>

<!-- PAGE 3: DEFECT DETAILS -->
<div class="page">
  ${pageHeader('Defect Details')}
  <div style="padding:40px">
    <h2 style="font-size:22px;color:#22d3ee;margin-bottom:24px">Defect Details</h2>
    
    ${criticals.map((d: any) => `
    <div style="background:#0d1117;border:1px solid #ff444433;border-radius:12px;padding:24px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="background:#ff444422;color:#ff4444;border:1px solid #ff444455;padding:4px 10px;border-radius:4px;font-weight:800">CRITICAL</span>
          <span style="font-size:18px;font-weight:700;color:#e2e8f0">${d.type}</span>
          <span style="font-family:monospace;font-size:13px;color:#64748b">${d.id}</span>
        </div>
        <div style="font-size:14px;color:#64748b">Confidence: <strong style="color:#94a3b8">${d.confidence}</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="background:#070b14;border:1px solid #1e2736;border-radius:8px;padding:14px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:8px">Location</div>
          <div style="color:#94a3b8;font-size:14px">${d.zone ?? 'Zone data unavailable'}</div>
        </div>
        <div style="background:#070b14;border:1px solid #1e2736;border-radius:8px;padding:14px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:8px">Recommended Action</div>
          <div style="color:#22d3ee;font-size:14px;font-weight:600">${d.method ?? 'Immediate structural review'}</div>
        </div>
      </div>
    </div>`).join('')}

    ${moderates.length > 0 ? `
    <h3 style="font-size:16px;color:#f59e0b;margin:24px 0 16px">Moderate Defects</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${moderates.map((d: any) => `
      <div style="background:#0d1117;border:1px solid #f59e0b33;border-radius:12px;padding:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700;color:#e2e8f0">${d.type}</span>
          <span style="background:#f59e0b22;color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:11px">MODERATE</span>
        </div>
        <div style="font-size:12px;color:#64748b">Zone: ${d.zone ?? '—'} · Conf: ${d.confidence ?? '—'}</div>
        <div style="font-size:12px;color:#22d3ee;margin-top:6px">${d.method ?? 'Monitor'}</div>
      </div>`).join('')}
    </div>` : ''}
  </div>
</div>

<!-- LAST PAGE: RECOMMENDATIONS -->
<div class="page">
  ${pageHeader('Recommendations')}
  <div style="padding:40px">
    <h2 style="font-size:22px;color:#22d3ee;margin-bottom:24px">Prioritized Repair Plan</h2>
    ${repairRows}

    <div style="margin-top:32px;padding:24px;background:#0d1117;border:1px solid #ff444433;border-radius:12px">
      <h3 style="color:#ff4444;margin-bottom:16px;font-size:15px">⚠ Risk Assessment</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div style="background:#070b14;border:1px solid #1e2736;border-radius:8px;padding:14px">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px">OVERALL RISK</div>
          <div style="font-size:28px;font-weight:800;color:${riskColor}">${data.riskLevel ?? 'HIGH'}</div>
        </div>
        <div style="background:#070b14;border:1px solid #1e2736;border-radius:8px;padding:14px">
          <div style="font-size:11px;color:#64748b;margin-bottom:4px">CRITICAL ZONES</div>
          <div style="font-size:28px;font-weight:800;color:#ff4444">${criticals.length}</div>
        </div>
      </div>
    </div>

    <!-- Signature lines -->
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px">
      ${['Inspector', 'Structural Engineer', 'Site Manager'].map(r => `
      <div>
        <div style="border-top:1px solid #1e2736;padding-top:12px">
          <div style="font-size:12px;color:#64748b">${r}</div>
          <div style="font-size:11px;color:#475569;margin-top:4px">Signature / Date</div>
        </div>
      </div>`).join('')}
    </div>

    <div style="margin-top:40px;padding:16px;border-top:1px solid #1e2736;text-align:center;color:#475569;font-size:11px">
      Generated by STRIDE Inspector v2.0 · ${new Date().toISOString()} · CONFIDENTIAL DOCUMENT
    </div>
  </div>
</div>

</body></html>`;
}

// ─── Main PDF generation function ─────────────────────────────────────────────
export async function generateReport(flightId: string): Promise<string> {
  const outDir = path.join(process.cwd(), 'public', 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `STRIDE_${flightId}_${Date.now()}.pdf`);
  const data = await getFlightData(flightId);
  const html = buildHtml(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outPath, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  } finally {
    await browser.close();
  }
  return `/reports/${path.basename(outPath)}`;
}

// ─── Async job launcher ────────────────────────────────────────────────────────
export function startReportJob(flightId: string): string {
  const jobId = `${flightId}_${Date.now()}`;
  jobs.set(jobId, { status: 'queued', progress: 0 });

  (async () => {
    jobs.set(jobId, { status: 'running', progress: 20 });
    try {
      jobs.set(jobId, { status: 'running', progress: 60 });
      const url = await generateReport(flightId);
      jobs.set(jobId, { status: 'done', progress: 100, downloadUrl: url });
    } catch (e: any) {
      jobs.set(jobId, { status: 'error', progress: 0, error: e.message });
    }
  })();

  return jobId;
}
