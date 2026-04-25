/**
 * RightPanel — context-sensitive inspector panel rendered to the right of the canvas.
 *
 * Renders a NodePanel when a node is selected, or an EdgePanel when an edge is selected.
 * Both panels are memoised to prevent unnecessary re-renders during canvas interactions.
 */

import { memo, useState, useRef, useCallback, type CSSProperties } from 'react';
import { Copy, Trash2, ArrowRight, Link2, ChevronDown, ChevronRight, AtSign } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import { DB, CONN_TYPES } from '@/constants';
import { updateNodeData, updateEdge, deleteEdge, duplicateNode } from '@/store';
import { SchemaEditor } from './SchemaEditors';

// ── Types ─────────────────────────────────────────────

interface RightPanelState {
  selId: string | null;
  rfNodes: Node[];
  rfEdges: Edge[];
}

interface RightPanelProps {
  state: RightPanelState;
}

// ── RightPanel ────────────────────────────────────────

/** Top-level panel. Delegates to NodePanel or EdgePanel based on current selection. */
export const RightPanel = memo(function RightPanel({ state }: RightPanelProps) {
  const { selId, rfNodes, rfEdges } = state;
  const selNode = rfNodes.find(n => n.id === selId);
  const selEdge = rfEdges.find(e => e.id === selId);
  const [width, setWidth] = useState(300);
  const dragStart = useRef<{ x: number; w: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, w: width };
    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const next = Math.max(220, Math.min(600, dragStart.current.w - (ev.clientX - dragStart.current.x)));
      setWidth(next);
    };
    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  if (!selNode && !selEdge) return null;

  return (
    <div style={{ width, background: 'var(--panel-bg)', borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div
        onMouseDown={onMouseDown}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', zIndex: 10 }}
      />
      {selEdge && <EdgePanel edge={selEdge} nodes={rfNodes} />}
      {selNode && <NodePanel node={selNode} />}
    </div>
  );
});

// ── Section ───────────────────────────────────────────

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Collapsible section with a chevron toggle, used to group related controls in the panel. */
function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, cursor: 'pointer' }}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {title}
      </button>
      {open && <div style={{ padding: '0 12px 10px' }}>{children}</div>}
    </div>
  );
}

// ── NodePanel ─────────────────────────────────────────

interface NodePanelProps {
  node: Node;
}

/** Inspector for a selected node. Provides name editing, @alias, colour picker, and schema editor. */
const NodePanel = memo(function NodePanel({ node }: NodePanelProps) {
  const data = node.data as Record<string, unknown>;
  const def = DB[data.dbType as string];
  const accent = (data.color as string) || def.c;

  return (
    <>
      <div style={{ background: accent, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 15, color: '#fff' }}>{def.i}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.85)', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{def.l}</span>
          <button onClick={() => duplicateNode(node.id)} title="Duplicate" style={headerBtn}><Copy size={12} /></button>
        </div>
        <input
          value={(data.name as string) || ''}
          onChange={e => updateNodeData(node.id, { name: e.target.value })}
          style={{ width: '100%', background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, fontWeight: 700, outline: 'none', fontFamily: 'var(--sans)' }}
        />
      </div>

      <Section title="@ Alias" defaultOpen={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AtSign size={12} color="var(--muted)" style={{ flexShrink: 0 }} />
          <input
            className="inp"
            value={(data.alias as string) || ''}
            placeholder="e.g. users_db"
            onChange={e => updateNodeData(node.id, { alias: e.target.value.replace(/\s/g, '_') })}
            style={{ fontSize: 11 }}
          />
        </div>
        {data.alias && (
          <div style={{ marginTop: 5, fontSize: 10, color: accent, fontFamily: 'var(--mono)', background: accent + '12', borderRadius: 4, padding: '2px 7px', display: 'inline-block' }}>
            @{data.alias as string}
          </div>
        )}
      </Section>

      <Section title="Color" defaultOpen={false}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([null, '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444', '#F97316'] as (string | null)[]).map(c => (
            <div
              key={c ?? 'def'}
              onClick={() => updateNodeData(node.id, { color: c })}
              style={{ width: 16, height: 16, borderRadius: 3, background: c ?? def.c, cursor: 'pointer', border: `2px solid ${(data.color ?? null) === c ? '#fff' : 'transparent'}`, opacity: c ? 1 : 0.5 }}
            />
          ))}
        </div>
      </Section>

      <Section title="Schema">
        <SchemaEditor n={node as Parameters<typeof SchemaEditor>[0]['n']} />
      </Section>
    </>
  );
});

