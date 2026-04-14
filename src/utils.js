import { DB, NW } from './constants';

let _c = 0;
export const uid = () => `n${(++_c).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function nodeH(n) {
  const s = n.schema; let rows = 2;
  switch (n.type) {
    case 'sql': rows = (s.columns || []).length; break;
    case 'document': rows = (s.fields || []).length + 1; break;
    case 'graph': rows = (s.properties || []).length + 2; break;
    case 'cache': rows = 3 + (s.fields || []).length; break;
    case 'objstore': rows = 5; break;
    case 'search': rows = (s.fields || []).length + 2; break;
    case 'tseries': rows = (s.tags || []).length + (s.fields || []).length + 2; break;
    case 'vector': rows = (s.payload || []).length + 3; break;
    case 'column': rows = (s.columns || []).length + 1; break;
    case 'queue': rows = (s.schema || []).length + 3; break;
    case 'keyvalue': rows = (s.attributes || []).length + 4; break;
    case 'ledger': rows = (s.fields || []).length + 2; break;
  }
  return 40 + rows * 22 + 8;
}

export function bezier(x1, y1, x2, y2) {
  const d = Math.max(Math.abs(x2 - x1) * 0.5, 60);
  return `M${x1},${y1}C${x1 + d},${y1} ${x2 - d},${y2} ${x2},${y2}`;
}

export function toScreen(x, y, vp) {
  return { sx: x * vp.s + vp.x, sy: y * vp.s + vp.y };
}

export function snapN(v, snapGrid, gridSize) {
  return snapGrid ? Math.round(v / gridSize) * gridSize : v;
}

export function mkSchema(type) {
  switch (type) {
    case 'sql': return { engine: 'PostgreSQL', columns: [{ id: uid(), name: 'id', type: 'BIGSERIAL', pk: true, nullable: false, unique: true, default: '', fk: '', index: false }, { id: uid(), name: 'created_at', type: 'TIMESTAMPTZ', pk: false, nullable: true, unique: false, default: 'NOW()', fk: '', index: true }] };
    case 'document': return { engine: 'MongoDB', collection: 'my_collection', fields: [{ id: uid(), name: '_id', type: 'ObjectId', required: true, unique: true, indexed: true }, { id: uid(), name: 'createdAt', type: 'Date', required: false, unique: false, indexed: false }] };
    case 'graph': return { engine: 'Neo4j', entityType: 'Node', labels: ['Entity'], properties: [{ id: uid(), name: 'id', type: 'String', required: true, indexed: true }, { id: uid(), name: 'name', type: 'String', required: false, indexed: false }] };
    case 'cache': return { engine: 'Redis', keyPattern: 'app:{resource}:{id}', structure: 'hash', ttl: 3600, fields: [{ id: uid(), name: 'field1', type: 'string' }, { id: uid(), name: 'updated_at', type: 'integer' }] };
    case 'objstore': return { engine: 'AWS S3', bucket: 'my-bucket', prefix: '', storageClass: 'STANDARD', encryption: 'SSE-S3', acl: 'private', versioning: false, cors: false };
    case 'search': return { engine: 'Elasticsearch', index: 'my_index', shards: 1, replicas: 0, fields: [{ id: uid(), name: 'id', type: 'keyword', indexed: true, stored: true, analyzer: '' }, { id: uid(), name: 'title', type: 'text', indexed: true, stored: true, analyzer: 'standard' }] };
    case 'tseries': return { engine: 'InfluxDB', measurement: 'my_metric', retention: '30d', precision: 'ns', tags: [{ id: uid(), name: 'host' }, { id: uid(), name: 'region' }], fields: [{ id: uid(), name: 'value', type: 'float' }, { id: uid(), name: 'count', type: 'integer' }] };
    case 'vector': return { engine: 'Qdrant', collection: 'embeddings', dimensions: 1536, distance: 'Cosine', quantization: 'None', onDisk: false, payload: [{ id: uid(), name: 'text', type: 'text' }, { id: uid(), name: 'source', type: 'keyword' }] };
    case 'column': return { engine: 'Cassandra', keyspace: 'my_keyspace', table: 'my_table', replication: 3, strategy: 'SimpleStrategy', columns: [{ id: uid(), name: 'pk', type: 'UUID', role: 'partition', static: false }, { id: uid(), name: 'created_at', type: 'TIMESTAMP', role: 'clustering', static: false }, { id: uid(), name: 'data', type: 'TEXT', role: 'regular', static: false }] };
    case 'queue': return { engine: 'Apache Kafka', topic: 'my.events', partitions: 3, replication: 1, retention: '7d', compression: 'snappy', schema: [{ id: uid(), name: 'event_type', type: 'string', required: true }, { id: uid(), name: 'timestamp', type: 'long', required: true }, { id: uid(), name: 'payload', type: 'object', required: false }] };
    case 'keyvalue': return { engine: 'DynamoDB', table: 'my_table', billingMode: 'PAY_PER_REQUEST', partitionKey: { name: 'pk', type: 'String' }, sortKey: { name: 'sk', type: 'String' }, ttlEnabled: false, ttlAttr: 'ttl', attributes: [{ id: uid(), name: 'data', type: 'Map' }, { id: uid(), name: 'status', type: 'String' }] };
    case 'ledger': return { engine: 'QLDB', ledger: 'my-ledger', table: 'my_table', permissions: 'ALLOW_ALL', fields: [{ id: uid(), name: 'id', type: 'String' }, { id: uid(), name: 'data', type: 'IonStruct' }, { id: uid(), name: 'metadata', type: 'IonStruct' }] };
    default: return {};
  }
}

export function lintSchema(nodes, conns) {
  const issues = [];
  nodes.forEach(n => {
    const s = n.schema;
    switch (n.type) {
      case 'sql': {
        const cols = s.columns || [];
        if (!cols.find(c => c.pk)) issues.push({ sev: 'error', node: n.name, msg: 'No primary key defined' });
        cols.filter(c => c.fk).forEach(c => { if (!c.index) issues.push({ sev: 'warn', node: n.name, msg: `FK column "${c.name}" has no index` }); });
        const dupNames = cols.filter((c, i) => cols.findIndex(x => x.name === c.name) !== i);
        dupNames.forEach(c => issues.push({ sev: 'error', node: n.name, msg: `Duplicate column name: "${c.name}"` }));
        if (cols.some(c => c.name === 'id' && !c.pk)) issues.push({ sev: 'warn', node: n.name, msg: '"id" column exists but is not set as PK' });
        break;
      }
      case 'document': {
        if (!(s.fields || []).find(f => f.name === '_id')) issues.push({ sev: 'warn', node: n.name, msg: 'No _id field — consider adding ObjectId _id' });
        break;
      }
      case 'vector': {
        if (!s.dimensions || s.dimensions < 1) issues.push({ sev: 'error', node: n.name, msg: 'Dimensions must be > 0' });
        if (s.dimensions > 4096) issues.push({ sev: 'warn', node: n.name, msg: `Large dimensions (${s.dimensions}) — may impact performance` });
        break;
      }
      case 'cache': {
        if (!s.keyPattern) issues.push({ sev: 'warn', node: n.name, msg: 'No key pattern defined' });
        if (!s.ttl || s.ttl === 0) issues.push({ sev: 'warn', node: n.name, msg: 'TTL is 0 — keys will never expire' });
        break;
      }
      case 'queue': {
        if (!s.partitions || s.partitions < 1) issues.push({ sev: 'error', node: n.name, msg: 'Partitions must be >= 1' });
        if (s.replication > s.partitions) issues.push({ sev: 'warn', node: n.name, msg: 'Replication factor > partition count' });
        break;
      }
      case 'column': {
        if (!(s.columns || []).find(c => c.role === 'partition')) issues.push({ sev: 'error', node: n.name, msg: 'No partition key defined' });
        break;
      }
      case 'keyvalue': {
        if (!s.partitionKey?.name) issues.push({ sev: 'error', node: n.name, msg: 'No partition key defined' });
        break;
      }
    }
    const nameField = (s.columns || s.fields || s.properties || s.payload || s.schema || s.attributes || []);
    nameField.forEach(f => {
      if (f.name && f.name !== f.name.toLowerCase() && n.type !== 'graph')
        issues.push({ sev: 'info', node: n.name, msg: `Field "${f.name}" uses mixed case — consider snake_case` });
    });
  });
  nodes.forEach(n => {
    if (nodes.length > 1 && !conns.find(c => c.f === n.id || c.t === n.id))
      issues.push({ sev: 'info', node: n.name, msg: 'Node has no connections — is it isolated?' });
  });
  return issues;
}

export function genSQL(nodes) {
  const sqls = nodes.filter(n => n.type === 'sql');
  if (!sqls.length) return '-- No SQL tables in diagram\n';
  return sqls.map(n => {
    const s = n.schema, cols = s.columns || [];
    const colDefs = cols.map(c => {
      let def = `  ${c.name.padEnd(24)} ${c.type}`;
      if (c.pk) def += ' PRIMARY KEY';
      else if (!c.nullable) def += ' NOT NULL';
      if (c.unique && !c.pk) def += ' UNIQUE';
      if (c.default) def += ` DEFAULT ${c.default}`;
      return def;
    }).join(',\n');
    const fkDefs = cols.filter(c => c.fk).map(c => {
      const [rt, rc] = c.fk.split('.');
      return `  CONSTRAINT fk_${n.name}_${c.name} FOREIGN KEY (${c.name}) REFERENCES ${rt}(${rc || 'id'})`;
    });
    const indexes = cols.filter(c => c.index && !c.pk).map(c => `CREATE INDEX idx_${n.name}_${c.name} ON ${n.name}(${c.name});`);
    const allDefs = [colDefs, ...fkDefs].join(',\n');
    return `-- Table: ${n.name} [${s.engine}]\nCREATE TABLE ${n.name} (\n${allDefs}\n);\n${indexes.join('\n')}${indexes.length ? '\n' : ''}`;
  }).join('\n');
}

export function genPrisma(nodes) {
  const sqls = nodes.filter(n => n.type === 'sql');
  const docs = nodes.filter(n => n.type === 'document');
  const typeMap = { 'BIGSERIAL': 'Int @default(autoincrement())', 'SERIAL': 'Int @default(autoincrement())', 'BIGINT': 'BigInt', 'INT': 'Int', 'INTEGER': 'Int', 'SMALLINT': 'Int', 'BOOLEAN': 'Boolean', 'FLOAT': 'Float', 'DOUBLE PRECISION': 'Float', 'DECIMAL(10,2)': 'Decimal', 'TEXT': 'String', 'VARCHAR(255)': 'String', 'VARCHAR(64)': 'String', 'UUID': 'String @default(uuid())', 'DATE': 'DateTime', 'TIMESTAMP': 'DateTime', 'TIMESTAMPTZ': 'DateTime', 'JSONB': 'Json', 'JSON': 'Json' };
  let out = '// Prisma Schema — Generated by Data Design Factory\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n';
  sqls.forEach(n => {
    const s = n.schema, cols = s.columns || [];
    out += `model ${n.name.charAt(0).toUpperCase() + n.name.slice(1)} {\n`;
    cols.forEach(c => {
      const pt = typeMap[c.type] || 'String';
      const nl = !c.nullable || c.pk ? '' : ' ?';
      out += `  ${c.name.padEnd(20)} ${pt}${nl}${c.pk ? ' @id' : ''}${c.unique && !c.pk ? ' @unique' : ''}\n`;
    });
    const idxCols = cols.filter(c => c.index && !c.pk);
    if (idxCols.length) out += `\n  @@index([${idxCols.map(c => c.name).join(', ')}])\n`;
    out += '}\n\n';
  });
  docs.forEach(n => {
    const s = n.schema;
    out += `// MongoDB collection: ${s.collection}\ntype ${n.name.charAt(0).toUpperCase() + n.name.slice(1)} {\n`;
    (s.fields || []).forEach(f => out += `  ${f.name.padEnd(20)} ${f.type}${f.required ? '' : ' ?'}\n`);
    out += '}\n\n';
  });
  return out;
}

