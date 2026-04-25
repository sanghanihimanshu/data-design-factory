import { useState, useRef } from 'react';
import { X, Copy, CheckCheck, AlertTriangle, Info, CheckCircle2, Keyboard, LayoutTemplate, Upload, Download } from 'lucide-react';
import { DB } from '../constants';
import { setState, importDiagram } from '../store';
import { TEMPLATES, loadTemplate as loadTpl } from '../templates';
import { getQueueSchemaView, getSearchSchemaView } from '../schemaCompat';

// ── EXPORT ────────────────────────────────────────────
function genSQL(nodes) {
  const sqls = nodes.filter(n => n.data.dbType === 'sql');
  if (!sqls.length) return '-- No SQL tables\n';
  return sqls.map(n => {
    const s = n.data.schema, cols = s.columns || [];
    const colDefs = cols.map(c => {
      let d = `  ${c.name.padEnd(24)} ${c.type}`;
      if (c.pk) d += ' PRIMARY KEY';
      else if (!c.nullable) d += ' NOT NULL';
      if (c.unique && !c.pk) d += ' UNIQUE';
      if (c.default) d += ` DEFAULT ${c.default}`;
      if ((c.type === 'ENUM' || c.type === 'ENUM(custom)') && c.enumValues) d += ` -- values: ${c.enumValues}`;
      return d;
    }).join(',\n');
    const fks = cols.filter(c => c.fk).map(c => { const [rt,rc]=c.fk.split('.'); return `  CONSTRAINT fk_${n.data.name}_${c.name} FOREIGN KEY (${c.name}) REFERENCES ${rt}(${rc||'id'})`; });
    const idxs = cols.filter(c => c.index && !c.pk).map(c => `CREATE INDEX idx_${n.data.name}_${c.name} ON ${n.data.name}(${c.name});`);
    return `-- Table: ${n.data.name} [${s.engine}]\nCREATE TABLE ${n.data.name} (\n${[colDefs,...fks].join(',\n')}\n);\n${idxs.join('\n')}`;
  }).join('\n\n');
}

function genTypeScript(nodes) {
  const tsMap = { 'BIGSERIAL':'number','SERIAL':'number','BIGINT':'bigint','INT':'number','INTEGER':'number','BOOLEAN':'boolean','FLOAT':'number','DOUBLE PRECISION':'number','DECIMAL(10,2)':'number','VARCHAR(255)':'string','VARCHAR(64)':'string','TEXT':'string','UUID':'string','DATE':'Date','TIMESTAMP':'Date','TIMESTAMPTZ':'Date','JSONB':'Record<string,unknown>','JSON':'Record<string,unknown>','ARRAY':'unknown[]','String':'string','Number':'number','Boolean':'boolean','ObjectId':'string','Date':'Date','Array':'unknown[]','Object':'Record<string,unknown>','Map':'Record<string,unknown>','Array<Object>':'Record<string,unknown>[]','Array<String>':'string[]','Array<Number>':'number[]' };
  return nodes.map(n => {
    const s = n.data.schema; const def = DB[n.data.dbType];
    let fields = [];
    if (n.data.dbType === 'sql') fields = (s.columns||[]).map(c => ({ name: c.name, type: tsMap[c.type]||'unknown', opt: c.nullable&&!c.pk }));
    else if (n.data.dbType === 'document') fields = (s.fields||[]).map(f => ({ name: f.name, type: tsMap[f.type]||'unknown', opt: !f.required }));
    else if (n.data.dbType === 'queue') {
      const queue = getQueueSchemaView(s);
      fields = queue.msgSchema.map(f => ({ name: f.name, type: tsMap[f.type]||'unknown', opt: !f.required }));
    }
    const iName = n.data.name.charAt(0).toUpperCase() + n.data.name.slice(1);
    return `// ${def.l}: ${n.data.name}\nexport interface ${iName} {\n${fields.map(f=>`  ${f.name}${f.opt?'?':''}: ${f.type};`).join('\n')||'  [key: string]: unknown;'}\n}`;
  }).join('\n\n');
}

