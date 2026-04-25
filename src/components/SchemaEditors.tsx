/**
 * SchemaEditors — per-database-type schema editing panels rendered in the right sidebar.
 *
 * Each exported editor receives the selected ReactFlow node and renders
 * the appropriate form controls for its schema type. All field/column rows
 * are collapsed by default to keep long tables navigable.
 */

import { useState, type CSSProperties } from 'react';
import { uid, updateSchema } from '@/store';
import { SQL_TYPES, BSON_T, ES_T, CASS_T, KV_T, DB } from '@/constants';
import { SubFieldEditor, EnumEditor } from './SubFieldEditor';
import { useDragReorder } from '@/useDragReorder';
import type { Node } from '@xyflow/react';

// ── Types ─────────────────────────────────────────────

/** Minimal shape of a node passed to every editor. */
type EditorNode = Node<{
  dbType: string;
  schema: Record<string, unknown>;
  color?: string | null;
}>;

interface EditorProps {
  /** The selected ReactFlow node. */
  n: EditorNode;
}


// ── Shared helpers ────────────────────────────────────

/** Returns a style object for type-select dropdowns, tinted with the DB accent colour. */
function sel(color: string): CSSProperties {
  return {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    color,
    borderRadius: 4,
    padding: '3px 4px',
    fontSize: 10,
    width: 110,
    flexShrink: 0,
  };
}

/** Drag-handle glyph rendered at the start of every field row. */
const handle = (
  <span
    style={{ color: 'var(--muted)', fontSize: 12, cursor: 'grab', marginRight: 2, flexShrink: 0, userSelect: 'none' }}
    title="Drag to reorder"
  >
    ⠿
  </span>
);

/** Immutably moves an item in an array from `from` to `to`. */
function reorder<T>(arr: T[], from: number, to: number): T[] {
  const a = [...arr];
  a.splice(to, 0, a.splice(from, 1)[0]);
  return a;
}

/** Immutably updates a single item in an array by id. */
function uF<T extends { id: string }>(arr: T[], id: string, patch: Partial<T>): T[] {
  return arr.map(x => (x.id === id ? { ...x, ...patch } : x));
}

/** Immutably removes a single item from an array by id. */
function dF<T extends { id: string }>(arr: T[], id: string): T[] {
  return arr.filter(x => x.id !== id);
}

// ── useCollapse ───────────────────────────────────────

interface UseCollapseReturn {
  collapsed: Set<string>;
  toggle: (id: string) => void;
}

/**
 * Manages a Set of collapsed row ids.
 * Pass `initialIds` to start all rows collapsed; the Set is built once via lazy initializer.
 */
function useCollapse(initialIds: string[]): UseCollapseReturn {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(initialIds));

  const toggle = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return { collapsed, toggle };
}

// ── CollapseBtn ───────────────────────────────────────

interface CollapseBtnProps {
  id: string;
  collapsed: boolean;
  toggle: (id: string) => void;
}

/** Small ▸/▾ toggle button placed in the field row header. */
function CollapseBtn({ id, collapsed, toggle }: CollapseBtnProps) {
  return (
    <button
      onClick={e => { e.stopPropagation(); toggle(id); }}
      title={collapsed ? 'Expand' : 'Collapse'}
      style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '0 2px', fontSize: 11, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
    >
      {collapsed ? '▸' : '▾'}
    </button>
  );
}

// ── SqlEditor ─────────────────────────────────────────