export function genMongoose(nodes) {
  const docs = nodes.filter(n => n.type === 'document');
  if (!docs.length) return '// No Document DB nodes in diagram\n';
  const typeMap = { 'String': 'String', 'Number': 'Number', 'Boolean': 'Boolean', 'Date': 'Date', 'ObjectId': 'mongoose.Schema.Types.ObjectId', 'Object': 'Object', 'Array': 'Array', 'UUID': 'String' };
  return docs.map(n => {
    const s = n.schema, fields = s.fields || [];
    const fieldDefs = fields.filter(f => f.name !== '_id').map(f => {
      const t = typeMap[f.type] || 'mongoose.Schema.Types.Mixed';
      const opts = [`type: ${t}`, f.required ? 'required: true' : null, f.unique ? 'unique: true' : null, f.indexed ? 'index: true' : null].filter(Boolean);
      return `  ${f.name}: { ${opts.join(', ')} }`;
    }).join(',\n');
    const idxFields = fields.filter(f => f.indexed && f.name !== '_id');
    return `// Collection: ${s.collection}\nconst ${n.name}Schema = new mongoose.Schema({\n${fieldDefs}\n}, { timestamps: true });\n\n${idxFields.length ? idxFields.map(f => `${n.name}Schema.index({ ${f.name}: 1 });`).join('\n') + '\n\n' : ''}export const ${n.name.charAt(0).toUpperCase() + n.name.slice(1)} = mongoose.model('${n.name.charAt(0).toUpperCase() + n.name.slice(1)}', ${n.name}Schema);`;
  }).join('\n\n');
}