function genPrisma(nodes) {
  const sqls = nodes.filter(n => n.data.dbType === 'sql');
  const tMap = { 'BIGSERIAL':'Int @default(autoincrement())','SERIAL':'Int @default(autoincrement())','BIGINT':'BigInt','INT':'Int','INTEGER':'Int','BOOLEAN':'Boolean','FLOAT':'Float','DECIMAL(10,2)':'Decimal','TEXT':'String','VARCHAR(255)':'String','VARCHAR(64)':'String','UUID':'String @default(uuid())','DATE':'DateTime','TIMESTAMP':'DateTime','TIMESTAMPTZ':'DateTime','JSONB':'Json','JSON':'Json' };
  let out = 'generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n\n';
  sqls.forEach(n => {
    const cols = n.data.schema.columns || [];
    out += `model ${n.data.name.charAt(0).toUpperCase()+n.data.name.slice(1)} {\n`;
    cols.forEach(c => { out += `  ${c.name.padEnd(20)} ${tMap[c.type]||'String'}${(!c.nullable||c.pk)?'':' ?'}${c.pk?' @id':''}${c.unique&&!c.pk?' @unique':''}\n`; });
    const idx = cols.filter(c=>c.index&&!c.pk);
    if (idx.length) out += `\n  @@index([${idx.map(c=>c.name).join(', ')}])\n`;
    out += '}\n\n';
  });
  return out;
}

function genGo(nodes) {
  const goMap = {
    'BIGSERIAL':'int64','SERIAL':'int32','BIGINT':'int64','INT':'int32','INTEGER':'int32','SMALLINT':'int16',
    'BOOLEAN':'bool','FLOAT':'float32','DOUBLE PRECISION':'float64','DECIMAL(10,2)':'float64','NUMERIC':'float64',
    'VARCHAR(255)':'string','VARCHAR(64)':'string','TEXT':'string','CHAR(36)':'string','UUID':'string',
    'DATE':'time.Time','TIMESTAMP':'time.Time','TIMESTAMPTZ':'time.Time','TIME':'time.Time',
    'JSONB':'json.RawMessage','JSON':'json.RawMessage','BYTEA':'[]byte','INET':'string','ARRAY':'[]interface{}',
    'String':'string','Number':'float64','Boolean':'bool','ObjectId':'primitive.ObjectID','Date':'time.Time',
    'Array':'[]interface{}','Object':'map[string]interface{}','Array<Object>':'[]map[string]interface{}',
    'Array<String>':'[]string','Array<Number>':'[]float64','Int32':'int32','Int64':'int64',
    'Map':'map[string]interface{}','Mixed':'interface{}',
  };
  const toGoName = s => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
  const toGoType = t => goMap[t] || 'interface{}';

  return nodes.map(n => {
    const s = n.data.schema;
    const name = toGoName(n.data.name);
    let fields = [];
    if (n.data.dbType === 'sql') fields = (s.columns||[]).map(c => ({ name: toGoName(c.name), type: toGoType(c.type), tag: c.name, opt: c.nullable && !c.pk }));
    else if (n.data.dbType === 'document') fields = (s.fields||[]).map(f => ({ name: toGoName(f.name), type: toGoType(f.type), tag: f.name, opt: !f.required }));
    else if (n.data.dbType === 'queue') fields = (s.schema||[]).map(f => ({ name: toGoName(f.name), type: toGoType(f.type), tag: f.name, opt: !f.required }));
    else if (n.data.dbType === 'keyvalue') fields = [{ name: toGoName(s.partitionKey?.name||'PK'), type: 'string', tag: s.partitionKey?.name||'pk', opt: false }, { name: toGoName(s.sortKey?.name||'SK'), type: 'string', tag: s.sortKey?.name||'sk', opt: false }, ...(s.attributes||[]).map(a => ({ name: toGoName(a.name), type: toGoType(a.type), tag: a.name, opt: true }))];

    const body = fields.map(f => {
      const ptr = f.opt ? '*' : '';
      return `\t${f.name.padEnd(20)} ${ptr}${f.type.padEnd(24)} \`json:"${f.tag}${f.opt?',omitempty':''}"\``;
    }).join('\n');

    return `// ${n.data.name} — ${n.data.engine}\ntype ${name} struct {\n${body || '\t// no fields'}\n}`;
  }).join('\n\n');
}

