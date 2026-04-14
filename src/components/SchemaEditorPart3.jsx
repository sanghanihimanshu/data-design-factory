import { uid } from '../utils';
import { KV_T, DB } from '../constants';
import { upSchema, snapshot } from '../store';

const sel = (color, extra = {}) => ({
  background: 'var(--bg3)', border: '1px solid var(--border2)', color,
  borderRadius: 4, padding: '3px', fontSize: 10, ...extra
});
const sel2 = (color, extra = {}) => ({
  background: 'var(--bg3)', border: '1px solid var(--border2)', color,
  borderRadius: 4, padding: '4px', fontSize: 11, width: '100%', ...extra
});

export function TimeSeriesEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Measurement</span><input className="inp" value={s.measurement || ''} onChange={e => upSchema(n.id, { measurement: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Retention</span><input className="inp" value={s.retention || '30d'} onChange={e => upSchema(n.id, { retention: e.target.value })} /></div>
        <div style={{ width: 55 }}><span className="lbl">Prec</span>
          <select style={sel2('var(--text)')} value={s.precision} onChange={e => u({ precision: e.target.value })}>
            {['ns', 'us', 'ms', 's'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="lbl" style={{ margin: 0, color: '#FBBF24' }}>Tags (string dims)</span>
        <button className="addbtn" onClick={() => u({ tags: [...(s.tags || []), { id: uid(), name: 'tag' }] })}>+ Tag</button>
      </div>
      {(s.tags || []).map(t => (
        <div key={t.id} className="row">
          <input className="inp" value={t.name} onChange={e => upSchema(n.id, { tags: uF(s.tags || [], t.id, { name: e.target.value }) })} style={{ flex: 1 }} />
          <button className="delbtn" onClick={() => u({ tags: dF(s.tags || [], t.id) })}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, marginTop: 8 }}>
        <span className="lbl" style={{ margin: 0, color: def.c }}>Fields (numeric)</span>
        <button className="addbtn" onClick={() => u({ fields: [...(s.fields || []), { id: uid(), name: 'field', type: 'float' }] })}>+ Field</button>
      </div>
      {(s.fields || []).map(f => (
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e => upSchema(n.id, { fields: uF(s.fields || [], f.id, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select style={sel('var(--text)', { width: 80 })} value={f.type} onChange={e => u({ fields: uF(s.fields || [], f.id, { type: e.target.value }) })}>
            {['float', 'integer', 'unsigned', 'boolean', 'string'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ fields: dF(s.fields || [], f.id) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function VectorEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Collection</span><input className="inp" value={s.collection || ''} onChange={e => upSchema(n.id, { collection: e.target.value })} /></div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Dimensions</span><input className="inp" type="number" value={s.dimensions || 1536} onChange={e => upSchema(n.id, { dimensions: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Distance</span>
          <select style={sel2(def.c)} value={s.distance} onChange={e => u({ distance: e.target.value })}>
            {['Cosine', 'Euclid', 'Dot', 'Manhattan'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Quantization</span>
          <select style={sel2('var(--text)')} value={s.quantization} onChange={e => u({ quantization: e.target.value })}>
            {['None', 'Scalar', 'Product', 'Binary'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, paddingTop: 14 }}>
          <label className="cb-lbl"><input type="checkbox" checked={s.onDisk} onChange={e => u({ onDisk: e.target.checked })} /><span style={{ color: s.onDisk ? def.c : 'var(--hint)' }}>On-Disk</span></label>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Payload Fields</span>
        <button className="addbtn" onClick={() => u({ payload: [...(s.payload || []), { id: uid(), name: 'field', type: 'text' }] })}>+ Field</button>
      </div>
      {(s.payload || []).map(p => (
        <div key={p.id} className="row">
          <input className="inp" value={p.name} onChange={e => upSchema(n.id, { payload: uF(s.payload || [], p.id, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select style={sel('var(--text)', { width: 80 })} value={p.type} onChange={e => u({ payload: uF(s.payload || [], p.id, { type: e.target.value }) })}>
            {['text', 'keyword', 'integer', 'float', 'boolean', 'datetime', 'uuid', 'geo'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ payload: dF(s.payload || [], p.id) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function QueueEditor({ n }) {
  const s = n.schema;
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div style={{ marginBottom: 8 }}><span className="lbl">Topic / Queue</span><input className="inp" value={s.topic || ''} onChange={e => upSchema(n.id, { topic: e.target.value })} /></div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Partitions</span><input className="inp" type="number" value={s.partitions || 3} min="1" onChange={e => upSchema(n.id, { partitions: Number(e.target.value) })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Replication</span><input className="inp" type="number" value={s.replication || 1} min="1" onChange={e => upSchema(n.id, { replication: Number(e.target.value) })} /></div>
      </div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Retention</span><input className="inp" value={s.retention || '7d'} onChange={e => upSchema(n.id, { retention: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Compression</span>
          <select style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 4, padding: '4px', fontSize: 11, width: '100%' }} value={s.compression} onChange={e => u({ compression: e.target.value })}>
            {['none', 'snappy', 'lz4', 'gzip', 'zstd', 'brotli'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Message Schema</span>
        <button className="addbtn" onClick={() => u({ schema: [...(s.schema || []), { id: uid(), name: 'field', type: 'string', required: false }] })}>+ Field</button>
      </div>
      {(s.schema || []).map(f => (
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e => upSchema(n.id, { schema: uF(s.schema || [], f.id, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select style={sel('var(--text)', { width: 75 })} value={f.type} onChange={e => u({ schema: uF(s.schema || [], f.id, { type: e.target.value }) })}>
            {['string', 'integer', 'long', 'float', 'boolean', 'object', 'array', 'bytes', 'uuid', 'null'].map(t => <option key={t}>{t}</option>)}
          </select>
          <label className="cb-lbl"><input type="checkbox" checked={f.required} onChange={e => u({ schema: uF(s.schema || [], f.id, { required: e.target.checked }) })} /><span style={{ fontSize: 10, color: f.required ? '#f87171' : 'var(--hint)' }}>R</span></label>
          <button className="delbtn" onClick={() => u({ schema: dF(s.schema || [], f.id) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function KeyValueEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Table</span><input className="inp" value={s.table || ''} onChange={e => upSchema(n.id, { table: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Billing</span>
          <select style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 4, padding: '4px', fontSize: 11, width: '100%' }} value={s.billingMode} onChange={e => u({ billingMode: e.target.value })}>
            <option>PAY_PER_REQUEST</option><option>PROVISIONED</option>
          </select>
        </div>
      </div>
      <div style={{ background: 'var(--bg2)', border: `1px solid ${def.c}33`, borderRadius: 5, padding: 7, marginBottom: 7 }}>
        <span className="lbl" style={{ color: def.c }}>Partition Key</span>
        <div className="row">
          <input className="inp" value={s.partitionKey?.name || 'pk'} onChange={e => upSchema(n.id, { partitionKey: { ...s.partitionKey, name: e.target.value } })} style={{ flex: 1 }} />
          <select style={sel(def.c, { width: 80 })} value={s.partitionKey?.type} onChange={e => u({ partitionKey: { ...s.partitionKey, type: e.target.value } })}>
            {['String', 'Number', 'Binary'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ background: 'var(--bg2)', border: '1px solid #60A5FA33', borderRadius: 5, padding: 7, marginBottom: 10 }}>
        <span className="lbl" style={{ color: '#60A5FA' }}>Sort Key</span>
        <div className="row">
          <input className="inp" value={s.sortKey?.name || 'sk'} onChange={e => upSchema(n.id, { sortKey: { ...s.sortKey, name: e.target.value } })} style={{ flex: 1 }} />
          <select style={sel('#60A5FA', { width: 80 })} value={s.sortKey?.type} onChange={e => u({ sortKey: { ...s.sortKey, type: e.target.value } })}>
            {['String', 'Number', 'Binary'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="cb-row" style={{ marginBottom: 10 }}>
        <label className="cb-lbl"><input type="checkbox" checked={s.ttlEnabled} onChange={e => u({ ttlEnabled: e.target.checked })} /><span style={{ color: s.ttlEnabled ? def.c : 'var(--hint)' }}>TTL</span></label>
        {s.ttlEnabled && <input className="inp" value={s.ttlAttr || 'ttl'} placeholder="attr" onChange={e => upSchema(n.id, { ttlAttr: e.target.value })} style={{ width: 80 }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Attributes</span>
        <button className="addbtn" onClick={() => u({ attributes: [...(s.attributes || []), { id: uid(), name: 'attr', type: 'String' }] })}>+ Attr</button>
      </div>
      {(s.attributes || []).map(a => (
        <div key={a.id} className="row">
          <input className="inp" value={a.name} onChange={e => upSchema(n.id, { attributes: uF(s.attributes || [], a.id, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select style={sel('var(--text)', { width: 80 })} value={a.type} onChange={e => u({ attributes: uF(s.attributes || [], a.id, { type: e.target.value }) })}>
            {KV_T.map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ attributes: dF(s.attributes || [], a.id) })}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function LedgerEditor({ n }) {
  const s = n.schema;
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  return (
    <div>
      <div className="irow">
        <div style={{ flex: 1 }}><span className="lbl">Ledger</span><input className="inp" value={s.ledger || ''} onChange={e => upSchema(n.id, { ledger: e.target.value })} /></div>
        <div style={{ flex: 1 }}><span className="lbl">Table</span><input className="inp" value={s.table || ''} onChange={e => upSchema(n.id, { table: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: 10 }}><span className="lbl">Permissions</span>
        <select style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 4, padding: '4px', fontSize: 11, width: '100%' }} value={s.permissions} onChange={e => u({ permissions: e.target.value })}>
          {['ALLOW_ALL', 'STANDARD'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...(s.fields || []), { id: uid(), name: 'field', type: 'String' }] })}>+ Field</button>
      </div>
      {(s.fields || []).map(f => (
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e => upSchema(n.id, { fields: uF(s.fields || [], f.id, { name: e.target.value }) })} style={{ flex: 1 }} />
          <select style={sel('var(--text)', { width: 100 })} value={f.type} onChange={e => u({ fields: uF(s.fields || [], f.id, { type: e.target.value }) })}>
            {['String', 'IonStruct', 'IonList', 'Integer', 'Decimal', 'Boolean', 'Blob', 'Clob', 'Timestamp', 'Null'].map(t => <option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={() => u({ fields: dF(s.fields || [], f.id) })}>✕</button>
        </div>
      ))}
    </div>
  );
}
