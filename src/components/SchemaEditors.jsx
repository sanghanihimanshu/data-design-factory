import { uid } from '../store';
import { updateSchema } from '../store';
import { SQL_TYPES, BSON_T, DB } from '../constants';
import { SubFieldEditor, EnumEditor } from './SubFieldEditor';
import { useDragReorder } from '../useDragReorder';

const snap = () => {};

function sel(color) {
  return { background: 'var(--input-bg)', border: '1px solid var(--border)', color, borderRadius: 4, padding: '3px 4px', fontSize: 10, width: 110, flexShrink: 0 };
}

const handle = <span style={{ color: 'var(--muted)', fontSize: 12, cursor: 'grab', marginRight: 2, flexShrink: 0, userSelect: 'none' }} title="Drag to reorder">⠿</span>;

function reorder(arr, from, to) {
  const a = [...arr];
  a.splice(to, 0, a.splice(from, 1)[0]);
  return a;
}

export function SqlEditor({ n }) {
  const s = n.data.schema;
  const u = p => updateSchema(n.id, p);
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ columns: reorder(s.columns, from, to) }));

  return (
    <div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine || 'PostgreSQL'} onChange={e => u({ engine: e.target.value })}>
            {DB.sql.engines.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Columns</span>
        <button className="addbtn" onClick={() => u({ columns: [...s.columns, { id: uid(), name: 'new_col', type: 'TEXT', pk: false, nullable: true, unique: false, default: '', fk: '', index: false, indexType: 'btree', check: '', generated: '', enumValues: '' }] })}>+ Column</button>
      </div>
      {(s.columns || []).map((c, i) => (
        <div key={c.id} className="field-row" {...dragProps(i)}>
          <div className="row">
            {handle}
            <input className="inp" value={c.name} onChange={e => u({ columns: uF(s.columns, c.id, { name: e.target.value }) })} style={{ flex: 1, minWidth: 0 }} />
            <select style={sel(def.c)} value={c.type} onChange={e => u({ columns: uF(s.columns, c.id, { type: e.target.value }) })}>
              {SQL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={() => u({ columns: dF(s.columns, c.id) })}>✕</button>
          </div>
          {(c.type === 'ENUM' || c.type === 'ENUM(custom)') && (
            <EnumEditor values={c.enumValues || ''} onChange={v => u({ columns: uF(s.columns, c.id, { enumValues: v }) })} />
          )}
          <div className="cb-row">
            {[['pk','PK','#F59E0B'],['nullable','NULL','#94A3B8'],['unique','UNIQUE','#3B82F6'],['index','IDX','#06B6D4']].map(([k,l,col]) => (
              <label key={k} className="cb-lbl">
                <input type="checkbox" checked={!!c[k]} onChange={e => u({ columns: uF(s.columns, c.id, { [k]: e.target.checked }) })} />
                <span style={{ color: c[k] ? col : 'var(--muted)' }}>{l}</span>
              </label>
            ))}
            {c.index && (
              <select className="inp" value={c.indexType || 'btree'} onChange={e => u({ columns: uF(s.columns, c.id, { indexType: e.target.value }) })} style={{ fontSize: 9, height: 18, padding: '0 3px' }}>
                {['btree','hash','gin','gist','brin','spgist'].map(t => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>
          <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
            <input className="inp" value={c.default || ''} placeholder="default" onChange={e => u({ columns: uF(s.columns, c.id, { default: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
            <input className="inp" value={c.fk || ''} placeholder="table.col (FK)" onChange={e => u({ columns: uF(s.columns, c.id, { fk: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
          </div>
          <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
            <input className="inp" value={c.check || ''} placeholder="CHECK expr (e.g. age > 0)" onChange={e => u({ columns: uF(s.columns, c.id, { check: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
            <input className="inp" value={c.generated || ''} placeholder="GENERATED AS expr" onChange={e => u({ columns: uF(s.columns, c.id, { generated: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentEditor({ n }) {
  const s = n.data.schema;
  const u = p => updateSchema(n.id, p);
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ fields: reorder(s.fields, from, to) }));

  return (
    <div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine || 'MongoDB'} onChange={e => u({ engine: e.target.value })}>
            {DB.document.engines.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}><span className="lbl">Collection</span>
          <input className="inp" value={s.collection || ''} onChange={e => u({ collection: e.target.value })} />
        </div>
      </div>
      <div className="irow" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1 }}><span className="lbl">Write Concern</span>
          <select className="inp" value={s.writeConcern || 'majority'} onChange={e => u({ writeConcern: e.target.value })}>
            {['majority','1','2','0','w3'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}><span className="lbl">Read Concern</span>
          <select className="inp" value={s.readConcern || 'local'} onChange={e => u({ readConcern: e.target.value })}>
            {['local','majority','linearizable','snapshot','available'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="cb-row" style={{ marginBottom: 8 }}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.capped} onChange={e => u({ capped: e.target.checked })} /><span style={{ color: s.capped ? '#F59E0B' : 'var(--muted)' }}>Capped</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.timeseries} onChange={e => u({ timeseries: e.target.checked })} /><span style={{ color: s.timeseries ? '#06B6D4' : 'var(--muted)' }}>Time Series</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.changeStream} onChange={e => u({ changeStream: e.target.checked })} /><span style={{ color: s.changeStream ? '#8B5CF6' : 'var(--muted)' }}>Change Stream</span></label>
      </div>
      {s.capped && (
        <div className="row" style={{ marginBottom: 8 }}>
          <div style={{ flex: 1 }}><span className="lbl">Max Size (bytes)</span><input className="inp" type="number" value={s.cappedSize || 1048576} onChange={e => u({ cappedSize: Number(e.target.value) })} /></div>
          <div style={{ flex: 1 }}><span className="lbl">Max Docs</span><input className="inp" type="number" value={s.cappedMax || 1000} onChange={e => u({ cappedMax: Number(e.target.value) })} /></div>
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <span className="lbl">Compound Indexes (JSON)</span>
        <input className="inp" value={s.compoundIndexes || ''} placeholder='[{"name":1,"email":1}]' onChange={e => u({ compoundIndexes: e.target.value })} style={{ fontSize: 10 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...s.fields, { id: uid(), name: 'field', type: 'String', required: false, unique: false, indexed: false, sparse: false, ttlIndex: false, ttlSeconds: 0, subFields: [], enumValues: '' }] })}>+ Field</button>
      </div>
      {(s.fields || []).map((f, i) => (
        <div key={f.id} className="field-row" {...dragProps(i)}>
          <div className="row">
            {handle}
            <input className="inp" value={f.name} onChange={e => u({ fields: uF(s.fields, f.id, { name: e.target.value }) })} style={{ flex: 1, minWidth: 0 }} />
            <select style={sel(def.c)} value={f.type} onChange={e => u({ fields: uF(s.fields, f.id, { type: e.target.value }) })}>
              {BSON_T.map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={() => u({ fields: dF(s.fields, f.id) })}>✕</button>
          </div>
          {f.type === 'Enum' && (
            <EnumEditor values={f.enumValues || ''} onChange={v => u({ fields: uF(s.fields, f.id, { enumValues: v }) })} />
          )}
          {(f.type === 'Object' || f.type === 'Array<Object>' || f.type === 'Array') && (
            <div style={{ marginTop: 6 }}>
              <span className="lbl">Sub-fields</span>
              <SubFieldEditor fields={f.subFields || []} onChange={sf => u({ fields: uF(s.fields, f.id, { subFields: sf }) })} depth={1} dbType="document" />
            </div>
          )}
          <div className="cb-row">
            {[['required','REQ','#EF4444'],['unique','UNIQ','#3B82F6'],['indexed','IDX','#06B6D4'],['sparse','SPARSE','#8B5CF6'],['ttlIndex','TTL','#F59E0B']].map(([k,l,col]) => (
              <label key={k} className="cb-lbl">
                <input type="checkbox" checked={!!f[k]} onChange={e => u({ fields: uF(s.fields, f.id, { [k]: e.target.checked }) })} />
                <span style={{ color: f[k] ? col : 'var(--muted)' }}>{l}</span>
              </label>
            ))}
          </div>
          <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
            {f.indexed && (
              <select className="inp" value={f.indexType || '1'} onChange={e => u({ fields: uF(s.fields, f.id, { indexType: e.target.value }) })} style={{ fontSize: 10, width: 100, flexShrink: 0 }}>
                {[['1','ASC (1)'],['−1','DESC (−1)'],['text','text'],['2dsphere','2dsphere'],['hashed','hashed'],['wildcard','wildcard']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            {f.ttlIndex && (
              <input className="inp" type="number" value={f.ttlSeconds || 0} placeholder="TTL seconds" onChange={e => u({ fields: uF(s.fields, f.id, { ttlSeconds: Number(e.target.value) }) })} style={{ width: 100, fontSize: 10, flexShrink: 0 }} />
            )}
            <input className="inp" value={f.default || ''} placeholder="default" onChange={e => u({ fields: uF(s.fields, f.id, { default: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

import { ES_T, CASS_T, KV_T } from '../constants';

export function GraphEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF = (a,id,p) => a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  const dragProps = useDragReorder((from, to) => u({ properties: reorder(s.properties, from, to) }));
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'Neo4j'} onChange={e=>u({engine:e.target.value})}>
            {DB.graph.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Entity Type</span>
          <select className="inp" value={s.entityType} onChange={e=>u({entityType:e.target.value})}>
            {['Node','Relationship'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {s.entityType === 'Relationship' && (
        <div className="irow">
          <div style={{flex:1}}><span className="lbl">Direction</span>
            <select className="inp" value={s.direction||'OUTGOING'} onChange={e=>u({direction:e.target.value})}>
              {['OUTGOING','INCOMING','UNDIRECTED'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{flex:1}}><span className="lbl">Rel Type</span>
            <input className="inp" value={s.relType||''} placeholder="KNOWS, FOLLOWS…" onChange={e=>u({relType:e.target.value})}/>
          </div>
        </div>
      )}
      <div style={{marginBottom:8}}><span className="lbl">Labels (comma-sep)</span>
        <input className="inp" value={(s.labels||[]).join(', ')} onChange={e=>u({labels:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} />
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Constraints</span>
        <input className="inp" value={s.constraints||''} placeholder="UNIQUE(name), NODE KEY(id,email)…" onChange={e=>u({constraints:e.target.value})} style={{fontSize:10}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Properties</span>
        <button className="addbtn" onClick={()=>u({properties:[...s.properties,{id:uid(),name:'prop',type:'String',required:false,indexed:false,unique:false}]})}>+ Property</button>
      </div>
      {(s.properties||[]).map((p,i)=>(
        <div key={p.id} className="field-row" {...dragProps(i)}>
          <div className="row">
            {handle}
            <input className="inp" value={p.name} onChange={e=>u({properties:uF(s.properties,p.id,{name:e.target.value})})} style={{flex:1}}/>
            <select className="inp" value={p.type} onChange={e=>u({properties:uF(s.properties,p.id,{type:e.target.value})})} style={{width:90,flexShrink:0}}>
              {['String','Integer','Float','Boolean','Date','DateTime','List','Point','Duration','ByteArray'].map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={()=>u({properties:dF(s.properties,p.id)})}>✕</button>
          </div>
          <div className="cb-row">
            {[['required','REQ','#EF4444'],['unique','UNIQ','#3B82F6'],['indexed','IDX','#06B6D4']].map(([k,l,col])=>(
              <label key={k} className="cb-lbl"><input type="checkbox" checked={!!p[k]} onChange={e=>u({properties:uF(s.properties,p.id,{[k]:e.target.checked})})}/><span style={{color:p[k]?col:'var(--muted)'}}>{l}</span></label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CacheEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  return (
    <div>
      <div className="irow" style={{marginBottom:8}}>
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'Redis'} onChange={e=>u({engine:e.target.value})}>
            {DB.cache.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Key Pattern</span><input className="inp" value={s.keyPattern||''} onChange={e=>u({keyPattern:e.target.value})}/></div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Structure</span>
          <select className="inp" value={s.structure} onChange={e=>u({structure:e.target.value})}>
            {['string','hash','list','set','zset','stream','json','bitmap','hyperloglog','geo'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{width:80,flexShrink:0}}><span className="lbl">TTL (s)</span><input className="inp" type="number" value={s.ttl||3600} onChange={e=>u({ttl:Number(e.target.value)})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Eviction</span>
          <select className="inp" value={s.eviction||'allkeys-lru'} onChange={e=>u({eviction:e.target.value})}>
            {['noeviction','allkeys-lru','allkeys-lfu','allkeys-random','volatile-lru','volatile-lfu','volatile-random','volatile-ttl'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Persistence</span>
          <select className="inp" value={s.persistence||'RDB'} onChange={e=>u({persistence:e.target.value})}>
            {['RDB','AOF','RDB+AOF','None'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="cb-row" style={{marginBottom:8}}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.cluster} onChange={e=>u({cluster:e.target.checked})}/><span style={{color:s.cluster?'#06B6D4':'var(--muted)'}}>Cluster</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.pubsub} onChange={e=>u({pubsub:e.target.checked})}/><span style={{color:s.pubsub?'#8B5CF6':'var(--muted)'}}>Pub/Sub</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.pipeline} onChange={e=>u({pipeline:e.target.checked})}/><span style={{color:s.pipeline?'#F59E0B':'var(--muted)'}}>Pipeline</span></label>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Fields</span>
        <button className="addbtn" onClick={()=>u({fields:[...(s.fields||[]),{id:uid(),name:'field',type:'string',serialization:'raw'}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map(f=>(
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={f.type} onChange={e=>u({fields:uF(s.fields||[],f.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
            {['string','integer','float','boolean','binary','json','object','list','set'].map(t=><option key={t}>{t}</option>)}
          </select>
          <select className="inp" value={f.serialization||'raw'} onChange={e=>u({fields:uF(s.fields||[],f.id,{serialization:e.target.value})})} style={{width:60,fontSize:9,flexShrink:0}}>
            {['raw','json','msgpack','protobuf'].map(t=><option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={()=>u({fields:dF(s.fields||[],f.id)})}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function ObjStoreEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  return (
    <div>
      <div className="irow" style={{marginBottom:8}}>
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'AWS S3'} onChange={e=>u({engine:e.target.value})}>
            {DB.objstore.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Bucket</span><input className="inp" value={s.bucket||''} onChange={e=>u({bucket:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Key Prefix</span><input className="inp" value={s.prefix||''} onChange={e=>u({prefix:e.target.value})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Storage Class</span>
          <select className="inp" value={s.storageClass} onChange={e=>u({storageClass:e.target.value})}>
            {['STANDARD','INTELLIGENT_TIERING','STANDARD_IA','ONEZONE_IA','GLACIER','GLACIER_IR','DEEP_ARCHIVE','REDUCED_REDUNDANCY'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">ACL</span>
          <select className="inp" value={s.acl||'private'} onChange={e=>u({acl:e.target.value})}>
            {['private','public-read','public-read-write','authenticated-read','bucket-owner-read','bucket-owner-full-control'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Encryption</span>
          <select className="inp" value={s.encryption} onChange={e=>u({encryption:e.target.value})}>
            {['SSE-S3','SSE-KMS','SSE-C','DSSE-KMS','None'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Content-Type</span>
          <input className="inp" value={s.contentType||''} placeholder="application/json" onChange={e=>u({contentType:e.target.value})}/>
        </div>
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Lifecycle Rule</span>
        <input className="inp" value={s.lifecycle||''} placeholder="transition to GLACIER after 90d" onChange={e=>u({lifecycle:e.target.value})} style={{fontSize:10}}/>
      </div>
      <div className="cb-row">
        <label className="cb-lbl"><input type="checkbox" checked={!!s.versioning} onChange={e=>u({versioning:e.target.checked})}/><span style={{color:s.versioning?'#06B6D4':'var(--muted)'}}>Versioning</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.cors} onChange={e=>u({cors:e.target.checked})}/><span style={{color:s.cors?'#3B82F6':'var(--muted)'}}>CORS</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.replication} onChange={e=>u({replication:e.target.checked})}/><span style={{color:s.replication?'#8B5CF6':'var(--muted)'}}>Replication</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.publicAccess} onChange={e=>u({publicAccess:e.target.checked})}/><span style={{color:s.publicAccess?'#EF4444':'var(--muted)'}}>Public</span></label>
      </div>
    </div>
  );
}

export function SearchEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ fields: reorder(s.fields, from, to) }));
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'Elasticsearch'} onChange={e=>u({engine:e.target.value})}>
            {DB.search.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:2}}><span className="lbl">Index</span><input className="inp" value={s.index||''} onChange={e=>u({index:e.target.value})}/></div>
        <div style={{width:50,flexShrink:0}}><span className="lbl">Shards</span><input className="inp" type="number" value={s.shards||1} onChange={e=>u({shards:Number(e.target.value)})}/></div>
        <div style={{width:50,flexShrink:0}}><span className="lbl">Repls</span><input className="inp" type="number" value={s.replicas??0} onChange={e=>u({replicas:Number(e.target.value)})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Refresh Interval</span><input className="inp" value={s.refreshInterval||'1s'} onChange={e=>u({refreshInterval:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Default Analyzer</span><input className="inp" value={s.defaultAnalyzer||'standard'} onChange={e=>u({defaultAnalyzer:e.target.value})}/></div>
      </div>
      <div className="cb-row" style={{marginBottom:8}}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.dynamicMapping} onChange={e=>u({dynamicMapping:e.target.checked})}/><span style={{color:s.dynamicMapping?'#06B6D4':'var(--muted)'}}>Dynamic Mapping</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.sourceEnabled} onChange={e=>u({sourceEnabled:e.target.checked})}/><span style={{color:s.sourceEnabled?'#3B82F6':'var(--muted)'}}> _source</span></label>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Mappings</span>
        <button className="addbtn" onClick={()=>u({fields:[...s.fields,{id:uid(),name:'field',type:'keyword',indexed:true,stored:true,analyzer:'',boost:1,copyTo:'',nullValue:''}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map((f,i)=>(
        <div key={f.id} className="field-row" {...dragProps(i)}>
          <div className="row">
            {handle}
            <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields,f.id,{name:e.target.value})})} style={{flex:1}}/>
            <select style={sel(def.c)} value={f.type} onChange={e=>u({fields:uF(s.fields,f.id,{type:e.target.value})})}>
              {ES_T.map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={()=>u({fields:dF(s.fields,f.id)})}>✕</button>
          </div>
          <div className="row" style={{marginTop:4,gap:4}}>
            <input className="inp" value={f.analyzer||''} placeholder="analyzer" onChange={e=>u({fields:uF(s.fields,f.id,{analyzer:e.target.value})})} style={{flex:1,fontSize:10}}/>
            <input className="inp" value={f.copyTo||''} placeholder="copy_to" onChange={e=>u({fields:uF(s.fields,f.id,{copyTo:e.target.value})})} style={{flex:1,fontSize:10}}/>
            <input className="inp" type="number" value={f.boost||1} placeholder="boost" onChange={e=>u({fields:uF(s.fields,f.id,{boost:Number(e.target.value)})})} style={{width:50,fontSize:10,flexShrink:0}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimeSeriesEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'InfluxDB'} onChange={e=>u({engine:e.target.value})}>
            {DB.tseries.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Measurement</span><input className="inp" value={s.measurement||''} onChange={e=>u({measurement:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Retention</span><input className="inp" value={s.retention||'30d'} onChange={e=>u({retention:e.target.value})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Precision</span>
          <select className="inp" value={s.precision||'ns'} onChange={e=>u({precision:e.target.value})}>
            {['ns','us','ms','s'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Downsampling</span>
          <input className="inp" value={s.downsampling||''} placeholder="mean(1h), max(1d)…" onChange={e=>u({downsampling:e.target.value})} style={{fontSize:10}}/>
        </div>
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Continuous Query</span>
        <input className="inp" value={s.continuousQuery||''} placeholder="SELECT mean(value) INTO … GROUP BY time(1h)" onChange={e=>u({continuousQuery:e.target.value})} style={{fontSize:10}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
        <span className="lbl" style={{margin:0,color:'#F59E0B'}}>Tags</span>
        <button className="addbtn" onClick={()=>u({tags:[...(s.tags||[]),{id:uid(),name:'tag'}]})}>+ Tag</button>
      </div>
      {(s.tags||[]).map(t=>(
        <div key={t.id} className="row">
          <input className="inp" value={t.name} onChange={e=>u({tags:uF(s.tags||[],t.id,{name:e.target.value})})} style={{flex:1}}/>
          <button className="delbtn" onClick={()=>u({tags:dF(s.tags||[],t.id)})}>✕</button>
        </div>
      ))}
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,marginTop:8}}>
        <span className="lbl" style={{margin:0}}>Fields</span>
        <button className="addbtn" onClick={()=>u({fields:[...(s.fields||[]),{id:uid(),name:'field',type:'float',aggregation:'mean'}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map(f=>(
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={f.type} onChange={e=>u({fields:uF(s.fields||[],f.id,{type:e.target.value})})} style={{width:70,flexShrink:0}}>
            {['float','integer','unsigned','boolean','string'].map(t=><option key={t}>{t}</option>)}
          </select>
          <select className="inp" value={f.aggregation||'mean'} onChange={e=>u({fields:uF(s.fields||[],f.id,{aggregation:e.target.value})})} style={{width:60,fontSize:9,flexShrink:0}}>
            {['mean','sum','max','min','count','last','first','stddev'].map(t=><option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={()=>u({fields:dF(s.fields||[],f.id)})}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function VectorEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  return (
    <div>
      <div className="irow" style={{marginBottom:8}}>
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'Qdrant'} onChange={e=>u({engine:e.target.value})}>
            {DB.vector.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Collection</span><input className="inp" value={s.collection||''} onChange={e=>u({collection:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Dimensions</span><input className="inp" type="number" value={s.dimensions||1536} onChange={e=>u({dimensions:Number(e.target.value)})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Distance</span>
          <select className="inp" value={s.distance} onChange={e=>u({distance:e.target.value})}>
            {['Cosine','Euclid','Dot','Manhattan'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Quantization</span>
          <select className="inp" value={s.quantization||'None'} onChange={e=>u({quantization:e.target.value})}>
            {['None','Scalar','Product','Binary'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">HNSW m</span><input className="inp" type="number" value={s.hnswM||16} onChange={e=>u({hnswM:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">HNSW ef</span><input className="inp" type="number" value={s.hnswEf||100} onChange={e=>u({hnswEf:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">ef_construct</span><input className="inp" type="number" value={s.hnswEfConstruct||200} onChange={e=>u({hnswEfConstruct:Number(e.target.value)})}/></div>
      </div>
      <div className="cb-row" style={{marginBottom:8}}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.onDisk} onChange={e=>u({onDisk:e.target.checked})}/><span style={{color:s.onDisk?'#F59E0B':'var(--muted)'}}>On-Disk</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.namedVectors} onChange={e=>u({namedVectors:e.target.checked})}/><span style={{color:s.namedVectors?'#8B5CF6':'var(--muted)'}}>Named Vectors</span></label>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Payload</span>
        <button className="addbtn" onClick={()=>u({payload:[...(s.payload||[]),{id:uid(),name:'field',type:'text',filterable:false}]})}>+ Field</button>
      </div>
      {(s.payload||[]).map(p=>(
        <div key={p.id} className="row">
          <input className="inp" value={p.name} onChange={e=>u({payload:uF(s.payload||[],p.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={p.type} onChange={e=>u({payload:uF(s.payload||[],p.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
            {['text','keyword','integer','float','boolean','datetime','uuid','geo','json'].map(t=><option key={t}>{t}</option>)}
          </select>
          <label className="cb-lbl"><input type="checkbox" checked={!!p.filterable} onChange={e=>u({payload:uF(s.payload||[],p.id,{filterable:e.target.checked})})}/><span style={{color:p.filterable?'#06B6D4':'var(--muted)',fontSize:9}}>Filter</span></label>
          <button className="delbtn" onClick={()=>u({payload:dF(s.payload||[],p.id)})}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function ColumnEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  const def = DB[n.data.dbType];
  const dragProps = useDragReorder((from, to) => u({ columns: reorder(s.columns, from, to) }));
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'Cassandra'} onChange={e=>u({engine:e.target.value})}>
            {DB.column.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Keyspace</span><input className="inp" value={s.keyspace||''} onChange={e=>u({keyspace:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Table</span><input className="inp" value={s.table||''} onChange={e=>u({table:e.target.value})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Replication</span><input className="inp" type="number" value={s.replication||3} onChange={e=>u({replication:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">Strategy</span>
          <select className="inp" value={s.strategy||'SimpleStrategy'} onChange={e=>u({strategy:e.target.value})}>
            {['SimpleStrategy','NetworkTopologyStrategy','LocalStrategy'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Compaction</span>
          <select className="inp" value={s.compaction||'SizeTiered'} onChange={e=>u({compaction:e.target.value})}>
            {['SizeTiered','Leveled','TimeWindow','TWCS','DTCS'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Clustering Order</span>
          <select className="inp" value={s.clusteringOrder||'ASC'} onChange={e=>u({clusteringOrder:e.target.value})}>
            {['ASC','DESC'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Columns</span>
        <button className="addbtn" onClick={()=>u({columns:[...s.columns,{id:uid(),name:'col',type:'TEXT',role:'regular',static:false}]})}>+ Column</button>
      </div>
      {(s.columns||[]).map((c,i)=>(
        <div key={c.id} className="field-row" {...dragProps(i)}>
          <div className="row">
            {handle}
            <input className="inp" value={c.name} onChange={e=>u({columns:uF(s.columns,c.id,{name:e.target.value})})} style={{flex:1}}/>
            <select style={sel(def.c)} value={c.type} onChange={e=>u({columns:uF(s.columns,c.id,{type:e.target.value})})}>
              {CASS_T.map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={()=>u({columns:dF(s.columns,c.id)})}>✕</button>
          </div>
          <div className="row" style={{marginTop:4,gap:4}}>
            <select className="inp" value={c.role} onChange={e=>u({columns:uF(s.columns,c.id,{role:e.target.value})})} style={{flex:1,fontSize:10}}>
              <option value="partition">PARTITION KEY</option>
              <option value="clustering">CLUSTERING KEY</option>
              <option value="regular">REGULAR</option>
            </select>
            <label className="cb-lbl"><input type="checkbox" checked={!!c.static} onChange={e=>u({columns:uF(s.columns,c.id,{static:e.target.checked})})}/><span style={{color:c.static?'#8B5CF6':'var(--muted)',fontSize:10}}>STATIC</span></label>
            <label className="cb-lbl"><input type="checkbox" checked={!!c.frozen} onChange={e=>u({columns:uF(s.columns,c.id,{frozen:e.target.checked})})}/><span style={{color:c.frozen?'#06B6D4':'var(--muted)',fontSize:10}}>FROZEN</span></label>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QueueEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  const dragProps = useDragReorder((from, to) => u({ schema: reorder(s.schema || [], from, to) }));
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'Apache Kafka'} onChange={e=>u({engine:e.target.value})}>
            {DB.queue.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Topic</span><input className="inp" value={s.topic||''} onChange={e=>u({topic:e.target.value})}/></div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Partitions</span><input className="inp" type="number" value={s.partitions||3} onChange={e=>u({partitions:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">Replication</span><input className="inp" type="number" value={s.replication||1} onChange={e=>u({replication:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">Retention</span><input className="inp" value={s.retention||'7d'} onChange={e=>u({retention:e.target.value})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Compression</span>
          <select className="inp" value={s.compression||'snappy'} onChange={e=>u({compression:e.target.value})}>
            {['none','gzip','snappy','lz4','zstd'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Msg Format</span>
          <select className="inp" value={s.msgFormat||'JSON'} onChange={e=>u({msgFormat:e.target.value})}>
            {['JSON','Avro','Protobuf','MessagePack','Thrift','Raw'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Consumer Group</span><input className="inp" value={s.consumerGroup||''} placeholder="my-consumer-group" onChange={e=>u({consumerGroup:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">DLQ Topic</span><input className="inp" value={s.dlqTopic||''} placeholder="topic.dlq" onChange={e=>u({dlqTopic:e.target.value})}/></div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Message Schema</span>
        <button className="addbtn" onClick={()=>u({schema:[...(s.schema||[]),{id:uid(),name:'field',type:'string',required:false,subFields:[]}]})}>+ Field</button>
      </div>
      {(s.schema||[]).map((f,i)=>(
        <div key={f.id} className="field-row" {...dragProps(i)}>
          <div className="row">
            {handle}
            <input className="inp" value={f.name} onChange={e=>u({schema:uF(s.schema||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
            <select className="inp" value={f.type} onChange={e=>u({schema:uF(s.schema||[],f.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
              {['string','integer','long','float','double','boolean','object','array','bytes','uuid','null','json'].map(t=><option key={t}>{t}</option>)}
            </select>
            <label className="cb-lbl"><input type="checkbox" checked={!!f.required} onChange={e=>u({schema:uF(s.schema||[],f.id,{required:e.target.checked})})}/><span style={{fontSize:10}}>R</span></label>
            <button className="delbtn" onClick={()=>u({schema:dF(s.schema||[],f.id)})}>✕</button>
          </div>
          {(f.type==='object'||f.type==='array') && (
            <SubFieldEditor fields={f.subFields||[]} onChange={sf=>u({schema:uF(s.schema||[],f.id,{subFields:sf})})} depth={1} dbType="queue"/>
          )}
        </div>
      ))}
    </div>
  );
}

export function KeyValueEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  const def = DB[n.data.dbType];
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'DynamoDB'} onChange={e=>u({engine:e.target.value})}>
            {DB.keyvalue.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Table</span><input className="inp" value={s.table||''} onChange={e=>u({table:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Billing</span>
          <select className="inp" value={s.billingMode} onChange={e=>u({billingMode:e.target.value})}>
            <option>PAY_PER_REQUEST</option><option>PROVISIONED</option>
          </select>
        </div>
      </div>
      <div style={{background:'var(--field-bg)',border:`1px solid ${def.c}33`,borderRadius:5,padding:7,marginBottom:7}}>
        <span className="lbl" style={{color:def.c}}>Partition Key</span>
        <div className="row">
          <input className="inp" value={s.partitionKey?.name||'pk'} onChange={e=>u({partitionKey:{...s.partitionKey,name:e.target.value}})} style={{flex:1}}/>
          <select className="inp" value={s.partitionKey?.type} onChange={e=>u({partitionKey:{...s.partitionKey,type:e.target.value}})} style={{width:80,flexShrink:0}}>
            {['String','Number','Binary'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <span className="lbl" style={{color:def.c,marginTop:6}}>Sort Key (optional)</span>
        <div className="row">
          <input className="inp" value={s.sortKey?.name||''} placeholder="sort key name" onChange={e=>u({sortKey:{...s.sortKey,name:e.target.value}})} style={{flex:1}}/>
          <select className="inp" value={s.sortKey?.type||'String'} onChange={e=>u({sortKey:{...s.sortKey,type:e.target.value}})} style={{width:80,flexShrink:0}}>
            {['String','Number','Binary'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">GSI (JSON)</span>
          <input className="inp" value={s.gsi||''} placeholder='[{"name":"gsi1","pk":"email","sk":"createdAt"}]' onChange={e=>u({gsi:e.target.value})} style={{fontSize:9}}/>
        </div>
      </div>
      <div className="cb-row" style={{marginBottom:8}}>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.ttlEnabled} onChange={e=>u({ttlEnabled:e.target.checked})}/><span style={{color:s.ttlEnabled?'#F59E0B':'var(--muted)'}}>TTL</span></label>
        {s.ttlEnabled && <input className="inp" value={s.ttlAttr||'ttl'} onChange={e=>u({ttlAttr:e.target.value})} style={{width:80,fontSize:10}} placeholder="ttl attr"/>}
        <label className="cb-lbl"><input type="checkbox" checked={!!s.streams} onChange={e=>u({streams:e.target.checked})}/><span style={{color:s.streams?'#06B6D4':'var(--muted)'}}>Streams</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.pitr} onChange={e=>u({pitr:e.target.checked})}/><span style={{color:s.pitr?'#8B5CF6':'var(--muted)'}}>PITR</span></label>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Attributes</span>
        <button className="addbtn" onClick={()=>u({attributes:[...(s.attributes||[]),{id:uid(),name:'attr',type:'String'}]})}>+ Attr</button>
      </div>
      {(s.attributes||[]).map(a=>(
        <div key={a.id} className="row">
          <input className="inp" value={a.name} onChange={e=>u({attributes:uF(s.attributes||[],a.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={a.type} onChange={e=>u({attributes:uF(s.attributes||[],a.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
            {KV_T.map(t=><option key={t}>{t}</option>)}
          </select>
          <button className="delbtn" onClick={()=>u({attributes:dF(s.attributes||[],a.id)})}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function LedgerEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Engine</span>
          <select className="inp" value={s.engine||'QLDB'} onChange={e=>u({engine:e.target.value})}>
            {DB.ledger.engines.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Ledger</span><input className="inp" value={s.ledger||''} onChange={e=>u({ledger:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Table</span><input className="inp" value={s.table||''} onChange={e=>u({table:e.target.value})}/></div>
      </div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Permissions</span>
          <select className="inp" value={s.permissions||'ALLOW_ALL'} onChange={e=>u({permissions:e.target.value})}>
            {['ALLOW_ALL','STANDARD'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{flex:1}}><span className="lbl">Deletion Protection</span>
          <select className="inp" value={s.deletionProtection||'true'} onChange={e=>u({deletionProtection:e.target.value})}>
            {['true','false'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Tags (key=value, comma-sep)</span>
        <input className="inp" value={s.tags||''} placeholder="env=prod, team=backend" onChange={e=>u({tags:e.target.value})} style={{fontSize:10}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Fields</span>
        <button className="addbtn" onClick={()=>u({fields:[...(s.fields||[]),{id:uid(),name:'field',type:'String',indexed:false}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map(f=>(
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={f.type} onChange={e=>u({fields:uF(s.fields||[],f.id,{type:e.target.value})})} style={{width:100,flexShrink:0}}>
            {['String','IonStruct','IonList','Integer','Decimal','Boolean','Blob','Timestamp','Null','Clob','Symbol'].map(t=><option key={t}>{t}</option>)}
          </select>
          <label className="cb-lbl"><input type="checkbox" checked={!!f.indexed} onChange={e=>u({fields:uF(s.fields||[],f.id,{indexed:e.target.checked})})}/><span style={{color:f.indexed?'#06B6D4':'var(--muted)',fontSize:9}}>IDX</span></label>
          <button className="delbtn" onClick={()=>u({fields:dF(s.fields||[],f.id)})}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function SchemaEditor({ n }) {
  if (!n) return null;
  switch (n.data.dbType) {
    case 'sql': return <SqlEditor n={n}/>;
    case 'document': return <DocumentEditor n={n}/>;
    case 'graph': return <GraphEditor n={n}/>;
    case 'cache': return <CacheEditor n={n}/>;
    case 'objstore': return <ObjStoreEditor n={n}/>;
    case 'search': return <SearchEditor n={n}/>;
    case 'tseries': return <TimeSeriesEditor n={n}/>;
    case 'vector': return <VectorEditor n={n}/>;
    case 'column': return <ColumnEditor n={n}/>;
    case 'queue': return <QueueEditor n={n}/>;
    case 'keyvalue': return <KeyValueEditor n={n}/>;
    case 'ledger': return <LedgerEditor n={n}/>;
    default: return null;
  }
}