// ── EdgePanel ─────────────────────────────────────────

interface EdgePanelProps {
  edge: Edge;
  nodes: Node[];
}

/** Inspector for a selected edge. Provides connection type, cardinality, label, and delete. */
const EdgePanel = memo(function EdgePanel({ edge, nodes }: EdgePanelProps) {
  const edgeData = edge.data as Record<string, unknown> | undefined;
  const ct = CONN_TYPES.find((c: { id: string }) => c.id === edgeData?.connType) ?? CONN_TYPES[1];
  const src = nodes.find(n => n.id === edge.source);
  const tgt = nodes.find(n => n.id === edge.target);

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        <Link2 size={12} /> Connection
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--field-bg)', borderRadius: 8, padding: '7px 10px', marginBottom: 10, border: '1px solid var(--border)' }}>
        {src && (() => { const d = src.data as Record<string, unknown>; const c = DB[d.dbType as string]?.c; return <span style={{ fontSize: 10, color: c, background: c + '18', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{d.name as string}</span>; })()}
        <ArrowRight size={11} color={ct.c} style={{ flex: 1 }} />
        {tgt && (() => { const d = tgt.data as Record<string, unknown>; const c = DB[d.dbType as string]?.c; return <span style={{ fontSize: 10, color: c, background: c + '18', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{d.name as string}</span>; })()}
      </div>

      <span className="lbl">Type</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
        {CONN_TYPES.map((c: { id: string; c: string; l: string }) => (
          <button key={c.id} onClick={() => updateEdge(edge.id, { connType: c.id })}
            style={{ background: edgeData?.connType === c.id ? c.c + '20' : 'var(--field-bg)', border: `1.5px solid ${edgeData?.connType === c.id ? c.c : c.c + '33'}`, color: edgeData?.connType === c.id ? c.c : 'var(--muted)', padding: '4px 6px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
            {c.l}
          </button>
        ))}
      </div>

      <span className="lbl">Cardinality</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {['1:1', '1:N', 'N:M', 'M:1', '0:1', '0:N'].map(c => (
          <button key={c} onClick={() => updateEdge(edge.id, { cardinality: edgeData?.cardinality === c ? '' : c })}
            style={{ background: edgeData?.cardinality === c ? '#3B82F620' : 'var(--field-bg)', border: `1px solid ${edgeData?.cardinality === c ? '#3B82F6' : 'var(--border)'}`, color: edgeData?.cardinality === c ? '#3B82F6' : 'var(--muted)', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>

      <span className="lbl">Label</span>
      <input className="inp" value={(edgeData?.label as string) || ''} placeholder="e.g. user_id → id" onChange={e => updateEdge(edge.id, { label: e.target.value })} style={{ marginBottom: 12 }} />

      <button onClick={() => deleteEdge(edge.id)}
        style={{ background: 'transparent', border: '1px solid #EF444444', color: '#EF4444', width: '100%', padding: 7, borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Trash2 size={13} /> Delete Connection
      </button>
    </div>
  );
});

// ── Styles ────────────────────────────────────────────

const headerBtn: CSSProperties = {
  background: 'rgba(255,255,255,.2)',
  border: 'none',
  color: '#fff',
  width: 24,
  height: 24,
  borderRadius: 4,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  flexShrink: 0,
};
