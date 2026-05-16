'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { Layers, Activity, ShieldAlert, Cpu, Box, AlertTriangle, Hammer, XCircle } from 'lucide-react';
import ThreeDAnalysis from '@/components/ThreeDAnalysis';

function SearchContent() {
  const { success, error } = useToast();
  
  const [models, setModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [activeDefectId, setActiveDefectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'solid'|'wireframe'|'mesh'|'pointcloud'|'thermal'>('solid');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/model/reconstruct')
      .then(res => res.json())
      .then(data => {
        setModels(data.models);
        if (data.models.length > 0) {
          setSelectedModelId(data.models[0].id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        error("Failed to load 3D reconstruction data.");
        setIsLoading(false);
      });
  }, []);

  const activeModel = models.find(m => m.id === selectedModelId);
  const activeDefect = activeModel?.defects?.find((d: any) => d.id === activeDefectId);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'var(--accent-green)';
      case 'MODERATE': return 'var(--accent-amber)';
      case 'CRITICAL': return 'var(--accent-red)';
      default: return 'var(--text-muted)';
    }
  };

  if (isLoading) return <PageShell title="3D Analysis" noPadding><div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'var(--text-muted)'}}>Initializing 3D Environment...</div></PageShell>;

  return (
    <PageShell title="3D Analysis" subtitle="Photogrammetry & structural reconstruction viewer"
      actions={
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => success("Regenerating mesh...")}><Cpu size={12}/> Run Reconstruction</button>
        </div>
      }>
      
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 130px)' }}>

        {/* LEFT SIDEBAR: Structure Selection & Analysis Panel */}
        <div style={{ width:280, display:'flex', flexDirection:'column', gap:12, flexShrink:0, overflowY:'auto' }}>
          
          <div className="stride-card" style={{ overflow:'hidden' }}>
            <div className="card-header">
              <span className="card-header-title">Structures</span>
            </div>
            <div style={{ overflowY:'auto', maxHeight:200 }}>
              {models.map(m=>(
                <div key={m.id} onClick={()=>{ setSelectedModelId(m.id); setActiveDefectId(null); }} style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-primary)', background: selectedModelId===m.id?'var(--accent-blue-glow)':'transparent', borderLeft: selectedModelId===m.id?'3px solid var(--accent-blue)':'3px solid transparent', transition:'all 0.15s' }}>
                  <div style={{ fontSize:13, fontWeight:600, color: selectedModelId===m.id?'var(--accent-blue-bright)':'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{m.type} · {m.stats.images_stitched} imgs</div>
                </div>
              ))}
            </div>
          </div>

          {activeModel && (
            <div className="stride-card" style={{ padding:14, display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 }}>
                <Activity size={10}/> Analysis Panel
              </div>
              
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Health Score</div>
                <div style={{ fontSize:20, fontWeight:700, color: activeModel.health_score > 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                  {activeModel.health_score ? `${activeModel.health_score}%` : 'N/A'}
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Risk Level</div>
                <div className="badge" style={{ background:`${getRiskColor(activeModel.risk_level)}20`, color:getRiskColor(activeModel.risk_level), border:`1px solid ${getRiskColor(activeModel.risk_level)}` }}>
                  {activeModel.risk_level}
                </div>
              </div>

              <div style={{ height:1, background:'var(--border-primary)' }} />

              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>Model Statistics</div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Points</span>
                  <span style={{ fontSize:12, fontFamily:'var(--font-mono)' }}>{(activeModel.stats.points/1000000).toFixed(1)}M</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Mesh Faces</span>
                  <span style={{ fontSize:12, fontFamily:'var(--font-mono)' }}>{activeModel.stats.mesh_faces.toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>Defects</span>
                  <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--accent-amber)' }}>{activeModel.stats.defects_mapped}</span>
                </div>
              </div>
            </div>
          )}

          {activeDefect && (
            <div className="stride-card" style={{ padding:14, border:'1px solid var(--accent-blue)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--accent-blue)' }}>Defect Details</div>
                <button className="btn btn-ghost btn-sm" style={{ padding:4 }} onClick={() => setActiveDefectId(null)}>
                  <XCircle size={14} />
                </button>
              </div>
              
              <div style={{ fontSize:14, fontWeight:700, color:'white', marginBottom:4 }}>{activeDefect.type}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>{activeDefect.zone}</div>
              
              <div style={{ background:'var(--bg-primary)', padding:8, borderRadius:'var(--radius-sm)', marginBottom:12 }}>
                <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                  <ShieldAlert size={12} color={activeDefect.severity === 'CRITICAL' ? 'var(--accent-red)' : 'var(--accent-amber)'} />
                  <span style={{ fontSize:11, fontWeight:600, color: activeDefect.severity === 'CRITICAL' ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                    Severity: {activeDefect.severity}
                  </span>
                </div>
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>Area: {activeDefect.area}</div>
              </div>

              <div style={{ fontSize:11, color:'var(--text-secondary)', display:'flex', gap:6, alignItems:'flex-start' }}>
                <Hammer size={12} color="var(--accent-blue)" style={{ marginTop:2 }} />
                <div>
                  <div style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>Repair Recommendation</div>
                  {activeDefect.repair}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MAIN VIEWER AREA */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, position:'relative' }}>
          
          {/* Top Tools Bar */}
          <div className="stride-card" style={{ padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'absolute', top:12, left:12, right:12, zIndex:10 }}>
            <div style={{ display:'flex', gap:4, background:'var(--bg-primary)', padding:4, borderRadius:'var(--radius-md)' }}>
              {[
                { id: 'solid', label: 'Solid', icon: Box },
                { id: 'mesh', label: 'Mesh', icon: Layers },
                { id: 'wireframe', label: 'Wireframe', icon: Box },
                { id: 'pointcloud', label: 'Point Cloud', icon: Activity },
                { id: 'thermal', label: 'Damage Heatmap', icon: AlertTriangle },
              ].map(mode => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as any)}
                    className={`btn btn-sm ${viewMode === mode.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px' }}
                  >
                    <Icon size={12} />
                    <span style={{ fontSize: 11 }}>{mode.label}</span>
                  </button>
                )
              })}
            </div>
            
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
              STATUS: {activeModel?.status}
            </div>
          </div>

          {/* 3D Canvas Container */}
          <div style={{ flex:1, borderRadius:'var(--radius-lg)', overflow:'hidden', border:'1px solid var(--border-primary)', position:'relative' }}>
            {activeModel ? (
              <ThreeDAnalysis 
                mode={viewMode} 
                onSelectDefect={setActiveDefectId} 
                activeDefectId={activeDefectId}
                modelData={activeModel}
                viewMode={viewMode}
              />
            ) : (
              <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'var(--text-muted)' }}>
                No model selected
              </div>
            )}
            
            {/* Overlay Help Text */}
            <div style={{ position:'absolute', bottom:16, left:16, pointerEvents:'none', fontSize:11, color:'var(--text-muted)' }}>
              Left Click: Rotate • Right Click: Pan • Scroll: Zoom
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}

export default function SearchPage() {
  return <ToastProvider><SearchContent /></ToastProvider>;
}