/** Schema editor for SQL (relational) nodes. Manages columns with full constraint support. */
export function SqlEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const cols = (s.columns as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ columns: reorder(cols, from, to) }));
  const { collapsed, toggle } = useCollapse(cols.map(c => c.id as string));

  return (
    <div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'PostgreSQL'} onChange={e => u({ engine: e.target.value })}>
            {DB.sql.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Columns</span>
        <button className="addbtn" onClick={() => u({ columns: [...cols, { id: uid(), name: 'new_col', type: 'TEXT', pk: false, nullable: true, unique: false, default: '', fk: '', index: false, indexType: 'btree', check: '', generated: '', enumValues: '' }] })}>+ Column</button>
      </div>
      {cols.map((c, i) => {
        const isCollapsed = collapsed.has(c.id as string);
        return (
          <div key={c.id as string} className="field-row" {...dragProps(i)}>
            <div className="row">
              {handle}
              <CollapseBtn id={c.id as string} collapsed={isCollapsed} toggle={toggle} />
              <input className="inp" value={(c.name as string) || ''} onChange={e => u({ columns: uF(cols, c.id as string, { name: e.target.value }) })} style={{ flex: 1, minWidth: 0 }} />
              <select style={sel(def.c)} value={(c.type as string) || 'TEXT'} onChange={e => u({ columns: uF(cols, c.id as string, { type: e.target.value }) })}>
                {SQL_TYPES.map((t: string) => <option key={t}>{t}</option>)}
              </select>
              <button className="delbtn" onClick={() => u({ columns: dF(cols, c.id as string) })}>✕</button>
            </div>
            {!isCollapsed && <>
              {(c.type === 'ENUM' || c.type === 'ENUM(custom)') && (
                <EnumEditor values={(c.enumValues as string) || ''} onChange={(v: string) => u({ columns: uF(cols, c.id as string, { enumValues: v }) })} />
              )}
              <div className="cb-row">
                {(['pk', 'nullable', 'unique', 'index'] as const).map((k, idx) => {
                  const labels = ['PK', 'NULL', 'UNIQUE', 'IDX'];
                  const colors = ['#F59E0B', '#94A3B8', '#3B82F6', '#06B6D4'];
                  return (
                    <label key={k} className="cb-lbl">
                      <input type="checkbox" checked={!!c[k]} onChange={e => u({ columns: uF(cols, c.id as string, { [k]: e.target.checked }) })} />
                      <span style={{ color: c[k] ? colors[idx] : 'var(--muted)' }}>{labels[idx]}</span>
                    </label>
                  );
                })}
                {c.index && (
                  <select className="inp" value={(c.indexType as string) || 'btree'} onChange={e => u({ columns: uF(cols, c.id as string, { indexType: e.target.value }) })} style={{ fontSize: 9, height: 18, padding: '0 3px' }}>
                    {['btree', 'hash', 'gin', 'gist', 'brin', 'spgist'].map(t => <option key={t}>{t}</option>)}
                  </select>
                )}
              </div>
              <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
                <input className="inp" value={(c.default as string) || ''} placeholder="default" onChange={e => u({ columns: uF(cols, c.id as string, { default: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
                <input className="inp" value={(c.fk as string) || ''} placeholder="table.col (FK)" onChange={e => u({ columns: uF(cols, c.id as string, { fk: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
              </div>
              <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
                <input className="inp" value={(c.check as string) || ''} placeholder="CHECK expr" onChange={e => u({ columns: uF(cols, c.id as string, { check: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
                <input className="inp" value={(c.generated as string) || ''} placeholder="GENERATED AS expr" onChange={e => u({ columns: uF(cols, c.id as string, { generated: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
              </div>
            </>}
          </div>
        );
      })}
    </div>
  );
}

// ── DocumentEditor ────────────────────────────────────

/** Schema editor for document-store (MongoDB-style) nodes. Supports nested sub-fields. */
export function DocumentEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const fields = (s.fields as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ fields: reorder(fields, from, to) }));
  const { collapsed, toggle } = useCollapse(fields.map(f => f.id as string));

  return (
    <div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'MongoDB'} onChange={e => u({ engine: e.target.value })}>
            {DB.document.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Collection</span>
          <input className="inp" value={(s.collection as string) || ''} onChange={e => u({ collection: e.target.value })} />
        </div>
      </div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span className="lbl">Write Concern</span>
          <select className="inp" value={(s.writeConcern as string) || 'majority'} onChange={e => u({ writeConcern: e.target.value })}>
            {['majority', '1', '2', '0', 'w3'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Read Concern</span>
          <select className="inp" value={(s.readConcern as string) || 'local'} onChange={e => u({ readConcern: e.target.value })}>
            {['local', 'majority', 'linearizable', 'snapshot', 'available'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="cb-row" style={{ marginBottom: 8 }}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.capped} onChange={e => u({ capped: e.target.checked })} /><span style={{ color: s.capped ? '#F59E0B' : 'var(--muted)' }}>Capped</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.timeseries} onChange={e => u({ timeseries: e.target.checked })} /><span style={{ color: s.timeseries ? '#06B6D4' : 'var(--muted)' }}>Time Series</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.changeStream} onChange={e => u({ changeStream: e.target.checked })} /><span style={{ color: s.changeStream ? '#8B5CF6' : 'var(--muted)' }}>Change Stream</span></label>
      </div>
      {s.capped && (
        <div className="row" style={{ marginBottom: 8 }}>
          <div style={{ flex: 1 }}><span className="lbl">Max Size (bytes)</span><input className="inp" type="number" value={(s.cappedSize as number) || 1048576} onChange={e => u({ cappedSize: Number(e.target.value) })} /></div>
          <div style={{ flex: 1 }}><span className="lbl">Max Docs</span><input className="inp" type="number" value={(s.cappedMax as number) || 1000} onChange={e => u({ cappedMax: Number(e.target.value) })} /></div>
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <span className="lbl">Compound Indexes (JSON)</span>
        <input className="inp" value={(s.compoundIndexes as string) || ''} placeholder='[{"name":1,"email":1}]' onChange={e => u({ compoundIndexes: e.target.value })} style={{ fontSize: 10 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...fields, { id: uid(), name: 'field', type: 'String', required: false, unique: false, indexed: false, sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' }] })}>+ Field</button>
      </div>
      {fields.map((f, i) => {
        const isCollapsed = collapsed.has(f.id as string);
        return (
          <div key={f.id as string} className="field-row" {...dragProps(i)}>
            <div className="row">
              {handle}
              <CollapseBtn id={f.id as string} collapsed={isCollapsed} toggle={toggle} />
              <input className="inp" value={(f.name as string) || ''} onChange={e => u({ fields: uF(fields, f.id as string, { name: e.target.value }) })} style={{ flex: 1, minWidth: 0 }} />
              <select style={sel(def.c)} value={(f.type as string) || 'String'} onChange={e => u({ fields: uF(fields, f.id as string, { type: e.target.value }) })}>
                {BSON_T.map((t: string) => <option key={t}>{t}</option>)}
              </select>
              <button className="delbtn" onClick={() => u({ fields: dF(fields, f.id as string) })}>✕</button>
            </div>
            {!isCollapsed && <>
              {f.type === 'Enum' && (
                <EnumEditor values={(f.enumValues as string) || ''} onChange={(v: string) => u({ fields: uF(fields, f.id as string, { enumValues: v }) })} />
              )}
              {(f.type === 'Object' || f.type === 'Array<Object>' || f.type === 'Array') && (
                <div style={{ marginTop: 6 }}>
                  <span className="lbl">Sub-fields</span>
                  <SubFieldEditor fields={(f.subFields as unknown[]) || []} onChange={(sf: unknown) => u({ fields: uF(fields, f.id as string, { subFields: sf }) })} depth={1} dbType="document" />
                </div>
              )}
              <div className="cb-row">
                {(['required', 'unique', 'indexed', 'sparse', 'ttlIndex'] as const).map((k, idx) => {
                  const labels = ['REQ', 'UNIQ', 'IDX', 'SPARSE', 'TTL'];
                  const colors = ['#EF4444', '#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B'];
                  return (
                    <label key={k} className="cb-lbl">
                      <input type="checkbox" checked={!!f[k]} onChange={e => u({ fields: uF(fields, f.id as string, { [k]: e.target.checked }) })} />
                      <span style={{ color: f[k] ? colors[idx] : 'var(--muted)' }}>{labels[idx]}</span>
                    </label>
                  );
                })}
              </div>
              <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
                {f.indexed && (
                  <select className="inp" value={(f.indexType as string) || '1'} onChange={e => u({ fields: uF(fields, f.id as string, { indexType: e.target.value }) })} style={{ fontSize: 10, width: 100, flexShrink: 0 }}>
                    {[['1', 'ASC (1)'], ['-1', 'DESC (-1)'], ['text', 'text'], ['2dsphere', '2dsphere'], ['hashed', 'hashed'], ['wildcard', 'wildcard']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
                {f.ttlIndex && (
                  <input className="inp" type="number" value={(f.ttlSeconds as number) || 0} placeholder="TTL seconds" onChange={e => u({ fields: uF(fields, f.id as string, { ttlSeconds: Number(e.target.value) }) })} style={{ width: 100, fontSize: 10, flexShrink: 0 }} />
                )}
                <input className="inp" value={(f.default as string) || ''} placeholder="default" onChange={e => u({ fields: uF(fields, f.id as string, { default: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
              </div>
            </>}
          </div>
        );
      })}
    </div>
  );
}

// ── GraphEditor ───────────────────────────────────────

/** Schema editor for graph-database (Neo4j-style) nodes. Handles both Node and Relationship entity types. */
export function GraphEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const props = (s.properties as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);
  const dragProps = useDragReorder((from, to) => u({ properties: reorder(props, from, to) }));
  const { collapsed, toggle } = useCollapse(props.map(p => p.id as string));

  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'Neo4j'} onChange={e => u({ engine: e.target.value })}>
            {DB.graph.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Entity Type</span>
          <select className="inp" value={(s.entityType as string) || 'Node'} onChange={e => u({ entityType: e.target.value })}>
            {['Node', 'Relationship'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {s.entityType === 'Relationship' && (
        <div className="irow">
          <div style={{ flex: 1 }}>
            <span className="lbl">Direction</span>
            <select className="inp" value={(s.direction as string) || 'OUTGOING'} onChange={e => u({ direction: e.target.value })}>
              {['OUTGOING', 'INCOMING', 'UNDIRECTED'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span className="lbl">Rel Type</span>
            <input className="inp" value={(s.relType as string) || ''} placeholder="KNOWS, FOLLOWS…" onChange={e => u({ relType: e.target.value })} />
          </div>
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <span className="lbl">Labels (comma-sep)</span>
        <input className="inp" value={((s.labels as string[]) || []).join(', ')} onChange={e => u({ labels: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <span className="lbl">Constraints</span>
        <input className="inp" value={(s.constraints as string) || ''} placeholder="UNIQUE(name), NODE KEY(id,email)…" onChange={e => u({ constraints: e.target.value })} style={{ fontSize: 10 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Properties</span>
        <button className="addbtn" onClick={() => u({ properties: [...props, { id: uid(), name: 'prop', type: 'String', required: false, indexed: false, unique: false }] })}>+ Property</button>
      </div>
      {props.map((p, i) => {
        const isCollapsed = collapsed.has(p.id as string);
        return (
          <div key={p.id as string} className="field-row" {...dragProps(i)}>
            <div className="row">
              {handle}
              <CollapseBtn id={p.id as string} collapsed={isCollapsed} toggle={toggle} />
              <input className="inp" value={(p.name as string) || ''} onChange={e => u({ properties: uF(props, p.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
              <select className="inp" value={(p.type as string) || 'String'} onChange={e => u({ properties: uF(props, p.id as string, { type: e.target.value }) })} style={{ width: 90, flexShrink: 0 }}>
                {['String', 'Integer', 'Float', 'Boolean', 'Date', 'DateTime', 'List', 'Point', 'Duration', 'ByteArray'].map(t => <option key={t}>{t}</option>)}
              </select>
              <button className="delbtn" onClick={() => u({ properties: dF(props, p.id as string) })}>✕</button>
            </div>
            {!isCollapsed && (
              <div className="cb-row">
                {(['required', 'unique', 'indexed'] as const).map((k, idx) => {
                  const labels = ['REQ', 'UNIQ', 'IDX'];
                  const colors = ['#EF4444', '#3B82F6', '#06B6D4'];
                  return (
                    <label key={k} className="cb-lbl">
                      <input type="checkbox" checked={!!p[k]} onChange={e => u({ properties: uF(props, p.id as string, { [k]: e.target.checked }) })} />
                      <span style={{ color: p[k] ? colors[idx] : 'var(--muted)' }}>{labels[idx]}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── CacheEditor ───────────────────────────────────────

/** Schema editor for cache (Redis-style) nodes. */
export function CacheEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const fields = (s.fields as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);

  return (
    <div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'Redis'} onChange={e => u({ engine: e.target.value })}>
            {DB.cache.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Key Pattern</span><input className="inp" value={(s.keyPattern as string) || ''} onChange={e => u({ keyPattern: e.target.value })} /></div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Structure</span>
          <select className="inp" value={(s.structure as string) || 'hash'} onChange={e => u({ structure: e.target.value })}>
            {['string', 'hash', 'list', 'set', 'zset', 'stream', 'json', 'bitmap', 'hyperloglog', 'geo'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ width: 80, flexShrink: 0 }}><span className="lbl">TTL (s)</span><input className="inp" type="number" value={(s.ttl as number) || 3600} onChange={e => u({ ttl: Number(e.target.value) })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Eviction</span>
          <select className="inp" value={(s.eviction as string) || 'allkeys-lru'} onChange={e => u({ eviction: e.target.value })}>
            {['noeviction', 'allkeys-lru', 'allkeys-lfu', 'allkeys-random', 'volatile-lru', 'volatile-lfu', 'volatile-random', 'volatile-ttl'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Persistence</span>
          <select className="inp" value={(s.persistence as string) || 'RDB'} onChange={e => u({ persistence: e.target.value })}>
            {['RDB', 'AOF', 'RDB+AOF', 'None'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="cb-row" style={{ marginBottom: 8 }}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.cluster} onChange={e => u({ cluster: e.target.checked })} /><span style={{ color: s.cluster ? '#06B6D4' : 'var(--muted)' }}>Cluster</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.pubsub} onChange={e => u({ pubsub: e.target.checked })} /><span style={{ color: s.pubsub ? '#8B5CF6' : 'var(--muted)' }}>Pub/Sub</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.pipeline} onChange={e => u({ pipeline: e.target.checked })} /><span style={{ color: s.pipeline ? '#F59E0B' : 'var(--muted)' }}>Pipeline</span></label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...fields, { id: uid(), name: 'field', type: 'string', serialization: 'raw' }] })}>+ Field</button>
      </div>
      {fields.map(f => (
        <div key={f.id as string} className="row">
          <input className="inp" value={(f.name as string) || ''} onChange={e => u({ fields: uF(fields, f.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select className="inp" value={(f.type as string) || 'string'} onChange={e => u({ fields: uF(fields, f.id as string, { type: e.target.value }) })} style={{ width: 80, flexShrink: 0 }}>
            {['string', 'integer', 'float', 'boolean', 'binary', 'json', 'object', 'list', 'set'].map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="inp" value={(f.serialization as string) || 'raw'} onChange={e => u({ fields: uF(fields, f.id as string, { serialization: e.target.value }) })} style={{ width: 60, fontSize: 9, flexShrink: 0 }}>
            {['raw', 'json', 'msgpack', 'protobuf'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ fields: dF(fields, f.id as string) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── ObjStoreEditor ────────────────────────────────────

/** Schema editor for object-storage (S3-style) nodes. */
export function ObjStoreEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);

  return (
    <div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'AWS S3'} onChange={e => u({ engine: e.target.value })}>
            {DB.objstore.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Bucket</span><input className="inp" value={(s.bucket as string) || ''} onChange={e => u({ bucket: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Key Prefix</span><input className="inp" value={(s.prefix as string) || ''} onChange={e => u({ prefix: e.target.value })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Storage Class</span>
          <select className="inp" value={(s.storageClass as string) || 'STANDARD'} onChange={e => u({ storageClass: e.target.value })}>
            {['STANDARD', 'INTELLIGENT_TIERING', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER', 'GLACIER_IR', 'DEEP_ARCHIVE', 'REDUCED_REDUNDANCY'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">ACL</span>
          <select className="inp" value={(s.acl as string) || 'private'} onChange={e => u({ acl: e.target.value })}>
            {['private', 'public-read', 'public-read-write', 'authenticated-read', 'bucket-owner-read', 'bucket-owner-full-control'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Encryption</span>
          <select className="inp" value={(s.encryption as string) || 'SSE-S3'} onChange={e => u({ encryption: e.target.value })}>
            {['SSE-S3', 'SSE-KMS', 'SSE-C', 'DSSE-KMS', 'None'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}><span className="lbl">Content-Type</span><input className="inp" value={(s.contentType as string) || ''} placeholder="application/json" onChange={e => u({ contentType: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span className="lbl">Lifecycle Rule</span>
        <input className="inp" value={(s.lifecycle as string) || ''} placeholder="transition to GLACIER after 90d" onChange={e => u({ lifecycle: e.target.value })} style={{ fontSize: 10 }} />
      </div>
      <div className="cb-row">
        <label className="cb-lbl"><input type="checkbox" checked={!!s.versioning} onChange={e => u({ versioning: e.target.checked })} /><span style={{ color: s.versioning ? '#06B6D4' : 'var(--muted)' }}>Versioning</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.cors} onChange={e => u({ cors: e.target.checked })} /><span style={{ color: s.cors ? '#3B82F6' : 'var(--muted)' }}>CORS</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.replication} onChange={e => u({ replication: e.target.checked })} /><span style={{ color: s.replication ? '#8B5CF6' : 'var(--muted)' }}>Replication</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.publicAccess} onChange={e => u({ publicAccess: e.target.checked })} /><span style={{ color: s.publicAccess ? '#EF4444' : 'var(--muted)' }}>Public</span></label>
      </div>
    </div>
  );
}

// ── SearchEditor ──────────────────────────────────────

/** Schema editor for full-text search (Elasticsearch-style) nodes. */
export function SearchEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const fields = (s.fields as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ fields: reorder(fields, from, to) }));
  const { collapsed, toggle } = useCollapse(fields.map(f => f.id as string));

  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'Elasticsearch'} onChange={e => u({ engine: e.target.value })}>
            {DB.search.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 2 }}><span className="lbl">Index</span><input className="inp" value={(s.index as string) || ''} onChange={e => u({ index: e.target.value })} /></div>
        <div style={{ width: 50, flexShrink: 0 }}><span className="lbl">Shards</span><input className="inp" type="number" value={(s.shards as number) || 1} onChange={e => u({ shards: Number(e.target.value) })} /></div>
        <div style={{ width: 50, flexShrink: 0 }}><span className="lbl">Repls</span><input className="inp" type="number" value={(s.replicas as number) ?? 0} onChange={e => u({ replicas: Number(e.target.value) })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Refresh Interval</span><input className="inp" value={(s.refreshInterval as string) || '1s'} onChange={e => u({ refreshInterval: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Default Analyzer</span><input className="inp" value={(s.defaultAnalyzer as string) || 'standard'} onChange={e => u({ defaultAnalyzer: e.target.value })} /></div>
      </div>
      <div className="cb-row" style={{ marginBottom: 8 }}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.dynamicMapping} onChange={e => u({ dynamicMapping: e.target.checked })} /><span style={{ color: s.dynamicMapping ? '#06B6D4' : 'var(--muted)' }}>Dynamic Mapping</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.sourceEnabled} onChange={e => u({ sourceEnabled: e.target.checked })} /><span style={{ color: s.sourceEnabled ? '#3B82F6' : 'var(--muted)' }}> _source</span></label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Mappings</span>
        <button className="addbtn" onClick={() => u({ fields: [...fields, { id: uid(), name: 'field', type: 'keyword', indexed: true, stored: true, analyzer: '', boost: 1, copyTo: '', nullValue: '' }] })}>+ Field</button>
      </div>
      {fields.map((f, i) => {
        const isCollapsed = collapsed.has(f.id as string);
        return (
          <div key={f.id as string} className="field-row" {...dragProps(i)}>
            <div className="row">
              {handle}
              <CollapseBtn id={f.id as string} collapsed={isCollapsed} toggle={toggle} />
              <input className="inp" value={(f.name as string) || ''} onChange={e => u({ fields: uF(fields, f.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
              <select style={sel(def.c)} value={(f.type as string) || 'keyword'} onChange={e => u({ fields: uF(fields, f.id as string, { type: e.target.value }) })}>
                {ES_T.map((t: string) => <option key={t}>{t}</option>)}
              </select>
              <button className="delbtn" onClick={() => u({ fields: dF(fields, f.id as string) })}>✕</button>
            </div>
            {!isCollapsed && (
              <div className="row" style={{ marginTop: 4, gap: 4 }}>
                <input className="inp" value={(f.analyzer as string) || ''} placeholder="analyzer" onChange={e => u({ fields: uF(fields, f.id as string, { analyzer: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
                <input className="inp" value={(f.copyTo as string) || ''} placeholder="copy_to" onChange={e => u({ fields: uF(fields, f.id as string, { copyTo: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
                <input className="inp" type="number" value={(f.boost as number) || 1} placeholder="boost" onChange={e => u({ fields: uF(fields, f.id as string, { boost: Number(e.target.value) }) })} style={{ width: 50, fontSize: 10, flexShrink: 0 }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── TimeSeriesEditor ──────────────────────────────────

/** Schema editor for time-series (InfluxDB-style) nodes. */
export function TimeSeriesEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const tags = (s.tags as Array<Record<string, unknown>>) ?? [];
  const fields = (s.fields as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);

  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'InfluxDB'} onChange={e => u({ engine: e.target.value })}>
            {DB.tseries.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Measurement</span><input className="inp" value={(s.measurement as string) || ''} onChange={e => u({ measurement: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Retention</span><input className="inp" value={(s.retention as string) || '30d'} onChange={e => u({ retention: e.target.value })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Precision</span>
          <select className="inp" value={(s.precision as string) || 'ns'} onChange={e => u({ precision: e.target.value })}>
            {['ns', 'us', 'ms', 's'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}><span className="lbl">Downsampling</span><input className="inp" value={(s.downsampling as string) || ''} placeholder="mean(1h), max(1d)…" onChange={e => u({ downsampling: e.target.value })} style={{ fontSize: 10 }} /></div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span className="lbl">Continuous Query</span>
        <input className="inp" value={(s.continuousQuery as string) || ''} placeholder="SELECT mean(value) INTO … GROUP BY time(1h)" onChange={e => u({ continuousQuery: e.target.value })} style={{ fontSize: 10 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="lbl" style={{ margin: 0, color: '#F59E0B' }}>Tags</span>
        <button className="addbtn" onClick={() => u({ tags: [...tags, { id: uid(), name: 'tag' }] })}>+ Tag</button>
      </div>
      {tags.map(t => (
        <div key={t.id as string} className="row">
          <input className="inp" value={(t.name as string) || ''} onChange={e => u({ tags: uF(tags, t.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
          <button className="delbtn" onClick={() => u({ tags: dF(tags, t.id as string) })}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, marginTop: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...fields, { id: uid(), name: 'field', type: 'float', aggregation: 'mean' }] })}>+ Field</button>
      </div>
      {fields.map(f => (
        <div key={f.id as string} className="row">
          <input className="inp" value={(f.name as string) || ''} onChange={e => u({ fields: uF(fields, f.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select className="inp" value={(f.type as string) || 'float'} onChange={e => u({ fields: uF(fields, f.id as string, { type: e.target.value }) })} style={{ width: 70, flexShrink: 0 }}>
            {['float', 'integer', 'unsigned', 'boolean', 'string'].map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="inp" value={(f.aggregation as string) || 'mean'} onChange={e => u({ fields: uF(fields, f.id as string, { aggregation: e.target.value }) })} style={{ width: 60, fontSize: 9, flexShrink: 0 }}>
            {['mean', 'sum', 'max', 'min', 'count', 'last', 'first', 'stddev'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ fields: dF(fields, f.id as string) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── VectorEditor ──────────────────────────────────────

/** Schema editor for vector-database (Qdrant-style) nodes. */
export function VectorEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const payload = (s.payload as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);

  return (
    <div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'Qdrant'} onChange={e => u({ engine: e.target.value })}>
            {DB.vector.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Collection</span><input className="inp" value={(s.collection as string) || ''} onChange={e => u({ collection: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Dimensions</span><input className="inp" type="number" value={(s.dimensions as number) || 1536} onChange={e => u({ dimensions: Number(e.target.value) })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Distance</span>
          <select className="inp" value={(s.distance as string) || 'Cosine'} onChange={e => u({ distance: e.target.value })}>
            {['Cosine', 'Euclid', 'Dot', 'Manhattan'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Quantization</span>
          <select className="inp" value={(s.quantization as string) || 'None'} onChange={e => u({ quantization: e.target.value })}>
            {['None', 'Scalar', 'Product', 'Binary'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">HNSW m</span><input className="inp" type="number" value={(s.hnswM as number) || 16} onChange={e => u({ hnswM: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">HNSW ef</span><input className="inp" type="number" value={(s.hnswEf as number) || 100} onChange={e => u({ hnswEf: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">ef_construct</span><input className="inp" type="number" value={(s.hnswEfConstruct as number) || 200} onChange={e => u({ hnswEfConstruct: Number(e.target.value) })} /></div>
      </div>
      <div className="cb-row" style={{ marginBottom: 8 }}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.onDisk} onChange={e => u({ onDisk: e.target.checked })} /><span style={{ color: s.onDisk ? '#F59E0B' : 'var(--muted)' }}>On-Disk</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.namedVectors} onChange={e => u({ namedVectors: e.target.checked })} /><span style={{ color: s.namedVectors ? '#8B5CF6' : 'var(--muted)' }}>Named Vectors</span></label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Payload</span>
        <button className="addbtn" onClick={() => u({ payload: [...payload, { id: uid(), name: 'field', type: 'text', filterable: false }] })}>+ Field</button>
      </div>
      {payload.map(p => (
        <div key={p.id as string} className="row">
          <input className="inp" value={(p.name as string) || ''} onChange={e => u({ payload: uF(payload, p.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select className="inp" value={(p.type as string) || 'text'} onChange={e => u({ payload: uF(payload, p.id as string, { type: e.target.value }) })} style={{ width: 80, flexShrink: 0 }}>
            {['text', 'keyword', 'integer', 'float', 'boolean', 'datetime', 'uuid', 'geo', 'json'].map(t => <option key={t}>{t}</option>)}
          </select>
          <label className="cb-lbl"><input type="checkbox" checked={!!p.filterable} onChange={e => u({ payload: uF(payload, p.id as string, { filterable: e.target.checked }) })} /><span style={{ color: p.filterable ? '#06B6D4' : 'var(--muted)', fontSize: 9 }}>Filter</span></label>
          <button className="delbtn" onClick={() => u({ payload: dF(payload, p.id as string) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── ColumnEditor ──────────────────────────────────────

/** Schema editor for wide-column (Cassandra-style) nodes. */
export function ColumnEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const cols = (s.columns as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ columns: reorder(cols, from, to) }));
  const { collapsed, toggle } = useCollapse(cols.map(c => c.id as string));

  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'Cassandra'} onChange={e => u({ engine: e.target.value })}>
            {DB.column.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Keyspace</span><input className="inp" value={(s.keyspace as string) || ''} onChange={e => u({ keyspace: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Table</span><input className="inp" value={(s.table as string) || ''} onChange={e => u({ table: e.target.value })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Replication</span><input className="inp" type="number" value={(s.replication as number) || 3} onChange={e => u({ replication: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Strategy</span>
          <select className="inp" value={(s.strategy as string) || 'SimpleStrategy'} onChange={e => u({ strategy: e.target.value })}>
            {['SimpleStrategy', 'NetworkTopologyStrategy', 'LocalStrategy'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Compaction</span>
          <select className="inp" value={(s.compaction as string) || 'SizeTiered'} onChange={e => u({ compaction: e.target.value })}>
            {['SizeTiered', 'Leveled', 'TimeWindow', 'TWCS', 'DTCS'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Clustering Order</span>
          <select className="inp" value={(s.clusteringOrder as string) || 'ASC'} onChange={e => u({ clusteringOrder: e.target.value })}>
            {['ASC', 'DESC'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Columns</span>
        <button className="addbtn" onClick={() => u({ columns: [...cols, { id: uid(), name: 'col', type: 'TEXT', role: 'regular', static: false }] })}>+ Column</button>
      </div>
      {cols.map((c, i) => {
        const isCollapsed = collapsed.has(c.id as string);
        return (
          <div key={c.id as string} className="field-row" {...dragProps(i)}>
            <div className="row">
              {handle}
              <CollapseBtn id={c.id as string} collapsed={isCollapsed} toggle={toggle} />
              <input className="inp" value={(c.name as string) || ''} onChange={e => u({ columns: uF(cols, c.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
              <select style={sel(def.c)} value={(c.type as string) || 'TEXT'} onChange={e => u({ columns: uF(cols, c.id as string, { type: e.target.value }) })}>
                {CASS_T.map((t: string) => <option key={t}>{t}</option>)}
              </select>
              <button className="delbtn" onClick={() => u({ columns: dF(cols, c.id as string) })}>✕</button>
            </div>
            {!isCollapsed && (
              <div className="row" style={{ marginTop: 4, gap: 4 }}>
                <select className="inp" value={(c.role as string) || 'regular'} onChange={e => u({ columns: uF(cols, c.id as string, { role: e.target.value }) })} style={{ flex: 1, fontSize: 10 }}>
                  <option value="partition">PARTITION KEY</option>
                  <option value="clustering">CLUSTERING KEY</option>
                  <option value="regular">REGULAR</option>
                </select>
                <label className="cb-lbl"><input type="checkbox" checked={!!c.static} onChange={e => u({ columns: uF(cols, c.id as string, { static: e.target.checked }) })} /><span style={{ color: c.static ? '#8B5CF6' : 'var(--muted)', fontSize: 10 }}>STATIC</span></label>
                <label className="cb-lbl"><input type="checkbox" checked={!!c.frozen} onChange={e => u({ columns: uF(cols, c.id as string, { frozen: e.target.checked }) })} /><span style={{ color: c.frozen ? '#06B6D4' : 'var(--muted)', fontSize: 10 }}>FROZEN</span></label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── QueueEditor ───────────────────────────────────────

/** Schema editor for message-queue (Kafka-style) nodes. */
export function QueueEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const schema = (s.schema as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);
  const dragProps = useDragReorder((from, to) => u({ schema: reorder(schema, from, to) }));
  const { collapsed, toggle } = useCollapse(schema.map(f => f.id as string));

  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'Apache Kafka'} onChange={e => u({ engine: e.target.value })}>
            {DB.queue.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Topic</span><input className="inp" value={(s.topic as string) || ''} onChange={e => u({ topic: e.target.value })} /></div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Partitions</span><input className="inp" type="number" value={(s.partitions as number) || 3} onChange={e => u({ partitions: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Replication</span><input className="inp" type="number" value={(s.replication as number) || 1} onChange={e => u({ replication: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Retention</span><input className="inp" value={(s.retention as string) || '7d'} onChange={e => u({ retention: e.target.value })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Compression</span>
          <select className="inp" value={(s.compression as string) || 'snappy'} onChange={e => u({ compression: e.target.value })}>
            {['none', 'gzip', 'snappy', 'lz4', 'zstd'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Msg Format</span>
          <select className="inp" value={(s.msgFormat as string) || 'JSON'} onChange={e => u({ msgFormat: e.target.value })}>
            {['JSON', 'Avro', 'Protobuf', 'MessagePack', 'Thrift', 'Raw'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Consumer Group</span><input className="inp" value={(s.consumerGroup as string) || ''} placeholder="my-consumer-group" onChange={e => u({ consumerGroup: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">DLQ Topic</span><input className="inp" value={(s.dlqTopic as string) || ''} placeholder="topic.dlq" onChange={e => u({ dlqTopic: e.target.value })} /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Message Schema</span>
        <button className="addbtn" onClick={() => u({ schema: [...schema, { id: uid(), name: 'field', type: 'string', required: false, subFields: [] }] })}>+ Field</button>
      </div>
      {schema.map((f, i) => {
        const isCollapsed = collapsed.has(f.id as string);
        return (
          <div key={f.id as string} className="field-row" {...dragProps(i)}>
            <div className="row">
              {handle}
              <CollapseBtn id={f.id as string} collapsed={isCollapsed} toggle={toggle} />
              <input className="inp" value={(f.name as string) || ''} onChange={e => u({ schema: uF(schema, f.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
              <select className="inp" value={(f.type as string) || 'string'} onChange={e => u({ schema: uF(schema, f.id as string, { type: e.target.value }) })} style={{ width: 80, flexShrink: 0 }}>
                {['string', 'integer', 'long', 'float', 'double', 'boolean', 'object', 'array', 'bytes', 'uuid', 'null', 'json'].map(t => <option key={t}>{t}</option>)}
              </select>
              <label className="cb-lbl"><input type="checkbox" checked={!!f.required} onChange={e => u({ schema: uF(schema, f.id as string, { required: e.target.checked }) })} /><span style={{ fontSize: 10 }}>R</span></label>
              <button className="delbtn" onClick={() => u({ schema: dF(schema, f.id as string) })}>✕</button>
            </div>
            {!isCollapsed && (f.type === 'object' || f.type === 'array') && (
              <SubFieldEditor fields={(f.subFields as unknown[]) || []} onChange={(sf: unknown) => u({ schema: uF(schema, f.id as string, { subFields: sf }) })} depth={1} dbType="queue" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── KeyValueEditor ────────────────────────────────────

/** Schema editor for key-value (DynamoDB-style) nodes. */
export function KeyValueEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const attrs = (s.attributes as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);
  const def = DB[n.data.dbType];

  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'DynamoDB'} onChange={e => u({ engine: e.target.value })}>
            {DB.keyvalue.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Table</span><input className="inp" value={(s.table as string) || ''} onChange={e => u({ table: e.target.value })} /></div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Billing</span>
          <select className="inp" value={(s.billingMode as string) || 'PAY_PER_REQUEST'} onChange={e => u({ billingMode: e.target.value })}>
            <option>PAY_PER_REQUEST</option><option>PROVISIONED</option>
          </select>
        </div>
      </div>
      <div style={{ background: 'var(--field-bg)', border: `1px solid ${def.c}33`, borderRadius: 5, padding: 7, marginBottom: 7 }}>
        <span className="lbl" style={{ color: def.c }}>Partition Key</span>
        <div className="row">
          <input className="inp" value={((s.partitionKey as Record<string, string>)?.name) || 'pk'} onChange={e => u({ partitionKey: { ...(s.partitionKey as object), name: e.target.value } })} style={{ flex: 1 }} />
          <select className="inp" value={((s.partitionKey as Record<string, string>)?.type) || 'String'} onChange={e => u({ partitionKey: { ...(s.partitionKey as object), type: e.target.value } })} style={{ width: 80, flexShrink: 0 }}>
            {['String', 'Number', 'Binary'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <span className="lbl" style={{ color: def.c, marginTop: 6 }}>Sort Key (optional)</span>
        <div className="row">
          <input className="inp" value={((s.sortKey as Record<string, string>)?.name) || ''} placeholder="sort key name" onChange={e => u({ sortKey: { ...(s.sortKey as object), name: e.target.value } })} style={{ flex: 1 }} />
          <select className="inp" value={((s.sortKey as Record<string, string>)?.type) || 'String'} onChange={e => u({ sortKey: { ...(s.sortKey as object), type: e.target.value } })} style={{ width: 80, flexShrink: 0 }}>
            {['String', 'Number', 'Binary'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">GSI (JSON)</span>
          <input className="inp" value={(s.gsi as string) || ''} placeholder='[{"name":"gsi1","pk":"email","sk":"createdAt"}]' onChange={e => u({ gsi: e.target.value })} style={{ fontSize: 9 }} />
        </div>
      </div>
      <div className="cb-row" style={{ marginBottom: 8 }}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.ttlEnabled} onChange={e => u({ ttlEnabled: e.target.checked })} /><span style={{ color: s.ttlEnabled ? '#F59E0B' : 'var(--muted)' }}>TTL</span></label>
        {s.ttlEnabled && <input className="inp" value={(s.ttlAttr as string) || 'ttl'} onChange={e => u({ ttlAttr: e.target.value })} style={{ width: 80, fontSize: 10 }} placeholder="ttl attr" />}
        <label className="cb-lbl"><input type="checkbox" checked={!!s.streams} onChange={e => u({ streams: e.target.checked })} /><span style={{ color: s.streams ? '#06B6D4' : 'var(--muted)' }}>Streams</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.pitr} onChange={e => u({ pitr: e.target.checked })} /><span style={{ color: s.pitr ? '#8B5CF6' : 'var(--muted)' }}>PITR</span></label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Attributes</span>
        <button className="addbtn" onClick={() => u({ attributes: [...attrs, { id: uid(), name: 'attr', type: 'String' }] })}>+ Attr</button>
      </div>
      {attrs.map(a => (
        <div key={a.id as string} className="row">
          <input className="inp" value={(a.name as string) || ''} onChange={e => u({ attributes: uF(attrs, a.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select className="inp" value={(a.type as string) || 'String'} onChange={e => u({ attributes: uF(attrs, a.id as string, { type: e.target.value }) })} style={{ width: 80, flexShrink: 0 }}>
            {KV_T.map((t: string) => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ attributes: dF(attrs, a.id as string) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── LedgerEditor ──────────────────────────────────────

/** Schema editor for ledger (QLDB-style) nodes. */
export function LedgerEditor({ n }: EditorProps) {
  const s = n.data.schema as Record<string, unknown>;
  const fields = (s.fields as Array<Record<string, unknown>>) ?? [];
  const u = (p: Record<string, unknown>) => updateSchema(n.id, p);

  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Engine</span>
          <select className="inp" value={(s.engine as string) || 'QLDB'} onChange={e => u({ engine: e.target.value })}>
            {DB.ledger.engines.map((e: string) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Ledger</span><input className="inp" value={(s.ledger as string) || ''} onChange={e => u({ ledger: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Table</span><input className="inp" value={(s.table as string) || ''} onChange={e => u({ table: e.target.value })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Permissions</span>
          <select className="inp" value={(s.permissions as string) || 'ALLOW_ALL'} onChange={e => u({ permissions: e.target.value })}>
            {['ALLOW_ALL', 'STANDARD'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">Deletion Protection</span>
          <select className="inp" value={(s.deletionProtection as string) || 'true'} onChange={e => u({ deletionProtection: e.target.value })}>
            {['true', 'false'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <span className="lbl">Tags (key=value, comma-sep)</span>
        <input className="inp" value={(s.tags as string) || ''} placeholder="env=prod, team=backend" onChange={e => u({ tags: e.target.value })} style={{ fontSize: 10 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...fields, { id: uid(), name: 'field', type: 'String', indexed: false }] })}>+ Field</button>
      </div>
      {fields.map(f => (
        <div key={f.id as string} className="row">
          <input className="inp" value={(f.name as string) || ''} onChange={e => u({ fields: uF(fields, f.id as string, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select className="inp" value={(f.type as string) || 'String'} onChange={e => u({ fields: uF(fields, f.id as string, { type: e.target.value }) })} style={{ width: 100, flexShrink: 0 }}>
            {['String', 'IonStruct', 'IonList', 'Integer', 'Decimal', 'Boolean', 'Blob', 'Timestamp', 'Null', 'Clob', 'Symbol'].map(t => <option key={t}>{t}</option>)}
          </select>
          <label className="cb-lbl"><input type="checkbox" checked={!!f.indexed} onChange={e => u({ fields: uF(fields, f.id as string, { indexed: e.target.checked }) })} /><span style={{ color: f.indexed ? '#06B6D4' : 'var(--muted)', fontSize: 9 }}>IDX</span></label>
          <button className="delbtn" onClick={() => u({ fields: dF(fields, f.id as string) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── SchemaEditor (dispatcher) ─────────────────────────

/** Dispatches to the correct editor component based on `n.data.dbType`. */
export function SchemaEditor({ n }: EditorProps) {
  switch (n.data.dbType) {
    case 'sql':       return <SqlEditor n={n} />;
    case 'document':  return <DocumentEditor n={n} />;
    case 'graph':     return <GraphEditor n={n} />;
    case 'cache':     return <CacheEditor n={n} />;
    case 'objstore':  return <ObjStoreEditor n={n} />;
    case 'search':    return <SearchEditor n={n} />;
    case 'tseries':   return <TimeSeriesEditor n={n} />;
    case 'vector':    return <VectorEditor n={n} />;
    case 'column':    return <ColumnEditor n={n} />;
    case 'queue':     return <QueueEditor n={n} />;
    case 'keyvalue':  return <KeyValueEditor n={n} />;
    case 'ledger':    return <LedgerEditor n={n} />;
    default:          return null;
  }
}
