import { uid } from '../utils';
import { SQL_TYPES, BSON_T, DB } from '../constants';
import { upSchema, snapshot } from '../store';

const sel = (color, extra = {}) => ({
  background: 'var(--bg3)', border: '1px solid var(--border2)', color,
  borderRadius: 4, padding: '3px', fontSize: 10, ...extra
});

export function SqlEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Columns</span>
        <button className="addbtn" onClick={() => u({ columns: [...s.columns, { id: uid(), name: 'new_col', type: 'TEXT', pk: false, nullable: true, unique: false, default: '', fk: '', index: false }] })}>+ Column</button>
      </div>
      {(s.columns || []).map(c => (
        <div key={c.id} className="field-row">
          <div className="row">
            <input className="inp" value={c.name} onChange={e => upSchema(n.id, { columns: uF(s.columns, c.id, { name: e.target.value }) })} style={{ flex: 1 }} />
            <select style={sel(def.c, { width: 130 })} value={c.type} onChange={e => u({ columns: uF(s.columns, c.id, { type: e.target.value }) })}>
              {SQL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="cb-row">
            <label className="cb-lbl"><input type="checkbox" checked={c.pk} onChange={e => u({ columns: uF(s.columns, c.id, { pk: e.target.checked }) })} /><span style={{ color: c.pk ? '#FBBF24' : 'var(--hint)' }}>PK</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={c.nullable} onChange={e => u({ columns: uF(s.columns, c.id, { nullable: e.target.checked }) })} /><span style={{ color: c.nullable ? '#94a3b8' : 'var(--hint)' }}>NULL</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={c.unique} onChange={e => u({ columns: uF(s.columns, c.id, { unique: e.target.checked }) })} /><span style={{ color: c.unique ? '#60A5FA' : 'var(--hint)' }}>UNIQUE</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={c.index} onChange={e => u({ columns: uF(s.columns, c.id, { index: e.target.checked }) })} /><span style={{ color: c.index ? '#22D3EE' : 'var(--hint)' }}>IDX</span></label>
            <button className="delbtn" onClick={() => u({ columns: dF(s.columns, c.id) })}>✕</button>
          </div>
          <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
            <input className="inp" value={c.default || ''} placeholder="default" onChange={e => upSchema(n.id, { columns: uF(s.columns, c.id, { default: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
            <input className="inp" value={c.fk || ''} placeholder="table.col (FK)" onChange={e => upSchema(n.id, { columns: uF(s.columns, c.id, { fk: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentEditor({ n }) {
  const s = n.schema, def = DB[n.type];
  const u = p => { snapshot(); upSchema(n.id, p); };
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span className="lbl">Collection</span>
        <input className="inp" value={s.collection || ''} onChange={e => upSchema(n.id, { collection: e.target.value })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...s.fields, { id: uid(), name: 'field', type: 'String', required: false, unique: false, indexed: false }] })}>+ Field</button>
      </div>
      {(s.fields || []).map(f => (
        <div key={f.id} className="field-row">
          <div className="row">
            <input className="inp" value={f.name} onChange={e => upSchema(n.id, { fields: uF(s.fields, f.id, { name: e.target.value }) })} style={{ flex: 1 }} />
            <select style={sel(def.c, { width: 100 })} value={f.type} onChange={e => u({ fields: uF(s.fields, f.id, { type: e.target.value }) })}>
              {BSON_T.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="cb-row">
            <label className="cb-lbl"><input type="checkbox" checked={f.required} onChange={e => u({ fields: uF(s.fields, f.id, { required: e.target.checked }) })} /><span style={{ color: f.required ? '#f87171' : 'var(--hint)' }}>Required</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={f.unique} onChange={e => u({ fields: uF(s.fields, f.id, { unique: e.target.checked }) })} /><span style={{ color: f.unique ? '#60A5FA' : 'var(--hint)' }}>Unique</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={f.indexed} onChange={e => u({ fields: uF(s.fields, f.id, { indexed: e.target.checked }) })} /><span style={{ color: f.indexed ? '#22D3EE' : 'var(--hint)' }}>Index</span></label>
            <button className="delbtn" onClick={() => u({ fields: dF(s.fields, f.id) })}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
