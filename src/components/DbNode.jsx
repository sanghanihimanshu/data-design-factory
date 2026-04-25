import { memo, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { Copy, Trash2, Key, Link, Search, Database, FileJson, GitBranch, Zap, Cloud, ScanSearch, TrendingUp, Sparkles, AlignJustify, MessageSquare, Hash, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { DB } from '../constants';
import { deleteNode, duplicateNode, updateNodeData } from '../store';

// White Lucide icon per DB type
const DB_ICONS = {
  sql:      <Database size={16} color="#fff" strokeWidth={2} />,
  document: <FileJson size={16} color="#fff" strokeWidth={2} />,
  graph:    <GitBranch size={16} color="#fff" strokeWidth={2} />,
  cache:    <Zap size={16} color="#fff" strokeWidth={2} />,
  objstore: <Cloud size={16} color="#fff" strokeWidth={2} />,
  search:   <ScanSearch size={16} color="#fff" strokeWidth={2} />,
  tseries:  <TrendingUp size={16} color="#fff" strokeWidth={2} />,
  vector:   <Sparkles size={16} color="#fff" strokeWidth={2} />,
  column:   <AlignJustify size={16} color="#fff" strokeWidth={2} />,
  queue:    <MessageSquare size={16} color="#fff" strokeWidth={2} />,
  keyvalue: <Hash size={16} color="#fff" strokeWidth={2} />,
  ledger:   <BookOpen size={16} color="#fff" strokeWidth={2} />,
};

function TypeBadge({ type, color }) {
  return <span style={{ fontSize: 9, color, background: color + '18', padding: '1px 5px', borderRadius: 10, border: `1px solid ${color}30`, fontWeight: 600, letterSpacing: 0.3, flexShrink: 0 }}>{type}</span>;
}

function FieldRow({ nodeId, rowId, name, type, color, pkIcon, fkIcon, indexIcon, required, subCount, depth = 0 }) {
  const padLeft = 12 + depth * 14;

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: `6px 12px 6px ${padLeft}px`,
        borderBottom: '1px solid var(--node-border)',
        fontSize: 11.5,
        background: 'var(--node-bg)',
      }}
    >
      {depth > 0 && (
        <span
          style={{
            position: 'absolute',
            left: padLeft - 8,
            top: 6,
            bottom: 6,
            width: 1,
            background: 'var(--node-border)',
            opacity: 0.8,
            pointerEvents: 'none',
          }}
        />
      )}
      <Handle
        type="target"
        id={`in-${nodeId}-${rowId}`}
        position={Position.Left}
        style={rowHandleStyle(color, 'left')}
      />
      <Handle
        type="source"
        id={`out-${nodeId}-${rowId}`}
        position={Position.Right}
        style={rowHandleStyle(color, 'right')}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {pkIcon && <Key size={10} color="#F59E0B" style={{ flexShrink: 0 }} />}
        {fkIcon && <Link size={10} color="#8B5CF6" style={{ flexShrink: 0 }} />}
        {indexIcon && <Search size={10} color="#06B6D4" style={{ flexShrink: 0 }} />}
        {!pkIcon && !fkIcon && !indexIcon && <span style={{ width: 10, flexShrink: 0 }} />}
        <span style={{ color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: 11 }}>{name}</span>
        {required && <span style={{ fontSize: 9, color: '#EF4444', flexShrink: 0, fontWeight: 700 }}>*</span>}
        {subCount > 0 && <span style={{ fontSize: 9, color, flexShrink: 0, fontWeight: 600 }}>+{subCount}</span>}
      </div>
      <TypeBadge type={type} color={color} />
    </div>
  );
}

function nestedRows(fields, nodeId, color, depth = 0) {
  return (fields || []).flatMap((f) => {
    const rows = [
      <FieldRow
        key={f.id}
        nodeId={nodeId}
        rowId={f.id}
        name={f.name}
        type={f.type}
        color={color}
        required={f.required}
        indexIcon={f.indexed}
        subCount={f.subFields?.length || 0}
        depth={depth}
      />,
    ];

    if (f.subFields?.length) {
      rows.push(...nestedRows(f.subFields, nodeId, color, depth + 1));
    }

    return rows;
  });
}

