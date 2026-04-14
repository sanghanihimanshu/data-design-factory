import { openDB } from 'idb';

const DB_NAME = 'ddf';
const DB_VER = 1;
const STORE = 'projects';

let _db = null;
async function getDb() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VER, {
    upgrade(db) { db.createObjectStore(STORE, { keyPath: 'id' }); }
  });
  return _db;
}

export async function idbLoadAll() {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function idbSave(project) {
  const db = await getDb();
  await db.put(STORE, project);
}

export async function idbDelete(id) {
  const db = await getDb();
  await db.delete(STORE, id);
}
