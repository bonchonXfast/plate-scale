/* Plate & Scale — in-memory state backed by IndexedDB (window.DB). */
(function () {
  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();

  const DEFAULT_SETTINGS = {
    key: 'settings', aiVision: false, lastBackupAt: null, demoActive: false, onboarded: false,
    favorites: [], recent: [], welcomeSeen: false, persistAsked: false
  };

  const Store = {
    profile: null,
    settings: Object.assign({}, DEFAULT_SETTINGS),
    weights: [], weightMap: new Map(),
    entries: [], byDate: new Map(),
    foods: [], plans: new Map(), notes: new Map(), reviews: new Map(),
    photoMeta: new Map(),        // id -> {id, size, demo, createdAt}
    urlCache: new Map(),         // id|kind -> objectURL
    uid, now,

    async load() {
      const [kv, weights, entries, foods, plans, notes, reviews, photos] = await Promise.all(
        ['kv', 'weights', 'entries', 'foods', 'plans', 'notes', 'reviews', 'photos'].map(s => DB.getAll(s)));
      const prof = kv.find(x => x.key === 'profile');
      const sets = kv.find(x => x.key === 'settings');
      this.profile = prof ? prof.value : null;
      this.settings = Object.assign({}, DEFAULT_SETTINGS, sets || {});
      this.weights = weights.sort((a, b) => a.date < b.date ? -1 : 1);
      this.entries = entries;
      this.foods = foods;
      this.plans = new Map(plans.map(p => [p.date, p]));
      this.notes = new Map(notes.map(n => [n.date, n]));
      this.reviews = new Map(reviews.map(r => [r.weekStart, r]));
      this.photoMeta = new Map(photos.map(p => [p.id, { id: p.id, size: p.size || (p.blob && p.blob.size) || 0, thumbSize: p.thumb ? p.thumb.size : 0, demo: !!p.demo, createdAt: p.createdAt }]));
      this.reindex();
    },

    reindex() {
      this.weights.sort((a, b) => a.date < b.date ? -1 : 1);
      this.weightMap = new Map(this.weights.map(w => [w.date, w]));
      const m = new Map();
      for (const e of this.entries) { if (!m.has(e.date)) m.set(e.date, []); m.get(e.date).push(e); }
      for (const list of m.values()) list.sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1);
      this.byDate = m;
    },

    /* ---------- profile & settings ---------- */
    async saveProfile(p) {
      p.updatedAt = now();
      if (!p.id) { p.id = uid('profile'); p.createdAt = now(); }
      await DB.put('kv', { key: 'profile', value: p });
      this.profile = p;
    },
    async saveSettings(patch) {
      Object.assign(this.settings, patch);
      await DB.put('kv', Object.assign({}, this.settings, { key: 'settings' }));
    },

    /* ---------- weight ---------- */
    async putWeight(w) {
      const ex = this.weightMap.get(w.date);
      const rec = Object.assign({ id: ex ? ex.id : uid('w'), createdAt: ex ? ex.createdAt : now() }, w, { updatedAt: now(), demo: false });
      await DB.put('weights', rec);
      this.weights = this.weights.filter(x => x.date !== rec.date).concat(rec);
      this.reindex();
      return rec;
    },
    async delWeight(date) {
      await DB.del('weights', date);
      this.weights = this.weights.filter(x => x.date !== date);
      this.reindex();
    },

    /* ---------- food entries ---------- */
    async putEntry(e) {
      const rec = Object.assign({}, e);
      if (!rec.id) { rec.id = uid('fe'); rec.createdAt = now(); }
      rec.updatedAt = now();
      rec.demo = !!rec.demo;
      await DB.put('entries', rec);
      this.entries = this.entries.filter(x => x.id !== rec.id).concat(rec);
      this.reindex();
      this.touchRecent(rec);
      return rec;
    },
    async putEntries(list) {
      const recs = list.map(e => Object.assign({}, e, { id: uid('fe'), createdAt: now(), updatedAt: now(), demo: false }));
      await DB.putMany('entries', recs);
      this.entries = this.entries.concat(recs);
      this.reindex();
      return recs;
    },
    async delEntries(ids) {
      const set = new Set(ids);
      const photos = this.entries.filter(e => set.has(e.id) && e.photoId).map(e => e.photoId);
      await DB.delMany('entries', ids);
      this.entries = this.entries.filter(e => !set.has(e.id));
      this.reindex();
      for (const p of photos) await this.delPhotoIfUnused(p);
    },
    touchRecent(e) {
      const sig = e.foodId || ('n:' + e.name);
      const rec = { sig, foodId: e.foodId || null, name: e.name, serving: e.serving, base: e.base, qty: e.qty };
      const list = [rec].concat((this.settings.recent || []).filter(r => r.sig !== sig)).slice(0, 12);
      this.saveSettings({ recent: list }).catch(() => {});
    },

    /* ---------- custom foods & favorites ---------- */
    async putFood(f) {
      const rec = Object.assign({ cat: 'custom', builtin: false }, f);
      if (!rec.id) { rec.id = uid('cf'); rec.createdAt = now(); }
      rec.updatedAt = now();
      await DB.put('foods', rec);
      this.foods = this.foods.filter(x => x.id !== rec.id).concat(rec);
      return rec;
    },
    async delFood(id) { await DB.del('foods', id); this.foods = this.foods.filter(f => f.id !== id); },
    isFavorite(id) { return (this.settings.favorites || []).includes(id) || !!(this.foods.find(f => f.id === id) || {}).favorite; },
    async toggleFavorite(id) {
      const cf = this.foods.find(f => f.id === id);
      if (cf) { cf.favorite = !cf.favorite; await this.putFood(cf); return cf.favorite; }
      const fav = new Set(this.settings.favorites || []);
      if (fav.has(id)) fav.delete(id); else fav.add(id);
      await this.saveSettings({ favorites: [...fav] });
      return fav.has(id);
    },
    allFoodsWithFav() {
      const fav = new Set(this.settings.favorites || []);
      return this.foods.map(f => f).concat(Foods.LIST.map(f => Object.assign({}, f, { favorite: fav.has(f.id) })));
    },
    findFood(id) { return this.foods.find(f => f.id === id) || Foods.BY_ID.get(id) || null; },

    /* ---------- plans, notes, reviews ---------- */
    async putPlan(p) {
      const rec = Object.assign({ id: uid('plan'), createdAt: now() }, this.plans.get(p.date) || {}, p, { updatedAt: now(), demo: false });
      await DB.put('plans', rec); this.plans.set(rec.date, rec); return rec;
    },
    async delPlan(date) { await DB.del('plans', date); this.plans.delete(date); },
    async putNote(date, text) {
      if (!text.trim()) { await DB.del('notes', date); this.notes.delete(date); return null; }
      const ex = this.notes.get(date);
      const rec = { id: ex ? ex.id : uid('note'), date, text, createdAt: ex ? ex.createdAt : now(), updatedAt: now(), demo: false };
      await DB.put('notes', rec); this.notes.set(date, rec); return rec;
    },
    async putReview(r) { const rec = Object.assign({ id: uid('wk'), createdAt: now() }, r, { updatedAt: now() }); await DB.put('reviews', rec); this.reviews.set(rec.weekStart, rec); return rec; },

    /* ---------- photos ---------- */
    async savePhoto(blob, thumb, extra = {}) {
      const rec = Object.assign({ id: uid('ph'), blob, thumb, size: blob.size, createdAt: now(), mime: blob.type || 'image/jpeg' }, extra);
      await DB.put('photos', rec);
      this.photoMeta.set(rec.id, { id: rec.id, size: blob.size, thumbSize: thumb ? thumb.size : 0, demo: !!rec.demo, createdAt: rec.createdAt });
      return rec.id;
    },
    async photoURL(id, kind = 'thumb') {
      if (!id) return null;
      const k = id + '|' + kind;
      if (this.urlCache.has(k)) return this.urlCache.get(k);
      const rec = await DB.get('photos', id);
      if (!rec) return null;
      const b = kind === 'thumb' ? (rec.thumb || rec.blob) : rec.blob;
      if (!b) return null;
      const url = URL.createObjectURL(b);
      this.urlCache.set(k, url);
      return url;
    },
    async delPhotoIfUnused(id) {
      if (!id) return;
      if (this.entries.some(e => e.photoId === id)) return;
      await DB.del('photos', id);
      this.photoMeta.delete(id);
      for (const kind of ['thumb', 'full']) {
        const k = id + '|' + kind;
        if (this.urlCache.has(k)) { URL.revokeObjectURL(this.urlCache.get(k)); this.urlCache.delete(k); }
      }
    },
    photoBytes() { let s = 0; for (const p of this.photoMeta.values()) s += (p.size || 0) + (p.thumbSize || 0); return s; },

    /* ---------- demo & reset ---------- */
    hasDemo() {
      return this.entries.some(e => e.demo) || this.weights.some(w => w.demo) || [...this.plans.values()].some(p => p.demo) || [...this.notes.values()].some(n => n.demo);
    },
    hasRealData() { return this.entries.some(e => !e.demo) || this.weights.some(w => !w.demo); },
    async clearDemo() {
      const e = this.entries.filter(x => x.demo).map(x => x.id);
      const w = this.weights.filter(x => x.demo).map(x => x.date);
      const p = [...this.plans.values()].filter(x => x.demo).map(x => x.date);
      const n = [...this.notes.values()].filter(x => x.demo).map(x => x.date);
      const ph = [...this.photoMeta.values()].filter(x => x.demo).map(x => x.id);
      await DB.delMany('entries', e); await DB.delMany('weights', w); await DB.delMany('plans', p); await DB.delMany('notes', n);
      this.entries = this.entries.filter(x => !x.demo);
      this.weights = this.weights.filter(x => !x.demo);
      p.forEach(d => this.plans.delete(d)); n.forEach(d => this.notes.delete(d));
      this.reindex();
      for (const id of ph) { if (!this.entries.some(x => x.photoId === id)) { await DB.del('photos', id); this.photoMeta.delete(id); } }
      // demo reviews are tied to demo weeks
      const rv = [...this.reviews.values()].filter(r => r.demo).map(r => r.weekStart);
      await DB.delMany('reviews', rv); rv.forEach(k => this.reviews.delete(k));
      if (this.profile && this.profile.demo) { await DB.del('kv', 'profile'); this.profile = null; }
      await this.saveSettings({ demoActive: false, recent: (this.settings.recent || []).filter(r => !r.demo) });
    },
    async resetAll() {
      for (const url of this.urlCache.values()) URL.revokeObjectURL(url);
      this.urlCache.clear();
      await DB.clearAll();
      this.profile = null; this.settings = Object.assign({}, DEFAULT_SETTINGS);
      this.weights = []; this.entries = []; this.foods = []; this.plans = new Map(); this.notes = new Map(); this.reviews = new Map(); this.photoMeta = new Map();
      this.reindex();
    }
  };

  window.Store = Store;
})();