function NodeBody({ nodeId, data }) {
  const { dbType, schema } = data;
  const def = DB[dbType];
  const c = data.color || def.c;

  switch (dbType) {
    case 'sql':
      return (schema.columns || []).map(col => (
        <FieldRow key={col.id} nodeId={nodeId} rowId={col.id} name={col.name} type={col.type} color={c}
          pkIcon={col.pk} fkIcon={!!col.fk} indexIcon={col.index && !col.pk && !col.fk}
          required={!col.nullable && !col.pk}
        />
      ));
    case 'document':
      return nestedRows(schema.fields, nodeId, c);
    case 'graph':
      return <>
        <FieldRow nodeId={nodeId} rowId="graph-type" name="type" type={schema.entityType} color={c} />
        {(schema.properties || []).map(p => <FieldRow key={p.id} nodeId={nodeId} rowId={p.id} name={p.name} type={p.type} color={c} indexIcon={p.indexed} />)}
      </>;
    case 'cache':
      return <>
        <FieldRow nodeId={nodeId} rowId="cache-key" name="key" type={schema.keyPattern || '—'} color={c} />
        <FieldRow nodeId={nodeId} rowId="cache-struct" name="struct" type={schema.structure} color={c} />
        <FieldRow nodeId={nodeId} rowId="cache-ttl" name="ttl" type={`${schema.ttl}s`} color={c} />
        {(schema.fields || []).map(f => <FieldRow key={f.id} nodeId={nodeId} rowId={f.id} name={f.name} type={f.type} color={c} />)}
      </>;
    case 'objstore':
      return <>
        <FieldRow nodeId={nodeId} rowId="obj-bucket" name="bucket" type={schema.bucket} color={c} />
        <FieldRow nodeId={nodeId} rowId="obj-class" name="class" type={schema.storageClass} color={c} />
        <FieldRow nodeId={nodeId} rowId="obj-enc" name="enc" type={schema.encryption} color={c} />
      </>;
    case 'search':
      return <>
        <FieldRow nodeId={nodeId} rowId="search-index" name="index" type={schema.index} color={c} />
        <FieldRow nodeId={nodeId} rowId="search-sr" name="shards/replicas" type={`${schema.shards}/${schema.replicas}`} color={c} />
        {(schema.fields || []).map(f => <FieldRow key={f.id} nodeId={nodeId} rowId={f.id} name={f.name} type={f.type} color={c} indexIcon={f.indexed} />)}
      </>;
    case 'tseries':
      return <>
        <FieldRow nodeId={nodeId} rowId="ts-measurement" name="measurement" type={schema.measurement} color={c} />
        <FieldRow nodeId={nodeId} rowId="ts-retention" name="retention" type={schema.retention} color={c} />
        {(schema.tags || []).map(t => <FieldRow key={t.id} nodeId={nodeId} rowId={t.id} name={t.name} type="tag" color="#F59E0B" />)}
        {(schema.fields || []).map(f => <FieldRow key={f.id} nodeId={nodeId} rowId={f.id} name={f.name} type={f.type} color={c} />)}
      </>;
    case 'vector':
      return <>
        <FieldRow nodeId={nodeId} rowId="vec-collection" name="collection" type={schema.collection} color={c} />
        <FieldRow nodeId={nodeId} rowId="vec-dims" name="dims" type={`${schema.dimensions}d · ${schema.distance}`} color={c} />
        {(schema.payload || []).map(p => <FieldRow key={p.id} nodeId={nodeId} rowId={p.id} name={p.name} type={p.type} color={c} />)}
      </>;
    case 'column':
      return <>
        <FieldRow nodeId={nodeId} rowId="col-table" name="table" type={`${schema.keyspace}.${schema.table}`} color={c} />
        {(schema.columns || []).map(col => (
          <FieldRow key={col.id} nodeId={nodeId} rowId={col.id} name={col.name} type={col.type} color={c}
            pkIcon={col.role === 'partition'} indexIcon={col.role === 'clustering'}
          />
        ))}
      </>;
    case 'queue':
      return <>
        <FieldRow nodeId={nodeId} rowId="q-topic" name="topic" type={schema.topic} color={c} />
        <FieldRow nodeId={nodeId} rowId="q-parts" name="partitions" type={`${schema.partitions}p · ${schema.replication}r`} color={c} />
        {(schema.schema || []).flatMap((f) => {
          const rows = [
            <FieldRow key={f.id} nodeId={nodeId} rowId={f.id} name={f.name} type={f.type} color={c} required={f.required} subCount={f.subFields?.length || 0} />,
          ];
          if (f.subFields?.length) {
            rows.push(...nestedRows(f.subFields, nodeId, c, 1));
          }
          return rows;
        })}
      </>;
    case 'keyvalue':
      return <>
        <FieldRow nodeId={nodeId} rowId="kv-table" name="table" type={schema.table} color={c} />
        <FieldRow nodeId={nodeId} rowId="kv-pk" name={schema.partitionKey?.name || 'pk'} type={`PK · ${schema.partitionKey?.type}`} color={c} pkIcon />
        <FieldRow nodeId={nodeId} rowId="kv-sk" name={schema.sortKey?.name || 'sk'} type={`SK · ${schema.sortKey?.type}`} color={c} />
        {(schema.attributes || []).map(a => <FieldRow key={a.id} nodeId={nodeId} rowId={a.id} name={a.name} type={a.type} color={c} />)}
      </>;
    case 'ledger':
      return <>
        <FieldRow nodeId={nodeId} rowId="ledger-name" name="ledger" type={schema.ledger} color={c} />
        <FieldRow nodeId={nodeId} rowId="ledger-table" name="table" type={schema.table} color={c} />
        {(schema.fields || []).map(f => <FieldRow key={f.id} nodeId={nodeId} rowId={f.id} name={f.name} type={f.type} color={c} />)}
      </>;
    default: return null;
  }
}

