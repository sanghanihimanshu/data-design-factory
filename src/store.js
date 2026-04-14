import { idbLoadAll, idbSave, idbDelete } from './idb';
import { DB, NODE_WIDTH } from './constants';
import { rfRef } from './rfRef';

const LAST_PROJECT_KEY = 'ddf_last_project_id';

let _c = 0;
export const uid = () => `n${(++_c).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function mkSchema(type) {
  switch (type) {
    case 'sql': return { engine: 'PostgreSQL', columns: [
      { id: uid(), name: 'id', type: 'BIGSERIAL', pk: true, nullable: false, unique: true, default: '', fk: '', index: false, enumValues: '' },
      { id: uid(), name: 'created_at', type: 'TIMESTAMPTZ', pk: false, nullable: true, unique: false, default: 'NOW()', fk: '', index: true, enumValues: '' },
    ]};
    case 'document': return { engine: 'MongoDB', collection: 'my_collection', fields: [
      { id: uid(), name: '_id', type: 'ObjectId', required: true, unique: true, indexed: true, subFields: [] },
      { id: uid(), name: 'createdAt', type: 'Date', required: false, unique: false, indexed: false, subFields: [] },
    ]};
    case 'graph': return { engine: 'Neo4j', entityType: 'Node', labels: ['Entity'], properties: [
      { id: uid(), name: 'id', type: 'String', required: true, indexed: true },
      { id: uid(), name: 'name', type: 'String', required: false, indexed: false },
    ]};
    case 'cache': return { engine: 'Redis', keyPattern: 'app:{resource}:{id}', structure: 'hash', ttl: 3600, fields: [
      { id: uid(), name: 'field1', type: 'string' },
      { id: uid(), name: 'updated_at', type: 'integer' },
    ]};
    case 'objstore': return { engine: 'AWS S3', bucket: 'my-bucket', prefix: '', storageClass: 'STANDARD', encryption: 'SSE-S3', acl: 'private', versioning: false, cors: false };
    case 'search': return { engine: 'Elasticsearch', index: 'my_index', shards: 1, replicas: 0, fields: [
      { id: uid(), name: 'id', type: 'keyword', indexed: true, stored: true, analyzer: '' },
      { id: uid(), name: 'title', type: 'text', indexed: true, stored: true, analyzer: 'standard' },
    ]};
    case 'tseries': return { engine: 'InfluxDB', measurement: 'my_metric', retention: '30d', precision: 'ns',
      tags: [{ id: uid(), name: 'host' }, { id: uid(), name: 'region' }],
      fields: [{ id: uid(), name: 'value', type: 'float' }, { id: uid(), name: 'count', type: 'integer' }],
    };
    case 'vector': return { engine: 'Qdrant', collection: 'embeddings', dimensions: 1536, distance: 'Cosine', quantization: 'None', onDisk: false, payload: [
      { id: uid(), name: 'text', type: 'text' },
      { id: uid(), name: 'source', type: 'keyword' },
    ]};
    case 'column': return { engine: 'Cassandra', keyspace: 'my_keyspace', table: 'my_table', replication: 3, strategy: 'SimpleStrategy', columns: [
      { id: uid(), name: 'pk', type: 'UUID', role: 'partition', static: false },
      { id: uid(), name: 'created_at', type: 'TIMESTAMP', role: 'clustering', static: false },
      { id: uid(), name: 'data', type: 'TEXT', role: 'regular', static: false },
    ]};
    case 'queue': return { engine: 'Apache Kafka', topic: 'my.events', partitions: 3, replication: 1, retention: '7d', compression: 'snappy', schema: [
      { id: uid(), name: 'event_type', type: 'string', required: true },
      { id: uid(), name: 'timestamp', type: 'long', required: true },
      { id: uid(), name: 'payload', type: 'object', required: false, subFields: [] },
    ]};
    case 'keyvalue': return { engine: 'DynamoDB', table: 'my_table', billingMode: 'PAY_PER_REQUEST',
      partitionKey: { name: 'pk', type: 'String' }, sortKey: { name: 'sk', type: 'String' },
      ttlEnabled: false, ttlAttr: 'ttl',
      attributes: [{ id: uid(), name: 'data', type: 'Map' }, { id: uid(), name: 'status', type: 'String' }],
    };
    case 'ledger': return { engine: 'QLDB', ledger: 'my-ledger', table: 'my_table', permissions: 'ALLOW_ALL', fields: [
      { id: uid(), name: 'id', type: 'String' },
      { id: uid(), name: 'data', type: 'IonStruct' },
    ]};
    default: return {};
  }
}

// ── STATE ─────────────────────────────────────────────
let _state = {
  screen: 'loading', projects: [], projId: null,
  rfNodes: [], rfEdges: [],
  selId: null,
  history: [], historyIndex: -1,
  theme: localStorage.getItem('ddf_theme') || 'light',
  showExport: false, showLinter: false, showShortcuts: false, showTemplates: false,
  exportTab: 'sql',
  clipboard: null, // { nodes, edges }
};

const _listeners = new Set();
export const getState = () => _state;
export function setState(patch) {
  _state = { ..._state, ...(typeof patch === 'function' ? patch(_state) : patch) };
  _listeners.forEach(fn => fn(_state));
}
export function subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }

// ── UNDO/REDO ─────────────────────────────────────────
export function snapshot() {
  const snap = { rfNodes: JSON.parse(JSON.stringify(_state.rfNodes)), rfEdges: JSON.parse(JSON.stringify(_state.rfEdges)) };
  const h = _state.history.slice(0, _state.historyIndex + 1);
  _state.history = [...h, snap].slice(-60);
  _state.historyIndex = _state.history.length - 1;
}
export function undo() {
  if (_state.historyIndex <= 0) return;
  const idx = _state.historyIndex - 1;
  const s = _state.history[idx];
  setState({ rfNodes: JSON.parse(JSON.stringify(s.rfNodes)), rfEdges: JSON.parse(JSON.stringify(s.rfEdges)), historyIndex: idx });
  schedSave();
}
export function redo() {
  if (_state.historyIndex >= _state.history.length - 1) return;
  const idx = _state.historyIndex + 1;
  const s = _state.history[idx];
  setState({ rfNodes: JSON.parse(JSON.stringify(s.rfNodes)), rfEdges: JSON.parse(JSON.stringify(s.rfEdges)), historyIndex: idx });
  schedSave();
}

// ── SAVE ──────────────────────────────────────────────
let _saveTimer = null;

async function flushSaveNow() {
  const { projId, projects, rfNodes, rfEdges } = _state;
  if (!projId) return;
  const proj = projects.find(p => p.id === projId);
  if (!proj) return;
  const updated = { ...proj, rfNodes, rfEdges, updatedAt: new Date().toISOString() };
  await idbSave(updated);
  _state.projects = _state.projects.map(p => p.id === projId ? updated : p);
}

function queueFlushSaveNow() {
  // Fire-and-forget flush to reduce refresh data loss.
  clearTimeout(_saveTimer);
  void flushSaveNow();
}

export function schedSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    await flushSaveNow();
  }, 800);
}

// ── COPY / PASTE ──────────────────────────────────────
export function copySelected(selectedNodeIds) {
  const nodes = _state.rfNodes.filter(n => selectedNodeIds.includes(n.id));
  const edges = _state.rfEdges.filter(e => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target));
  setState({ clipboard: { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) } });
}

export function pasteClipboard() {
  const { clipboard } = _state;
  if (!clipboard?.nodes?.length) return;
  const idMap = {};
  const newNodes = clipboard.nodes.map(n => {
    const newId = uid();
    idMap[n.id] = newId;
    return { ...n, id: newId, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true, data: { ...n.data, schema: JSON.parse(JSON.stringify(n.data.schema)) } };
  });
  const newEdges = clipboard.edges.map(e => ({ ...e, id: uid(), source: idMap[e.source], target: idMap[e.target] }));
  snapshot();
  setState({
    rfNodes: [..._state.rfNodes.map(n => ({ ...n, selected: false })), ...newNodes],
    rfEdges: [..._state.rfEdges, ...newEdges],
  });
  schedSave();
}

// ── NODE ACTIONS ──────────────────────────────────────
export function addNode(type, position = { x: 200, y: 200 }) {
  const def = DB[type];
  const node = {
    id: uid(), type: 'dbNode',
    position,
    data: { dbType: type, name: def.l, engine: def.engines[0], schema: mkSchema(type), color: null },
  };
  snapshot();
  setState({ rfNodes: [..._state.rfNodes, node], selId: node.id });
  schedSave();
}

export function updateNodeData(id, patch) {
  _state.rfNodes = _state.rfNodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n);
  rfRef.setNodes?.(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  schedSave();
}

export function updateSchema(id, patch) {
  _state.rfNodes = _state.rfNodes.map(n => n.id === id ? { ...n, data: { ...n.data, schema: { ...n.data.schema, ...patch } } } : n);
  rfRef.setNodes?.(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, schema: { ...n.data.schema, ...patch } } } : n));
  schedSave();
}

export function deleteNode(id) {
  snapshot();
  setState({ rfNodes: _state.rfNodes.filter(n => n.id !== id), rfEdges: _state.rfEdges.filter(e => e.source !== id && e.target !== id), selId: null });
  schedSave();
}

export function duplicateNode(id) {
  const n = _state.rfNodes.find(x => x.id === id); if (!n) return;
  const clone = JSON.parse(JSON.stringify(n));
  clone.id = uid(); clone.position = { x: n.position.x + 40, y: n.position.y + 40 };
  const reId = arr => (arr || []).map(f => ({ ...f, id: uid() }));
  const s = clone.data.schema;
  ['columns','fields','properties','tags','payload','schema','attributes'].forEach(k => { if (s[k]) s[k] = reId(s[k]); });
  snapshot();
  setState({ rfNodes: [..._state.rfNodes, clone], selId: clone.id });
  schedSave();
}

// ── EDGE ACTIONS ──────────────────────────────────────
export function addEdge(params, connType = 'ref') {
  const edge = { id: uid(), source: params.source, target: params.target, sourceHandle: params.sourceHandle, targetHandle: params.targetHandle, type: 'dbEdge', data: { connType, label: '', cardinality: '' } };
  snapshot();
  setState({ rfEdges: [..._state.rfEdges, edge] });
  schedSave();
}

export function updateEdge(id, patch) {
  setState({ rfEdges: _state.rfEdges.map(e => e.id === id ? { ...e, data: { ...e.data, ...patch } } : e) });
  schedSave();
}

export function deleteEdge(id) {
  snapshot();
  setState({ rfEdges: _state.rfEdges.filter(e => e.id !== id), selId: null });
  schedSave();
}

// ── PROJECT ACTIONS ───────────────────────────────────
export function openProj(p) {
  localStorage.setItem(LAST_PROJECT_KEY, p.id);
  setState({ rfNodes: p.rfNodes || [], rfEdges: p.rfEdges || [], selId: null, projId: p.id, screen: 'editor', history: [], historyIndex: -1 });
}

export async function createProj(name, desc) {
  if (!name.trim()) return;
  const p = { id: uid(), name: name.trim(), description: desc?.trim() || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), rfNodes: [], rfEdges: [] };
  await idbSave(p);
  setState({ projects: [..._state.projects, p] });
  openProj(p);
}

export async function deleteProj(id) {
  await idbDelete(id);
  const ps = _state.projects.filter(p => p.id !== id);
  if (_state.projId === id) localStorage.removeItem(LAST_PROJECT_KEY);
  setState({ projects: ps, screen: _state.projId === id ? 'home' : _state.screen, projId: _state.projId === id ? null : _state.projId });
}

export function goHome() {
  clearTimeout(_saveTimer);
  localStorage.removeItem(LAST_PROJECT_KEY);
  setState({ screen: 'home', projId: null, selId: null });
}

export function toggleTheme() {
  const t = _state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('ddf_theme', t);
  setState({ theme: t });
}

export async function boot() {
  if (typeof window !== 'undefined' && !window.__ddfSaveHooksAdded) {
    window.__ddfSaveHooksAdded = true;
    window.addEventListener('beforeunload', queueFlushSaveNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') queueFlushSaveNow();
    });
  }

  const projects = (await idbLoadAll()) || [];
  const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);

  setState({ projects });

  if (!lastProjectId) {
    setState({ screen: 'home' });
    return;
  }

  const lastProject = projects.find(p => p.id === lastProjectId);
  if (!lastProject) {
    localStorage.removeItem(LAST_PROJECT_KEY);
    setState({ screen: 'home' });
    return;
  }

  openProj(lastProject);
}