function genAI(nodes) {
  if (!nodes.length) return '// No nodes in diagram\n';
  const DB_LABELS = { sql:'SQL Table', document:'MongoDB Collection', graph:'Graph DB', cache:'Cache', objstore:'Object Storage', search:'Search Index', tseries:'Time Series', vector:'Vector DB', column:'Column Store', queue:'Queue/Stream', keyvalue:'Key-Value', ledger:'Ledger' };
  const lines = ['# Database Schema — AI Context', '', `Total nodes: ${nodes.length}`, ''];
  nodes.forEach(n => {
    const s = n.data.schema, t = n.data.dbType;
    lines.push(`## ${n.data.name} [${DB_LABELS[t] || t}]`);
    if (s.engine) lines.push(`Engine: ${s.engine}`);
    if (t === 'document') {
      lines.push(`Collection: ${s.collection || n.data.name}`);
      lines.push('Fields:');
      (s.fields || []).forEach(f => {
        const flags = [f.required && 'required', f.unique && 'unique', f.indexed && `index(${f.indexType||'1'})`, f.sparse && 'sparse'].filter(Boolean);
        lines.push(`  - ${f.name}: ${f.type}${flags.length ? ` [${flags.join(', ')}]` : ''}${f.default ? ` default=${f.default}` : ''}${f.enumValues ? ` enum(${f.enumValues})` : ''}`);
        if (f.subFields?.length) {
          const printSub = (subs, indent) => subs.forEach(sf => {
            const sf_flags = [sf.required && 'required', sf.unique && 'unique', sf.index && 'index'].filter(Boolean);
            lines.push(`${indent}- ${sf.name}: ${sf.type}${sf_flags.length ? ` [${sf_flags.join(', ')}]` : ''}`);
            if (sf.subFields?.length) printSub(sf.subFields, indent + '  ');
          });
          printSub(f.subFields, '      ');
        }
      });
    } else if (t === 'sql') {
      lines.push('Columns:');
      (s.columns || []).forEach(c => {
        const flags = [c.pk && 'PK', !c.nullable && 'NOT NULL', c.unique && 'UNIQUE', c.index && 'INDEX', c.fk && `FK→${c.fk}`].filter(Boolean);
        lines.push(`  - ${c.name}: ${c.type}${flags.length ? ` [${flags.join(', ')}]` : ''}${c.default ? ` default=${c.default}` : ''}`);
      });
    } else if (t === 'graph') {
      lines.push(`Entity: ${s.entityType}, Labels: ${(s.labels||[]).join(', ')}`);
      lines.push('Properties:');
      (s.properties || []).forEach(p => lines.push(`  - ${p.name}: ${p.type}${p.required ? ' [required]' : ''}${p.indexed ? ' [index]' : ''}`));
    } else if (t === 'cache') {
      lines.push(`Key Pattern: ${s.keyPattern}, Structure: ${s.structure}, TTL: ${s.ttl}s`);
      (s.fields || []).forEach(f => lines.push(`  - ${f.name}: ${f.type}`));
    } else if (t === 'vector') {
      lines.push(`Collection: ${s.collection}, Dimensions: ${s.dimensions}, Distance: ${s.distance}`);
      lines.push('Payload:');
      (s.payload || []).forEach(p => lines.push(`  - ${p.name}: ${p.type}`));
    } else if (t === 'queue') {
      const queue = getQueueSchemaView(s);
      const qTopic = queue.topic || (queue.topics.length ? `${queue.topics.length} topics` : '—');
      const qPartitions = Number.isFinite(queue.partitions) ? queue.partitions : '—';
      const qReplication = Number.isFinite(queue.replication) ? queue.replication : '—';
      lines.push(`Topic: ${qTopic}, Partitions: ${qPartitions}, Replication: ${qReplication}, Retention: ${queue.retention || '—'}`);
      lines.push('Message Schema:');
      queue.msgSchema.forEach(f => lines.push(`  - ${f.name}: ${f.type}${f.required ? ' [required]' : ''}`));
    } else if (t === 'keyvalue') {
      lines.push(`Table: ${s.table}, Billing: ${s.billingMode}`);
      lines.push(`Partition Key: ${s.partitionKey?.name} (${s.partitionKey?.type})`);
      if (s.sortKey?.name) lines.push(`Sort Key: ${s.sortKey.name} (${s.sortKey.type})`);
      (s.attributes || []).forEach(a => lines.push(`  - ${a.name}: ${a.type}`));
    } else if (t === 'column') {
      lines.push(`Keyspace: ${s.keyspace}, Table: ${s.table}`);
      (s.columns || []).forEach(c => lines.push(`  - ${c.name}: ${c.type} [${c.role}]`));
    } else if (t === 'search') {
      const search = getSearchSchemaView(s);
      const sIndex = search.index || (search.indices.length ? `${search.indices.length} indices` : '—');
      const sShards = Number.isFinite(search.shards) ? search.shards : 1;
      const sReplicas = Number.isFinite(search.replicas) ? search.replicas : 0;
      lines.push(`Index: ${sIndex}, Shards: ${sShards}, Replicas: ${sReplicas}`);
      search.fields.forEach(f => lines.push(`  - ${f.name}: ${f.type}${f.analyzer ? ` analyzer=${f.analyzer}` : ''}`));
    } else if (t === 'tseries') {
      lines.push(`Measurement: ${s.measurement}, Retention: ${s.retention}`);
      lines.push(`Tags: ${(s.tags||[]).map(t=>t.name).join(', ')}`);
      (s.fields || []).forEach(f => lines.push(`  - ${f.name}: ${f.type}`));
    }
    lines.push('');
  });
  return lines.join('\n');
}