export function genTypeScript(nodes) {
  const typeMap = { 'BIGSERIAL': 'number', 'SERIAL': 'number', 'BIGINT': 'bigint', 'INT': 'number', 'INTEGER': 'number', 'SMALLINT': 'number', 'BOOLEAN': 'boolean', 'FLOAT': 'number', 'DOUBLE PRECISION': 'number', 'DECIMAL(10,2)': 'number', 'VARCHAR(255)': 'string', 'VARCHAR(64)': 'string', 'TEXT': 'string', 'UUID': 'string', 'DATE': 'Date', 'TIMESTAMP': 'Date', 'TIMESTAMPTZ': 'Date', 'JSONB': 'Record<string, unknown>', 'JSON': 'Record<string, unknown>', 'ARRAY': 'unknown[]', 'INET': 'string', 'String': 'string', 'Number': 'number', 'Int32': 'number', 'Int64': 'bigint', 'Boolean': 'boolean', 'ObjectId': 'string', 'Date': 'Date', 'Array': 'unknown[]', 'Object': 'Record<string, unknown>', 'Map': 'Record<string, unknown>' };
  return nodes.map(n => {
    const s = n.schema; const def = DB[n.type];
    let fields = [];
    switch (n.type) {
      case 'sql': fields = (s.columns || []).map(c => ({ name: c.name, type: typeMap[c.type] || 'unknown', optional: c.nullable && !c.pk })); break;
      case 'document': fields = (s.fields || []).map(f => ({ name: f.name, type: typeMap[f.type] || 'unknown', optional: !f.required })); break;
      case 'graph': fields = (s.properties || []).map(p => ({ name: p.name, type: typeMap[p.type] || 'unknown', optional: !p.required })); break;
      case 'cache': fields = (s.fields || []).map(f => ({ name: f.name, type: typeMap[f.type] || 'string', optional: false })); break;
      case 'keyvalue': fields = [{ name: s.partitionKey?.name || 'pk', type: 'string', optional: false }, { name: s.sortKey?.name || 'sk', type: 'string', optional: false }, ...(s.attributes || []).map(a => ({ name: a.name, type: typeMap[a.type] || 'unknown', optional: true }))]; break;
      case 'vector': fields = (s.payload || []).map(p => ({ name: p.name, type: typeMap[p.type] || 'unknown', optional: true })); fields.unshift({ name: 'vector', type: 'number[]', optional: false }); break;
      case 'tseries': fields = [...(s.tags || []).map(t => ({ name: t.name, type: 'string', optional: false })), ...(s.fields || []).map(f => ({ name: f.name, type: f.type === 'float' || f.type === 'integer' || f.type === 'unsigned' ? 'number' : 'unknown', optional: false }))]; fields.unshift({ name: 'timestamp', type: 'Date', optional: false }); break;
      case 'queue': fields = (s.schema || []).map(f => ({ name: f.name, type: typeMap[f.type] || 'unknown', optional: !f.required })); break;
      default: fields = [];
    }
    const iName = n.name.charAt(0).toUpperCase() + n.name.slice(1);
    const body = fields.map(f => `  ${f.name}${f.optional ? '?' : ''}: ${f.type};`).join('\n');
    return `// ${def.l}: ${n.name}\nexport interface ${iName} {\n${body || '  [key: string]: unknown;'}\n}`;
  }).join('\n\n');
}

