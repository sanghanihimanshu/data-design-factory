import { uid } from '../utils';
import { ES_T, CASS_T, DB } from '../constants';
import { upSchema, snapshot } from '../store';

const sel = (color, extra = {}) => ({
  background: 'var(--bg3)', border: '1px solid var(--border2)', color,
  borderRadius: 4, padding: '3px', fontSize: 10, ...extra
});
const sel2 = (color, extra = {}) => ({
  background: 'var(--bg3)', border: '1px solid var(--border2)', color,
  borderRadius: 4, padding: '4px', fontSize: 11, width: '100%', ...extra
});

export function GraphEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Entity Type</span>
          <select style={sel2('var(--text)')} value={s.entityType} onChange={e => u({ entityType: e.target.value })}>
            {['Node', 'Relationship'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <span className="lbl">Labels (comma-sep)</span>
        <input className="inp" value={(s.labels || []).join(', ')} onChange={e => upSchema(n.id, { labels: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Properties</span>
        <button className="addbtn" onClick={() => u({ properties: [...s.properties, { id: uid(), name: 'prop', type: 'String', required: false, indexed: false }] })}>+ Property</button>
      </div>
      {(s.properties || []).map(p => (
        <div key={p.id} className="field-row">
          <div className="row">
            <input className="inp" value={p.name} onChange={e => upSchema(n.id, { properties: uF(s.properties, p.id, { name: e.target.value }) })} style={{ flex: 1 }} />
            <select style={sel(def.c, { width: 90 })} value={p.type} onChange={e => u({ properties: uF(s.properties, p.id, { type: e.target.value }) })}>
              {['String', 'Integer', 'Float', 'Boolean', 'Date', 'DateTime', 'List', 'Point', 'Duration'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="cb-row">
            <label className="cb-lbl"><input type="checkbox" checked={p.required} onChange={e => u({ properties: uF(s.properties, p.id, { required: e.target.checked }) })} /><span style={{ color: p.required ? '#f87171' : 'var(--hint)' }}>Required</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={p.indexed} onChange={e => u({ properties: uF(s.properties, p.id, { indexed: e.target.checked }) })} /><span style={{ color: p.indexed ? '#22D3EE' : 'var(--hint)' }}>Index</span></label>
            <button className="delbtn" onClick={() => u({ properties: dF(s.properties, p.id) })}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CacheEditor({ n }) {
  const s = n.schema;
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  const def = DB[n.type];
  return (
    <div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Key Pattern</span><input className="inp" value={s.keyPattern || ''} onChange={e => upSchema(n.id, { keyPattern: e.target.value })} /></div>
      <div className="irow">
        <div style={{ flex: 1 }}>
          <span className="lbl">Structure</span>
          <select style={sel2(def.c)} value={s.structure} onChange={e => u({ structure: e.target.value })}>
            {['string', 'hash', 'list', 'set', 'zset', 'stream', 'hyperloglog', 'geo', 'json', 'bitmap'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ width: 80 }}><span className="lbl">TTL (s)</span><input className="inp" type="number" value={s.ttl || 3600} onChange={e => upSchema(n.id, { ttl: Number(e.target.value) })} /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...(s.fields || []), { id: uid(), name: 'field', type: 'string' }] })}>+ Field</button>
      </div>
      {(s.fields || []).map(f => (
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e => upSchema(n.id, { fields: uF(s.fields || [], f.id, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select style={sel('var(--text)', { width: 80 })} value={f.type} onChange={e => u({ fields: uF(s.fields || [], f.id, { type: e.target.value }) })}>
            {['string', 'integer', 'float', 'boolean', 'binary', 'json'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ fields: dF(s.fields || [], f.id) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function ObjStoreEditor({ n }) {
  const s = n.schema;
  const u = p => { snapshot(); upSchema(n.id, p); };
  const def = DB[n.type];
  return (
    <div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Bucket</span><input className="inp" value={s.bucket || ''} onChange={e => upSchema(n.id, { bucket: e.target.value })} /></div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Key Prefix</span><input className="inp" value={s.prefix || ''} placeholder="optional/prefix/" onChange={e => upSchema(n.id, { prefix: e.target.value })} /></div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Storage Class</span>
        <select style={sel2(def.c)} value={s.storageClass} onChange={e => u({ storageClass: e.target.value })}>
          {['STANDARD', 'INTELLIGENT_TIERING', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER', 'DEEP_ARCHIVE'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Encryption</span>
        <select style={sel2('var(--text)')} value={s.encryption} onChange={e => u({ encryption: e.target.value })}>
          {['SSE-S3', 'SSE-KMS', 'SSE-C', 'None'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 8 }}><span className="lbl">ACL</span>
        <select style={sel2('var(--text)')} value={s.acl} onChange={e => u({ acl: e.target.value })}>
          {['private', 'public-read', 'public-read-write', 'authenticated-read'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="cb-row">
        <label className="cb-lbl"><input type="checkbox" checked={s.versioning} onChange={e => u({ versioning: e.target.checked })} /><span style={{ color: s.versioning ? '#60A5FA' : 'var(--hint)' }}>Versioning</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={s.cors} onChange={e => u({ cors: e.target.checked })} /><span style={{ color: s.cors ? '#60A5FA' : 'var(--hint)' }}>CORS</span></label>
      </div>
    </div>
  );
}

export function SearchEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Index</span><input className="inp" value={s.index || ''} onChange={e => upSchema(n.id, { index: e.target.value })} /></div>
        <div style={{ width: 50 }}><span className="lbl">Shards</span><input className="inp" type="number" value={s.shards || 1} min="1" onChange={e => upSchema(n.id, { shards: Number(e.target.value) })} /></div>
        <div style={{ width: 50 }}><span className="lbl">Repls</span><input className="inp" type="number" value={s.replicas ?? 0} min="0" onChange={e => upSchema(n.id, { replicas: Number(e.target.value) })} /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Field Mappings</span>
        <button className="addbtn" onClick={() => u({ fields: [...s.fields, { id: uid(), name: 'field', type: 'keyword', indexed: true, stored: true, analyzer: '' }] })}>+ Mapping</button>
      </div>
      {(s.fields || []).map(f => (
        <div key={f.id} className="field-row">
          <div className="row">
            <input className="inp" value={f.name} onChange={e => upSchema(n.id, { fields: uF(s.fields, f.id, { name: e.target.value }) })} style={{ flex: 1 }} />
            <select style={sel(def.c, { width: 100 })} value={f.type} onChange={e => u({ fields: uF(s.fields, f.id, { type: e.target.value }) })}>
              {ES_T.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginBottom: 0 }}>
            <input className="inp" value={f.analyzer || ''} placeholder="analyzer" onChange={e => upSchema(n.id, { fields: uF(s.fields, f.id, { analyzer: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
            <label className="cb-lbl"><input type="checkbox" checked={f.indexed} onChange={e => u({ fields: uF(s.fields, f.id, { indexed: e.target.checked }) })} /><span style={{ color: f.indexed ? '#22D3EE' : 'var(--hint)' }}>IDX</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={f.stored} onChange={e => u({ fields: uF(s.fields, f.id, { stored: e.target.checked }) })} /><span style={{ color: f.stored ? '#60A5FA' : 'var(--hint)' }}>STORE</span></label>
            <button className="delbtn" onClick={() => u({ fields: dF(s.fields, f.id) })}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColumnEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Keyspace</span><input className="inp" value={s.keyspace || ''} onChange={e => upSchema(n.id, { keyspace: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Table</span><input className="inp" value={s.table || ''} onChange={e => upSchema(n.id, { table: e.target.value })} /></div>
      </div>
      <div className="irow">
        <div style={{ width: 60 }}><span className="lbl">Repl.</span><input className="inp" type="number" value={s.replication || 3} min="1" onChange={e => upSchema(n.id, { replication: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Strategy</span>
          <select style={sel2('var(--text)')} value={s.strategy} onChange={e => u({ strategy: e.target.value })}>
            {['SimpleStrategy', 'NetworkTopologyStrategy'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Columns</span>
        <button className="addbtn" onClick={() => u({ columns: [...s.columns, { id: uid(), name: 'col', type: 'TEXT', role: 'regular', static: false }] })}>+ Column</button>
      </div>
      {(s.columns || []).map(c => (
        <div key={c.id} className="field-row" style={{ borderColor: c.role === 'partition' ? def.c + '55' : c.role === 'clustering' ? '#FBBF2455' : 'var(--border)' }}>
          <div className="row">
            <input className="inp" value={c.name} onChange={e => upSchema(n.id, { columns: uF(s.columns, c.id, { name: e.target.value }) })} style={{ flex: 1 }} />
            <select style={sel(def.c, { width: 100 })} value={c.type} onChange={e => u({ columns: uF(s.columns, c.id, { type: e.target.value }) })}>
              {CASS_T.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginBottom: 0 }}>
            <select style={sel(c.role === 'partition' ? def.c : c.role === 'clustering' ? '#FBBF24' : 'var(--muted)', { width: 110 })} value={c.role} onChange={e => u({ columns: uF(s.columns, c.id, { role: e.target.value }) })}>
              <option value="partition">PARTITION</option>
              <option value="clustering">CLUSTERING</option>
              <option value="regular">REGULAR</option>
            </select>
            <label className="cb-lbl"><input type="checkbox" checked={c.static} onChange={e => u({ columns: uF(s.columns, c.id, { static: e.target.checked }) })} /><span style={{ color: c.static ? '#94a3b8' : 'var(--hint)' }}>STATIC</span></label>
            <button className="delbtn" onClick={() => u({ columns: dF(s.columns, c.id) })}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
