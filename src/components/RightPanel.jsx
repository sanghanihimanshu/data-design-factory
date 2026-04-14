import { Copy, Trash2, ArrowRight, Link2 } from 'lucide-react';
import { DB, CONN_TYPES } from '../constants';
import { updateNodeData, updateEdge, deleteEdge, duplicateNode } from '../store';
import { SchemaEditor } from './SchemaEditors';

export function RightPanel({ state }) {
  const { selId, rfNodes, rfEdges } = state;
  const selNode = rfNodes.find(n => n.id === selId);
  const selEdge = rfEdges.find(e => e.id === selId);
  if (!selNode && !selEdge) return null;

  return (
    <div style={{ width: 320, background: 'var(--panel-bg)', borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {selEdge && <EdgePanel edge={selEdge} nodes={rfNodes} />}
      {selNode && <NodePanel node={selNode} />}
    </div>
  );
}

function NodePanel({ node }) {
  const def = DB[node.data.dbType];
  const accent = node.data.color || def.c;
  return (
    <>
      <div style={{ background: accent, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16, color: '#fff' }}>{def.i}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)', flex: 1 }}>{def.l.toUpperCase()}</span>
          <button onClick={() => duplicateNode(node.id)} title="Duplicate" style={headerBtn}><Copy size={13} /></button>
        </div>
        <input value={node.data.name} onChange={e => updateNodeData(node.id, { name: e.target.value })}
          style={{ width: '100%', background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 6, padding: '5px 8px', color: '#fff', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'var(--sans)' }} />
        <select value={node.data.engine} onChange={e => updateNodeData(node.id, { engine: e.target.value })}
          style={{ width: '100%', marginTop: 6, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
          {def.engines.map(e => <option key={e} style={{ color: '#000' }}>{e}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
          {[null,'#3B82F6','#10B981','#8B5CF6','#F59E0B','#EC4899','#06B6D4','#EF4444','#F97316'].map(c => (
            <div key={c||'def'} onClick={() => updateNodeData(node.id, { color: c })}
              style={{ width: 18, height: 18, borderRadius: 4, background: c || def.c, cursor: 'pointer', border: `2px solid ${(node.data.color||null)===c?'#fff':'transparent'}`, opacity: c?1:0.5 }} />
          ))}
        </div>
      </div>
      <div style={{ padding: '12px 14px', flex: 1 }}>
        <SchemaEditor n={node} />
      </div>
    </>
  );
}

function EdgePanel({ edge, nodes }) {
  const ct = CONN_TYPES.find(c => c.id === edge.data?.connType) || CONN_TYPES[1];
  const src = nodes.find(n => n.id === edge.source);
  const tgt = nodes.find(n => n.id === edge.target);
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        <Link2 size={12} /> Connection
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--field-bg)', borderRadius: 8, padding: '8px 10px', marginBottom: 12, border: '1px solid var(--border)' }}>
        {src && <span style={{ fontSize: 10, color: DB[src.data.dbType]?.c, background: DB[src.data.dbType]?.c + '18', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{src.data.name}</span>}
        <ArrowRight size={12} color={ct.c} style={{ flex: 1 }} />
        {tgt && <span style={{ fontSize: 10, color: DB[tgt.data.dbType]?.c, background: DB[tgt.data.dbType]?.c + '18', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{tgt.data.name}</span>}
      </div>

      <span className="lbl" style={{ marginBottom: 8 }}>Type</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {CONN_TYPES.map(c => (
          <button key={c.id} onClick={() => updateEdge(edge.id, { connType: c.id })}
            style={{ background: edge.data?.connType===c.id ? c.c+'20' : 'var(--field-bg)', border: `1.5px solid ${edge.data?.connType===c.id ? c.c : c.c+'33'}`, color: edge.data?.connType===c.id ? c.c : 'var(--muted)', padding: '4px 6px', borderRadius: 5, fontSize: 9.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
            {c.l}
          </button>
        ))}
      </div>

      <span className="lbl" style={{ marginBottom: 6 }}>Cardinality</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {['1:1','1:N','N:M','M:1','0:1','0:N'].map(c => (
          <button key={c} onClick={() => updateEdge(edge.id, { cardinality: edge.data?.cardinality===c ? '' : c })}
            style={{ background: edge.data?.cardinality===c ? '#3B82F620' : 'var(--field-bg)', border: `1px solid ${edge.data?.cardinality===c ? '#3B82F6' : 'var(--border)'}`, color: edge.data?.cardinality===c ? '#3B82F6' : 'var(--muted)', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>

      <span className="lbl">Label</span>
      <input className="inp" value={edge.data?.label||''} placeholder="e.g. user_id → id" onChange={e => updateEdge(edge.id, { label: e.target.value })} style={{ marginBottom: 16 }} />

      <button onClick={() => deleteEdge(edge.id)}
        style={{ background: 'transparent', border: '1px solid #EF444444', color: '#EF4444', width: '100%', padding: 7, borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Trash2 size={13} /> Delete Connection
      </button>
    </div>
  );
}

const headerBtn = {
  background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff',
  width: 26, height: 26, borderRadius: 5, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};
