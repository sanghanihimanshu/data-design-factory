export const NODE_WIDTH = 320;

// Brand color
export const BRAND = '#4ba6a6'; // wfflow brand

// ── SQL ───────────────────────────────────────────────
export const SQL_TYPES = [
  'BIGSERIAL','SERIAL','BIGINT','INT','INTEGER','SMALLINT','BOOLEAN',
  'FLOAT','DOUBLE PRECISION','DECIMAL(10,2)','NUMERIC',
  'VARCHAR(255)','VARCHAR(64)','TEXT','CHAR(36)',
  'UUID','DATE','TIMESTAMP','TIMESTAMPTZ','TIME','INTERVAL',
  'JSONB','JSON','BYTEA','INET','CIDR','ARRAY','TSVECTOR','POINT',
  'ENUM','ENUM(custom)','SMALLINT[]','INT[]','TEXT[]','UUID[]',
  'JSONB[]','RECORD','COMPOSITE','HSTORE','LTREE','XML',
];

// ── DOCUMENT ──────────────────────────────────────────
export const BSON_T = [
  'ObjectId','String','Number','Int32','Int64','Double','Decimal128',
  'Boolean','Date','Timestamp','BinData',
  'Object','Array','Array<Object>','Array<String>','Array<Number>',
  'Array<ObjectId>','Array<Boolean>','Array<Date>','Array<Int32>',
  'Array<Int64>','Array<Double>','Array<Decimal128>','Array<Mixed>',
  'Null','UUID','Regex','Mixed','Map','Enum',
];

// ── SEARCH ────────────────────────────────────────────
export const ES_T = [
  'keyword','text','integer','long','float','double','boolean','date',
  'geo_point','nested','object','binary','dense_vector','range','ip',
  'completion','percolator','flattened','join','rank_feature',
];

// ── CASSANDRA ─────────────────────────────────────────
export const CASS_T = [
  'UUID','TIMEUUID','TEXT','VARCHAR','INT','BIGINT','FLOAT','DOUBLE',
  'DECIMAL','BOOLEAN','DATE','TIMESTAMP','BLOB',
  'LIST<TEXT>','LIST<INT>','LIST<UUID>',
  'MAP<TEXT,TEXT>','MAP<TEXT,INT>','MAP<UUID,TEXT>',
  'SET<TEXT>','SET<INT>','SET<UUID>',
  'COUNTER','DURATION','INET','TUPLE','FROZEN<LIST<TEXT>>',
];

// ── KEY-VALUE ─────────────────────────────────────────
export const KV_T = [
  'String','Number','Binary','Boolean',
  'List','Map','StringSet','NumberSet','BinarySet','Null',
  'JSON','Any',
];

// ── CONNECTION TYPES ──────────────────────────────────
export const CONN_TYPES = [
  { id: 'fk',            l: 'Foreign Key',     c: '#4ba6a6', card: ['1:1','1:N','N:M'] },
  { id: 'ref',           l: 'Reference',       c: '#6f8f83', card: ['1:1','1:N','N:M'] },
  { id: 'cache',         l: 'Cache-Aside',     c: '#c79a3b', card: [] },
  { id: 'write_through', l: 'Write-Through',   c: '#5f9f6f', card: [] },
  { id: 'write_back',    l: 'Write-Back',      c: '#84b48d', card: [] },
  { id: 'pub_sub',       l: 'Pub/Sub',         c: '#3e9b8d', card: [] },
  { id: 'stores',        l: 'Stores In',       c: '#b56c8a', card: [] },
  { id: 'indexes',       l: 'Indexes',         c: '#7fa9a0', card: [] },
  { id: 'feeds',         l: 'Feeds',           c: '#b46868', card: [] },
  { id: 'reads',         l: 'Reads From',      c: '#8a6faf', card: [] },
  { id: 'writes',        l: 'Writes To',       c: '#7d9c57', card: [] },
  { id: 'embeds',        l: 'Embeds',          c: '#a97c5a', card: [] },
  { id: 'replicates',    l: 'Replicates To',   c: '#7a7f85', card: [] },
  { id: 'triggers',      l: 'Triggers',        c: '#9b6f84', card: [] },
  { id: 'syncs',         l: 'Syncs With',      c: '#4f8d7f', card: [] },
  { id: 'streams',       l: 'Streams To',      c: '#b48b62', card: [] },
];

