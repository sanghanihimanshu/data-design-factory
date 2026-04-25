import { useRef, useEffect, useCallback } from 'react';
import { getState, setState, addGroup, schedSave } from '../store';
import { nodeH, toScreen, snapN, bezier } from '../utils';
import { NW, CONN_TYPES, DB } from '../constants';
import { NodeEl, ConnPath, SvgDefs } from './CanvasElements';

function Minimap({ nodes, groups, vp, cvW, cvH }) {
  if (!nodes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => { const h = nodeH(n); minX = Math.min(minX, n.x - 10); minY = Math.min(minY, n.y - 10); maxX = Math.max(maxX, n.x + NW + 10); maxY = Math.max(maxY, n.y + h + 10); });
  groups.forEach(g => { minX = Math.min(minX, g.x - 10); minY = Math.min(minY, g.y - 10); maxX = Math.max(maxX, g.x + g.w + 10); maxY = Math.max(maxY, g.y + g.h + 10); });
  const mw = 140, mh = 90;
  const tw = maxX - minX, th = maxY - minY;
  const scale = Math.min(mw / tw, mh / th) * 0.9;
  const ox = (mw - tw * scale) / 2, oy = (mh - th * scale) / 2;
  const vpW = cvW / vp.s, vpH = cvH / vp.s;
  const vpX = (-vp.x / vp.s - minX) * scale + ox, vpY = (-vp.y / vp.s - minY) * scale + oy;
  return (
    <div style={{ position: 'absolute', bottom: 14, right: 14, background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 6, overflow: 'hidden', zIndex: 10, opacity: 0.85 }}>
      <svg width={mw} height={mh} style={{ display: 'block' }}>
        <rect width={mw} height={mh} fill="var(--bg2)" />
        {nodes.map(n => {
          const def = DB[n.type]; const h = nodeH(n);
          const rx = (n.x - minX) * scale + ox, ry = (n.y - minY) * scale + oy;
          return <rect key={n.id} x={rx} y={ry} width={NW * scale} height={Math.max(h * scale, 2)} rx={1.5} fill={def.c + '33'} stroke={def.c} strokeWidth={0.5} />;
        })}
        <rect x={vpX} y={vpY} width={vpW * scale} height={vpH * scale} fill="none" stroke="var(--brand)" strokeWidth={1} strokeDasharray="3,2" rx={1} />
      </svg>
    </div>
  );
}