const EXPORT_TABS = [
  { id: 'sql', l: 'SQL DDL', gen: (nodes) => genSQL(nodes) },
  { id: 'prisma', l: 'Prisma', gen: (nodes) => genPrisma(nodes) },
  { id: 'typescript', l: 'TypeScript', gen: (nodes) => genTypeScript(nodes) },
  { id: 'go', l: 'Go Struct', gen: (nodes) => genGo(nodes) },
  { id: 'ai', l: '✦ AI Export', gen: (nodes) => genAI(nodes) },
  { id: 'json', l: '{ } JSON', gen: null }, // handled separately
];

export function Modals({ state }) {
  const { showExport, showLinter, showShortcuts, showTemplates, exportTab, rfNodes, rfEdges } = state;
  return (
    <>
      {showExport && <ExportModal nodes={rfNodes} edges={rfEdges} tab={exportTab} />}
      {showLinter && <LinterModal nodes={rfNodes} edges={rfEdges} />}
      {showShortcuts && <ShortcutsModal />}
      {showTemplates && <TemplatesModal />}
    </>
  );
}

function ModalShell({ title, icon, onClose, width = 680, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12, width, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon}
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--field-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          ><X size={16} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function ExportModal({ nodes, edges, tab }) {
  const [copied, setCopied] = useState(false);
  const [importErr, setImportErr] = useState('');
  const fileRef = useRef();
  const isJson = tab === 'json';
  const tabDef = EXPORT_TABS.find(t => t.id === tab) || EXPORT_TABS[0];
  const code = isJson
    ? JSON.stringify({ nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges }, null, 2)
    : tabDef.gen(nodes);

  const copy = () => navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  const download = () => {
    const blob = new Blob([code], { type: isJson ? 'application/json' : 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = isJson ? 'diagram.json' : `schema.${tab === 'sql' ? 'sql' : tab === 'prisma' ? 'prisma' : tab === 'go' ? 'go' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { nodes: n, edges: eg } = JSON.parse(ev.target.result);
        if (!Array.isArray(n)) throw new Error('Invalid format: missing nodes array');
        importDiagram(n, eg || []);
        setState({ showExport: false });
      } catch (err) {
        setImportErr(err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <ModalShell title="Export / Import" icon={<Upload size={16} color="var(--brand)" />} onClose={() => setState({ showExport: false })}>
      <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 2, alignItems: 'center' }}>
        {EXPORT_TABS.map(t => (
          <button key={t.id} onClick={() => setState({ exportTab: t.id })} style={{ background: 'none', border: 'none', color: tab === t.id ? 'var(--text-h)' : 'var(--muted)', padding: '6px 10px', fontSize: 11, borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`, cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400 }}>{t.l}</button>
        ))}
        <div style={{ flex: 1 }} />
        {isJson && <>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button onClick={() => fileRef.current.click()} style={{ background: 'var(--field-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={12} /> Import JSON
          </button>
        </>}
      </div>
      {importErr && <div style={{ margin: '8px 18px 0', background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: 5, padding: '5px 10px', fontSize: 11, color: '#B91C1C' }}>{importErr}</div>}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button onClick={download} style={{ background: 'var(--field-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={13} /> Download
          </button>
          <button onClick={copy} style={{ background: 'var(--field-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {copied ? <><CheckCheck size={13} color="#10B981" /> Copied!</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
        <pre style={{ background: 'var(--field-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 11, color: 'var(--text)', overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'var(--mono)', maxHeight: 400 }}>{code}</pre>
      </div>
    </ModalShell>
  );
}

function LinterModal({ nodes, edges }) {
  const issues = [];
  nodes.forEach(n => {
    const s = n.data.schema;
    if (n.data.dbType === 'sql') {
      const cols = s.columns || [];
      if (!cols.find(c => c.pk)) issues.push({ sev: 'error', node: n.data.name, msg: 'No primary key defined' });
      cols.filter(c => c.fk).forEach(c => { if (!c.index) issues.push({ sev: 'warn', node: n.data.name, msg: `FK "${c.name}" has no index` }); });
    }
    if (n.data.dbType === 'vector' && (!s.dimensions || s.dimensions < 1)) issues.push({ sev: 'error', node: n.data.name, msg: 'Dimensions must be > 0' });
    if (n.data.dbType === 'cache' && !s.ttl) issues.push({ sev: 'warn', node: n.data.name, msg: 'TTL is 0 — keys never expire' });
    if (nodes.length > 1 && !edges.find(e => e.source === n.id || e.target === n.id))
      issues.push({ sev: 'info', node: n.data.name, msg: 'Node has no connections' });
  });
  const errCount = issues.filter(i => i.sev === 'error').length;
  const byNode = {};
  issues.forEach(i => { if (!byNode[i.node]) byNode[i.node] = []; byNode[i.node].push(i); });
  return (
    <ModalShell title="Schema Linter" icon={<AlertTriangle size={16} color={errCount ? '#EF4444' : '#F59E0B'} />} onClose={() => setState({ showLinter: false })} width={480}>
      <div style={{ padding: 18 }}>
        {issues.length === 0
          ? <div style={{ background: '#ECFDF5', border: '1px solid #10B981', borderRadius: 6, padding: '8px 12px', color: '#065F46', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} color="#10B981" /> No issues found</div>
          : Object.entries(byNode).map(([node, iss]) => (
            <div key={node} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>{node}</div>
              {iss.map((i, idx) => (
                <div key={idx} style={{ background: i.sev==='error'?'#FEF2F2':i.sev==='warn'?'#FFFBEB':'color-mix(in srgb, var(--brand) 12%, #fff)', border: `1px solid ${i.sev==='error'?'#EF4444':i.sev==='warn'?'#F59E0B':'var(--brand)'}`, borderRadius: 5, padding: '5px 10px', marginBottom: 4, fontSize: 11, color: i.sev==='error'?'#B91C1C':i.sev==='warn'?'#92400E':'var(--brand)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i.sev==='error' ? <AlertTriangle size={12} /> : i.sev==='warn' ? <AlertTriangle size={12} /> : <Info size={12} />}
                  {i.msg}
                </div>
              ))}
            </div>
          ))
        }
      </div>
    </ModalShell>
  );
}

function ShortcutsModal() {
  const shortcuts = [
    ['Ctrl+Z','Undo'],
    ['Ctrl+Y','Redo'],
    ['Ctrl+C','Copy selected nodes'],
    ['Ctrl+V','Paste nodes'],
    ['Ctrl+K','Open quick node search'],
    ['Alt+Shift+L/C/R','Align left/center/right'],
    ['Alt+Shift+T/M/B','Align top/middle/bottom'],
    ['Alt+Shift+H/V','Distribute horizontal/vertical'],
    ['Alt+Shift+A','Auto-layout by connection depth'],
    ['Delete','Delete selected'],
    ['?','Toggle shortcuts'],
    ['ESC','Close modals and quick search'],
  ];
  return (
    <ModalShell title="Keyboard Shortcuts" icon={<Keyboard size={16} />} onClose={() => setState({ showShortcuts: false })} width={380}>
      <div style={{ padding: 18 }}>
        {shortcuts.map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <code style={{ background: 'var(--field-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 10, color: 'var(--text)' }}>{k}</code>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{v}</span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function TemplatesModal() {
  return (
    <ModalShell title="Templates" icon={<LayoutTemplate size={16} />} onClose={() => setState({ showTemplates: false })} width={560}>
      <div style={{ padding: 18 }}>
        {Object.entries(TEMPLATES).map(([name, tpl]) => {
          const nodes = tpl.nodes || tpl;
          const edgeCount = tpl.edges?.length || 0;
          return (
            <div key={name} onClick={() => loadTpl(tpl)}
              style={{ background: 'var(--field-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 10, cursor: 'pointer', transition: 'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 3 }}>{name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>{nodes.length} nodes · {edgeCount} connections</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {nodes.map((n, i) => {
                  const dbType = n.data?.dbType || n.type;
                  const c = DB[dbType]?.c || '#64748B';
                  return <span key={i} style={{ fontSize: 9, color: c, background: c + '18', padding: '1px 6px', borderRadius: 3 }}>{DB[dbType]?.i} {n.data?.name || n.name}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
