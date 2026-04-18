import { uid } from '../store';
import { useDragReorder } from '../useDragReorder';

export const SUB_TYPES = [
  'String','Number','Int32','Int64','Double','Decimal128','Boolean',
  'Date','Timestamp','ObjectId','UUID','BinData',
  'Object','Array','Array<Object>','Array<String>','Array<Number>',
  'Array<ObjectId>','Array<Boolean>','Array<Date>','Array<Mixed>',
  'JSON','Enum','Mixed','Any',
];

const IDX_TYPES = {
  document: [['1','ASC (1)'],['−1','DESC (−1)'],['text','text'],['2dsphere','2dsphere'],['hashed','hashed'],['wildcard','wildcard']],
  sql:       [['btree','btree'],['hash','hash'],['gin','gin'],['gist','gist'],['brin','brin']],
};

const handle = <span style={{ color: 'var(--muted)', fontSize: 12, cursor: 'grab', flexShrink: 0, userSelect: 'none' }} title="Drag to reorder">⠿</span>;

export function SubFieldEditor({ fields = [], onChange, depth = 0, dbType = 'document' }) {
  if (depth > 3) return null;
  const add = () => onChange([...fields, { id: uid(), name: 'field', type: 'String', required: false, unique: false, index: false, indexType: '', subFields: [] }]);
  const del = id => onChange(fields.filter(f => f.id !== id));
  const upd = (id, p) => onChange(fields.map(f => f.id === id ? { ...f, ...p } : f));
  const idxOpts = IDX_TYPES[dbType];
  const dragProps = useDragReorder((from, to) => {
    const a = [...fields]; a.splice(to, 0, a.splice(from, 1)[0]); onChange(a);
  });

  return (
    <div style={{ marginLeft: depth * 12, borderLeft: depth > 0 ? '2px solid var(--border)' : 'none', paddingLeft: depth > 0 ? 8 : 0 }}>
      {fields.map((f, i) => (
        <div key={f.id} style={{ marginBottom: 4 }} {...dragProps(i)}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {handle}
            <input className="inp" value={f.name} onChange={e => upd(f.id, { name: e.target.value })} style={{ flex: 1, fontSize: 10 }} placeholder="field name" />
            <select className="inp" value={f.type} onChange={e => upd(f.id, { type: e.target.value })} style={{ width: 110, fontSize: 10 }}>
              {SUB_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={() => del(f.id)}>✕</button>
          </div>
          <div className="cb-row" style={{ marginTop: 2, marginBottom: 0 }}>
            {[['required','REQ','#EF4444'],['unique','UNIQ','#3B82F6'],['index','IDX','#06B6D4']].map(([k,l,col]) => (
              <label key={k} className="cb-lbl">
                <input type="checkbox" checked={!!f[k]} onChange={e => upd(f.id, { [k]: e.target.checked })} />
                <span style={{ color: f[k] ? col : 'var(--muted)' }}>{l}</span>
              </label>
            ))}
            {f.index && idxOpts && (
              <select className="inp" value={f.indexType || idxOpts[0][0]} onChange={e => upd(f.id, { indexType: e.target.value })} style={{ fontSize: 9, height: 18, padding: '0 3px', marginLeft: 2 }}>
                {idxOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
          </div>
          {(f.type === 'Object' || f.type === 'Array<Object>' || f.type === 'Array') && (
            <SubFieldEditor fields={f.subFields || []} onChange={sf => upd(f.id, { subFields: sf })} depth={depth + 1} dbType={dbType} />
          )}
        </div>
      ))}
      <button className="addbtn" onClick={add} style={{ fontSize: 9, marginTop: 2 }}>+ sub-field</button>
    </div>
  );
}

// Enum values editor
export function EnumEditor({ values = '', onChange }) {
  return (
    <div style={{ marginTop: 4 }}>
      <span className="lbl">Enum Values (comma-separated)</span>
      <input className="inp" value={values} onChange={e => onChange(e.target.value)} placeholder="active, inactive, pending" style={{ fontSize: 10 }} />
    </div>
  );
}