export function Canvas({ state, onNodeMouseDown, cvRef }) {
  const { nodes, conns, groups, notes, vp, selId, linking, mousePos, groupDrawMode, groupRect, pendingConnType, searchQ } = state;
  const localRef = useRef(null);
  const ref = cvRef || localRef;

  const visNodes = searchQ ? nodes.filter(n => n.name.toLowerCase().includes(searchQ.toLowerCase()) || n.type.includes(searchQ.toLowerCase())) : nodes;

  const typeCounts = {};
  nodes.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });

  const cvW = ref.current?.clientWidth || 700;
  const cvH = ref.current?.clientHeight || 500;

  const handleMouseDown = useCallback(e => {
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      setState({ _pan: { sx: e.clientX, sy: e.clientY, ox: vp.x, oy: vp.y } });
      return;
    }
    if (linking) { setState({ linking: null }); return; }
    if (e.shiftKey && groupDrawMode) {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const wx = (e.clientX - rect.left - vp.x) / vp.s;
      const wy = (e.clientY - rect.top - vp.y) / vp.s;
      setState({ groupRect: { sx: wx, sy: wy, ex: wx, ey: wy } });
      e.preventDefault();
      return;
    }
    setState({ selId: null });
  }, [linking, groupDrawMode, vp]);

  const handleWheel = useCallback(e => {
    e.preventDefault();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const f = e.deltaY < 0 ? 1.1 : 0.9;
    const ns = Math.min(3, Math.max(0.12, vp.s * f));
    const r = ns / vp.s;
    setState({ vp: { s: ns, x: mx - r * (mx - vp.x), y: my - r * (my - vp.y) } });
  }, [vp]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pending link line
  let pendingPath = null;
  if (linking && ref.current) {
    const rect = ref.current.getBoundingClientRect();
    const fn = nodes.find(n => n.id === linking);
    if (fn) {
      const fh = nodeH(fn);
      const { sx: x1, sy: y1 } = toScreen(fn.x + NW, fn.y + fh / 2, vp);
      const x2 = mousePos.x - rect.left, y2 = mousePos.y - rect.top;
      const ct = CONN_TYPES.find(c => c.id === pendingConnType) || CONN_TYPES[1];
      pendingPath = (
        <>
          <circle cx={x1} cy={y1} r={5} fill={ct.c} stroke="var(--bg0)" strokeWidth={2} />
          <path d={bezier(x1, y1, x2, y2)} fill="none" stroke={ct.c} strokeWidth={2} strokeDasharray="8,5" markerEnd={`url(#ah-${ct.id})`}>
            <animate attributeName="stroke-dashoffset" values="0;-52" dur=".5s" repeatCount="indefinite" />
          </path>
          <circle cx={x2} cy={y2} r={5} fill={ct.c} stroke="var(--bg0)" strokeWidth={2} opacity={0.7} />
        </>
      );
    }
  }

  // Group rect preview
  let groupRectSvg = null;
  if (groupRect) {
    const lx = Math.min(groupRect.sx, groupRect.ex), ly = Math.min(groupRect.sy, groupRect.ey);
    const rw = Math.abs(groupRect.ex - groupRect.sx), rh = Math.abs(groupRect.ey - groupRect.sy);
    const { sx: rx, sy: ry } = toScreen(lx, ly, vp);
    groupRectSvg = (
      <>
        <rect x={rx} y={ry} width={rw * vp.s} height={rh * vp.s} fill="color-mix(in srgb, var(--brand) 10%, transparent)" stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="8,4" rx={10} pointerEvents="none" />
        <text x={rx + 12} y={ry + 18} fill="var(--brand)" fontSize={11} fontFamily="monospace" fontWeight={700} pointerEvents="none" opacity={0.8}>Service Group</text>
      </>
    );
  }

  return (
    <div
      ref={ref}
      id="cv"
      style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: groupDrawMode || linking ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
    >
      {/* dot grid */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="dots" x={vp.x % 40} y={vp.y % 40} width={40} height={40} patternUnits="userSpaceOnUse">
            <circle cx={0} cy={0} r={0.7} fill="var(--brand-border)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* connections SVG */}
      <svg id="csv" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }}>
        <SvgDefs />
        {conns.map(cn => <ConnPath key={cn.id} cn={cn} nodes={nodes} selId={selId} vp={vp} />)}
        {pendingPath}
        {groupRectSvg}
      </svg>

      {/* groups layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.s})`, zIndex: 1, willChange: 'transform' }}>
        {groups.map(g => (
          <GroupEl key={g.id} g={g} selId={selId} vp={vp} />
        ))}
      </div>

      {/* nodes layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.s})`, zIndex: 3, willChange: 'transform' }}>
        {visNodes.map(n => (
          <NodeEl key={n.id} n={n} selId={selId} linking={linking} pendingConnType={pendingConnType} onMouseDown={onNodeMouseDown} />
        ))}
      </div>

      {/* notes layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.s})`, zIndex: 4, willChange: 'transform' }}>
        {notes.map(n => <NoteEl key={n.id} n={n} selId={selId} />)}
      </div>

      {/* empty state */}
      {nodes.length === 0 && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'var(--hint)', pointerEvents: 'none' }}>
          <div style={{ fontSize: 38, opacity: 0.2, marginBottom: 10 }}>⬡</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Canvas is empty</div>
          <div style={{ fontSize: 11 }}>Add nodes from the toolbar · Load a template · Or press ? for shortcuts</div>
        </div>
      )}

      {/* linking banner */}
      {linking && (
        <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 12, padding: '10px 12px', boxShadow: '0 8px 32px rgba(0,0,0,.7)', minWidth: 320 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', animation: 'pulse 1s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>Connecting — click a target node</span>
              <button onClick={() => setState({ linking: null })} style={{ background: 'none', border: '1px solid var(--border2)', color: 'var(--muted)', padding: '2px 8px', borderRadius: 4, fontSize: 9, marginLeft: 'auto', cursor: 'pointer' }}>ESC Cancel</button>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CONN_TYPES.map(c => (
                <button key={c.id} onClick={() => setState({ pendingConnType: c.id })} style={{ background: pendingConnType === c.id ? c.c + '28' : 'var(--bg3)', border: `1px solid ${pendingConnType === c.id ? c.c : c.c + '33'}`, color: pendingConnType === c.id ? c.c : c.c + '99', padding: '3px 8px', borderRadius: 5, fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>{c.l}</button>
              ))}
            </div>
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`}</style>
        </div>
      )}

      {/* group draw hint */}
      {groupDrawMode && !groupRect && (
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg1)', border: '1px solid color-mix(in srgb, var(--brand) 35%, transparent)', borderRadius: 8, padding: '7px 14px', fontSize: 10, color: 'var(--brand)', fontWeight: 700, pointerEvents: 'none', zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,.5)' }}>
          ⬡ Group Draw Mode — Shift+Drag to draw a service group · ESC or G to exit
        </div>
      )}

      {/* stats bar */}
      {nodes.length > 0 && (
        <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', maxWidth: '60%', pointerEvents: 'none' }}>
          {Object.entries(typeCounts).map(([t, c]) => {
            const def = DB[t];
            return <span key={t} style={{ fontSize: 9, color: def.c, padding: '1px 5px', background: def.c + '18', borderRadius: 3, marginRight: 3 }}>{def.i}{c}</span>;
          })}
          <span style={{ fontSize: 9, color: 'var(--hint)', marginLeft: 2 }}>{nodes.length}n · {conns.length}c · {Math.round(vp.s * 100)}%</span>
        </div>
      )}

      <Minimap nodes={nodes} groups={groups} vp={vp} cvW={cvW} cvH={cvH} />
    </div>
  );
}

function GroupEl({ g, selId }) {
  const isSel = selId === g.id;
  const handleMouseDown = e => {
    e.stopPropagation();
    setState({ selId: g.id, _groupDrag: { id: g.id, sx: e.clientX, sy: e.clientY, ox: g.x, oy: g.y } });
  };
  return (
    <div
      onMouseDown={handleMouseDown}
      style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, border: `1.5px dashed ${isSel ? '#fff' : g.color}`, borderRadius: 12, cursor: 'move', background: g.color + '07', pointerEvents: 'auto' }}
    >
      <div style={{ position: 'absolute', top: -1, left: 14, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: g.color, background: 'var(--bg0)', padding: '1px 8px', borderRadius: 20, border: `1px solid ${g.color}44`, letterSpacing: '.3px' }}>{g.label}</span>
      </div>
    </div>
  );
}

function NoteEl({ n, selId }) {
  const isSel = selId === n.id;
  const handleMouseDown = e => {
    e.stopPropagation();
    setState({ selId: n.id, _notesDrag: { id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y } });
  };
  return (
    <div
      onMouseDown={handleMouseDown}
      style={{ position: 'absolute', left: n.x, top: n.y, width: n.w, minHeight: n.h, background: `linear-gradient(135deg,${n.color}20,${n.color}10)`, border: `1px solid ${isSel ? '#fff' : n.color + '44'}`, borderRadius: 8, padding: '9px 10px', cursor: 'move', overflow: 'hidden', boxShadow: isSel ? `0 0 0 1.5px ${n.color}` : '0 2px 8px rgba(0,0,0,.4)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: n.color, opacity: 0.8, flexShrink: 0 }} />
        <button onClick={e => { e.stopPropagation(); }} style={{ background: 'none', border: 'none', color: n.color, fontSize: 11, cursor: 'pointer', opacity: 0.6, padding: 0 }}>✕</button>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, opacity: 0.9 }}>{n.text}</div>
    </div>
  );
}
