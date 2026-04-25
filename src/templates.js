import { uid, mkSchema } from './store';
import { DB } from './constants';
import { setState, getState, schedSave, snapshot } from './store';

function tNode(dbType, name, x, y, schemaOverride, color = null) {
  const def = DB[dbType];
  return {
    id: uid(), type: 'dbNode', position: { x, y },
    data: { dbType, name, engine: def.engines[0], schema: schemaOverride || mkSchema(dbType), color },
  };
}

function tEdge(srcNode, tgtNode, connType = 'ref', cardinality = '1:N', label = '') {
  return {
    id: uid(), source: srcNode.id, target: tgtNode.id,
    type: 'dbEdge', data: { connType, cardinality, label },
  };
}

// ── Large-scale E-Commerce Platform ───────────────────
// 22 nodes across SQL, document, cache, search, queue,
// time-series, vector, key-value, object-store, graph, column.

function buildEcommerce() {
  const users        = tNode('sql',      'users',            80,   60,  { engine: 'PostgreSQL', columns: [
    { id: uid(), name: 'id',           type: 'BIGSERIAL',    pk: true,  nullable: false, unique: true,  default: '',       fk: '', index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'email',        type: 'VARCHAR(255)', pk: false, nullable: false, unique: true,  default: '',       fk: '', index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'password_hash',type: 'TEXT',         pk: false, nullable: false, unique: false, default: '',       fk: '', index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'role',         type: 'ENUM',         pk: false, nullable: false, unique: false, default: 'customer', fk: '', index: true, indexType: 'btree', check: '', generated: '', enumValues: 'customer,seller,admin' },
    { id: uid(), name: 'created_at',   type: 'TIMESTAMPTZ',  pk: false, nullable: true,  unique: false, default: 'NOW()', fk: '', index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
  ]});

  const addresses    = tNode('sql',      'addresses',        80,  320,  { engine: 'PostgreSQL', columns: [
    { id: uid(), name: 'id',        type: 'BIGSERIAL',    pk: true,  nullable: false, unique: true,  default: '',   fk: '',        index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'user_id',   type: 'BIGINT',       pk: false, nullable: false, unique: false, default: '',   fk: 'users.id',index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'line1',     type: 'TEXT',         pk: false, nullable: false, unique: false, default: '',   fk: '',        index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'city',      type: 'VARCHAR(64)',  pk: false, nullable: false, unique: false, default: '',   fk: '',        index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'country',   type: 'CHAR(36)',     pk: false, nullable: false, unique: false, default: '',   fk: '',        index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'is_default',type: 'BOOLEAN',      pk: false, nullable: false, unique: false, default: 'false', fk: '',     index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
  ]});

  const products     = tNode('sql',      'products',         480,  60,  { engine: 'PostgreSQL', columns: [
    { id: uid(), name: 'id',          type: 'BIGSERIAL',    pk: true,  nullable: false, unique: true,  default: '',       fk: '',          index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'seller_id',   type: 'BIGINT',       pk: false, nullable: false, unique: false, default: '',       fk: 'users.id',  index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'sku',         type: 'VARCHAR(64)',  pk: false, nullable: false, unique: true,  default: '',       fk: '',          index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'name',        type: 'VARCHAR(255)', pk: false, nullable: false, unique: false, default: '',       fk: '',          index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'price',       type: 'DECIMAL(10,2)',pk: false, nullable: false, unique: false, default: '',       fk: '',          index: true,  indexType: 'btree', check: 'price > 0', generated: '', enumValues: '' },
    { id: uid(), name: 'stock',       type: 'INTEGER',      pk: false, nullable: false, unique: false, default: '0',      fk: '',          index: false, indexType: 'btree', check: 'stock >= 0', generated: '', enumValues: '' },
    { id: uid(), name: 'category_id', type: 'INTEGER',      pk: false, nullable: true,  unique: false, default: '',       fk: '',          index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'created_at',  type: 'TIMESTAMPTZ',  pk: false, nullable: true,  unique: false, default: 'NOW()', fk: '',          index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
  ]});

  const orders       = tNode('sql',      'orders',           280, 320,  { engine: 'PostgreSQL', columns: [
    { id: uid(), name: 'id',          type: 'BIGSERIAL',    pk: true,  nullable: false, unique: true,  default: '',       fk: '',             index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'user_id',     type: 'BIGINT',       pk: false, nullable: false, unique: false, default: '',       fk: 'users.id',     index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'address_id',  type: 'BIGINT',       pk: false, nullable: false, unique: false, default: '',       fk: 'addresses.id', index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'status',      type: 'ENUM',         pk: false, nullable: false, unique: false, default: 'pending', fk: '',            index: true,  indexType: 'btree', check: '', generated: '', enumValues: 'pending,confirmed,shipped,delivered,cancelled,refunded' },
    { id: uid(), name: 'total',       type: 'DECIMAL(10,2)',pk: false, nullable: false, unique: false, default: '',       fk: '',             index: false, indexType: 'btree', check: 'total >= 0', generated: '', enumValues: '' },
    { id: uid(), name: 'created_at',  type: 'TIMESTAMPTZ',  pk: false, nullable: true,  unique: false, default: 'NOW()', fk: '',             index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
  ]});

  const orderItems   = tNode('sql',      'order_items',      480, 320,  { engine: 'PostgreSQL', columns: [
    { id: uid(), name: 'id',         type: 'BIGSERIAL',    pk: true,  nullable: false, unique: true,  default: '', fk: '',            index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'order_id',   type: 'BIGINT',       pk: false, nullable: false, unique: false, default: '', fk: 'orders.id',   index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'product_id', type: 'BIGINT',       pk: false, nullable: false, unique: false, default: '', fk: 'products.id', index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'qty',        type: 'INTEGER',      pk: false, nullable: false, unique: false, default: '1', fk: '',           index: false, indexType: 'btree', check: 'qty > 0', generated: '', enumValues: '' },
    { id: uid(), name: 'unit_price', type: 'DECIMAL(10,2)',pk: false, nullable: false, unique: false, default: '', fk: '',            index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
  ]});

  const payments     = tNode('sql',      'payments',         280, 560,  { engine: 'PostgreSQL', columns: [
    { id: uid(), name: 'id',         type: 'BIGSERIAL',   pk: true,  nullable: false, unique: true,  default: '',       fk: '',          index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'order_id',   type: 'BIGINT',      pk: false, nullable: false, unique: false, default: '',       fk: 'orders.id', index: true,  indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'provider',   type: 'VARCHAR(64)', pk: false, nullable: false, unique: false, default: '',       fk: '',          index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'status',     type: 'ENUM',        pk: false, nullable: false, unique: false, default: 'pending', fk: '',         index: true,  indexType: 'btree', check: '', generated: '', enumValues: 'pending,captured,failed,refunded' },
    { id: uid(), name: 'amount',     type: 'DECIMAL(10,2)',pk: false,nullable: false, unique: false, default: '',       fk: '',          index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
    { id: uid(), name: 'paid_at',    type: 'TIMESTAMPTZ', pk: false, nullable: true,  unique: false, default: '',       fk: '',          index: false, indexType: 'btree', check: '', generated: '', enumValues: '' },
  ]});

  const sessionCache = tNode('cache',    'session_cache',    880,  60,  { engine: 'Redis', keyPattern: 'session:{user_id}:{token}', structure: 'hash', ttl: 86400, eviction: 'volatile-lru', persistence: 'RDB', cluster: true, pubsub: false, pipeline: false, fields: [
    { id: uid(), name: 'user_id',    type: 'integer',  serialization: 'raw' },
    { id: uid(), name: 'role',       type: 'string',   serialization: 'raw' },
    { id: uid(), name: 'cart_id',    type: 'string',   serialization: 'raw' },
    { id: uid(), name: 'expires_at', type: 'integer',  serialization: 'raw' },
  ]});

  const cartCache    = tNode('cache',    'cart_cache',       880, 280,  { engine: 'Redis', keyPattern: 'cart:{user_id}', structure: 'json', ttl: 3600, eviction: 'allkeys-lru', persistence: 'RDB', cluster: true, pubsub: false, pipeline: true, fields: [
    { id: uid(), name: 'items',      type: 'json',    serialization: 'json' },
    { id: uid(), name: 'coupon',     type: 'string',  serialization: 'raw'  },
    { id: uid(), name: 'updated_at', type: 'integer', serialization: 'raw'  },
  ]});

  const rateLimit    = tNode('cache',    'rate_limiter',     880, 480,  { engine: 'Redis', keyPattern: 'rl:{ip}:{endpoint}', structure: 'string', ttl: 60, eviction: 'volatile-ttl', persistence: 'None', cluster: false, pubsub: false, pipeline: false, fields: [] });

  const productSearch= tNode('search',   'product_search',   1180,  60, { engine: 'Elasticsearch', index: 'products', shards: 3, replicas: 1, refreshInterval: '1s', defaultAnalyzer: 'standard', dynamicMapping: false, sourceEnabled: true, fields: [
    { id: uid(), name: 'id',          type: 'keyword',      indexed: true,  stored: true, analyzer: '',          boost: 1, copyTo: '', nullValue: '' },
    { id: uid(), name: 'name',        type: 'text',         indexed: true,  stored: true, analyzer: 'standard',  boost: 3, copyTo: 'suggest', nullValue: '' },
    { id: uid(), name: 'description', type: 'text',         indexed: true,  stored: false,analyzer: 'english',   boost: 1, copyTo: '', nullValue: '' },
    { id: uid(), name: 'category',    type: 'keyword',      indexed: true,  stored: true, analyzer: '',          boost: 1, copyTo: '', nullValue: '' },
    { id: uid(), name: 'price',       type: 'float',        indexed: true,  stored: true, analyzer: '',          boost: 1, copyTo: '', nullValue: '' },
    { id: uid(), name: 'in_stock',    type: 'boolean',      indexed: true,  stored: true, analyzer: '',          boost: 1, copyTo: '', nullValue: '' },
    { id: uid(), name: 'suggest',     type: 'dense_vector', indexed: false, stored: false,analyzer: '',          boost: 1, copyTo: '', nullValue: '' },
  ]});

  const productEmbeds= tNode('vector',   'product_embeddings',1180, 320, { engine: 'Qdrant', collection: 'products', dimensions: 1536, distance: 'Cosine', quantization: 'Scalar', hnswM: 16, hnswEf: 128, hnswEfConstruct: 200, onDisk: false, namedVectors: false, payload: [
    { id: uid(), name: 'product_id', type: 'keyword',  filterable: true  },
    { id: uid(), name: 'category',   type: 'keyword',  filterable: true  },
    { id: uid(), name: 'price',      type: 'float',    filterable: true  },
    { id: uid(), name: 'in_stock',   type: 'boolean',  filterable: true  },
  ]});

  const reviewDoc    = tNode('document', 'reviews',          1180, 560, { engine: 'MongoDB', collection: 'reviews', writeConcern: 'majority', readConcern: 'local', capped: false, timeseries: false, changeStream: true, compoundIndexes: '[{"product_id":1,"created_at":-1}]', fields: [
    { id: uid(), name: '_id',        type: 'ObjectId', required: true,  unique: true,  indexed: true,  sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' },
    { id: uid(), name: 'product_id', type: 'Int64',    required: true,  unique: false, indexed: true,  sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' },
    { id: uid(), name: 'user_id',    type: 'Int64',    required: true,  unique: false, indexed: true,  sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' },
    { id: uid(), name: 'rating',     type: 'Number',   required: true,  unique: false, indexed: true,  sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' },
    { id: uid(), name: 'body',       type: 'String',   required: false, unique: false, indexed: false, sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' },
    { id: uid(), name: 'images',     type: 'Array<String>', required: false, unique: false, indexed: false, sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' },
    { id: uid(), name: 'created_at', type: 'Date',     required: true,  unique: false, indexed: true,  sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' },
  ]});

  const orderEvents  = tNode('queue',    'order_events',     80,  760,  { engine: 'Apache Kafka', topic: 'commerce.order.events', partitions: 6, replication: 3, retention: '7d', compression: 'snappy', msgFormat: 'Avro', consumerGroup: 'order-processor', dlqTopic: 'commerce.order.events.dlq', schema: [
    { id: uid(), name: 'event_id',   type: 'uuid',    required: true,  subFields: [] },
    { id: uid(), name: 'event_type', type: 'string',  required: true,  subFields: [] },
    { id: uid(), name: 'order_id',   type: 'long',    required: true,  subFields: [] },
    { id: uid(), name: 'user_id',    type: 'long',    required: true,  subFields: [] },
    { id: uid(), name: 'payload',    type: 'object',  required: false, subFields: [] },
    { id: uid(), name: 'timestamp',  type: 'long',    required: true,  subFields: [] },
  ]});

  const notifEvents  = tNode('queue',    'notification_events', 480, 760, { engine: 'Apache Kafka', topic: 'commerce.notifications', partitions: 3, replication: 3, retention: '3d', compression: 'snappy', msgFormat: 'JSON', consumerGroup: 'notif-service', dlqTopic: 'commerce.notifications.dlq', schema: [
    { id: uid(), name: 'user_id',    type: 'long',   required: true,  subFields: [] },
    { id: uid(), name: 'channel',    type: 'string', required: true,  subFields: [] },
    { id: uid(), name: 'template',   type: 'string', required: true,  subFields: [] },
    { id: uid(), name: 'data',       type: 'object', required: false, subFields: [] },
  ]});

  const inventoryEvents = tNode('queue', 'inventory_events', 880, 760, { engine: 'Apache Kafka', topic: 'commerce.inventory', partitions: 3, replication: 3, retention: '7d', compression: 'lz4', msgFormat: 'Avro', consumerGroup: 'inventory-service', dlqTopic: '', schema: [
    { id: uid(), name: 'product_id', type: 'long',    required: true,  subFields: [] },
    { id: uid(), name: 'delta',      type: 'integer', required: true,  subFields: [] },
    { id: uid(), name: 'reason',     type: 'string',  required: false, subFields: [] },
    { id: uid(), name: 'timestamp',  type: 'long',    required: true,  subFields: [] },
  ]});

  const metrics      = tNode('tseries',  'platform_metrics', 1180, 760, { engine: 'InfluxDB', measurement: 'platform', retention: '90d', precision: 'ms', downsampling: 'mean(1h)', continuousQuery: '', tags: [
    { id: uid(), name: 'service'  },
    { id: uid(), name: 'region'   },
    { id: uid(), name: 'env'      },
  ], fields: [
    { id: uid(), name: 'request_count', type: 'integer', aggregation: 'sum'  },
    { id: uid(), name: 'latency_ms',    type: 'float',   aggregation: 'mean' },
    { id: uid(), name: 'error_rate',    type: 'float',   aggregation: 'mean' },
    { id: uid(), name: 'revenue',       type: 'float',   aggregation: 'sum'  },
  ]});

  const userActivity = tNode('keyvalue', 'user_activity',    80,  980,  { engine: 'DynamoDB', table: 'user_activity', billingMode: 'PAY_PER_REQUEST', partitionKey: { name: 'user_id', type: 'String' }, sortKey: { name: 'timestamp', type: 'Number' }, ttlEnabled: true, ttlAttr: 'expires_at', streams: true, pitr: true, gsi: '[{"name":"activity_type_idx","pk":"activity_type","sk":"timestamp"}]', attributes: [
    { id: uid(), name: 'activity_type', type: 'String' },
    { id: uid(), name: 'resource_id',   type: 'String' },
    { id: uid(), name: 'metadata',      type: 'Map'    },
    { id: uid(), name: 'expires_at',    type: 'Number' },
  ]});

  const mediaStore   = tNode('objstore', 'media_store',      480, 980,  { engine: 'AWS S3', bucket: 'commerce-media', prefix: 'products/', storageClass: 'STANDARD', acl: 'public-read', encryption: 'SSE-S3', contentType: 'image/*', lifecycle: 'transition to INTELLIGENT_TIERING after 30d', versioning: true, cors: true, replication: true, publicAccess: true });

  const auditLog     = tNode('column',   'audit_log',        880, 980,  { engine: 'Cassandra', keyspace: 'commerce', table: 'audit_log', replication: 3, strategy: 'NetworkTopologyStrategy', compaction: 'TimeWindow', clusteringOrder: 'DESC', columns: [
    { id: uid(), name: 'entity_type', type: 'TEXT',      role: 'partition',   static: false, frozen: false },
    { id: uid(), name: 'entity_id',   type: 'BIGINT',    role: 'partition',   static: false, frozen: false },
    { id: uid(), name: 'occurred_at', type: 'TIMESTAMP', role: 'clustering',  static: false, frozen: false },
    { id: uid(), name: 'actor_id',    type: 'BIGINT',    role: 'regular',     static: false, frozen: false },
    { id: uid(), name: 'action',      type: 'TEXT',      role: 'regular',     static: false, frozen: false },
    { id: uid(), name: 'diff',        type: 'TEXT',      role: 'regular',     static: false, frozen: false },
  ]});

  const socialGraph  = tNode('graph',    'social_graph',     1180, 980, { engine: 'Neo4j', entityType: 'Node', labels: ['User'], constraints: 'UNIQUE(id)', properties: [
    { id: uid(), name: 'id',           type: 'Integer', required: true,  indexed: true,  unique: true  },
    { id: uid(), name: 'username',     type: 'String',  required: true,  indexed: true,  unique: true  },
    { id: uid(), name: 'follower_count',type: 'Integer',required: false, indexed: false, unique: false },
  ]});

  const nodes = [
    users, addresses, products, orders, orderItems, payments,
    sessionCache, cartCache, rateLimit,
    productSearch, productEmbeds, reviewDoc,
    orderEvents, notifEvents, inventoryEvents,
    metrics, userActivity, mediaStore, auditLog, socialGraph,
  ];

  const edges = [
    tEdge(users,     addresses,     'ref',  '1:N', 'user_id'),
    tEdge(users,     orders,        'ref',  '1:N', 'user_id'),
    tEdge(products,  orders,        'ref',  'N:M', 'via order_items'),
    tEdge(orders,    orderItems,    'ref',  '1:N', 'order_id'),
    tEdge(products,  orderItems,    'ref',  '1:N', 'product_id'),
    tEdge(orders,    payments,      'ref',  '1:1', 'order_id'),
    tEdge(users,     sessionCache,  'cache','1:1', 'session'),
    tEdge(users,     cartCache,     'cache','1:1', 'cart'),
    tEdge(products,  productSearch, 'sync', '1:1', 'index sync'),
    tEdge(products,  productEmbeds, 'sync', '1:1', 'embed sync'),
    tEdge(products,  reviewDoc,     'ref',  '1:N', 'product_id'),
    tEdge(users,     reviewDoc,     'ref',  '1:N', 'user_id'),
    tEdge(orders,    orderEvents,   'event','1:N', 'status change'),
    tEdge(orderEvents, notifEvents, 'event','1:1', 'fan-out'),
    tEdge(orderEvents, inventoryEvents,'event','1:1','stock delta'),
    tEdge(users,     userActivity,  'ref',  '1:N', 'activity'),
    tEdge(products,  mediaStore,    'ref',  '1:N', 'images'),
    tEdge(orders,    auditLog,      'ref',  '1:N', 'audit'),
    tEdge(users,     socialGraph,   'sync', '1:1', 'user node'),
  ];

  return { nodes, edges };
}

export const TEMPLATES = {
  'E-Commerce Platform': buildEcommerce(),
};

export function loadTemplate({ nodes, edges }) {
  const idMap = {};
  const newNodes = nodes.map(n => {
    const newId = uid();
    idMap[n.id] = newId;
    return { ...n, id: newId, data: { ...n.data, schema: JSON.parse(JSON.stringify(n.data.schema)) } };
  });
  const newEdges = (edges || []).map(e => ({
    ...e, id: uid(),
    source: idMap[e.source] || e.source,
    target: idMap[e.target] || e.target,
  }));
  snapshot();
  setState({ rfNodes: [...getState().rfNodes, ...newNodes], rfEdges: [...getState().rfEdges, ...newEdges], showTemplates: false });
  schedSave();
}
