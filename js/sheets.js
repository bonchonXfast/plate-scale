/* Plate & Scale — sheets: quick add, photo flow, food editor, weight, note, copy, assistant, daily detail. */
(function () {
  const { esc, icon } = App;
  const N = (v, d = 0) => App.n(v, d);
  const NUT_FIELDS = [
    ['kcal', 'Calories', 'kcal', 5000], ['protein', 'Protein', 'g', 500], ['carbs', 'Carbs', 'g', 1000], ['fat', 'Fat', 'g', 500],
    ['fiber', 'Fiber', 'g', 200], ['sugar', 'Sugar', 'g', 500], ['sodium', 'Sodium', 'mg', 20000]
  ];
  const emptyBase = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

  function guessMeal() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    if (h >= 4.5 && h < 10.5) return 'breakfast';
    if (h < 14.5 && h >= 10.5) return 'lunch';
    if (h >= 14.5 && h < 17) return 'snack';
    if (h >= 17 && h < 21.5) return 'dinner';
    return 'snack';
  }
  App.guessMeal = guessMeal;
  function workDate() { return App.ui.view === 'food' && App.ui.foodDate ? App.ui.foodDate : Calc.today(); }

  /* ================= QUICK ADD (#31) ================= */
  App.actions.quickadd = () => {
    App.sheet.open({
      title: 'เพิ่มรายการ', name: 'quick',
      body: `
        <div class="quick">
          <label class="q primary" for="in-camera" data-pick="new">${icon('camera')}ถ่ายรูปอาหาร<small>Take Food Photo</small></label>
          <button class="q" data-act="add-food">${icon('food')}เพิ่มอาหาร<small>ค้นหาจากฐานข้อมูล</small></button>
          <button class="q" data-act="add-weight">${icon('scale')}บันทึกน้ำหนัก<small>Add Weight</small></button>
          <button class="q" data-act="add-note">${icon('note')}บันทึกโน้ต<small>Add Note</small></button>
        </div>
        <label class="btn block" for="in-library" data-pick="new">${icon('image')} เลือกรูปจาก Photo Library</label>
        <p class="help" style="margin:0">รูปและข้อมูลทั้งหมดเก็บในเครื่องนี้ ไม่ถูกส่งออกโดยอัตโนมัติ</p>`
    });
  };
  App.actions['add-food'] = el => App.openEditor({ mode: 'log', date: el.dataset.date || workDate(), meal: el.dataset.meal || guessMeal() });
  App.actions['add-weight'] = el => App.openWeight(el.dataset.date || null);
  App.actions['add-note'] = el => App.openNote(el.dataset.date || workDate());

  /* ================= PHOTO INPUT (#10) ================= */
  async function onFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (App.photoTarget === 'editor' && App.sheet.name === 'editor') {
      await setEditorPhoto(file);
      return;
    }
    openPreview(file);
  }
  App.bindFileInputs = () => {
    document.getElementById('in-camera').addEventListener('change', e => onFile(e.target).catch(err => App.fail(err)));
    document.getElementById('in-library').addEventListener('change', e => onFile(e.target).catch(err => App.fail(err)));
  };

  let pending = null;
  function openPreview(file) {
    if (pending && pending.url) URL.revokeObjectURL(pending.url);
    pending = { file, url: URL.createObjectURL(file) };
    App.sheet.open({
      title: 'Preview รูปอาหาร', name: 'preview',
      body: `<img class="preview-img" src="${pending.url}" alt="รูปอาหารที่เลือก">
             <p class="help" style="margin:0">ระบบจะย่อและบีบอัดรูปก่อนเก็บในเครื่อง</p>`,
      foot: `<label class="btn" for="in-camera" data-pick="new">${icon('camera')} ถ่ายใหม่</label>
             <label class="btn" for="in-library" data-pick="new">${icon('image')} เลือกรูปอื่น</label>
             <span class="spacer"></span>
             <button class="btn primary" data-act="photo-use">${icon('check')} ใช้รูปนี้</button>`,
      onClose: () => { if (pending) { URL.revokeObjectURL(pending.url); pending = null; } }
    });
  }
  App.actions['photo-use'] = async btn => {
    if (!pending) return;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> กำลังเตรียมรูป';
    try {
      const p = await Photos.process(pending.file);
      URL.revokeObjectURL(pending.url); pending = null;
      App.openEditor({ mode: 'log', date: App.ui.pendingDate || workDate(), meal: App.ui.pendingMeal || guessMeal(), photo: { blob: p.blob, thumb: p.thumb, url: URL.createObjectURL(p.blob) }, focusSearch: true });
    } catch (e) { btn.disabled = false; btn.innerHTML = icon('check') + ' ใช้รูปนี้'; App.fail(e, 'เตรียมรูปไม่สำเร็จ'); }
  };

  /* ================= FOOD EDITOR (#9, #12, #13, #16) ================= */
  let ED = null;
  App.openEditor = function (o) {
    const e = o.entry || o.planItem;
    ED = {
      mode: o.mode || 'log', id: e ? e.id : null, date: o.date || (e && e.date) || Calc.today(), meal: (e && e.meal) || o.meal || guessMeal(),
      foodId: e ? e.foodId || null : null, name: e ? e.name : '', serving: e ? e.serving : '', qty: e ? e.qty : 1,
      base: e ? Object.assign(emptyBase(), e.base) : emptyBase(), note: e ? e.note || '' : '',
      photo: o.photo || (e && e.photoId ? { id: e.photoId } : null), origPhotoId: e ? e.photoId || null : null,
      saveAsCustom: false, query: '', ai: null, aiConfirm: false, aiBusy: false, errors: {}, isDemo: e ? !!e.demo : false
    };
    const title = ED.mode === 'plan' ? (ED.id ? 'แก้ไขรายการในแผน' : 'เพิ่มอาหารในแผน') : (ED.id ? 'แก้ไขอาหาร' : 'เพิ่มอาหาร');
    App.sheet.open({ title, name: 'editor', body: editorBody(), foot: editorFoot(), wide: false, onClose: cleanupEditor });
    hydrateEditorPhoto();
    if (o.focusSearch || !ED.id) setTimeout(() => { const q = document.getElementById('ed-q'); if (q && !('ontouchstart' in window && !o.focusSearch)) q.focus(); }, 60);
  };
  function cleanupEditor() { if (ED && ED.photo && ED.photo.url) URL.revokeObjectURL(ED.photo.url); ED = null; }

  function editorBody() {
    const meals = Calc.MEALS.map(m => `<button class="chip ${ED.meal === m ? 'on' : ''}" data-act="ed-meal" data-meal="${m}">${Calc.MEAL_TH[m]}</button>`).join('');
    return `
      <div class="row wrap between">
        <div class="chips" role="group" aria-label="มื้ออาหาร">${meals}</div>
      </div>
      <div class="field"><label for="ed-date">วันที่</label><input class="input" type="date" id="ed-date" value="${ED.date}" data-in="ed-date"></div>
      ${ED.mode === 'log' ? `<div id="ed-photo">${photoBlock()}</div>` : ''}
      <div class="field">
        <label for="ed-q">ค้นหาอาหาร (Search Food)</label>
        <input class="input" id="ed-q" type="search" placeholder="เช่น กะเพรา, ข้าวมันไก่, banana" autocomplete="off" enterkeyhint="search" data-in="ed-search" value="${esc(ED.query)}">
      </div>
      <div id="ed-results">${resultsHTML()}</div>
      <div id="ed-form">${formHTML()}</div>`;
  }
  function editorFoot() {
    const left = ED.id ? `<button class="btn danger sm" data-act="ed-delete" aria-label="ลบ">${icon('trash')}<span class="hide-mobile">ลบ</span></button>${ED.mode === 'log' ? `<button class="btn sm" data-act="ed-copy" aria-label="คัดลอก">${icon('copy')}<span class="hide-mobile">คัดลอก</span></button>` : ''}` : '';
    return `${left}<span class="spacer"></span><button class="btn" data-act="sheet-close">ยกเลิก</button><button class="btn primary" data-act="ed-save">${icon('check')} บันทึก</button>`;
  }

  function photoBlock() {
    if (!ED.photo) return `
      <div class="row wrap">
        <label class="btn soft camera" for="in-camera" data-pick="editor" style="flex:1">${icon('camera')} ถ่ายรูปอาหาร</label>
        <label class="btn" for="in-library" data-pick="editor" style="flex:1">${icon('image')} Photo Library</label>
      </div>`;
    const src = ED.photo.url ? `<img src="${ED.photo.url}" alt="รูปอาหาร">` : `<span data-photo="${esc(ED.photo.id)}" data-kind="full" style="display:block;min-height:120px"></span>`;
    let ai = '';
    if (App.aiAvailable && Store.settings.aiVision) {
      if (ED.aiBusy) ai = `<div class="ai-box row"><span class="spinner"></span><span>กำลังวิเคราะห์รูป… อาจใช้เวลา 10–60 วินาที</span><span class="spacer" style="flex:1"></span><button class="btn sm" data-act="ed-ai-stop">หยุด</button></div>`;
      else if (ED.aiConfirm) ai = `<div class="ai-box stack"><b>ส่งรูปนี้ให้ Claude วิเคราะห์?</b><span class="small">รูปจะถูกส่งออกจากเครื่องไปยัง Claude เพื่อประมาณชนิดอาหารและสารอาหาร ใช้โควตาบัญชี Claude ของคุณ ผลเป็นค่าประมาณที่ต้องตรวจสอบเอง</span><div class="row"><button class="btn sm" data-act="ed-ai-cancel">ยกเลิก</button><button class="btn sm primary" data-act="ed-ai-go">ส่งรูปและวิเคราะห์</button></div></div>`;
      else if (ED.ai) ai = aiResultHTML();
      else ai = `<button class="btn soft sm" data-act="ed-ai-ask">${icon('sparkle')} ให้ AI ช่วยประมาณจากรูป</button>`;
    }
    return `<div class="photo-box">${src}
      <div class="ph-actions">
        <label class="btn sm" for="in-camera" data-pick="editor">${icon('camera')} ถ่ายใหม่</label>
        <label class="btn sm" for="in-library" data-pick="editor">${icon('image')} เปลี่ยนรูป</label>
        <button class="btn sm danger" data-act="ed-photo-remove">${icon('trash')} เอารูปออก</button>
      </div></div>${ai ? `<div style="margin-top:10px">${ai}</div>` : ''}`;
  }
  function aiResultHTML() {
    const r = ED.ai;
    if (!r.items.length) return `<div class="ai-box"><b>AI ไม่พบอาหารในรูป</b><p class="small" style="margin:4px 0 0">${esc(r.note || 'เลือกอาหารจากฐานข้อมูลแทน')}</p></div>`;
    const conf = { low: 'ความมั่นใจต่ำ', medium: 'ความมั่นใจปานกลาง', high: 'ความมั่นใจสูง' };
    return `<div class="ai-box stack"><div class="row between"><b>ผลประมาณจาก AI</b><span class="est">Estimated Nutrition</span></div>
      ${r.items.map((it, i) => `<div class="ai-item"><div style="flex:1;min-width:0"><div>${esc(it.name)} <span class="tag">${esc(it.serving)}</span></div><div class="tiny muted">${N(it.base.kcal)} kcal · P ${N(it.base.protein)} · C ${N(it.base.carbs)} · F ${N(it.base.fat)} · ${conf[it.confidence]}</div></div><button class="btn sm" data-act="ed-ai-use" data-i="${i}">ใช้ค่านี้</button></div>`).join('')}
      ${r.items.length > 1 ? `<button class="btn sm soft" data-act="ed-ai-all">บันทึกทุกรายการลง${Calc.MEAL_TH[ED.meal]}</button>` : ''}
      ${r.note ? `<p class="tiny muted" style="margin:0">${esc(r.note)}</p>` : ''}
      <p class="tiny muted" style="margin:0">ผลจาก AI ไม่แม่นยำ 100% ตรวจและแก้ไขค่าก่อนบันทึก</p></div>`;
  }
  function hydrateEditorPhoto() { if (App.sheet.el) App.loadPhotos(App.sheet.el); }

  function resultsHTML() {
    const q = ED.query.trim();
    if (q) {
      const list = Foods.search(q, Store.allFoodsWithFav().filter(f => !f.builtin));
      const fav = new Set(Store.settings.favorites || []);
      if (!list.length) return `<div class="callout small">ไม่พบ "${esc(q)}" ในฐานข้อมูล พิมพ์ชื่อและค่าสารอาหารเองด้านล่าง แล้วติ๊ก "บันทึกเป็นอาหารของฉัน" เพื่อใช้ครั้งต่อไป <button class="btn sm soft" data-act="ed-use-name" style="margin-top:8px">ใช้ชื่อ "${esc(q)}"</button></div>`;
      return `<div class="search-results" role="listbox">${list.map(f => itemHTML(f, fav.has(f.id) || f.favorite)).join('')}</div>`;
    }
    const recent = (Store.settings.recent || []).slice(0, 6);
    const favs = Store.allFoodsWithFav().filter(f => f.favorite).slice(0, 8);
    if (!recent.length && !favs.length) return `<p class="help" style="margin:0">พิมพ์ชื่ออาหารเพื่อค้นหา มีอาหารไทยที่พบบ่อยกว่า 100 รายการ</p>`;
    let h = '';
    if (favs.length) h += `<div class="lbl small muted" style="margin-bottom:6px">${icon('star').replace('class=""', 'style="width:14px;height:14px;vertical-align:-2px"')} Favorite</div><div class="chips" style="margin-bottom:10px">${favs.map(f => `<button class="chip" data-act="ed-pick" data-id="${esc(f.id)}">${esc(f.name)}</button>`).join('')}</div>`;
    if (recent.length) h += `<div class="lbl small muted" style="margin-bottom:6px">ล่าสุด</div><div class="chips">${recent.map((r, i) => `<button class="chip" data-act="ed-pick-recent" data-i="${i}">${esc(r.name)}${r.qty !== 1 ? ' ×' + r.qty : ''}</button>`).join('')}</div>`;
    return h;
  }
  function itemHTML(f, fav) {
    return `<button class="sr-item" data-act="ed-pick" data-id="${esc(f.id)}" role="option">
      <div class="grow"><div class="nm">${esc(f.name)}${!f.builtin ? '<span class="tag mine">ของฉัน</span>' : ''}${fav ? '<span class="tag fav">★</span>' : ''}</div>
      <div class="meta">${esc(f.serving)} · P ${N(f.n.protein)} · C ${N(f.n.carbs)} · F ${N(f.n.fat)}</div></div>
      <div class="kc">${N(f.n.kcal)} kcal</div></button>`;
  }

  function formHTML() {
    const fav = ED.foodId ? Store.isFavorite(ED.foodId) : false;
    const err = ED.errors;
    return `
      <div class="row between" style="margin-bottom:10px"><span class="est">${icon('info').replace('class=""', 'style="width:13px;height:13px"')} Estimated Nutrition</span><span class="tiny muted">ค่าประมาณ แก้ไขได้ทุกค่า</span></div>
      <div class="form-grid">
        <div class="field full"><label for="ed-name">ชื่ออาหาร (Food Name)</label><input class="input ${err.name ? 'invalid' : ''}" id="ed-name" data-in="ed-f" data-k="name" value="${esc(ED.name)}" placeholder="เช่น ข้าวกะเพราหมูสับ" autocomplete="off">${err.name ? `<span class="err-text">${err.name}</span>` : ''}</div>
        <div class="field"><label for="ed-serving">หน่วยบริโภค (Serving Size)</label><input class="input" id="ed-serving" data-in="ed-f" data-k="serving" value="${esc(ED.serving)}" placeholder="1 จาน"></div>
        <div class="field"><label for="ed-qty">จำนวน (Quantity)</label>
          <div class="stepper"><button type="button" data-act="ed-qty" data-d="-0.5" aria-label="ลดจำนวน">−</button><input class="input ${err.qty ? 'invalid' : ''}" id="ed-qty" inputmode="decimal" data-in="ed-f" data-k="qty" value="${ED.qty}"><button type="button" data-act="ed-qty" data-d="0.5" aria-label="เพิ่มจำนวน">+</button></div>
          ${err.qty ? `<span class="err-text">${err.qty}</span>` : ''}</div>
      </div>
      <div class="lbl small muted" style="margin:14px 0 6px">สารอาหารต่อ 1 หน่วยบริโภค</div>
      <div class="nut-grid">${NUT_FIELDS.map(([k, label, unit]) => `<div class="field"><label for="ed-n-${k}">${label} (${unit})</label><input class="input ${err[k] ? 'invalid' : ''}" id="ed-n-${k}" inputmode="decimal" data-in="ed-n" data-k="${k}" value="${ED.base[k] || ED.base[k] === 0 ? Calc.round(ED.base[k], 1) : ''}"></div>`).join('')}</div>
      ${err.kcal ? `<p class="err-text">${err.kcal}</p>` : ''}
      <div class="totals-line" id="ed-total" style="margin-top:12px">${totalsText()}</div>
      <div class="field" style="margin-top:12px"><label for="ed-note">โน้ต (Note)</label><input class="input" id="ed-note" data-in="ed-f" data-k="note" value="${esc(ED.note)}" placeholder="เช่น ไม่ใส่น้ำตาล, กินครึ่งจาน"></div>
      <div class="row wrap" style="margin-top:8px">
        ${!ED.foodId || !Store.findFood(ED.foodId) || Store.findFood(ED.foodId).builtin ? `<label class="toggle"><input type="checkbox" data-ch="ed-custom" ${ED.saveAsCustom ? 'checked' : ''}> บันทึกเป็นอาหารของฉัน (Custom Food)</label>` : ''}
        ${ED.foodId ? `<button class="btn sm ${fav ? 'soft' : ''}" data-act="ed-fav">${icon('star')} ${fav ? 'อยู่ใน Favorite' : 'เพิ่มเป็น Favorite'}</button>` : ''}
      </div>`;
  }
  function totalsText() {
    const t = Calc.entryTotals(ED);
    return `รวม ${N(t.kcal)} kcal · P ${N(t.protein, 1)} g · C ${N(t.carbs, 1)} g · F ${N(t.fat, 1)} g · Fiber ${N(t.fiber, 1)} g · Sodium ${N(t.sodium)} mg`;
  }
  const refreshTotals = () => { const el = document.getElementById('ed-total'); if (el) el.textContent = totalsText(); };
  const refreshForm = () => { const el = document.getElementById('ed-form'); if (el) el.innerHTML = formHTML(); };
  const refreshResults = () => { const el = document.getElementById('ed-results'); if (el) el.innerHTML = resultsHTML(); };
  const refreshPhoto = () => { const el = document.getElementById('ed-photo'); if (el) { el.innerHTML = photoBlock(); hydrateEditorPhoto(); } };

  App.inputs['ed-search'] = el => { if (!ED) return; ED.query = el.value; refreshResults(); };
  App.inputs['ed-date'] = el => { if (ED && el.value) ED.date = el.value; };
  App.inputs['ed-f'] = el => {
    if (!ED) return;
    const k = el.dataset.k;
    if (k === 'qty') ED.qty = App.num(el.value); else ED[k] = el.value;
    if (k === 'name' && ED.foodId) { const f = Store.findFood(ED.foodId); if (f && f.name !== el.value) ED.foodId = null; }
    refreshTotals();
  };
  App.inputs['ed-n'] = el => { if (!ED) return; const v = App.num(el.value); ED.base[el.dataset.k] = isNaN(v) ? 0 : v; refreshTotals(); };
  App.changes['ed-custom'] = el => { if (ED) ED.saveAsCustom = el.checked; };
  App.actions['ed-meal'] = el => { if (!ED) return; ED.meal = el.dataset.meal; App.$$('[data-act="ed-meal"]').forEach(b => b.classList.toggle('on', b.dataset.meal === ED.meal)); };
  App.actions['ed-qty'] = el => {
    if (!ED) return;
    const q = Math.max(0.5, Calc.round((isNaN(ED.qty) ? 1 : ED.qty) + parseFloat(el.dataset.d), 2));
    ED.qty = q; const inp = document.getElementById('ed-qty'); if (inp) inp.value = q; refreshTotals();
  };
  function fillFrom(f, qty = 1) {
    ED.foodId = f.id; ED.name = f.name; ED.serving = f.serving; ED.base = Object.assign(emptyBase(), f.n || f.base); ED.qty = qty; ED.query = ''; ED.errors = {};
    const q = document.getElementById('ed-q'); if (q) q.value = '';
    refreshResults(); refreshForm();
  }
  App.actions['ed-pick'] = el => { if (!ED) return; const f = Store.findFood(el.dataset.id); if (f) fillFrom(f); };
  App.actions['ed-pick-recent'] = el => {
    if (!ED) return; const r = (Store.settings.recent || [])[+el.dataset.i]; if (!r) return;
    const f = r.foodId && Store.findFood(r.foodId);
    if (f) fillFrom(f, r.qty || 1);
    else { ED.foodId = null; ED.name = r.name; ED.serving = r.serving; ED.base = Object.assign(emptyBase(), r.base); ED.qty = r.qty || 1; refreshForm(); }
  };
  App.actions['ed-use-name'] = () => { if (!ED) return; ED.name = ED.query.trim(); ED.foodId = null; ED.saveAsCustom = true; ED.query = ''; document.getElementById('ed-q').value = ''; refreshResults(); refreshForm(); const k = document.getElementById('ed-n-kcal'); k && k.focus(); };
  App.actions['ed-fav'] = async () => { if (!ED || !ED.foodId) return; const on = await Store.toggleFavorite(ED.foodId); refreshForm(); App.toast(on ? 'เพิ่มใน Favorite แล้ว' : 'นำออกจาก Favorite แล้ว'); };
  App.actions['ed-photo-remove'] = () => { if (!ED) return; if (ED.photo && ED.photo.url) URL.revokeObjectURL(ED.photo.url); ED.photo = null; ED.ai = null; refreshPhoto(); };

  async function setEditorPhoto(file) {
    const box = document.getElementById('ed-photo');
    if (box) box.innerHTML = '<div class="row"><span class="spinner"></span> กำลังย่อและบีบอัดรูป…</div>';
    try {
      const p = await Photos.process(file);
      if (!ED) return;
      if (ED.photo && ED.photo.url) URL.revokeObjectURL(ED.photo.url);
      ED.photo = { blob: p.blob, thumb: p.thumb, url: URL.createObjectURL(p.blob) };
      ED.ai = null;
      refreshPhoto();
    } catch (e) { refreshPhoto(); App.fail(e, 'เตรียมรูปไม่สำเร็จ'); }
  }

  /* AI (optional, consent every time) */
  let aiCtl = null;
  App.actions['ed-ai-ask'] = () => { if (!ED) return; ED.aiConfirm = true; refreshPhoto(); };
  App.actions['ed-ai-cancel'] = () => { if (!ED) return; ED.aiConfirm = false; refreshPhoto(); };
  App.actions['ed-ai-stop'] = () => { if (aiCtl) aiCtl.abort(); };
  App.actions['ed-ai-go'] = async () => {
    if (!ED || !ED.photo) return;
    ED.aiConfirm = false; ED.aiBusy = true; refreshPhoto();
    aiCtl = new AbortController();
    try {
      let blob = ED.photo.blob;
      if (!blob && ED.photo.id) { const rec = await DB.get('photos', ED.photo.id); blob = rec && rec.blob; }
      const res = await Vision.ai.estimate(blob, ED.name || ED.query, aiCtl.signal);
      if (!ED) return;
      ED.ai = res;
    } catch (e) {
      if (ED && e && e.code !== 'cancelled') App.toast(Vision.message(e), { error: true });
      if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'images_unavailable')) App.aiAvailable = false;
    } finally { if (ED) { ED.aiBusy = false; refreshPhoto(); } aiCtl = null; }
  };
  App.actions['ed-ai-use'] = el => {
    if (!ED || !ED.ai) return; const it = ED.ai.items[+el.dataset.i]; if (!it) return;
    ED.foodId = null; ED.name = it.name; ED.serving = it.serving; ED.base = Object.assign(emptyBase(), it.base); ED.qty = 1; ED.note = ED.note || 'ประมาณโดย AI';
    refreshForm();
  };
  App.actions['ed-ai-all'] = async () => {
    if (!ED || !ED.ai) return;
    const photoId = await persistPhoto();
    const list = ED.ai.items.map((it, i) => ({ date: ED.date, meal: ED.meal, foodId: null, name: it.name, serving: it.serving, qty: 1, base: it.base, note: 'ประมาณโดย AI', photoId: i === 0 ? photoId : null }));
    await Store.putEntries(list);
    App.sheet.close(true); ED = null;
    App.render({ keepScroll: true });
    App.toast(`บันทึก ${list.length} รายการแล้ว`);
  };

  async function persistPhoto() {
    if (!ED.photo) return null;
    if (ED.photo.id) return ED.photo.id;
    const id = await Store.savePhoto(ED.photo.blob, ED.photo.thumb);
    URL.revokeObjectURL(ED.photo.url);
    ED.photo = { id };
    return id;
  }

  function validate() {
    const e = {};
    if (!String(ED.name || '').trim()) e.name = 'กรุณาใส่ชื่ออาหาร';
    if (isNaN(ED.qty) || ED.qty <= 0 || ED.qty > 50) e.qty = 'จำนวนต้องอยู่ระหว่าง 0.1 ถึง 50';
    for (const [k, label, unit, max] of NUT_FIELDS) {
      const v = ED.base[k];
      if (isNaN(v) || v < 0 || v > max) e[k] = `${label} ต้องอยู่ระหว่าง 0–${Calc.num(max)} ${unit}`;
    }
    if (e.kcal == null && !(ED.base.kcal > 0)) e.kcal = 'กรุณาใส่ Calories ต่อหน่วยบริโภค (มากกว่า 0)';
    ED.errors = e;
    return !Object.keys(e).length;
  }

  App.actions['ed-save'] = async btn => {
    if (!ED) return;
    if (!validate()) { refreshForm(); App.toast(Object.values(ED.errors)[0], { error: true }); return; }
    btn.disabled = true;
    const ed = ED;
    try {
      const rec = { date: ed.date, meal: ed.meal, foodId: ed.foodId, name: ed.name.trim(), serving: (ed.serving || '1 ที่').trim(), qty: Calc.round(ed.qty, 2), base: Object.assign({}, ed.base), note: (ed.note || '').trim() };
      if (ed.saveAsCustom) {
        const cf = await Store.putFood({ name: rec.name, serving: rec.serving, n: Object.assign({}, rec.base), favorite: true, alias: '' });
        rec.foodId = cf.id;
      }
      if (ed.mode === 'plan') {
        const plan = Store.plans.get(ed.date) || { date: ed.date, items: [] };
        const items = (plan.items || []).filter(i => i.id !== ed.id);
        items.push(Object.assign({ id: ed.id || Store.uid('pi') }, rec));
        await Store.putPlan({ date: ed.date, items });
        App.sheet.close(true); ED = null; App.render({ keepScroll: true });
        App.toast('เพิ่มในแผนแล้ว');
        return;
      }
      const photoId = await persistPhoto();
      rec.photoId = photoId;
      if (ed.id) { rec.id = ed.id; const old = Store.entries.find(x => x.id === ed.id); if (old) { rec.createdAt = old.createdAt; rec.demo = old.demo; } }
      const saved = await Store.putEntry(rec);
      if (ed.origPhotoId && ed.origPhotoId !== photoId) await Store.delPhotoIfUnused(ed.origPhotoId);
      App.sheet.close(true); ED = null;
      App.render({ keepScroll: true });
      const t = Calc.dayTotals(saved.date), tk = Calc.targetKcalFor(saved.date);
      App.toast(`บันทึกแล้ว · วันนี้ ${N(t.kcal)}${tk ? ' / ' + N(tk) : ''} kcal`, photoId ? { action: { label: 'เพิ่มอีกรายการจากรูปนี้', fn: () => App.openEditor({ mode: 'log', date: saved.date, meal: saved.meal, photo: { id: photoId }, focusSearch: true }) } } : {});
    } catch (e) { btn.disabled = false; App.fail(e, 'บันทึกไม่สำเร็จ'); }
  };

  App.actions['ed-delete'] = async () => {
    if (!ED || !ED.id) return;
    const ed = ED;
    const ok = await App.confirm({ title: 'ลบรายการนี้?', message: `ลบ "${esc(ed.name)}" ออกจาก${ed.mode === 'plan' ? 'แผน' : 'บันทึก'}`, ok: 'ลบ', danger: true });
    if (!ok) { App.openEditor(Object.assign({ mode: ed.mode, date: ed.date }, ed.mode === 'plan' ? { planItem: (Store.plans.get(ed.date).items || []).find(i => i.id === ed.id) } : { entry: Store.entries.find(e => e.id === ed.id) })); return; }
    if (ed.mode === 'plan') {
      const plan = Store.plans.get(ed.date);
      await Store.putPlan({ date: ed.date, items: (plan.items || []).filter(i => i.id !== ed.id) });
    } else await Store.delEntries([ed.id]);
    App.render({ keepScroll: true });
    App.toast('ลบแล้ว');
  };

  App.actions['ed-copy'] = () => { if (!ED || !ED.id) return; const id = ED.id; App.sheet.close(true); App.openCopy({ ids: [id], label: 'คัดลอกอาหาร (Copy Food)' }); };

  App.editEntry = id => { const e = Store.entries.find(x => x.id === id); if (e) App.openEditor({ mode: 'log', entry: e, date: e.date }); };
  App.actions['entry'] = el => App.editEntry(el.dataset.id);

  /* ================= COPY FOOD / COPY MEAL ================= */
  App.openCopy = function ({ ids, label }) {
    const src = Store.entries.filter(e => ids.includes(e.id));
    if (!src.length) return;
    const srcDate = src[0].date;
    const def = srcDate === Calc.today() ? Calc.add(srcDate, 1) : Calc.today();
    App._copy = { ids, meal: src[0].meal, dest: 'log' };
    App.sheet.open({
      title: label, name: 'copy',
      body: `<p class="small muted" style="margin:0">${src.map(e => esc(e.name)).join(', ')}</p>
        <div class="field"><label for="cp-date">ไปยังวันที่</label><input class="input" type="date" id="cp-date" value="${def}"></div>
        <div class="field"><span class="lbl">ไปยังมื้อ</span><div class="chips">${Calc.MEALS.map(m => `<button class="chip ${m === src[0].meal ? 'on' : ''}" data-act="cp-meal" data-meal="${m}">${Calc.MEAL_TH[m]}</button>`).join('')}</div></div>
        <div class="field"><span class="lbl">ปลายทาง</span><div class="seg"><button class="on" data-act="cp-dest" data-d="log">บันทึกอาหาร</button><button data-act="cp-dest" data-d="plan">Meal Plan</button></div></div>`,
      foot: `<button class="btn" data-act="sheet-close">ยกเลิก</button><button class="btn primary" data-act="cp-go">${icon('copy')} คัดลอก</button>`
    });
  };
  App.actions['cp-meal'] = el => { App._copy.meal = el.dataset.meal; App.$$('[data-act="cp-meal"]').forEach(b => b.classList.toggle('on', b === el)); };
  App.actions['cp-dest'] = el => { App._copy.dest = el.dataset.d; App.$$('[data-act="cp-dest"]').forEach(b => b.classList.toggle('on', b === el)); };
  App.actions['cp-go'] = async () => {
    const date = document.getElementById('cp-date').value;
    if (!date) { App.toast('เลือกวันที่ก่อน', { error: true }); return; }
    const c = App._copy;
    const src = Store.entries.filter(e => c.ids.includes(e.id));
    const items = src.map(e => ({ date, meal: c.meal, foodId: e.foodId || null, name: e.name, serving: e.serving, qty: e.qty, base: Object.assign({}, e.base), note: e.note || '', photoId: e.photoId || null }));
    if (c.dest === 'plan') {
      const plan = Store.plans.get(date) || { date, items: [] };
      await Store.putPlan({ date, items: (plan.items || []).concat(items.map(i => Object.assign({ id: Store.uid('pi') }, i, { photoId: null }))) });
    } else await Store.putEntries(items);
    App.sheet.close(true); App.render({ keepScroll: true });
    App.toast(`คัดลอก ${items.length} รายการไป ${Calc.fmt.rel(date)} แล้ว`);
  };

  /* meal menu */
  App.actions['meal-menu'] = el => {
    const { date, meal } = el.dataset;
    const n = Calc.mealEntries(date, meal).length;
    App.sheet.open({
      title: `${Calc.MEAL_TH[meal]} · ${Calc.fmt.day(date)}`, name: 'meal-menu',
      body: `<div class="stack">
        <button class="btn block" data-act="add-food" data-date="${date}" data-meal="${meal}">${icon('plus')} เพิ่มอาหารในมื้อนี้</button>
        <button class="btn block" data-act="meal-copy" data-date="${date}" data-meal="${meal}" ${n ? '' : 'disabled'}>${icon('copy')} คัดลอกทั้งมื้อ (Copy Meal)</button>
        <button class="btn block danger" data-act="meal-delete" data-date="${date}" data-meal="${meal}" ${n ? '' : 'disabled'}>${icon('trash')} ลบทั้งมื้อ (${n} รายการ)</button></div>`
    });
  };
  App.actions['meal-copy'] = el => { const ids = Calc.mealEntries(el.dataset.date, el.dataset.meal).map(e => e.id); App.sheet.close(true); App.openCopy({ ids, label: 'คัดลอกทั้งมื้อ (Copy Meal)' }); };
  App.actions['meal-delete'] = async el => {
    const { date, meal } = el.dataset;
    const list = Calc.mealEntries(date, meal);
    const ok = await App.confirm({ title: 'ลบทั้งมื้อ?', message: `ลบ ${list.length} รายการใน${Calc.MEAL_TH[meal]} วันที่ ${Calc.fmt.day(date)} รูปที่แนบไว้จะถูกลบด้วย`, ok: 'ลบทั้งมื้อ', danger: true });
    if (!ok) return;
    await Store.delEntries(list.map(e => e.id));
    App.render({ keepScroll: true }); App.toast('ลบมื้อแล้ว');
  };

  /* ================= WEIGHT (#7) ================= */
  App.openWeight = function (date) {
    const d = date || Calc.today();
    const ex = Store.weightMap.get(d);
    const last = Calc.latestWeight(Calc.today());
    App._wEdit = !!ex;
    App.sheet.open({
      title: ex ? 'แก้ไขน้ำหนัก' : 'บันทึกน้ำหนัก', name: 'weight',
      body: `
        <div class="form-grid">
          <div class="field full"><label for="w-date">วันที่</label><input class="input" type="date" id="w-date" value="${d}" max="${Calc.today()}" data-ch="w-date"></div>
          <div class="field full"><label for="w-kg">น้ำหนัก (kg)</label><input class="input" id="w-kg" inputmode="decimal" placeholder="${last ? last.weight : 'เช่น 72.4'}" value="${ex ? ex.weight : ''}" style="font-size:24px;font-weight:700;min-height:58px" data-enter="w-save"></div>
          <div class="field"><label for="w-waist">รอบเอว (cm) ไม่บังคับ</label><input class="input" id="w-waist" inputmode="decimal" value="${ex && ex.waist != null ? ex.waist : ''}"></div>
          <div class="field"><label for="w-bf">Body Fat (%) ไม่บังคับ</label><input class="input" id="w-bf" inputmode="decimal" value="${ex && ex.bodyFat != null ? ex.bodyFat : ''}"></div>
          <div class="field full"><label for="w-note">โน้ต ไม่บังคับ</label><input class="input" id="w-note" value="${esc(ex ? ex.note || '' : '')}" placeholder="เช่น ชั่งหลังตื่นนอน"></div>
        </div>
        <p class="help" style="margin:0">ชั่งเวลาเดิมทุกวัน เช่น หลังตื่นนอนและเข้าห้องน้ำ เพื่อให้แนวโน้มแม่นขึ้น</p>
        <p class="err-text" id="w-err" hidden></p>`,
      foot: `${ex ? `<button class="btn danger sm" data-act="w-del" data-date="${d}">${icon('trash')} ลบ</button><span class="spacer"></span>` : ''}<button class="btn" data-act="sheet-close">ยกเลิก</button><button class="btn primary" data-act="w-save">${icon('check')} บันทึก</button>`
    });
    setTimeout(() => { const i = document.getElementById('w-kg'); i && i.focus(); }, 60);
  };
  App.changes['w-date'] = el => { if (el.value) App.openWeight(el.value); };
  App.actions['w-save'] = async () => {
    const date = document.getElementById('w-date').value;
    const w = App.num(document.getElementById('w-kg').value);
    const waist = App.num(document.getElementById('w-waist').value);
    const bf = App.num(document.getElementById('w-bf').value);
    const note = document.getElementById('w-note').value.trim();
    const errEl = document.getElementById('w-err');
    const fail = m => { errEl.textContent = m; errEl.hidden = false; };
    if (!date) return fail('กรุณาเลือกวันที่');
    if (date > Calc.today()) return fail('บันทึกน้ำหนักล่วงหน้าไม่ได้');
    if (isNaN(w) || w < 20 || w > 300) return fail('น้ำหนักไม่ถูกต้อง กรุณาใส่ตัวเลขระหว่าง 20–300 kg');
    if (!isNaN(waist) && (waist < 30 || waist > 250)) return fail('รอบเอวควรอยู่ระหว่าง 30–250 cm');
    if (!isNaN(bf) && (bf < 2 || bf > 70)) return fail('Body Fat ควรอยู่ระหว่าง 2–70%');
    const prev = Calc.latestWeight(Calc.add(date, -1));
    await Store.putWeight({ date, weight: Calc.round(w, 2), waist: isNaN(waist) ? null : waist, bodyFat: isNaN(bf) ? null : bf, note });
    App.sheet.close(true); App.render({ keepScroll: true });
    App.toast(prev ? `บันทึกแล้ว ${Calc.signed(w - prev.weight, 1)} kg จาก ${Calc.fmt.rel(prev.date)}` : 'บันทึกน้ำหนักแล้ว');
  };
  App.actions['w-del'] = async el => {
    const d = el.dataset.date;
    const ok = await App.confirm({ title: 'ลบน้ำหนักวันนี้?', message: `ลบน้ำหนักวันที่ ${Calc.fmt.day(d)}`, ok: 'ลบ', danger: true });
    if (!ok) { App.openWeight(d); return; }
    await Store.delWeight(d); App.render({ keepScroll: true }); App.toast('ลบแล้ว');
  };
  App.actions['weight-row'] = el => App.openWeight(el.dataset.date);

  /* ================= NOTE ================= */
  App.openNote = function (date) {
    const ex = Store.notes.get(date);
    App.sheet.open({
      title: 'บันทึกโน้ต', name: 'note',
      body: `<div class="field"><label for="n-date">วันที่</label><input class="input" type="date" id="n-date" value="${date}" data-ch="n-date"></div>
        <div class="field"><label for="n-text">โน้ตประจำวัน</label><textarea class="input" id="n-text" rows="5" placeholder="เช่น นอนน้อย, ออกกำลังกาย 30 นาที, งานเลี้ยง">${esc(ex ? ex.text : '')}</textarea></div>
        <p class="help" style="margin:0">หากมีอาการผิดปกติ ควรปรึกษาแพทย์ ระบบนี้ไม่วินิจฉัยโรค</p>`,
      foot: `<button class="btn" data-act="sheet-close">ยกเลิก</button><button class="btn primary" data-act="n-save">${icon('check')} บันทึก</button>`
    });
  };
  App.changes['n-date'] = el => { if (el.value) App.openNote(el.value); };
  App.actions['n-save'] = async () => {
    const date = document.getElementById('n-date').value; const text = document.getElementById('n-text').value;
    await Store.putNote(date, text);
    App.sheet.close(true); App.render({ keepScroll: true });
    const sym = Calc.SYMPTOMS.some(s => text.includes(s));
    App.toast(sym ? 'บันทึกแล้ว · หากอาการไม่ดีขึ้น ควรปรึกษาแพทย์' : 'บันทึกโน้ตแล้ว');
  };

  /* ================= ASSISTANT (#26, #27) ================= */
  App._chat = [];
  App.actions.assistant = () => {
    App.sheet.open({
      title: 'Nutrition Assistant', name: 'assistant', wide: true,
      body: `<div class="callout small">ตอบจากข้อมูลที่บันทึกในเครื่องนี้เท่านั้น ทำงานออฟไลน์ เป็นคำแนะนำเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์</div>
        <div class="chips">${Assistant.QUESTIONS.map((q, i) => `<button class="chip" data-act="ask" data-i="${i}">${esc(q)}</button>`).join('')}</div>
        <div class="chat" id="chat">${chatHTML()}</div>`,
      foot: `<input class="input" id="ask-input" placeholder="พิมพ์คำถาม เช่น มื้อเย็นควรกินเท่าไร" style="flex:1;min-width:0" data-enter="ask-send" enterkeyhint="send"><button class="btn primary" data-act="ask-send">ถาม</button>`
    });
  };
  function chatHTML() {
    return App._chat.map(m => m.q ? `<div class="msg q">${esc(m.q)}</div>` : `<div class="msg a tone-${m.tone || 'neutral'}">${m.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`).join('');
  }
  function ask(q) {
    const a = Assistant.answer(q);
    App._chat.push({ q }, a);
    App._chat = App._chat.slice(-20);
    const c = document.getElementById('chat'); if (c) { c.innerHTML = chatHTML(); c.lastElementChild && c.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  App.actions.ask = el => ask(Assistant.QUESTIONS[+el.dataset.i]);
  App.actions['ask-send'] = () => { const i = document.getElementById('ask-input'); if (i && i.value.trim()) { ask(i.value.trim()); i.value = ''; } };

  /* ================= DAILY DETAIL (#30) ================= */
  App.openDay = function (date) {
    const tot = Calc.dayTotals(date), t = Calc.targets(), tk = Calc.targetKcalFor(date);
    const w = Store.weightMap.get(date);
    const note = Store.notes.get(date);
    const adv = Calc.dailyAdvice(date);
    const photos = [...new Set(Calc.dayEntries(date).filter(e => e.photoId).map(e => e.photoId))];
    const status = Calc.dayStatus(date);
    const stTxt = { ok: 'อยู่ในเป้าหมาย', warn: 'ต่างจากเป้า 10–25%', bad: 'ต่างจากเป้ามากกว่า 25%', progress: 'วันนี้ (ยังไม่จบวัน)' }[status] || 'ไม่มีบันทึกอาหาร';
    const plan = Store.plans.get(date);
    App.sheet.open({
      title: Calc.fmt.long(date), name: 'day', wide: true,
      body: `
        <div class="kv-grid">
          <div class="kv"><div class="k">น้ำหนัก</div><div class="v">${w ? N(w.weight, 1) + ' <small>kg</small>' : '–'}</div></div>
          <div class="kv"><div class="k">Calories</div><div class="v">${N(tot.kcal)} <small>/ ${N(tk)} kcal</small></div></div>
          <div class="kv"><div class="k">Protein</div><div class="v">${N(tot.protein)} <small>/ ${t ? t.protein : '–'} g</small></div></div>
          <div class="kv"><div class="k">สถานะ</div><div class="v" style="font-size:14px"><span class="pill ${status === 'progress' ? 'accent' : status || ''}"><span class="dot"></span>${stTxt}</span></div></div>
        </div>
        <div class="small muted">Carbs ${N(tot.carbs)} g · Fat ${N(tot.fat)} g · Fiber ${N(tot.fiber, 1)} g · Sugar ${N(tot.sugar)} g · Sodium ${N(tot.sodium)} mg</div>
        ${photos.length ? `<div><div class="lbl small muted" style="margin-bottom:6px">รูปอาหาร</div><div class="photo-grid">${photos.map(id => `<span data-photo="${esc(id)}" style="display:block"></span>`).join('')}</div></div>` : ''}
        <div>${Calc.MEALS.map(m => {
          const list = Calc.mealEntries(date, m);
          return `<div class="meal"><div class="meal-h"><span class="name">${Calc.MEAL_TH[m]}</span><span class="kcal">${N(Calc.sumTotals(list).kcal)} kcal</span></div>
            ${list.length ? list.map(e => `<div class="small" style="padding:3px 0">${esc(e.name)} <span class="muted">×${e.qty} · ${N(Calc.entryTotals(e).kcal)} kcal</span></div>`).join('') : '<div class="meal-empty">ไม่มีบันทึก</div>'}</div>`;
        }).join('')}</div>
        ${plan && (plan.items || []).length ? `<div class="callout small">แผนวันนั้น ${N(Calc.sumTotals(plan.items).kcal)} kcal · กินจริง ${N(tot.kcal)} kcal (${Calc.signed(tot.kcal - Calc.sumTotals(plan.items).kcal, 0)})</div>` : ''}
        ${note ? `<div class="callout"><b>โน้ต</b><p style="margin:4px 0 0">${esc(note.text)}</p></div>` : ''}
        <div class="card tone-${adv.tone}" style="padding:12px"><div class="eyebrow" style="margin-bottom:6px">Recommendation</div><div class="advice">${adv.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div></div>`,
      foot: `<button class="btn sm" data-act="add-weight" data-date="${date}" aria-label="น้ำหนัก">${icon('scale')}<span class="hide-mobile">น้ำหนัก</span></button><button class="btn sm" data-act="add-note" data-date="${date}" aria-label="โน้ต">${icon('note')}<span class="hide-mobile">โน้ต</span></button><span class="spacer"></span><button class="btn primary" data-act="nav" data-view="food" data-date="${date}" data-tab="log">เปิดหน้าอาหาร</button>`
    });
    App.$$('[data-photo]', App.sheet.el).forEach(el => { el.dataset.kind = 'thumb'; });
    App.loadPhotos(App.sheet.el);
  };
  App.actions.day = el => App.openDay(el.dataset.date);
})();