export function genCQL(nodes) {
  const cols = nodes.filter(n => n.type === 'column');
  if (!cols.length) return '-- No Column Store nodes in diagram\n';
  return cols.map(n => {
    const s = n.schema, columns = s.columns || [];
    const partitionKeys = columns.filter(c => c.role === 'partition');
    const clusterKeys = columns.filter(c => c.role === 'clustering');
    const allCols = columns.map(c => `  ${c.name.padEnd(24)} ${c.type}${c.static ? ' STATIC' : ''}`).join(',\n');
    const pk = `PRIMARY KEY ((${partitionKeys.map(c => c.name).join(', ')})${clusterKeys.length ? ', ' + clusterKeys.map(c => c.name).join(', ') : ''})`;
    return `CREATE KEYSPACE IF NOT EXISTS ${s.keyspace}\n  WITH replication = {'class': '${s.strategy}', 'replication_factor': ${s.replication}};\n\nCREATE TABLE IF NOT EXISTS ${s.keyspace}.${s.table} (\n${allCols},\n  ${pk}\n);\n`;
  }).join('\n');
}

export function genAvro(nodes) {
  const queues = nodes.filter(n => n.type === 'queue');
  if (!queues.length) return '// No Queue/Stream nodes in diagram\n';
  const typeMap = { 'string': 'string', 'integer': 'int', 'long': 'long', 'float': 'float', 'boolean': 'boolean', 'object': 'record', 'array': 'array', 'bytes': 'bytes', 'uuid': 'string', 'null': 'null' };
  return queues.map(n => {
    const s = n.schema;
    const fields = (s.schema || []).map(f => `    {"name": "${f.name}", "type": "${f.required ? typeMap[f.type] || 'string' : ['null', typeMap[f.type] || 'string']}", "default": ${f.required ? '""' : 'null'}}`);
    return `// Avro Schema: ${s.topic}\n{\n  "type": "record",\n  "name": "${n.name.charAt(0).toUpperCase() + n.name.slice(1)}Event",\n  "namespace": "com.company.events",\n  "fields": [\n${fields.join(',\n')}\n  ]\n}`;
  }).join('\n\n');
}

export function genElastic(nodes) {
  const srch = nodes.filter(n => n.type === 'search');
  if (!srch.length) return '// No Search Index nodes in diagram\n';
  return srch.map(n => {
    const s = n.schema, fields = s.fields || [];
    const props = fields.map(f => {
      let def = `    "${f.name}": { "type": "${f.type}"`;
      if (f.analyzer) def += `, "analyzer": "${f.analyzer}"`;
      if (!f.indexed) def += `, "index": false`;
      if (f.stored) def += `, "store": true`;
      def += ' }';
      return def;
    }).join(',\n');
    return `// PUT /${s.index}\n{\n  "settings": {\n    "number_of_shards": ${s.shards},\n    "number_of_replicas": ${s.replicas}\n  },\n  "mappings": {\n    "properties": {\n${props}\n    }\n  }\n}`;
  }).join('\n\n');
}
