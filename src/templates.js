import { uid, mkSchema } from './store';
import { DB } from './constants';
import { setState, getState, schedSave, snapshot } from './store';

function tNode(dbType, name, x, y, schemaOverride) {
  const def = DB[dbType];
  return {
    id: uid(), type: 'dbNode', position: { x, y },
    data: { dbType, name, engine: def.engines[0], schema: schemaOverride || mkSchema(dbType), color: null },
  };
}

export const TEMPLATES = {
  'E-Commerce Stack': [
    tNode('sql', 'users', 50, 80),
    tNode('sql', 'products', 400, 80),
    tNode('sql', 'orders', 220, 280),
    tNode('cache', 'session_cache', 50, 360),
    tNode('search', 'product_search', 600, 280),
    tNode('queue', 'order_events', 220, 520),
  ],
  'Auth Microservice': [
    tNode('sql', 'users', 80, 80),
    tNode('sql', 'sessions', 440, 80),
    tNode('cache', 'token_cache', 80, 320),
    tNode('cache', 'rate_limiter', 440, 320),
    tNode('document', 'audit_log', 260, 500),
  ],
  'AI / RAG Pipeline': [
    tNode('document', 'raw_documents', 60, 80),
    tNode('queue', 'ingestion_queue', 390, 80),
    tNode('vector', 'embeddings', 60, 340),
    tNode('cache', 'response_cache', 390, 340),
    tNode('tseries', 'usage_metrics', 220, 560),
  ],
};

export function loadTemplate(tpl) {
  const newNodes = tpl.map(n => ({ ...n, id: uid(), data: { ...n.data, schema: JSON.parse(JSON.stringify(n.data.schema)) } }));
  snapshot();
  setState({ rfNodes: [...getState().rfNodes, ...newNodes], showTemplates: false });
  schedSave();
}
