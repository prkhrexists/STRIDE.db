'use client';

import React, { useState, useEffect, useRef } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { Send, Trash2, FileText, Brain, RefreshCw, Zap, Download, ChevronDown, BarChart2, PieChart as PieChartIcon, Box, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Message { role: 'user' | 'assistant'; content: string; }

const quickPrompts = [
  'Summarize critical defects',
  'Compare Flight 001 vs 002',
  'Generate repair recommendations',
  'Create executive summary',
  'Estimate structural risk',
];

// --- Custom Renderers for AI Output ---
const DefectTable = () => (
  <div style={{ marginTop: 12, marginBottom: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}>
          <th style={{ padding: '8px 12px', fontWeight: 600 }}>ID</th>
          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Zone</th>
          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Type</th>
          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Severity</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>D-001</td>
          <td style={{ padding: '8px 12px' }}>North Tower</td>
          <td style={{ padding: '8px 12px' }}>Crack</td>
          <td style={{ padding: '8px 12px', color: 'var(--accent-red)', fontWeight: 700 }}>CRITICAL</td>
        </tr>
        <tr>
          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>D-004</td>
          <td style={{ padding: '8px 12px' }}>South Tower</td>
          <td style={{ padding: '8px 12px' }}>Crack</td>
          <td style={{ padding: '8px 12px', color: 'var(--accent-red)', fontWeight: 700 }}>CRITICAL</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const SeverityChart = () => {
  const data = [
    { name: 'Critical', value: 2, color: '#EF4444' },
    { name: 'Warning', value: 3, color: '#F59E0B' },
    { name: 'Moderate', value: 4, color: '#3B82F6' },
    { name: 'Clean', value: 21, color: '#22C55E' },
  ];
  return (
    <div style={{ marginTop: 12, marginBottom: 12, background: 'var(--bg-primary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', height: 200, display: 'flex', alignItems: 'center' }}>
      <ResponsiveContainer width="50%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 4, fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 20 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RiskChart = () => {
  const data = [
    { name: 'Tower N', risk: 85 },
    { name: 'Tower S', risk: 60 },
    { name: 'Deck', risk: 20 },
    { name: 'Pier 3', risk: 45 },
  ];
  return (
    <div style={{ marginTop: 12, marginBottom: 12, background: 'var(--bg-primary)', padding: '16px 16px 0 0', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'var(--bg-elevated)' }} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 4, fontSize: 11 }} />
          <Bar dataKey="risk" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Report Generator Overlay ---
function ReportGenerator({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  
  useEffect(() => {
    let t1 = setTimeout(() => setStep(1), 1500);
    let t2 = setTimeout(() => setStep(2), 3000);
    let t3 = setTimeout(() => setStep(3), 5000);
    let t4 = setTimeout(() => setStep(4), 6500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stride-card" style={{ width: 400, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <FileText size={32} color="var(--accent-blue)" style={{ marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'white' }}>Generating Executive Report</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center' }}>Compiling multi-page PDF with telemetry, charts, and annotated images.</p>
        
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {[
            'Loading flight context & metadata...',
            'Aggregating defect severity charts...',
            'Generating repair recommendations...',
            'Formatting PDF & applying branding...',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: step >= i ? 1 : 0.3, transition: 'opacity 0.3s' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: step > i ? 'var(--accent-green)' : step === i ? 'var(--accent-blue)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {step > i && <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%' }} />}
              </div>
              <span style={{ fontSize: 12, color: step === i ? 'white' : 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>

        {step === 4 ? (
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Close</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { window.print(); onClose(); }}><Download size={14}/> Download PDF</button>
          </div>
        ) : (
          <div className="progress-track" style={{ width: '100%', height: 4 }}>
            <div className="progress-fill" style={{ width: `${(step / 4) * 100}%`, background: 'var(--accent-blue)', transition: 'width 1.5s linear' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Chat Content ---
function ChatContent() {
  const router = useRouter();
  const { success, info } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'checking'|'online'|'offline'>('online');
  const [showReportGen, setShowReportGen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [stats, setStats] = useState({ numFlights: 3, numDefects: 14 });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ai-analyst')
      .then(r => r.json())
      .then(d => { if(d.numFlights) setStats(d); })
      .catch(()=>{});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('stride_chat_v2');
    if (saved) setMessages(JSON.parse(saved));
    else setMessages([{ role:'assistant', content:'Hello Operator. I am **STRIDE-Inspector**, your AI-powered structural analysis assistant.\n\nI have loaded the Context Engine with:\n- **3 Flights**\n- **14 Defect Metadata Entries**\n- **Full Inspection History**\n\nHow can I assist you today?' }]);
  }, []);

  useEffect(() => {
    localStorage.setItem('stride_chat_v2', JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const handleSend = async (override?: string) => {
    const text = override || input;
    if (!text.trim() || isStreaming) return;
    setInput('');
    const newMsgs: Message[] = [...messages, { role:'user', content:text }];
    setMessages(newMsgs);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/ai-analyst', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:newMsgs })
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false, ai = '';
      setMessages(p=>[...p,{role:'assistant',content:''}]);
      while (!done) {
        const { value, done:rd } = await reader.read();
        done = rd;
        if (value) {
          const chunk = decoder.decode(value,{stream:true});
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const d = JSON.parse(line.slice(6));
                ai += d.choices?.[0]?.delta?.content || '';
                setMessages(p=>{ const c=[...p]; c[c.length-1].content=ai; return c; });
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages(p=>[...p,{role:'assistant',content:'⚠ Connection error. Analytics engine offline.'}]);
    } finally { setIsStreaming(false); }
  };

  const clearHistory = () => {
    const init: Message[] = [{ role:'assistant', content:'Context engine reset. How can I assist with your inspection data?' }];
    setMessages(init);
    localStorage.setItem('stride_chat_v2', JSON.stringify(init));
    info('Chat history cleared');
  };

  const handleExport = (format: string) => {
    setShowExportMenu(false);
    if (format === 'PDF') {
      setShowReportGen(true);
    } else {
      success(`Chat exported as ${format}`);
    }
  };

  const renderContent = (text: string, isStreaming: boolean) => {
    // Attempt to parse JSON if it looks like a structured response
    if (text.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(text);
        if (obj.type === 'defect_summary') {
          return (
            <div style={{ marginTop: 12, marginBottom: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', fontWeight: 700, fontSize: 13, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Box size={14} color="var(--accent-blue)" /> Critical Defect Summary
              </div>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Location</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Confidence</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {obj.data.map((d: any, i: number) => (
                    <tr key={i} style={{ borderBottom: i === obj.data.length - 1 ? 'none' : '1px solid var(--border-primary)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{d.id || d.defect_id}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{d.type}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{d.zone || d.location}</td>
                      <td style={{ padding: '8px 12px' }}>{d.confidence}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge ${d.severity === 'CRITICAL' ? 'badge-red' : 'badge-amber'}`}>{d.severity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (obj.type === 'flight_comparison') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="stride-card" style={{ flex: 1, padding: 16, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>{obj.data.flight1}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{obj.data.total_defects_f1}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Defects</div>
                </div>
                <div className="stride-card" style={{ flex: 1, padding: 16, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>{obj.data.flight2}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{obj.data.total_defects_f2}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Defects</div>
                </div>
              </div>
              <div className="stride-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border-primary)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Health Delta</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: String(obj.data.health_delta).includes('-') ? 'var(--accent-red)' : 'var(--accent-green)' }}>{obj.data.health_delta}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>New Defects</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: obj.data.new_defects > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>+{obj.data.new_defects}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resolved</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: obj.data.resolved_defects > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>-{obj.data.resolved_defects}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Worst Location</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-amber)' }}>{obj.data.worst_location}</div>
                </div>
              </div>
            </div>
          );
        }
        if (obj.type === 'repair_plan') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Brain size={14} color="var(--accent-blue)"/> Prioritized Repair Plan</div>
              {obj.data.map((d: any, i: number) => (
                <div key={i} className="stride-card" style={{ padding: '12px 16px', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className={`badge ${d.priority === 'P1' ? 'badge-red' : d.priority === 'P2' ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: 14, padding: '4px 8px' }}>{d.priority}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{d.method}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Target: <span style={{ fontFamily: 'var(--font-mono)', color: 'white' }}>{d.defect_id}</span>
                      <div style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--border-primary)' }} />
                      Urgency: <span style={{ color: d.urgency.toLowerCase().includes('immediate') ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{d.urgency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        if (obj.type === 'risk_matrix') {
          return (
            <div className="stride-card" style={{ padding: 20, border: '1px solid var(--accent-red)', marginTop: 12, background: 'var(--accent-red-glow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-red)', letterSpacing: '0.05em', marginBottom: 4 }}>Overall Structural Risk Score</div>
                  <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', lineHeight: 1 }}>{obj.data.score}<span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/10</span></div>
                </div>
                <div style={{ textAlign: 'right', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-red)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Likelihood: <span style={{ color: 'white', fontWeight: 700 }}>{obj.data.likelihood}</span></div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Impact: <span style={{ color: 'white', fontWeight: 700 }}>{obj.data.impact}</span></div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'white', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={12} color="var(--accent-red)"/> Key Risk Factors:</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {obj.data.factors.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          );
        }
      } catch (e) {
        // Fallback during streaming of JSON
        if (isStreaming) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
              <div style={{ animation: 'spin 1s linear infinite' }}><RefreshCw size={12} /></div>
              Processing structured analysis response...
            </div>
          );
        } else {
          return <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>{text}</div>;
        }
      }
    }

    // Fallback to basic Markdown parsing
    const parts = text.split(/(\[TABLE: defects\]|\[CHART: severity\]|\[CHART: risk\]|\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part === '[TABLE: defects]') return <DefectTable key={i} />;
      if (part === '[CHART: severity]') return <SeverityChart key={i} />;
      if (part === '[CHART: risk]') return <RiskChart key={i} />;
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} style={{ color:'var(--text-primary)' }}>{part.slice(2,-2)}</strong>;
      if (/^`[^`]+`$/.test(part)) return <code key={i} style={{ fontFamily:'var(--font-mono)', fontSize:12, background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:3, color:'var(--accent-cyan)' }}>{part.slice(1,-1)}</code>;
      return <span key={i}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{line}{j !== part.split('\n').length - 1 && <br />}</React.Fragment>)}</span>;
    });
  };

  return (
    <PageShell title="AI Analyst" subtitle="STRIDE-Inspector · Infrastructure Analysis Assistant"
      actions={
        <div style={{ display:'flex', gap:8, position: 'relative' }}>
          <button className="btn btn-ghost btn-sm" onClick={clearHistory}><Trash2 size={11}/> Clear</button>
          
          <div style={{ position: 'relative' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download size={11}/> Export <ChevronDown size={11} />
            </button>
            {showExportMenu && (
              <div className="stride-card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, padding: 4, zIndex: 50, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => handleExport('PDF')}><FileText size={12}/> Export to PDF</button>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => handleExport('CSV')}><BarChart2 size={12}/> Export to CSV</button>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => handleExport('JSON')}><Box size={12}/> Export as JSON</button>
              </div>
            )}
          </div>
        </div>
      }>
      
      {showReportGen && <ReportGenerator onClose={() => setShowReportGen(false)} />}

      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 130px)' }}>

        {/* Status Bar */}
        <div className="stride-card" style={{ padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent-green)', animation: 'pulse-dot 2s infinite' }}/>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--accent-green)' }}>ONLINE</span>
          </div>
          <div style={{ width:1, height:16, background:'var(--border-primary)' }}/>
          <div className="badge badge-blue" style={{ fontSize:10 }}><Brain size={10}/> Analytics Engine v2</div>
          <div style={{ width:1, height:16, background:'var(--border-primary)' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-secondary)' }}>
            <Zap size={11} color="var(--accent-amber)"/>
            Context Loader Active: {stats.numFlights} flights · {stats.numDefects} defects
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:16, paddingBottom:8, paddingRight: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth: m.role==='user'?'70%':'85%' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:5, textAlign: m.role==='user'?'right':'left' }}>
                {m.role==='user' ? 'Operator' : 'AI Inspector'}
              </div>
              <div style={{ padding:'14px 18px', borderRadius: m.role==='user'?'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)':'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px', background: m.role==='user'?'var(--accent-blue)':'var(--bg-card)', border: m.role==='user'?'none':'1px solid var(--border-primary)', color: m.role==='user'?'white':'var(--text-secondary)', lineHeight:1.6, fontSize:13, boxShadow:'var(--shadow-card)' }}>
                {renderContent(m.content, isStreaming && i === messages.length - 1)}
                {isStreaming && i===messages.length-1 && m.role==='assistant' && !m.content.trim().startsWith('{') && (
                  <span style={{ display:'inline-block', width:2, height:14, background:'var(--accent-blue)', marginLeft:2, animation:'blink 1s step-end infinite', verticalAlign:'middle' }}/>
                )}
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length-1]?.role==='user' && (
            <div style={{ alignSelf:'flex-start', display:'flex', gap:4, padding:'12px 16px' }}>
              {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', animation:`pulse-dot 1.2s ${i*0.2}s infinite` }}/>)}
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Input Area */}
        <div className="stride-card" style={{ padding:14, marginTop:14, flexShrink:0 }}>
          {/* Quick prompts */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:12, marginBottom:12, borderBottom:'1px solid var(--border-primary)', WebkitOverflowScrolling: 'touch' }}>
            {quickPrompts.map(q=>(
              <button key={q} onClick={()=>handleSend(q)} className="btn btn-secondary btn-sm" style={{ whiteSpace:'nowrap', fontSize:11, background: 'var(--bg-primary)', border: '1px solid var(--border-active)' }}>{q}</button>
            ))}
          </div>
          <div style={{ position:'relative' }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}}
              placeholder="Ask about structural risks, compare flights, or request a summary..."
              style={{ width:'100%', height:76, padding:'12px 50px 12px 14px', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border-primary)', borderRadius:'var(--radius-md)', resize:'none', fontFamily:'var(--font-sans)', fontSize:13, outline:'none', lineHeight:1.5 }}
            />
            <button onClick={()=>handleSend()} disabled={isStreaming||!input.trim()} style={{ position:'absolute', right:10, bottom:10, width:34, height:34, borderRadius:'var(--radius-sm)', border:'none', cursor: isStreaming||!input.trim()?'not-allowed':'pointer', background: isStreaming||!input.trim()?'var(--border-primary)':'var(--accent-blue)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', opacity: isStreaming||!input.trim()?0.5:1, transition:'all 0.2s', boxShadow: !isStreaming&&input.trim()?'var(--shadow-glow-blue)':undefined }}>
              <Send size={14}/>
            </button>
          </div>
          <div style={{ textAlign:'center', fontSize:10, color:'var(--text-muted)', marginTop:8 }}>
            Shift+Enter for new line · Reports generated by STRIDE Analytics Engine
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function ChatPage() {
  return <ToastProvider><ChatContent /></ToastProvider>;
}
