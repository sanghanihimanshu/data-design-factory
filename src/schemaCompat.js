function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function getQueueSchemaView(schema = {}) {
  const s = asObject(schema);
  const topics = asArray(s.topics).map(asObject);
  const primary = topics[0] || {};

  return {
    topics,
    topic: asString(s.topic ?? primary.name, ''),
    partitions: asNumber(s.partitions ?? primary.partitions),
    replication: asNumber(s.replication ?? primary.replication),
    retention: asString(s.retention ?? primary.retention, ''),
    msgSchema: asArray(s.schema),
  };
}

export function getSearchSchemaView(schema = {}) {
  const s = asObject(schema);
  const indices = asArray(s.indices).map(asObject);
  const primary = indices[0] || {};
  const primaryFields = asArray(primary.fields);
  const fields = asArray(s.fields);

  return {
    indices,
    index: asString(s.index ?? primary.name, ''),
    shards: asNumber(s.shards ?? primary.shards),
    replicas: asNumber(s.replicas ?? primary.replicas),
    fields: fields.length ? fields : primaryFields,
  };
}

export function getObjStoreSchemaView(schema = {}) {
  const s = asObject(schema);
  const buckets = asArray(s.buckets).map(asObject);
  const primary = buckets[0] || {};

  return {
    buckets,
    bucket: asString(s.bucket ?? primary.name, ''),
    prefix: asString(s.prefix, ''),
    storageClass: asString(s.storageClass, ''),
    encryption: asString(s.encryption, ''),
    acl: asString(s.acl ?? primary.access, ''),
    lifecycle: asString(s.lifecycle ?? primary.lifecycle, ''),
    versioning: Boolean(s.versioning ?? primary.versioning),
  };
}
