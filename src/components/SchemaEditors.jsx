import { uid } from '../store';
import { updateSchema } from '../store';
import { SQL_TYPES, BSON_T, DB } from '../constants';
import { SubFieldEditor, EnumEditor } from './SubFieldEditor';

const snap = () => {}; // snapshot called in updateSchema via store

function sel(color) {
  return { background: 'var(--input-bg)', border: '1px solid var(--border)', color, borderRadius: 4, padding: '3px 4px', fontSize: 10, width: 110, flexShrink: 0 };
}

export function SqlEditor({ n }) {
  const s = n.data.schema;
  const u = p => updateSchema(n.id, p);
  const uF = (arr, id, p) => arr.map(x => x.id === id ? { ...x, ...p } : x);
  const dF = (arr, id) => arr.filter(x => x.id !== id);
  const def = DB[n.data.dbType];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Columns</span>
        <button className="addbtn" onClick={() => u({ columns: [...s.columns, { id: uid(), name: 'new_col', type: 'TEXT', pk: false, nullable: true, unique: false, default: '', fk: '', index: false, enumValues: '' }] })}>+ Column</button>
      </div>
      {(s.columns || []).map(c => (
        <div key={c.id} className="field-row">
          <div className="row">
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
          </div>
          <div className="row" style={{ marginTop: 4, marginBottom: 0 }}>
            <input className="inp" value={c.default || ''} placeholder="default" onChange={e => u({ columns: uF(s.columns, c.id, { default: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
            <input className="inp" value={c.fk || ''} placeholder="table.col (FK)" onChange={e => u({ columns: uF(s.columns, c.id, { fk: e.target.value }) })} style={{ flex: 1, fontSize: 10 }} />
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

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span className="lbl">Collection</span>
        <input className="inp" value={s.collection || ''} onChange={e => u({ collection: e.target.value })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="lbl" style={{ margin: 0 }}>Fields</span>
        <button className="addbtn" onClick={() => u({ fields: [...s.fields, { id: uid(), name: 'field', type: 'String', required: false, unique: false, indexed: false, subFields: [], enumValues: '' }] })}>+ Field</button>
      </div>
      {(s.fields || []).map(f => (
        <div key={f.id} className="field-row">
          <div className="row">
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
              <SubFieldEditor fields={f.subFields || []} onChange={sf => u({ fields: uF(s.fields, f.id, { subFields: sf }) })} depth={1} />
            </div>
          )}
          <div className="cb-row">
            {[['required','Required','#EF4444'],['unique','Unique','#3B82F6'],['indexed','Index','#06B6D4']].map(([k,l,col]) => (
              <label key={k} className="cb-lbl">
                <input type="checkbox" checked={!!f[k]} onChange={e => u({ fields: uF(s.fields, f.id, { [k]: e.target.checked }) })} />
                <span style={{ color: f[k] ? col : 'var(--muted)' }}>{l}</span>
              </label>
            ))}
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
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Entity Type</span>
          <select className="inp" value={s.entityType} onChange={e=>u({entityType:e.target.value})}>
            {['Node','Relationship'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Labels (comma-sep)</span>
        <input className="inp" value={(s.labels||[]).join(', ')} onChange={e=>u({labels:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} />
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Properties</span>
        <button className="addbtn" onClick={()=>u({properties:[...s.properties,{id:uid(),name:'prop',type:'String',required:false,indexed:false}]})}>+ Property</button>
      </div>
      {(s.properties||[]).map(p=>(
        <div key={p.id} className="field-row">
          <div className="row">
            <input className="inp" value={p.name} onChange={e=>u({properties:uF(s.properties,p.id,{name:e.target.value})})} style={{flex:1}}/>
            <select className="inp" value={p.type} onChange={e=>u({properties:uF(s.properties,p.id,{type:e.target.value})})} style={{width:90,flexShrink:0}}>
              {['String','Integer','Float','Boolean','Date','DateTime','List','Point','Duration'].map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={()=>u({properties:dF(s.properties,p.id)})}>✕</button>
          </div>
          <div className="cb-row">
            {[['required','Required','#EF4444'],['indexed','Index','#06B6D4']].map(([k,l,col])=>(
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
      <div style={{marginBottom:8}}><span className="lbl">Key Pattern</span><input className="inp" value={s.keyPattern||''} onChange={e=>u({keyPattern:e.target.value})}/></div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Structure</span>
          <select className="inp" value={s.structure} onChange={e=>u({structure:e.target.value})}>
            {['string','hash','list','set','zset','stream','json','bitmap'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{width:80,flexShrink:0}}><span className="lbl">TTL (s)</span><input className="inp" type="number" value={s.ttl||3600} onChange={e=>u({ttl:Number(e.target.value)})}/></div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Fields</span>
        <button className="addbtn" onClick={()=>u({fields:[...(s.fields||[]),{id:uid(),name:'field',type:'string'}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map(f=>(
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={f.type} onChange={e=>u({fields:uF(s.fields||[],f.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
            {['string','integer','float','boolean','binary','json','object'].map(t=><option key={t}>{t}</option>)}
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
      <div style={{marginBottom:8}}><span className="lbl">Bucket</span><input className="inp" value={s.bucket||''} onChange={e=>u({bucket:e.target.value})}/></div>
      <div style={{marginBottom:8}}><span className="lbl">Key Prefix</span><input className="inp" value={s.prefix||''} onChange={e=>u({prefix:e.target.value})}/></div>
      <div style={{marginBottom:8}}><span className="lbl">Storage Class</span>
        <select className="inp" value={s.storageClass} onChange={e=>u({storageClass:e.target.value})}>
          {['STANDARD','INTELLIGENT_TIERING','STANDARD_IA','ONEZONE_IA','GLACIER','DEEP_ARCHIVE'].map(t=><option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={{marginBottom:8}}><span className="lbl">Encryption</span>
        <select className="inp" value={s.encryption} onChange={e=>u({encryption:e.target.value})}>
          {['SSE-S3','SSE-KMS','SSE-C','None'].map(t=><option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="cb-row">
        <label className="cb-lbl"><input type="checkbox" checked={!!s.versioning} onChange={e=>u({versioning:e.target.checked})}/><span>Versioning</span></label>
        <label className="cb-lbl"><input type="checkbox" checked={!!s.cors} onChange={e=>u({cors:e.target.checked})}/><span>CORS</span></label>
      </div>
    </div>
  );
}

export function SearchEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  const def = DB[n.data.dbType];
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Index</span><input className="inp" value={s.index||''} onChange={e=>u({index:e.target.value})}/></div>
        <div style={{width:50,flexShrink:0}}><span className="lbl">Shards</span><input className="inp" type="number" value={s.shards||1} onChange={e=>u({shards:Number(e.target.value)})}/></div>
        <div style={{width:50,flexShrink:0}}><span className="lbl">Repls</span><input className="inp" type="number" value={s.replicas??0} onChange={e=>u({replicas:Number(e.target.value)})}/></div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Mappings</span>
        <button className="addbtn" onClick={()=>u({fields:[...s.fields,{id:uid(),name:'field',type:'keyword',indexed:true,stored:true,analyzer:''}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map(f=>(
        <div key={f.id} className="field-row">
          <div className="row">
            <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields,f.id,{name:e.target.value})})} style={{flex:1}}/>
            <select style={sel(def.c)} value={f.type} onChange={e=>u({fields:uF(s.fields,f.id,{type:e.target.value})})}>
              {ES_T.map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={()=>u({fields:dF(s.fields,f.id)})}>✕</button>
          </div>
          <input className="inp" value={f.analyzer||''} placeholder="analyzer" onChange={e=>u({fields:uF(s.fields,f.id,{analyzer:e.target.value})})} style={{fontSize:10,marginTop:4}}/>
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
        <div style={{flex:1}}><span className="lbl">Measurement</span><input className="inp" value={s.measurement||''} onChange={e=>u({measurement:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Retention</span><input className="inp" value={s.retention||'30d'} onChange={e=>u({retention:e.target.value})}/></div>
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
        <button className="addbtn" onClick={()=>u({fields:[...(s.fields||[]),{id:uid(),name:'field',type:'float'}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map(f=>(
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={f.type} onChange={e=>u({fields:uF(s.fields||[],f.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
            {['float','integer','unsigned','boolean','string'].map(t=><option key={t}>{t}</option>)}
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
      <div style={{marginBottom:8}}><span className="lbl">Collection</span><input className="inp" value={s.collection||''} onChange={e=>u({collection:e.target.value})}/></div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Dimensions</span><input className="inp" type="number" value={s.dimensions||1536} onChange={e=>u({dimensions:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">Distance</span>
          <select className="inp" value={s.distance} onChange={e=>u({distance:e.target.value})}>
            {['Cosine','Euclid','Dot','Manhattan'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Payload</span>
        <button className="addbtn" onClick={()=>u({payload:[...(s.payload||[]),{id:uid(),name:'field',type:'text'}]})}>+ Field</button>
      </div>
      {(s.payload||[]).map(p=>(
        <div key={p.id} className="row">
          <input className="inp" value={p.name} onChange={e=>u({payload:uF(s.payload||[],p.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={p.type} onChange={e=>u({payload:uF(s.payload||[],p.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
            {['text','keyword','integer','float','boolean','datetime','uuid','geo','json'].map(t=><option key={t}>{t}</option>)}
          </select>
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
  return (
    <div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Keyspace</span><input className="inp" value={s.keyspace||''} onChange={e=>u({keyspace:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Table</span><input className="inp" value={s.table||''} onChange={e=>u({table:e.target.value})}/></div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Columns</span>
        <button className="addbtn" onClick={()=>u({columns:[...s.columns,{id:uid(),name:'col',type:'TEXT',role:'regular',static:false}]})}>+ Column</button>
      </div>
      {(s.columns||[]).map(c=>(
        <div key={c.id} className="field-row">
          <div className="row">
            <input className="inp" value={c.name} onChange={e=>u({columns:uF(s.columns,c.id,{name:e.target.value})})} style={{flex:1}}/>
            <select style={sel(def.c)} value={c.type} onChange={e=>u({columns:uF(s.columns,c.id,{type:e.target.value})})}>
              {CASS_T.map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="delbtn" onClick={()=>u({columns:dF(s.columns,c.id)})}>✕</button>
          </div>
          <select className="inp" value={c.role} onChange={e=>u({columns:uF(s.columns,c.id,{role:e.target.value})})} style={{marginTop:4,fontSize:10}}>
            <option value="partition">PARTITION KEY</option>
            <option value="clustering">CLUSTERING KEY</option>
            <option value="regular">REGULAR</option>
          </select>
        </div>
      ))}
    </div>
  );
}

export function QueueEditor({ n }) {
  const s = n.data.schema; const u = p => updateSchema(n.id, p);
  const uF=(a,id,p)=>a.map(x=>x.id===id?{...x,...p}:x), dF=(a,id)=>a.filter(x=>x.id!==id);
  return (
    <div>
      <div style={{marginBottom:8}}><span className="lbl">Topic</span><input className="inp" value={s.topic||''} onChange={e=>u({topic:e.target.value})}/></div>
      <div className="irow">
        <div style={{flex:1}}><span className="lbl">Partitions</span><input className="inp" type="number" value={s.partitions||3} onChange={e=>u({partitions:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">Replication</span><input className="inp" type="number" value={s.replication||1} onChange={e=>u({replication:Number(e.target.value)})}/></div>
        <div style={{flex:1}}><span className="lbl">Retention</span><input className="inp" value={s.retention||'7d'} onChange={e=>u({retention:e.target.value})}/></div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Message Schema</span>
        <button className="addbtn" onClick={()=>u({schema:[...(s.schema||[]),{id:uid(),name:'field',type:'string',required:false,subFields:[]}]})}>+ Field</button>
      </div>
      {(s.schema||[]).map(f=>(
        <div key={f.id} className="field-row">
          <div className="row">
            <input className="inp" value={f.name} onChange={e=>u({schema:uF(s.schema||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
            <select className="inp" value={f.type} onChange={e=>u({schema:uF(s.schema||[],f.id,{type:e.target.value})})} style={{width:80,flexShrink:0}}>
              {['string','integer','long','float','boolean','object','array','bytes','uuid','null','json'].map(t=><option key={t}>{t}</option>)}
            </select>
            <label className="cb-lbl"><input type="checkbox" checked={!!f.required} onChange={e=>u({schema:uF(s.schema||[],f.id,{required:e.target.checked})})}/><span style={{fontSize:10}}>R</span></label>
            <button className="delbtn" onClick={()=>u({schema:dF(s.schema||[],f.id)})}>✕</button>
          </div>
          {(f.type==='object'||f.type==='array') && (
            <SubFieldEditor fields={f.subFields||[]} onChange={sf=>u({schema:uF(s.schema||[],f.id,{subFields:sf})})} depth={1}/>
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
        <div style={{flex:1}}><span className="lbl">Ledger</span><input className="inp" value={s.ledger||''} onChange={e=>u({ledger:e.target.value})}/></div>
        <div style={{flex:1}}><span className="lbl">Table</span><input className="inp" value={s.table||''} onChange={e=>u({table:e.target.value})}/></div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span className="lbl" style={{margin:0}}>Fields</span>
        <button className="addbtn" onClick={()=>u({fields:[...(s.fields||[]),{id:uid(),name:'field',type:'String'}]})}>+ Field</button>
      </div>
      {(s.fields||[]).map(f=>(
        <div key={f.id} className="row">
          <input className="inp" value={f.name} onChange={e=>u({fields:uF(s.fields||[],f.id,{name:e.target.value})})} style={{flex:1}}/>
          <select className="inp" value={f.type} onChange={e=>u({fields:uF(s.fields||[],f.id,{type:e.target.value})})} style={{width:100,flexShrink:0}}>
            {['String','IonStruct','IonList','Integer','Decimal','Boolean','Blob','Timestamp','Null'].map(t=><option key={t}>{t}</option>)}
          </select>
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
