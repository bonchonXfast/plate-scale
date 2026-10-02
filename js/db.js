/* Plate & Scale — storage layer.
   IndexedDB is the primary store. If IndexedDB is unavailable (e.g. some private modes),
   the app falls back to in-memory storage and tells the user data will not be kept. */
(function () {
  const NAME = 'plate-scale';
  const VERSION = 1;
  const STORES = {
    kv:      { keyPath: 'key' },          // profile, settings
    weights: { keyPath: 'date' },         // WeightEntry (one per day)
    entries: { keyPath: 'id', idx: ['date'] }, // FoodEntry
    photos:  { keyPath: 'id' },           // compressed food photos (Blob)
    foods:   { keyPath: 'id' },           // CustomFood / favorites
    plans:   { keyPath: 'date' },         // DailyPlan
    notes:   { keyPath: 'date' },         // daily notes
    reviews: { keyPath: 'weekStart' }     // WeeklySummary decisions
  };

  let db = null;
  let memory = null;
  let mode = 'idb';

  class StorageError extends Error {
    constructor(code, message, cause) { super(message); this.code = code; this.cause = cause; }
  }

  function wrapError(e) {
    if (e instanceof StorageError) return e;
    const name = e && (e.name || (e.target && e.target.error && e.target.error.name));
    if (name === 'QuotaExceededError') return new StorageError('quota', 'พื้นที่จัดเก็บในเครื่องเต็ม ลองลบรูปเก่าหรือ Backup แล้วล้างข้อมูลบางส่วน', e);
    return new StorageError('idb', 'บันทึกข้อมูลไม่สำเร็จ ลองรีเฟรชหน้าแล้วทำอีกครั้ง', e);
  }

  function useMemory() {
    mode = 'memory';
    memory = {};
    for (const n in STORES) memory[n] = new Map();
  }

  function open() {
    return new Promise(resolve => {
      let done = false;
      const finish = ok => { if (!done) { done = true; resolve(ok); } };
      if (!('indexedDB' in window) || !window.indexedDB) { useMemory(); return finish(false); }
      let req;
      try { req = indexedDB.open(NAME, VERSION); } catch (e) { useMemory(); return finish(false); }
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const [n, o] of Object.entries(STORES)) {
          if (!d.objectStoreNames.contains(n)) {
            const s = d.createObjectStore(n, { keyPath: o.keyPath });
            (o.idx || []).forEach(i => s.createIndex(i, i));
          }
        }
      };
      req.onsuccess = () => {
        db = req.result;
        db.onversionchange = () => { try { db.close(); } catch (e) {} };
        finish(true);
      };
      req.onerror = () => { useMemory(); finish(false); };
      setTimeout(() => { if (!done) { useMemory(); finish(false); } }, 6000);
    });
  }

  function keyOf(store, val) { return val[STORES[store].keyPath]; }

  function run(store, modeRW, fn) {
    if (memory) {
      try { return Promise.resolve(fn(null)); } catch (e) { return Promise.reject(wrapError(e)); }
    }
    return new Promise((resolve, reject) => {
      let t, result;
      try { t = db.transaction(store, modeRW); } catch (e) { return reject(wrapError(e)); }
      const s = t.objectStore(store);
      try {
        const r = fn(s);
        if (r && typeof r === 'object' && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
        else result = r;
      } catch (e) { return reject(wrapError(e)); }
      t.oncomplete = () => resolve(result);
      t.onerror = ev => { ev.preventDefault && ev.preventDefault(); reject(wrapError(t.error || ev)); };
      t.onabort = () => reject(wrapError(t.error || new Error('abort')));
    });
  }

  const api = {
    open, StorageError,
    get mode() { return mode; },
    getAll(store) {
      if (memory) return Promise.resolve([...memory[store].values()].map(v => (v && v.blob ? v : structuredCloneSafe(v))));
      return run(store, 'readonly', s => s.getAll());
    },
    get(store, key) {
      if (memory) return Promise.resolve(memory[store].get(key));
      return run(store, 'readonly', s => s.get(key));
    },
    put(store, val) {
      if (memory) { memory[store].set(keyOf(store, val), val); return Promise.resolve(val); }
      return run(store, 'readwrite', s => { s.put(val); return val; });
    },
    putMany(store, vals) {
      if (memory) { vals.forEach(v => memory[store].set(keyOf(store, v), v)); return Promise.resolve(); }
      return run(store, 'readwrite', s => { vals.forEach(v => s.put(v)); });
    },
    del(store, key) {
      if (memory) { memory[store].delete(key); return Promise.resolve(); }
      return run(store, 'readwrite', s => { s.delete(key); });
    },
    delMany(store, keys) {
      if (memory) { keys.forEach(k => memory[store].delete(k)); return Promise.resolve(); }
      return run(store, 'readwrite', s => { keys.forEach(k => s.delete(k)); });
    },
    clear(store) {
      if (memory) { memory[store].clear(); return Promise.resolve(); }
      return run(store, 'readwrite', s => { s.clear(); });
    },
    async clearAll() { for (const n in STORES) await api.clear(n); },
    stores: Object.keys(STORES)
  };

  function structuredCloneSafe(v) {
    try { return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)); }
    catch (e) { return v; }
  }

  window.DB = api;
})();
