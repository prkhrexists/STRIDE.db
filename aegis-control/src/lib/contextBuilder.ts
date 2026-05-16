import fs from 'fs';
import path from 'path';

export async function buildMissionContext() {
  // Search both directories for flight data
  const searchPaths = [
    path.join(process.cwd(), 'data', 'flights'),
    path.join(process.cwd(), 'public', 'data', 'flights'),
  ];

  let flights: any[] = [];

  for (const dataDir of searchPaths) {
    if (!fs.existsSync(dataDir)) continue;

    try {
      const dirs = fs.readdirSync(dataDir);
      for (const d of dirs) {
        const flightPath = path.join(dataDir, d);
        if (!fs.statSync(flightPath).isDirectory()) continue;

        // Support both naming conventions:
        // Old format: metadata.json + results.json
        // New format: manifest.json + results.json
        const metaPath = path.join(flightPath, 'metadata.json');
        const manifestPath = path.join(flightPath, 'manifest.json');
        const resultsPath = path.join(flightPath, 'results.json');

        let metadata: any = null;
        let results: any = null;

        // Read metadata (try metadata.json first, then manifest.json)
        if (fs.existsSync(metaPath)) {
          try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch {}
        } else if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            metadata = {
              id: manifest.sessionId ? `FL-${String(manifest.sessionId).padStart(3, '0')}` : d,
              name: manifest.name || d,
              date: manifest.date || manifest.timestamp?.split('T')[0] || 'unknown',
              structure: manifest.structure || 'Unknown',
              frameCount: manifest.frameCount || 0,
            };
          } catch {}
        }

        // Read results
        if (fs.existsSync(resultsPath)) {
          try { results = JSON.parse(fs.readFileSync(resultsPath, 'utf8')); } catch {}
        }

        // If we have at least metadata, include this flight
        if (metadata) {
          flights.push({
            metadata,
            healthScore: results?.healthScore ?? 100,
            riskLevel: results?.riskLevel ?? 'LOW',
            defects: results?.defects ?? [],
          });
        }
      }
    } catch (e) {
      console.warn('[contextBuilder] Failed to read flight data from', dataDir, e);
    }
  }

  // Fallback to mock data if no real flights exist
  if (flights.length === 0) {
    flights = [
      {
        metadata: { id: 'FL-001', name: 'Highway Bridge Deck', date: '2026-05-14', structure: 'Bridge', frameCount: 450 },
        healthScore: 78,
        riskLevel: 'MODERATE',
        defects: [
          { id: 'd1', type: 'Crack', severity: 'CRITICAL', position: [2, 0.5, -1], confidence: 0.92, zone: 'Pier 3' },
          { id: 'd2', type: 'Spalling', severity: 'MODERATE', position: [-3, -1, 2], confidence: 0.85, zone: 'Deck Underside' },
          { id: 'd3', type: 'Corrosion', severity: 'WARNING', position: [0, 2, 4], confidence: 0.77, zone: 'Cable Anchor' },
        ]
      },
      {
        metadata: { id: 'FL-002', name: 'Comms Tower A', date: '2026-05-15', structure: 'Tower', frameCount: 210 },
        healthScore: 92,
        riskLevel: 'LOW',
        defects: [
          { id: 'd4', type: 'Corrosion', severity: 'MODERATE', position: [0, 5, 0], confidence: 0.88, zone: 'Level 2 Crossbrace' },
        ]
      },
      {
        metadata: { id: 'FL-003', name: 'Hydro Dam Spillway', date: '2026-05-16', structure: 'Dam', frameCount: 840 },
        healthScore: 65,
        riskLevel: 'CRITICAL',
        defects: [
          { id: 'd5', type: 'Crack', severity: 'CRITICAL', position: [10, -5, 2], confidence: 0.95, zone: 'Spillway Face Left' },
          { id: 'd6', type: 'Spalling', severity: 'CRITICAL', position: [12, -6, 2], confidence: 0.91, zone: 'Spillway Face Left' },
          { id: 'd7', type: 'Spalling', severity: 'MODERATE', position: [-5, 10, 1], confidence: 0.81, zone: 'Upper Crest' },
        ]
      }
    ];
    for (let i = 8; i <= 14; i++) {
      flights[2].defects.push({
        id: `d${i}`, type: 'Minor Wear', severity: 'CLEAN', position: [0, 0, 0], confidence: 0.99, zone: 'General'
      });
    }
  }

  const numFlights = flights.length;
  const numDefects = flights.reduce((acc, f) => acc + (f.defects ? f.defects.length : 0), 0);
  const structures = Array.from(new Set(flights.map(f => f.metadata?.structure || 'Unknown'))).join(', ');

  const systemPrompt = `You are STRIDE-Inspector, an AI structural inspection analyst. You have access to the following inspection data from ${numFlights} flights conducted on ${structures}: 

${JSON.stringify(flights, null, 2)}

When the user query matches these specific patterns, you MUST return ONLY a JSON response (no markdown, no prose before or after) with the following structures:

1. "Summarize critical defects"
{"type": "defect_summary", "data": [{"id": "D-001", "type": "Crack", "zone": "North Tower", "confidence": "95%", "severity": "CRITICAL"}]}

2. "Compare Flight X vs Flight Y"
{"type": "flight_comparison", "data": {"flight1": "FL-001", "flight2": "FL-002", "total_defects_f1": 10, "total_defects_f2": 15, "health_delta": "-5%", "new_defects": 5, "resolved_defects": 0, "worst_location": "Pier 3"}}

3. "Generate repair recommendations"
{"type": "repair_plan", "data": [{"priority": "P1", "defect_id": "D-001", "method": "Epoxy Injection", "urgency": "Immediate"}]}

4. "Estimate structural risk"
{"type": "risk_matrix", "data": {"score": 8, "likelihood": "High", "impact": "Critical", "factors": ["Major spalling on load-bearing column"]}}

For all other queries, respond in plain text, concise but technical.`;

  return { systemPrompt, stats: { numFlights, numDefects } };
}
