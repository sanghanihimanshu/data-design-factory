import { SqlEditor, DocumentEditor } from './SchemaEditorPart1';
import { GraphEditor, CacheEditor, ObjStoreEditor, SearchEditor, ColumnEditor } from './SchemaEditorPart2';
import { TimeSeriesEditor, VectorEditor, QueueEditor, KeyValueEditor, LedgerEditor } from './SchemaEditorPart3';

export function SchemaEditor({ n }) {
  switch (n.type) {
    case 'sql': return <SqlEditor n={n} />;
    case 'document': return <DocumentEditor n={n} />;
    case 'graph': return <GraphEditor n={n} />;
    case 'cache': return <CacheEditor n={n} />;
    case 'objstore': return <ObjStoreEditor n={n} />;
    case 'search': return <SearchEditor n={n} />;
    case 'tseries': return <TimeSeriesEditor n={n} />;
    case 'vector': return <VectorEditor n={n} />;
    case 'column': return <ColumnEditor n={n} />;
    case 'queue': return <QueueEditor n={n} />;
    case 'keyvalue': return <KeyValueEditor n={n} />;
    case 'ledger': return <LedgerEditor n={n} />;
    default: return null;
  }
}
