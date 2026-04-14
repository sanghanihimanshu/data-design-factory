import { DB } from '../constants';

function R({ name, val, color = '#60A5FA' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '2px 9px', gap: 4, fontSize: 10 }}>
      <span style={{ color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <span style={{ color: 'var(--hint)', fontSize: 9, flexShrink: 0 }}>{val || ''}</span>
    </div>
  );
}

export function NodeBody({ n }) {
  const s = n.schema, def = DB[n.type];
  switch (n.type) {
    case 'sql':
      return (s.columns || []).map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '2px 9px', gap: 3, fontSize: 10 }}>
          {c.pk && <span style={{ color: '#FBBF24', fontSize: 8 }}>⚿</span>}
          <span style={{ color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
          <span style={{ color: def.c, fontSize: 9, flexShrink: 0 }}>{c.type}</span>
          {c.fk && <span style={{ color: '#A78BFA', fontSize: 7 }}> ⇒FK</span>}
        </div>
      ));
    case 'document':
      return <>
        <R name="collection" val={s.collection} color={def.c} />
        {(s.fields || []).map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '2px 9px', gap: 3, fontSize: 10 }}>
            {f.required && <span style={{ color: '#f87171', fontSize: 8 }}>*</span>}
            <span style={{ color: 'var(--text)', flex: 1 }}>{f.name}</span>
            <span style={{ color: def.c, fontSize: 9 }}>{f.type}</span>
            {f.indexed && <span style={{ color: '#22D3EE', fontSize: 8 }}>⌕</span>}
          </div>
        ))}
      </>;
    case 'graph':
      return <>
        <R name="type" val={s.entityType} color={def.c} />
        <R name="labels" val={(s.labels || []).join(', ')} color={def.c} />
        {(s.properties || []).map(p => (
          <div key={p.id} style={{ display: 'flex', padding: '2px 9px', gap: 4, fontSize: 10 }}>
            <span style={{ color: 'var(--text)', flex: 1 }}>{p.name}</span>
            <span style={{ color: def.c, fontSize: 9 }}>{p.type}</span>
            {p.indexed && <span style={{ color: '#22D3EE', fontSize: 8 }}>⌕</span>}
          </div>
        ))}
      </>;
    case 'cache':
      return <>
        <R name="key" val={s.keyPattern} color={def.c} />
        <R name="struct" val={s.structure} />
        <R name="ttl" val={s.ttl + 's'} />
        {(s.fields || []).map(f => <R key={f.id} name={f.name} val={f.type} />)}
      </>;
    case 'objstore':
      return <>
        <R name="bucket" val={s.bucket} color={def.c} />
        <R name="class" val={s.storageClass} />
        <R name="enc" val={s.encryption} />
        <R name="acl" val={s.acl} />
        <R name="versioning" val={s.versioning ? 'ON' : 'off'} color={s.versioning ? '#34D399' : undefined} />
      </>;
    case 'search':
      return <>
        <R name="index" val={s.index} color={def.c} />
        <R name={`${s.shards}s/${s.replicas}r`} val="" />
        {(s.fields || []).map(f => (
          <div key={f.id} style={{ display: 'flex', padding: '2px 9px', gap: 3, fontSize: 10 }}>
            <span style={{ color: 'var(--text)', flex: 1 }}>{f.name}</span>
            <span style={{ color: def.c, fontSize: 9 }}>{f.type}</span>
            {f.indexed && <span style={{ color: '#22D3EE', fontSize: 8 }}>⌕</span>}
          </div>
        ))}
      </>;
    case 'tseries':
      return <>
        <R name="↳" val={s.measurement} color={def.c} />
        <R name="ret" val={s.retention} />
        {(s.tags || []).map(t => (
          <div key={t.id} style={{ display: 'flex', padding: '2px 9px', gap: 3, fontSize: 10 }}>
            <span style={{ color: '#FBBF24', fontSize: 8 }}>T</span>
            <span style={{ color: 'var(--text)', flex: 1 }}>{t.name}</span>
          </div>
        ))}
        {(s.fields || []).map(f => (
          <div key={f.id} style={{ display: 'flex', padding: '2px 9px', gap: 3, fontSize: 10 }}>
            <span style={{ color: def.c, fontSize: 8 }}>F</span>
            <span style={{ color: 'var(--text)', flex: 1 }}>{f.name}</span>
            <span style={{ color: 'var(--hint)', fontSize: 9 }}>{f.type}</span>
          </div>
        ))}
      </>;
    case 'vector':
      return <>
        <R name="↳" val={s.collection} color={def.c} />
        <R name={`${s.dimensions}d`} val={s.distance} />
        {(s.payload || []).map(p => <R key={p.id} name={p.name} val={p.type} />)}
      </>;
    case 'column':
      return <>
        <R name={`${s.keyspace}.${s.table}`} val="" color={def.c} />
        {(s.columns || []).map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '2px 9px', gap: 3, fontSize: 10 }}>
            <span style={{ fontSize: 8, color: c.role === 'partition' ? def.c : c.role === 'clustering' ? '#FBBF24' : 'var(--hint)' }}>
              {c.role === 'partition' ? 'P' : c.role === 'clustering' ? 'C' : 'R'}
            </span>
            <span style={{ color: 'var(--text)', flex: 1 }}>{c.name}</span>
            <span style={{ color: 'var(--hint)', fontSize: 9 }}>{c.type}</span>
          </div>
        ))}
      </>;
    case 'queue':
      return <>
        <R name="topic" val={s.topic} color={def.c} />
        <R name={`${s.partitions}p/${s.replication}r`} val="" />
        <R name="ret" val={s.retention} />
        {(s.schema || []).map(f => <R key={f.id} name={f.name} val={f.type} />)}
      </>;
    case 'keyvalue':
      return <>
        <R name="table" val={s.table} color={def.c} />
        <R name="PK" val={`${s.partitionKey?.name}(${s.partitionKey?.type})`} />
        <R name="SK" val={`${s.sortKey?.name}(${s.sortKey?.type})`} />
        {(s.attributes || []).map(a => <R key={a.id} name={a.name} val={a.type} />)}
      </>;
    case 'ledger':
      return <>
        <R name="ledger" val={s.ledger} color={def.c} />
        <R name="table" val={s.table} />
        {(s.fields || []).map(f => <R key={f.id} name={f.name} val={f.type} />)}
      </>;
    default:
      return null;
  }
}
