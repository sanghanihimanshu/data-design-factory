import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState,
  BackgroundVariant, SelectionMode, useReactFlow, applyNodeChanges, applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DB, CONN_TYPES } from '../constants';
import { addEdge, undo, redo, copySelected, pasteClipboard, setState, getState, schedSave, snapshot } from '../store';
import { DbNode } from './DbNode';
import { DbEdge, EdgeMarkers } from './DbEdge';
import { RightPanel } from './RightPanel';
import { Modals } from './Modals';
import { alignNodes, distributeNodes, autoLayoutByDepth } from '../layoutTools';

import { rfRef } from '../rfRef';

const nodeTypes = { dbNode: DbNode };
const edgeTypes = { dbEdge: DbEdge };

export function Editor({ state }) {
  const { rfNodes, rfEdges, theme } = state;
  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const pendingConnType = useRef('ref');
  const searchInputRef = useRef(null);
  const rf = useReactFlow();

  const searchMatches = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => {
        const name = n.data?.name?.toLowerCase() || '';
        const engine = n.data?.engine?.toLowerCase() || '';
        const type = n.data?.dbType?.toLowerCase() || '';
        return name.includes(q) || engine.includes(q) || type.includes(q);
      })
      .slice(0, 12);
  }, [nodes, searchQ]);

  // Expose rf.setNodes so store can update node data without going through App state
  useEffect(() => { rfRef.setNodes = rf.setNodes; rfRef.setEdges = rf.setEdges; return () => { rfRef.setNodes = null; rfRef.setEdges = null; }; }, [rf]);

  // Only sync from store on initial load or when nodes are added/deleted (not on data edits)
  const prevNodeIds = useRef(new Set(rfNodes.map(n => n.id)));
  useEffect(() => {
    const newIds = new Set(rfNodes.map(n => n.id));
    const added = rfNodes.filter(n => !prevNodeIds.current.has(n.id));
    const removed = [...prevNodeIds.current].filter(id => !newIds.has(id));
    if (added.length || removed.length) {
      setNodes(rfNodes);
      prevNodeIds.current = newIds;
    }
  }, [rfNodes, setNodes]);

  // Sync edges fully (edges don't have focus issues)
  useEffect(() => { setEdges(rfEdges); }, [rfEdges, setEdges]);

  const onNodeDragStop = useCallback((_, node) => {
    const s = getState();
    setState({ rfNodes: s.rfNodes.map(n => n.id === node.id ? { ...n, position: node.position } : n) });
    schedSave();
  }, []);

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    setState((s) => ({ rfNodes: applyNodeChanges(changes, s.rfNodes) }));

    // Persist meaningful graph mutations quickly.
    if (changes.some((c) => c.type === 'add' || c.type === 'remove' || c.type === 'position')) {
      schedSave();
    }
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    setState((s) => ({ rfEdges: applyEdgeChanges(changes, s.rfEdges) }));

    if (changes.some((c) => c.type === 'add' || c.type === 'remove')) {
      schedSave();
    }
  }, [onEdgesChange]);

  const onConnect = useCallback(params => {
    addEdge(params, pendingConnType.current);
  }, []);

  const onSelectionChange = useCallback(({ nodes: sn, edges: se }) => {
    setState({ selId: sn[0]?.id || se[0]?.id || null });
  }, []);

  const onNodesDelete = useCallback(deleted => {
    snapshot();
    const s = getState();
    setState({
      rfNodes: s.rfNodes.filter(n => !deleted.find(d => d.id === n.id)),
      rfEdges: s.rfEdges.filter(e => !deleted.find(d => d.id === e.source || d.id === e.target)),
    });
    schedSave();
  }, []);

  const onEdgesDelete = useCallback(deleted => {
    snapshot();
    setState({ rfEdges: getState().rfEdges.filter(e => !deleted.find(d => d.id === e.id)) });
    schedSave();
  }, []);

  const focusNode = useCallback((nodeId) => {
    const target = rf.getNodes().find((n) => n.id === nodeId);
    if (!target) return;

    rf.setNodes((curr) => curr.map((n) => ({ ...n, selected: n.id === nodeId })));
    setState({ selId: nodeId });

    const w = target.measured?.width || target.width || 328;
    const h = target.measured?.height || target.height || 180;
    rf.setCenter(target.position.x + w / 2, target.position.y + h / 2, {
      zoom: Math.max(0.95, rf.getZoom()),
      duration: 260,
    });
  }, [rf]);

  useEffect(() => {
    const handler = e => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !inInput) {
        const sel = rf.getNodes().filter(n => n.selected).map(n => n.id);
        if (sel.length) copySelected(sel);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !inInput) pasteClipboard();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }

      if (!inInput && e.altKey && e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === 'l') { e.preventDefault(); alignNodes(rf, 'left'); }
        if (k === 'c') { e.preventDefault(); alignNodes(rf, 'center'); }
        if (k === 'r') { e.preventDefault(); alignNodes(rf, 'right'); }
        if (k === 't') { e.preventDefault(); alignNodes(rf, 'top'); }
        if (k === 'm') { e.preventDefault(); alignNodes(rf, 'middle'); }
        if (k === 'b') { e.preventDefault(); alignNodes(rf, 'bottom'); }
        if (k === 'h') { e.preventDefault(); distributeNodes(rf, 'x'); }
        if (k === 'v') { e.preventDefault(); distributeNodes(rf, 'y'); }
        if (k === 'a') { e.preventDefault(); autoLayoutByDepth(rf); }
      }

      if (e.key === 'Escape') setState({ showExport: false, showLinter: false, showShortcuts: false, showTemplates: false });
      if (e.key === 'Escape') setSearchOpen(false);
      if (e.key === '?' && !inInput) setState({ showShortcuts: !getState().showShortcuts });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rf]);

  const isDark = theme === 'dark';

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <EdgeMarkers />
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange}
        onConnect={onConnect} onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onNodesDelete={onNodesDelete} onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        selectionMode={SelectionMode.Partial}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
        style={{ background: 'var(--bg)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={isDark ? '#2f6f6f' : '#b9dddd'} />
        <Controls style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
        <MiniMap nodeColor={n => DB[n.data?.dbType]?.c || '#94A3B8'} style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
        <Panel position="bottom-center">
          <ConnTypeBar pendingConnType={pendingConnType} />
        </Panel>
      </ReactFlow>

      {searchOpen && (
        <div style={{ position: 'absolute', top: 12, left: 12, width: 340, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 28px rgba(8,15,30,.14)', zIndex: 30 }}>
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
            <input
              ref={searchInputRef}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search nodes by name, engine, or type..."
              style={{ width: '100%', fontSize: 12 }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {searchMatches.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 11, color: 'var(--muted)' }}>No matching nodes</div>
            ) : searchMatches.map((n) => (
              <button
                key={n.id}
                onClick={() => focusNode(n.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  padding: '9px 10px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-h)', fontWeight: 700 }}>{n.data?.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{DB[n.data?.dbType]?.l} · {n.data?.engine}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <RightPanel state={{ ...state, rfNodes: nodes, rfEdges: edges }} />
      <Modals state={state} />
    </div>
  );
}

function ConnTypeBar({ pendingConnType }) {
  return (
    <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '5px 8px', display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 640, boxShadow: '0 4px 20px rgba(0,0,0,.1)', backdropFilter: 'blur(8px)' }}>
      {CONN_TYPES.map(ct => (
        <button key={ct.id}
          onClick={() => { pendingConnType.current = ct.id; }}
          style={{ background: 'transparent', border: `1px solid ${ct.c}55`, color: ct.c, padding: '2px 8px', borderRadius: 6, fontSize: 9.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'none' }}
        >{ct.l}</button>
      ))}
    </div>
  );
}
