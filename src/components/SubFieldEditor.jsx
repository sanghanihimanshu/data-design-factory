import { uid } from '../store';

// Reusable sub-field editor for JSON/Object/Array<Object> types
export function SubFieldEditor({ fields = [], onChange, depth = 0 }) {
  if (depth > 3) return null;
  const add = () => onChange([...fields, { id: uid(), name: 'field', type: 'String', subFields: [] }]);
  const del = id => onChange(fields.filter(f => f.id !== id));
  const upd = (id, p) => onChange(fields.map(f => f.id === id ? { ...f, ...p } : f));

  return (
    <div style={{ marginLeft: depth * 12, borderLeft: depth > 0 ? '2px solid var(--border)' : 'none', paddingLeft: depth > 0 ? 8 : 0 }}>
      {fields.map(f => (
        <div key={f.id} style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input className="inp" value={f.name} onChange={e => upd(f.id, { name: e.target.value })} style={{ flex: 1, fontSize: 10 }} placeholder="field name" />
            <select className="inp" value={f.type} onChange={e => upd(f.id, { type: e.target.value })} style={{ width: 90, fontSize: 10 }}>
              {SUB_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={() => del(f.id)}>✕</button>
          </div>
          {(f.type === 'Object' || f.type === 'Array<Object>') && (
            <SubFieldEditor fields={f.subFields || []} onChange={sf => upd(f.id, { subFields: sf })} depth={depth + 1} />
          )}
        </div>
      ))}
      <button className="addbtn" onClick={add} style={{ fontSize: 9, marginTop: 2 }}>+ sub-field</button>
    </div>
  );
}

export const SUB_TYPES = [
  'String','Number','Boolean','Date','ObjectId','UUID',
  'Object','Array<Object>','Array<String>','Array<Number>',
  'JSON','JSONB','Enum','Mixed','Any',
];

// Enum values editor
export function EnumEditor({ values = '', onChange }) {
  return (
    <div style={{ marginTop: 4 }}>
      <span className="lbl">Enum Values (comma-separated)</span>
      <input className="inp" value={values} onChange={e => onChange(e.target.value)} placeholder="active, inactive, pending" style={{ fontSize: 10 }} />
    </div>
  );
}