// ── DB DEFINITIONS ────────────────────────────────────
export const DB = {
  sql:      { l: 'SQL Table',      c: '#4ba6a6', bg: '#eaf7f7', i: '▦', engines: ['PostgreSQL','MySQL','SQLite','MariaDB','MSSQL','CockroachDB','Aurora','Supabase'] },
  document: { l: 'Document DB',   c: '#5f9f6f', bg: '#edf8ef', i: '{}', engines: ['MongoDB','CouchDB','Firebase','FaunaDB','RethinkDB','DocumentDB','Firestore'] },
  graph:    { l: 'Graph DB',       c: '#8a6faf', bg: '#f5f1fa', i: '◎', engines: ['Neo4j','ArangoDB','Amazon Neptune','TigerGraph','JanusGraph','Dgraph','SurrealDB'] },
  cache:    { l: 'Cache',          c: '#c79a3b', bg: '#fdf8ea', i: '⚡', engines: ['Redis','Memcached','Valkey','KeyDB','DragonflyDB','Hazelcast','Infinispan'] },
  objstore: { l: 'Object Storage', c: '#b56c8a', bg: '#f9f1f5', i: '☁', engines: ['AWS S3','MinIO','GCS','Azure Blob','Cloudflare R2','Backblaze B2','Wasabi'] },
  search:   { l: 'Search Index',   c: '#6a9b8e', bg: '#eef7f5', i: '⌕', engines: ['Elasticsearch','OpenSearch','Typesense','Meilisearch','Algolia','Solr','Sphinx'] },
  tseries:  { l: 'Time Series',    c: '#b46868', bg: '#f9f0f0', i: '↗', engines: ['InfluxDB','TimescaleDB','Prometheus','QuestDB','VictoriaMetrics','OpenTSDB','TDengine'] },
  vector:   { l: 'Vector DB',      c: '#8d7a9f', bg: '#f5f2f8', i: '∿', engines: ['Qdrant','Pinecone','Weaviate','Chroma','Milvus','pgvector','Faiss','Vespa'] },
  column:   { l: 'Column Store',   c: '#a97c5a', bg: '#f8f3ef', i: '≡', engines: ['Cassandra','ClickHouse','ScyllaDB','HBase','BigTable','Redshift','Snowflake'] },
  queue:    { l: 'Queue / Stream', c: '#3e9b8d', bg: '#ebf7f5', i: '⇒', engines: ['Apache Kafka','RabbitMQ','NATS','Pulsar','AWS SQS','AWS Kinesis','Azure SB','Redis Streams'] },
  keyvalue: { l: 'Key-Value',      c: '#7d9c57', bg: '#f2f8ea', i: '⊟', engines: ['DynamoDB','etcd','Aerospike','Couchbase','Riak','BadgerDB','LMDB','RocksDB'] },
  ledger:   { l: 'Ledger',         c: '#7a7f85', bg: '#f3f4f6', i: '📒', engines: ['QLDB','Hyperledger Fabric','IOTA','Hedera Hashgraph','Sawtooth'] },
};

// ── DARK THEME OVERRIDES ──────────────────────────────
export const DB_DARK = {
  sql:      { bg: '#163838' },
  document: { bg: '#1a3320' },
  graph:    { bg: '#2a2236' },
  cache:    { bg: '#3a301a' },
  objstore: { bg: '#3a2631' },
  search:   { bg: '#1c3430' },
  tseries:  { bg: '#3b2424' },
  vector:   { bg: '#2b2434' },
  column:   { bg: '#382a21' },
  queue:    { bg: '#183833' },
  keyvalue: { bg: '#293723' },
  ledger:   { bg: '#23272d' },
};
