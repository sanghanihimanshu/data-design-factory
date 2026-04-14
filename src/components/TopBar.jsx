import { useReactFlow } from '@xyflow/react';
import {
  AlertTriangle,
  AlignJustify,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Cloud,
  Copy,
  Database, FileJson, GitBranch,
  Hash,
  Keyboard,
  LayoutTemplate,
  MessageSquare,
  Moon, Plus,
  Redo2,
  ScanSearch,
  Sparkles,
  Sun,
  TrendingUp,
  Undo2,
  Upload,
  Zap,
} from 'lucide-react';
import { DB } from '../constants';
import { alignNodes, autoLayoutByDepth, distributeNodes } from '../layoutTools';
import { addNode, copySelected, goHome, pasteClipboard, redo, setState, toggleTheme, undo } from '../store';

const DB_ICONS_SM = {
  sql: <Database size={11} />, document: <FileJson size={11} />, graph: <GitBranch size={11} />,
  cache: <Zap size={11} />, objstore: <Cloud size={11} />, search: <ScanSearch size={11} />,
  tseries: <TrendingUp size={11} />, vector: <Sparkles size={11} />, column: <AlignJustify size={11} />,
  queue: <MessageSquare size={11} />, keyvalue: <Hash size={11} />, ledger: <BookOpen size={11} />,
};

export function TopBar({ state }) {
  const { projId, projects, rfNodes, rfEdges, history, historyIndex, theme } = state;
  const proj = projects.find(p => p.id === projId);
  const rf = useReactFlow();

  const issues = lintNodes(rfNodes, rfEdges);
  const errCount = issues.filter(i => i.sev === 'error').length;
  const warnCount = issues.filter(i => i.sev === 'warn').length;
  const isDark = theme === 'dark';

  const handleAddNode = (type) => {
    const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    addNode(type, { x: center.x - 140, y: center.y - 60 });
  };

  return (
    <div style={{ height: 50, background: 'var(--panel-bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, flexShrink: 0, overflowX: 'auto', overflowY: 'hidden' }}>
      <button onClick={goHome} style={ghostBtn} title="Back to projects">
        <ArrowLeft size={14} />
        <span>Projects</span>
      </button>
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(145deg, #7bc8c8 0%, #4ba6a6 56%, #2f6f6f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9.5, fontWeight: 800, fontFamily: 'Space Grotesk, var(--sans)', letterSpacing: 0.2, boxShadow: '0 2px 8px rgba(75, 166, 166, .30)' }}>
          WF
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: 0.3, fontFamily: 'Space Grotesk, var(--sans)' }}>wfflow</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-h)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj?.name}</span>
        </div>
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

      {/* Node type buttons */}
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', flex: 1, alignItems: 'center' }}>
        {Object.entries(DB).map(([t, def]) => (
          <button key={t} onClick={() => handleAddNode(t)}
            style={{ background: def.c + '10', border: `1px solid ${def.c}28`, color: def.c, padding: '3px 7px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0, fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <Plus size={9} strokeWidth={3} />
            {DB_ICONS_SM[t]} {def.l}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
        <IconBtn onClick={() => setState({ showTemplates: true })} title="Templates"><LayoutTemplate size={14} /><span>Templates</span></IconBtn>
        <IconBtn onClick={() => { const sel = rf.getNodes().filter(n => n.selected).map(n => n.id); copySelected(sel); }} title="Copy (Ctrl+C)"><Copy size={14} /></IconBtn>
        <IconBtn onClick={pasteClipboard} title="Paste (Ctrl+V)"><Clipboard size={14} /></IconBtn>
        <IconBtn onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)"><Undo2 size={14} /></IconBtn>
        <IconBtn onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)"><Redo2 size={14} /></IconBtn>
        <button
          onClick={() => setState({ showLinter: true })}
          style={{ ...ghostBtn, color: errCount ? '#EF4444' : warnCount ? '#F59E0B' : 'var(--muted)', borderColor: errCount ? '#EF444430' : warnCount ? '#F59E0B30' : 'var(--border)' }}
          title="Schema Linter"
        >
          {errCount ? <><AlertTriangle size={13} /><span>{errCount}</span></> : warnCount ? <><AlertTriangle size={13} /><span>{warnCount}</span></> : <><CheckCircle2 size={13} /><span>ok</span></>}
        </button>
        <IconBtn onClick={() => setState({ showExport: true })} title="Export" style={{ color: 'var(--brand)', borderColor: 'color-mix(in srgb, var(--brand) 35%, transparent)', fontWeight: 700 }}><Upload size={14} /><span>Export</span></IconBtn>
        <IconBtn onClick={() => setState({ showShortcuts: !state.showShortcuts })} title="Shortcuts (?)"><Keyboard size={14} /></IconBtn>
        <IconBtn onClick={toggleTheme} title="Toggle theme">{isDark ? <Sun size={14} /> : <Moon size={14} />}</IconBtn>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
        <button onClick={() => alignNodes(rf, 'left')} style={toolBtn} title="Align Left">L</button>
        <button onClick={() => alignNodes(rf, 'center')} style={toolBtn} title="Align Center">C</button>
        <button onClick={() => alignNodes(rf, 'right')} style={toolBtn} title="Align Right">R</button>
        <button onClick={() => alignNodes(rf, 'top')} style={toolBtn} title="Align Top">T</button>
        <button onClick={() => alignNodes(rf, 'middle')} style={toolBtn} title="Align Middle">M</button>
        <button onClick={() => alignNodes(rf, 'bottom')} style={toolBtn} title="Align Bottom">B</button>
        <button onClick={() => distributeNodes(rf, 'x')} style={toolBtn} title="Distribute Horizontally">DX</button>
        <button onClick={() => distributeNodes(rf, 'y')} style={toolBtn} title="Distribute Vertically">DY</button>
        <button onClick={() => autoLayoutByDepth(rf)} style={{ ...toolBtn, minWidth: 38 }} title="Auto Layout by Connection Depth">Auto</button>
      </div>
    </div>
  );
}

function IconBtn({ onClick, disabled, title, style, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 4, opacity: disabled ? 0.35 : 1, ...style }}>
      {children}
    </button>
  );
}

function lintNodes(nodes, edges) {
  const issues = [];
  nodes.forEach(n => {
    const s = n.data?.schema || {};
    if (n.data?.dbType === 'sql' && !(s.columns || []).find(c => c.pk)) issues.push({ sev: 'error', node: n.data.name, msg: 'No primary key' });
    if (n.data?.dbType === 'vector' && (!s.dimensions || s.dimensions < 1)) issues.push({ sev: 'error', node: n.data.name, msg: 'Dimensions must be > 0' });
    if (nodes.length > 1 && !edges.find(e => e.source === n.id || e.target === n.id)) issues.push({ sev: 'info', node: n.data?.name, msg: 'No connections' });
  });
  return issues;
}

const ghostBtn = {
  background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
  padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
  display: 'flex', alignItems: 'center', gap: 4,
};

const toolBtn = {
  background: 'var(--field-bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  minWidth: 26,
  height: 24,
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 700,
  padding: '0 6px',
  cursor: 'pointer',
};
