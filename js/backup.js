/* Plate & Scale — backup, restore, CSV export and file saving. */
(function () {
  const APP = 'plate-scale';
  const FORMAT = 1;

  function err(msg) { const e = new Error(msg); e.userMessage = msg; return e; }
  const stamp = () => { const d = new Date(); return Calc.key(d).replace(/-/g, '') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0'); };

  function counts(data) {
    const meals = new Set((data.entries || []).map(e => e.date + '|' + e.meal));
    return {
      weights: (data.weights || []).length, meals: meals.size, entries: (data.entries || []).length,
      photos: (data.photos || []).length, foods: (data.foods || []).length, plans: (data.plans || []).length, notes: (data.notes || []).length
    };
  }

  async function build(includePhotos = true) {
    const [kv, weights, entries, foods, plans, notes, reviews] = await Promise.all(['kv', 'weights', 'entries', 'foods', 'plans', 'notes', 'reviews'].map(s => DB.getAll(s)));
    let photos = [];
    if (includePhotos) {
      const raw = await DB.getAll('photos');
      for (const p of raw) {
        photos.push({ id: p.id, createdAt: p.createdAt, demo: !!p.demo, mime: p.mime || 'image/jpeg', data: p.blob ? await Photos.blobToDataURL(p.blob) : null, thumb: p.thumb ? await Photos.blobToDataURL(p.thumb) : null });
      }
    }
    const data = { kv, weights, entries, foods, plans, notes, reviews, photos };
    return {
      app: APP, format: FORMAT,
      meta: { id: Store.uid('backup'), exportedAt: new Date().toISOString(), includesPhotos: includePhotos, counts: counts(data), userAgent: navigator.userAgent.slice(0, 120) },
      data
    };
  }

  function parse(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw err('ไฟล์ Backup เสียหายหรือไม่ใช่ไฟล์ JSON ของแอปนี้'); }
    if (!obj || obj.app !== APP || !obj.data || typeof obj.data !== 'object') throw err('ไฟล์นี้ไม่ใช่ Backup ของ Plate & Scale');
    if (obj.format > FORMAT) throw err('ไฟล์ Backup นี้มาจากเวอร์ชันที่ใหม่กว่า กรุณาอัปเดตแอปก่อน');
    const d = obj.data;
    const arr = k => Array.isArray(d[k]) ? d[k] : [];
    const weights = arr('weights').filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && isFinite(+w.weight));
    const entries = arr('entries').filter(e => e && e.id && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Calc.MEALS.includes(e.meal) && e.base);
    if (arr('weights').length !== weights.length || arr('entries').length !== entries.length) {
      obj.warnings = ['บางรายการในไฟล์ไม่สมบูรณ์และจะถูกข้าม'];
    }
    obj.data = {
      kv: arr('kv').filter(x => x && (x.key === 'profile' || x.key === 'settings')), weights, entries,
      foods: arr('foods').filter(f => f && f.id && f.name), plans: arr('plans').filter(p => p && p.date), notes: arr('notes').filter(n => n && n.date),
      reviews: arr('reviews').filter(r => r && r.weekStart), photos: arr('photos').filter(p => p && p.id && p.data)
    };
    obj.counts = counts(obj.data);
    return obj;
  }

  async function restore(parsed, mode) {
    const d = parsed.data;
    const photos = d.photos.map(p => {
      try {
        const blob = Photos.dataURLtoBlob(p.data);
        return { id: p.id, blob, thumb: p.thumb ? Photos.dataURLtoBlob(p.thumb) : blob, size: blob.size, createdAt: p.createdAt, demo: !!p.demo, mime: p.mime };
      } catch (e) { return null; }
    }).filter(Boolean);
    try {
      if (mode === 'replace') await DB.clearAll();
      for (const s of ['weights', 'entries', 'foods', 'plans', 'notes', 'reviews']) if (d[s].length) await DB.putMany(s, d[s]);
      if (photos.length) await DB.putMany('photos', photos);
      for (const kvRec of d.kv) {
        if (mode === 'merge' && kvRec.key === 'settings') continue;
        if (mode === 'merge' && kvRec.key === 'profile' && Store.profile && !Store.profile.demo) continue;
        await DB.put('kv', kvRec);
      }
    } catch (e) {
      throw err((e && e.code === 'quota') ? 'พื้นที่ในเครื่องไม่พอสำหรับ Restore ลองล้างรูปเก่าหรือใช้ Backup แบบไม่มีรูป' : 'Restore ไม่สำเร็จ ข้อมูลอาจไม่ครบ ลองอีกครั้ง หรือใช้ไฟล์ Backup อื่น');
    }
    for (const url of Store.urlCache.values()) URL.revokeObjectURL(url);
    Store.urlCache.clear();
    await Store.load();
    await Store.saveSettings({ welcomeSeen: true, demoActive: Store.hasDemo() });
  }

  /* ---------- CSV ---------- */
  function csv(rows) {
    const esc = v => { if (v == null) return ''; const s = String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
  }
  const r1 = v => v == null ? '' : Calc.round(v, 1);
  function allDates() { return [...Store.byDate.keys()].sort(); }

  const CSV = {
    weight() {
      return csv([['date', 'weight_kg', 'avg7_kg', 'waist_cm', 'body_fat_pct', 'note']].concat(
        Store.weights.map(w => [w.date, w.weight, r1(Calc.ma7(w.date)), w.waist ?? '', w.bodyFat ?? '', w.note || ''])));
    },
    entries() {
      const rows = [['date', 'meal', 'food', 'serving', 'quantity', 'calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'note', 'has_photo']];
      const list = Store.entries.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : Calc.MEALS.indexOf(a.meal) - Calc.MEALS.indexOf(b.meal));
      for (const e of list) { const t = Calc.entryTotals(e); rows.push([e.date, Calc.MEAL_EN[e.meal], e.name, e.serving, e.qty, r1(t.kcal), r1(t.protein), r1(t.carbs), r1(t.fat), r1(t.fiber), r1(t.sugar), Math.round(t.sodium), e.note || '', e.photoId ? 'yes' : 'no']); }
      return csv(rows);
    },
    daily() {
      const rows = [['date', 'calories_kcal', 'target_kcal', 'difference_kcal', 'status', 'entries', 'breakfast_kcal', 'lunch_kcal', 'dinner_kcal', 'snack_kcal', 'weight_kg']];
      for (const d of allDates()) {
        const t = Calc.dayTotals(d), tk = Calc.targetKcalFor(d);
        rows.push([d, Math.round(t.kcal), tk || '', tk ? Math.round(t.kcal - tk) : '', Calc.dayStatus(d) || '', t.count, Math.round(t.meals.breakfast), Math.round(t.meals.lunch), Math.round(t.meals.dinner), Math.round(t.meals.snack), Calc.weightOn(d) ?? '']);
      }
      return csv(rows);
    },
    macros() {
      const rows = [['date', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'protein_kcal', 'carbs_kcal', 'fat_kcal', 'protein_pct', 'carbs_pct', 'fat_pct']];
      for (const d of allDates()) {
        const t = Calc.dayTotals(d), m = Calc.macroSplit(t);
        rows.push([d, r1(t.protein), r1(t.carbs), r1(t.fat), r1(t.fiber), r1(t.sugar), Math.round(t.sodium), Math.round(m.protein.kcal), Math.round(m.carbs.kcal), Math.round(m.fat.kcal), r1(m.protein.pct), r1(m.carbs.pct), r1(m.fat.pct)]);
      }
      return csv(rows);
    }
  };

  /* ---------- saving files ----------
     Inside the Claude viewer: the `downloads` capability (viewer confirms; iOS app shows the share sheet).
     Standalone PWA on a phone: Web Share with a file (iOS Share Sheet -> Files / iCloud Drive / AirDrop).
     Desktop: a normal download. */
  let downloadsCap;
  async function getDownloads() {
    if (downloadsCap !== undefined) return downloadsCap;
    downloadsCap = null;
    try { if (window.claude && typeof window.claude.use === 'function') downloadsCap = await window.claude.use('downloads'); } catch (e) { downloadsCap = null; }
    return downloadsCap;
  }

  async function saveFile(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await getDownloads();
      if (dl) {
        try { await dl.save({ filename, data: blob }); return 'saved'; }
        catch (e) {
          if (e && e.code === 'declined') return 'cancelled';
          if (e && e.code === 'rate_limited') throw err('มีหน้าต่างบันทึกไฟล์เปิดอยู่แล้ว รอสักครู่แล้วลองใหม่');
          throw err('บันทึกไฟล์ไม่สำเร็จในหน้านี้');
        }
      }
      throw err('หน้านี้บันทึกไฟล์ไม่ได้ ลองเปิดแอปในเบราว์เซอร์โดยตรง');
    }
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (coarse && navigator.canShare && typeof File === 'function') {
      try {
        const file = new File([blob], filename, { type: mime });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return 'shared';
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }

  async function exportBackup(includePhotos) {
    const obj = await build(includePhotos);
    const text = JSON.stringify(obj);
    const name = `plate-scale-backup-${stamp()}${includePhotos ? '' : '-nophotos'}.json`;
    const status = await saveFile(name, text, 'application/json');
    if (status !== 'cancelled') await Store.saveSettings({ lastBackupAt: new Date().toISOString() });
    return { status, size: text.length, name, counts: obj.meta.counts };
  }

  async function exportCSV(kind) {
    const names = { weight: 'weight-history', entries: 'nutrition-history', daily: 'daily-calories', macros: 'macro-history' };
    return saveFile(`plate-scale-${names[kind]}-${stamp()}.csv`, CSV[kind](), 'text/csv');
  }

  window.Backup = { build, parse, restore, exportBackup, exportCSV, saveFile, counts, CSV };
})();
