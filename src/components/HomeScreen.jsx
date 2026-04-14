import { useState } from 'react';
import { Plus, X, Database, FolderOpen, Clock, Network, FileJson, GitBranch, Zap, Cloud, ScanSearch, TrendingUp, Sparkles, AlignJustify, MessageSquare, Hash, BookOpen } from 'lucide-react';
import { DB } from '../constants';
import { openProj, createProj, deleteProj } from '../store';

const DB_ICONS_SM = {
  sql: <Database size={10} />, document: <FileJson size={10} />, graph: <GitBranch size={10} />,
  cache: <Zap size={10} />, objstore: <Cloud size={10} />, search: <ScanSearch size={10} />,
  tseries: <TrendingUp size={10} />, vector: <Sparkles size={10} />, column: <AlignJustify size={10} />,
  queue: <MessageSquare size={10} />, keyvalue: <Hash size={10} />, ledger: <BookOpen size={10} />,
};

export function HomeScreen({ projects }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [modal, setModal] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProj(name, desc);
    setName(''); setDesc(''); setModal(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--border)', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Database size={22} color="var(--brand)" strokeWidth={2.5} />
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-h)', letterSpacing: -0.5 }}>Data Design Factory</span>
            <span style={{ fontSize: 10, background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid var(--brand-border)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>v3</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Multi-paradigm database schema designer · React Flow · IndexedDB · Export SQL / Prisma / TypeScript</div>
        </div>
        <button onClick={() => setModal(true)} style={{ background: 'var(--brand)', border: 'none', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(75,166,166,.28)' }}>
          <Plus size={15} strokeWidth={2.5} /> New Project
        </button>
      </div>

      {/* DB type legend */}
      <div style={{ padding: '10px 32px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--panel-bg)' }}>
        {Object.entries(DB).map(([t, def]) => (
          <span key={t} style={{ fontSize: 10, color: def.c, background: def.c + '15', padding: '2px 8px', borderRadius: 20, border: `1px solid ${def.c}30`, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{DB_ICONS_SM[t]} {def.l}</span>
        ))}
      </div>

      {/* Projects grid */}
      <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Network size={56} color="var(--border)" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>No projects yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Design full-stack data architectures with mixed database types</div>
            <button onClick={() => setModal(true)} style={{ background: 'var(--brand)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Create First Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => openProj(p)}
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all .15s', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(75,166,166,.16)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.06)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <FolderOpen size={15} color="var(--brand)" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    </div>
                    {p.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{p.description}</div>}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {[...new Set((p.rfNodes || []).map(n => n.data?.dbType))].filter(Boolean).map(t => (
                        <span key={t} style={{ fontSize: 9, color: DB[t]?.c, background: DB[t]?.c + '15', padding: '1px 6px', borderRadius: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{DB_ICONS_SM[t]} {DB[t]?.l}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                      <Clock size={11} />
                      {(p.rfNodes||[]).length} nodes · {(p.rfEdges||[]).length} edges · {new Date(p.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (confirm('Delete project?')) deleteProj(p.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 4, marginLeft: 8, cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'none'; }}
                  ><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New project modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Plus size={18} color="var(--brand)" />
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>New Project</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span className="lbl">Project Name *</span>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="My Microservice Stack" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <span className="lbl">Description</span>
              <input className="inp" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={handleCreate} style={{ background: 'var(--brand)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={13} /> Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
