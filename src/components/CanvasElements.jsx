import { DB, NW, CONN_TYPES } from '../constants';
import { nodeH, bezier, toScreen } from '../utils';
import { NodeBody } from './NodeBody';
import { setState, finishLink, delNode } from '../store';

export function NodeEl({ n, selId, linking, pendingConnType, onMouseDown }) {
  const def = DB[n.type];
  const isSel = selId === n.id;
  const isLink = linking === n.id;
  const isTarget = linking && linking !== n.id;
  const h = nodeH(n);
  const accent = n.color || def.c;

  return (
    <div
      data-nid={n.id}
      onMouseDown={e => onMouseDown(e, n)}
      style={{
        position: 'absolute', left: n.x, top: n.y, width: NW, height: h,
        background: 'var(--bg1)', border: `1.5px solid ${isSel ? accent : isLink ? '#FBBF24' : 'var(--border)'}`,
        borderRadius: 8, overflow: 'visible', cursor: 'grab',
        boxShadow: isSel ? `0 0 0 1px ${accent}44,0 10px 32px rgba(0,0,0,.75)` : '0 2px 12px rgba(0,0,0,.5)',
        transition: 'box-shadow .18s,border-color .12s',
      }}
    >
      {/* header */}
      <div style={{ background: def.d, borderBottom: `1px solid ${accent}28`, padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: '6px 6px 0 0' }}>
        <span style={{ fontSize: 12, color: accent, flexShrink: 0 }}>{def.i}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
        <span style={{ fontSize: 9, color: accent, background: accent + '1a', padding: '1px 5px', borderRadius: 10, flexShrink: 0, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: `1px solid ${accent}33` }}>{n.engine || ''}</span>
        <button
          className="nl"
          data-nid={n.id}
          onClick={e => { e.stopPropagation(); setState({ linking: n.id }); }}
          style={{ background: isLink ? accent : 'transparent', border: `1.5px solid ${accent}55`, color: accent, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, padding: 0, cursor: 'pointer', lineHeight: 1 }}
        >→</button>
        <button
          onClick={e => { e.stopPropagation(); if (confirm('Delete this node?')) delNode(n.id); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--hint)', padding: '0 2px', fontSize: 12, lineHeight: 1, cursor: 'pointer' }}
        >✕</button>
      </div>
      {/* body */}
      <div style={{ overflow: 'hidden', borderRadius: '0 0 6px 6px' }}>
        <NodeBody n={n} />
      </div>
      {/* port handles */}
      <div style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: 'var(--bg0)', border: `2px solid ${accent}55`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: 'var(--bg0)', border: `2px solid ${accent}55`, pointerEvents: 'none' }} />
      {/* link target overlay */}
      {isTarget && (
        <div
          onClick={e => { e.stopPropagation(); finishLink(n.id); }}
          style={{ position: 'absolute', inset: -2, background: 'rgba(96,165,250,.07)', border: '2px solid #60A5FA', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair', zIndex: 5 }}
        >
          <div style={{ background: '#60A5FA', color: '#000', padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, pointerEvents: 'none', letterSpacing: '.3px' }}>+ Connect here</div>
        </div>
      )}
    </div>
  );
}

export function ConnPath({ cn, nodes, selId, vp }) {
  const fn = nodes.find(n => n.id === cn.f), tn = nodes.find(n => n.id === cn.t);
  if (!fn || !tn) return null;
  const fh = nodeH(fn), th = nodeH(tn);
  const { sx: x1, sy: y1 } = toScreen(fn.x + NW, fn.y + fh / 2, vp);
  const { sx: x2, sy: y2 } = toScreen(tn.x, tn.y + th / 2, vp);
  const ct = CONN_TYPES.find(c => c.id === cn.type) || CONN_TYPES[1];
  const isSel = selId === cn.id;
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2 - 10;
  const labelText = [cn.cardinality, cn.label].filter(Boolean).join(' · ');
  const lw = labelText.length * 6.2 + 16;

  return (
    <g data-cid={cn.id} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setState({ selId: cn.id }); }}>
      <path d={bezier(x1, y1, x2, y2)} fill="none" stroke="transparent" strokeWidth={16} />
      <path d={bezier(x1, y1, x2, y2)} fill="none" stroke={isSel ? '#fff' : ct.c} strokeWidth={isSel ? 2.5 : 1.5} markerEnd={`url(#ah${isSel ? 's-' : '-'}${ct.id})`} opacity={isSel ? 1 : 0.8} strokeLinecap="round" />
      {isSel && <>
        <circle cx={x1} cy={y1} r={4} fill={ct.c} stroke="var(--bg0)" strokeWidth={2} />
        <circle cx={x2} cy={y2} r={4} fill={ct.c} stroke="var(--bg0)" strokeWidth={2} />
      </>}
      {labelText && (
        <>
          <rect x={midX - lw / 2} y={midY - 9} width={lw} height={18} rx={9} fill={isSel ? ct.c : vp.s > 0.5 ? 'var(--bg1)' : 'transparent'} stroke={ct.c} strokeWidth={isSel ? 0 : 0.8} />
          <text x={midX} y={midY + 1} fill={isSel ? '#000' : ct.c} fontSize={9.5} textAnchor="middle" dominantBaseline="middle" fontFamily="monospace" style={{ pointerEvents: 'none', fontWeight: 700 }}>{labelText}</text>
        </>
      )}
    </g>
  );
}

export function SvgDefs() {
  return (
    <defs>
      {CONN_TYPES.map(ct => (
        <g key={ct.id}>
          <marker id={`ah-${ct.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M1,2L8,5L1,8Z" fill={ct.c} stroke={ct.c} strokeLinejoin="round" />
          </marker>
          <marker id={`ahs-${ct.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M1,2L8,5L1,8Z" fill="#fff" stroke="#fff" strokeLinejoin="round" />
          </marker>
        </g>
      ))}
    </defs>
  );
}