export const DbNode = memo(({ id, data, selected }) => {
  const def = DB[data.dbType];
  const accent = data.color || def.c;
  const collapsed = !!data.collapsed;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => { updateNodeInternals(id); }, [id, data, updateNodeInternals]);

  return (
    <div
      style={{
        width: 328,
        background: 'var(--node-bg)',
        borderRadius: 14,
        border: `1.5px solid ${selected ? accent : 'var(--node-border)'}`,
        boxShadow: selected
          ? `0 0 0 2px ${accent}1E, 0 12px 28px rgba(8,15,30,.12)`
          : '0 4px 14px rgba(8,15,30,.08)',
        transition: 'border-color .12s, box-shadow .12s',
        fontFamily: 'var(--sans)',
        overflow: 'visible',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 9, borderBottom: collapsed ? 'none' : '1px solid var(--node-border)', background: 'var(--field-bg)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {DB_ICONS[data.dbType]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text)', fontWeight: 600, marginTop: 1 }}>
            {def.l} · {data.engine}
            {data.alias && <span style={{ marginLeft: 5, color: accent, fontFamily: 'var(--mono)', fontSize: 9.5 }}>@{data.alias}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <button
            onClick={e => { e.stopPropagation(); updateNodeData(id, { collapsed: !collapsed }); }}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={iconBtn(accent)}
          >
            {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
          {selected && <>
            <button onClick={e => { e.stopPropagation(); duplicateNode(id); }} title="Duplicate" style={iconBtn(accent)}><Copy size={11} /></button>
            <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteNode(id); }} title="Delete" style={iconBtn('#EF4444')}><Trash2 size={11} /></button>
          </>}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ overflow: 'hidden' }}>
          <NodeBody nodeId={id} data={data} />
        </div>
      )}
    </div>
  );
});

const iconBtn = (color) => ({
  background: color + '12', border: `1px solid ${color}28`, color,
  width: 23, height: 23, borderRadius: 6, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  transition: 'none',
});

const rowHandleStyle = (color, side) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  border: '1.5px solid var(--node-bg)',
  [side]: -5,
  top: 'calc(50% - 5px)',
  transform: 'none',
});
