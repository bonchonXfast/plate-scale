/* Plate & Scale — Settings, profile & goals, data management, first run. */
(function () {
  const { esc, icon } = App;
  const N = (v, d = 0) => App.n(v, d);

  /* ---------- Settings view ---------- */
  App.views.settings = function () {
    const p = Store.profile, t = Calc.targets();
    const goalTH = { lose: 'ลดน้ำหนัก (Lose Weight)', maintain: 'รักษาน้ำหนัก (Maintain Weight)', gain: 'เพิ่มน้ำหนัก (Gain Weight)' };
    let h = '<div class="grid g2">';
    h += `<section class="card"><div class="card-h"><h2>Profile & Goals</h2><button class="btn sm primary" data-act="${p ? 'profile-edit' : 'profile-welcome'}">${icon('edit')} ${p ? 'แก้ไข' : 'ตั้งค่า'}</button></div>
      ${p ? `<div class="kv-grid">
        <div class="kv"><div class="k">น้ำหนักตั้งต้นคำนวณ</div><div class="v">${N(p.currentWeight, 1)} <small>kg</small></div></div>
        <div class="kv"><div class="k">เป้าหมาย</div><div class="v">${N(p.targetWeight, 1)} <small>kg</small></div></div>
        <div class="kv"><div class="k">ส่วนสูง</div><div class="v">${N(p.height)} <small>cm</small></div></div>
        <div class="kv"><div class="k">อายุ / เพศ</div><div class="v">${p.age} <small>ปี · ${p.sex === 'male' ? 'ชาย' : 'หญิง'}</small></div></div>
      </div>
      <p class="small" style="margin:12px 0 0">${goalTH[p.goal]}${p.goal !== 'maintain' ? ` · ${p.rate} kg/สัปดาห์` : ''}<br><span class="muted">${esc((Calc.ACTIVITY.find(a => a.v === +p.activity) || {}).label || '')}</span>${p.calorieAdjust ? `<br><span class="muted">ปรับจาก Weekly Review ${Calc.signed(p.calorieAdjust, 0)} kcal/วัน</span>` : ''}${p.demo ? '<br><span class="pill warn">โปรไฟล์ตัวอย่าง</span>' : ''}</p>` : '<p class="muted">ยังไม่ได้ตั้งค่า</p>'}
    </section>`;
    if (t) h += `<section class="card"><div class="card-h"><h2>เป้าหมายรายวัน</h2><span class="est">Estimated Values</span></div>${targetsExplained(t)}</section>`;

    h += `<section class="card"><div class="card-h"><h2>Data Management</h2><span class="sub">ข้อมูลอยู่ในเครื่องนี้</span></div>
      <div class="stack">
        <div class="row wrap"><button class="btn primary" data-act="backup" data-photos="1">${icon('download')} Export Backup</button><button class="btn" data-act="backup" data-photos="0">Backup ไม่รวมรูป</button></div>
        <label class="btn" for="in-restore">${icon('upload')} Restore Backup</label>
        <div class="help">Backup ล่าสุด: ${Store.settings.lastBackupAt ? Calc.fmt.day(Calc.key(new Date(Store.settings.lastBackupAt))) : 'ยังไม่เคย'} · ${App.isArtifact ? 'ไฟล์จะถูกบันทึกผ่านหน้าต่างยืนยันของ Claude' : 'บน iPhone เลือก "บันทึกไปยังไฟล์" เพื่อเก็บใน Files, iCloud Drive หรือส่งด้วย AirDrop'}</div>
        <div class="divider" style="margin:4px 0"></div>
        <div class="lbl small muted">Export CSV (เปิดใน Excel / Google Sheets)</div>
        <div class="row wrap">
          <button class="btn sm" data-act="csv" data-k="weight">Weight History</button>
          <button class="btn sm" data-act="csv" data-k="entries">Nutrition History</button>
          <button class="btn sm" data-act="csv" data-k="daily">Daily Calories</button>
          <button class="btn sm" data-act="csv" data-k="macros">Macro History</button>
        </div>
        <div class="divider" style="margin:4px 0"></div>
        <div><div class="row between small"><span>Storage Usage</span><span id="storage-text" class="muted">กำลังตรวจสอบ…</span></div><div class="storage-bar" style="margin-top:6px"><div id="storage-bar" style="width:0%"></div></div><div id="storage-note" class="help" style="margin-top:6px"></div></div>
        <div class="divider" style="margin:4px 0"></div>
        <div class="row wrap">
          ${Store.hasDemo() ? `<button class="btn" data-act="clear-demo">ล้าง Demo Data</button>` : `<button class="btn" data-act="load-demo" ${Store.hasRealData() ? 'disabled title="ใช้ได้เมื่อยังไม่มีข้อมูลจริง"' : ''}>โหลด Demo Data</button>`}
          <button class="btn danger" data-act="reset-1">${icon('trash')} Reset All Data</button>
        </div>
      </div></section>`;

    h += `<section class="card"><div class="card-h"><h2>วิเคราะห์รูปด้วย AI</h2><span class="sub">AI Vision</span></div>
      ${App.aiAvailable ? `<label class="toggle"><input type="checkbox" data-ch="ai-toggle" ${Store.settings.aiVision ? 'checked' : ''}> เปิดปุ่ม "ให้ AI ช่วยประมาณจากรูป" ในหน้าบันทึกอาหาร</label>
        <p class="small muted" style="margin:6px 0 0">เมื่อกดใช้ รูปจะถูกส่งออกจากเครื่องไปยัง Claude เพื่อประมาณชนิดอาหารและสารอาหาร ระบบจะถามยืนยันทุกครั้งก่อนส่ง ผลเป็นค่าประมาณที่ต้องตรวจสอบเอง ข้อมูลอื่นไม่ถูกส่ง</p>`
        : `<p class="small muted" style="margin:0">เวอร์ชันนี้ประมาณสารอาหารด้วยการเลือกจากฐานข้อมูลอาหารไทยและให้คุณแก้ไขเอง ทำงานออฟไลน์ ไม่มีการส่งรูปออกจากเครื่อง ระบบออกแบบให้เพิ่ม AI Vision ได้ในอนาคต (ตอนนี้ใช้ได้เมื่อเปิดผ่าน Claude)</p>`}
    </section>`;

    h += `<section class="card"><div class="card-h"><h2>${App.isArtifact ? 'การใช้งานบนมือถือ' : 'ติดตั้งบน iPhone'}</h2><span class="sub">${App.isArtifact ? 'ผ่านลิงก์ Claude' : 'ไม่ต้องใช้ App Store'}</span></div>
      ${App.isArtifact ? `<p class="small" style="margin:0">เปิดลิงก์นี้ใน Safari หรือแอป Claude ได้ทันที ข้อมูลเก็บในเบราว์เซอร์ของแต่ละเครื่องแยกกัน ใช้ Backup/Restore เพื่อย้ายข้อมูลระหว่างเครื่อง หากต้องการใช้แบบออฟไลน์เต็มรูปแบบและเพิ่มไอคอนบนหน้าจอโฮม ใช้เวอร์ชัน PWA ที่โฮสต์บนเว็บของคุณเอง</p>`
        : `<ol class="small" style="margin:0;padding-left:20px"><li>เปิดหน้านี้ใน Safari</li><li>กดปุ่มแชร์ (สี่เหลี่ยมมีลูกศรขึ้น)</li><li>เลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</li><li>เปิดจากไอคอน ใช้งานได้แม้ไม่มีอินเทอร์เน็ต</li></ol>
          <p class="small muted" style="margin:8px 0 0" id="sw-status">${navigator.serviceWorker && navigator.serviceWorker.controller ? 'พร้อมใช้งานออฟไลน์แล้ว' : 'กำลังเตรียมโหมดออฟไลน์…'}</p>`}
    </section>`;

    h += `<section class="card"><div class="card-h"><h2>ความปลอดภัยและข้อจำกัด</h2></div>
      <div class="small stack" style="gap:6px">
        <p style="margin:0">แอปนี้เป็น <b>Personal Tracking & Educational Tool</b> ไม่ใช่แพทย์ นักกำหนดอาหาร หรือเครื่องมือวินิจฉัยหรือรักษาโรค</p>
        <p style="margin:0">ตัวเลข Calories และสารอาหารทั้งหมดเป็นค่าประมาณ ค่าจริงขึ้นกับสูตร ขนาด และวิธีปรุง</p>
        <p style="margin:0">หากน้ำหนักลดเร็วผิดปกติ ได้รับพลังงานต่ำมากต่อเนื่อง มีโรคประจำตัว ตั้งครรภ์ หรือมีอาการผิดปกติ ควรปรึกษาแพทย์หรือนักกำหนดอาหารเพื่อประเมินเพิ่มเติม</p>
        <p style="margin:0" class="muted">ไม่มีการ Login ไม่มี Server เก็บข้อมูลส่วนตัว ข้อมูลอยู่ใน IndexedDB ของเบราว์เซอร์นี้ ซึ่งอาจถูกลบได้หากล้างข้อมูลเว็บไซต์หรือพื้นที่เครื่องเต็ม จึงควร Backup เป็นประจำ</p>
      </div></section>`;
    h += '</div>';
    setTimeout(App.updateStorage, 0);
    return h;
  };

  function targetsExplained(t) {
    const row = (k, v, d) => `<div class="cmp-row" style="grid-template-columns:minmax(0,1fr) auto"><span><b>${k}</b><br><span class="tiny muted">${d}</span></span><span class="vals"><b>${v}</b></span></div>`;
    return row('BMI', `${N(t.bmi, 1)} <span class="pill ${t.bmiCat.tone}">${t.bmiCat.label}</span>`, 'ดัชนีมวลกาย น้ำหนัก ÷ ส่วนสูง² (เกณฑ์เอเชีย 18.5–22.9 = ปกติ)')
      + row('BMR', `${N(t.bmr)} kcal`, 'พลังงานที่ร่างกายใช้ขณะพักทั้งวัน (สูตร Mifflin-St Jeor)')
      + row('TDEE', `${N(t.tdee)} kcal`, 'พลังงานที่ใช้ทั้งวันรวมกิจกรรม = BMR × ระดับกิจกรรม')
      + row('Daily Calorie Target', `${N(t.kcal)} kcal`, t.goalDelta ? `TDEE ${t.goalDelta < 0 ? '−' : '+'} ${N(Math.abs(t.goalDelta))} kcal ตามอัตราเป้าหมาย (1 kg ≈ 7,700 kcal)${t.floorApplied ? ` · ไม่ต่ำกว่า ${t.floor} kcal เพื่อความปลอดภัย` : ''}` : 'เท่ากับ TDEE เพื่อรักษาน้ำหนัก')
      + row('Protein Target', `${t.protein} g`, 'ช่วยรักษากล้ามเนื้อและความอิ่ม (1.4–1.8 g/kg ตามเป้าหมาย)')
      + row('Carbohydrate Target', `${t.carbs} g`, 'พลังงานที่เหลือหลังจาก Protein และ Fat')
      + row('Fat Target', `${t.fat} g`, 'ประมาณ 28% ของพลังงานทั้งหมด')
      + row('Fiber Target', `${t.fiber} g`, 'ประมาณ 14 g ต่อ 1,000 kcal ช่วยระบบขับถ่ายและความอิ่ม');
  }
  App.targetsExplained = targetsExplained;

  App.updateStorage = async function () {
    const txt = document.getElementById('storage-text'); if (!txt) return;
    const photos = Store.photoBytes();
    let usage = null, quota = null, persisted = null;
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); usage = e.usage; quota = e.quota; } } catch (e) {}
    try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch (e) {}
    const mb = b => (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB';
    const pct = usage != null && quota ? usage / quota : null;
    txt.textContent = usage != null ? `${mb(usage)}${quota ? ' จาก ' + mb(quota) : ''} · รูปอาหาร ${mb(photos)} (${Store.photoMeta.size} รูป)` : `รูปอาหาร ${mb(photos)} (${Store.photoMeta.size} รูป)`;
    const bar = document.getElementById('storage-bar'); if (bar) { bar.style.width = (pct != null ? Math.max(1, pct * 100) : Math.min(100, photos / 5e8 * 100)).toFixed(1) + '%'; if (pct > 0.75) bar.style.background = 'var(--warn)'; }
    const note = document.getElementById('storage-note');
    if (note) {
      let s = '';
      if (pct != null && pct > 0.75) s += 'พื้นที่จัดเก็บเริ่มสูง ควร Backup แล้วลบรูปเก่าบางส่วน ';
      else if (photos > 300 * 1048576) s += 'รูปอาหารใช้พื้นที่มาก ควร Backup แล้วลบรูปเก่าบางส่วน ';
      if (persisted === false && navigator.storage && navigator.storage.persist && !App.isArtifact) s += '<button class="btn sm" data-act="persist">ขอให้เบราว์เซอร์เก็บข้อมูลถาวร</button>';
      else if (persisted) s += 'เบราว์เซอร์อนุญาตให้เก็บข้อมูลถาวรแล้ว (ยังควร Backup เป็นประจำ)';
      note.innerHTML = s;
    }
  };
  App.actions.persist = async () => {
    try { const ok = await navigator.storage.persist(); App.toast(ok ? 'เบราว์เซอร์จะพยายามเก็บข้อมูลไว้ถาวร' : 'เบราว์เซอร์ไม่อนุญาต ใช้ Backup เป็นประจำแทน'); } catch (e) { App.toast('เบราว์เซอร์นี้ไม่รองรับ', { error: true }); }
    App.updateStorage();
  };

  App.changes['ai-toggle'] = async el => { await Store.saveSettings({ aiVision: el.checked }); App.toast(el.checked ? 'เปิดปุ่ม AI แล้ว ระบบจะถามก่อนส่งรูปทุกครั้ง' : 'ปิดการใช้ AI แล้ว'); };

  /* ---------- Profile & first run (#6, #53) ---------- */
  let PF = null;
  App.openProfile = function (opts = {}) {
    const p = Store.profile && !(opts.welcome && Store.profile.demo) ? Store.profile : null;
    const lw = Calc.latestWeight(Calc.today());
    PF = {
      welcome: !!opts.welcome,
      currentWeight: p ? p.currentWeight : (lw && !lw.demo ? lw.weight : ''), targetWeight: p ? p.targetWeight : '', height: p ? p.height : '', age: p ? p.age : '',
      sex: p ? p.sex : 'male', activity: p ? p.activity : 1.375, goal: p ? p.goal : 'lose', rate: p ? p.rate : 0.5,
      startWeight: p ? p.startWeight : '', clearDemo: true
    };
    const intro = PF.welcome ? `<div><p style="margin:0 0 6px"><b>ยินดีต้อนรับสู่ Plate & Scale</b></p><p class="small muted" style="margin:0">บันทึกอาหาร ถ่ายรูป ดูน้ำหนักและแนวโน้ม แล้ววางแผนวันถัดไป ข้อมูลทั้งหมดเก็บในเครื่องนี้ ไม่ต้อง Login กรอก 7 ข้อด้านล่างเพื่อคำนวณแผน</p></div>` : '';
    App.sheet.open({
      title: PF.welcome ? 'เริ่มต้นใช้งาน' : 'Profile & Goals', name: 'profile',
      body: intro + `<div id="pf-form">${pfForm()}</div><div id="pf-preview">${pfPreview()}</div>`,
      foot: (PF.welcome ? `<button class="btn" data-act="pf-skip">${Store.hasDemo() ? 'ดู Demo ก่อน' : 'ไว้ทีหลัง'}</button>` : `<button class="btn" data-act="sheet-close">ยกเลิก</button>`) + `<button class="btn primary" data-act="pf-save">${icon('check')} ${PF.welcome ? 'Calculate My Plan' : 'บันทึก'}</button>`
    });
  };
  function pfForm(errs = {}) {
    const f = (k, label, ph, unit) => `<div class="field"><label for="pf-${k}">${label}</label><input class="input ${errs[k] ? 'invalid' : ''}" id="pf-${k}" inputmode="decimal" data-in="pf" data-k="${k}" value="${PF[k] === '' || PF[k] == null ? '' : PF[k]}" placeholder="${ph}">${errs[k] ? `<span class="err-text">${errs[k]}</span>` : unit ? `<span class="help">${unit}</span>` : ''}</div>`;
    const chips = (k, opts) => `<div class="chips">${opts.map(([v, l]) => `<button class="chip ${String(PF[k]) === String(v) ? 'on' : ''}" data-act="pf-chip" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const rates = PF.goal === 'gain' ? [[0.25, '0.25 kg/สัปดาห์'], [0.5, '0.50 kg/สัปดาห์']] : [[0.25, '0.25 kg/สัปดาห์'], [0.5, '0.50 kg/สัปดาห์'], [0.75, '0.75 kg/สัปดาห์']];
    return `<div class="form-grid">
      ${f('currentWeight', 'น้ำหนักปัจจุบัน (Current Weight)', 'เช่น 74.5', 'kg')}
      ${f('targetWeight', 'น้ำหนักเป้าหมาย (Target Weight)', 'เช่น 68', 'kg')}
      ${f('height', 'ส่วนสูง (Height)', 'เช่น 170', 'cm')}
      ${f('age', 'อายุ (Age)', 'เช่น 45', 'ปี')}
      <div class="field full"><span class="lbl">เพศ (Sex)</span>${chips('sex', [['male', 'ชาย'], ['female', 'หญิง']])}</div>
      <div class="field full"><label for="pf-activity">ระดับกิจกรรม (Activity Level)</label><select class="input" id="pf-activity" data-ch="pf-activity">${Calc.ACTIVITY.map(a => `<option value="${a.v}" ${+PF.activity === a.v ? 'selected' : ''}>${a.label}</option>`).join('')}</select></div>
      <div class="field full"><span class="lbl">เป้าหมาย (Goal)</span>${chips('goal', [['lose', 'Lose Weight'], ['maintain', 'Maintain'], ['gain', 'Gain Weight']])}</div>
      ${PF.goal !== 'maintain' ? `<div class="field full"><span class="lbl">อัตราเป้าหมาย (Target Rate)</span>${chips('rate', rates)}</div>` : ''}
      ${!PF.welcome ? f('startWeight', 'น้ำหนักเริ่มต้น (สำหรับนับผลรวม)', 'เช่น 76', 'kg') : ''}
      ${PF.welcome && Store.hasDemo() ? `<label class="toggle full"><input type="checkbox" data-ch="pf-clear" ${PF.clearDemo ? 'checked' : ''}> ล้างข้อมูลตัวอย่าง (Demo) แล้วเริ่มบันทึกจริง</label>` : ''}
    </div>${errs._ ? `<p class="err-text">${errs._}</p>` : ''}`;
  }
  function pfProfile() {
    return { currentWeight: App.num(PF.currentWeight), targetWeight: App.num(PF.targetWeight), height: App.num(PF.height), age: App.num(PF.age), sex: PF.sex, activity: +PF.activity, goal: PF.goal, rate: PF.goal === 'maintain' ? 0 : +PF.rate, calorieAdjust: (!PF.welcome && Store.profile && !Store.profile.demo) ? (Store.profile.calorieAdjust || 0) : 0 };
  }
  function pfPreview() {
    const p = pfProfile();
    if ([p.currentWeight, p.height, p.age].some(v => isNaN(v)) || p.height < 100 || p.currentWeight < 25) return `<p class="help" style="margin:0">กรอกน้ำหนัก ส่วนสูง และอายุ เพื่อดูค่าประมาณ</p>`;
    const t = Calc.computeTargets(p);
    return `<div class="card" style="background:var(--surface-2);border:0"><div class="card-h"><h2>แผนที่คำนวณได้</h2><span class="est">Estimated Values</span></div>${targetsExplained(t)}</div>`;
  }
  App.inputs.pf = el => { PF[el.dataset.k] = el.value; const pv = document.getElementById('pf-preview'); if (pv) pv.innerHTML = pfPreview(); };
  App.changes['pf-activity'] = el => { PF.activity = +el.value; document.getElementById('pf-preview').innerHTML = pfPreview(); };
  App.changes['pf-clear'] = el => { PF.clearDemo = el.checked; };
  App.actions['pf-chip'] = el => {
    PF[el.dataset.k] = el.dataset.k === 'rate' ? +el.dataset.v : el.dataset.v;
    if (el.dataset.k === 'goal' && PF.goal === 'gain' && PF.rate > 0.5) PF.rate = 0.5;
    document.getElementById('pf-form').innerHTML = pfForm();
    document.getElementById('pf-preview').innerHTML = pfPreview();
  };
  App.actions['pf-skip'] = async () => { await Store.saveSettings({ welcomeSeen: true }); App.sheet.close(true); App.render(); };
  App.actions['profile-welcome'] = () => App.openProfile({ welcome: true });
  App.actions['profile-edit'] = () => App.openProfile({});

  App.actions['pf-save'] = async btn => {
    const p = pfProfile();
    const e = {};
    if (isNaN(p.currentWeight) || p.currentWeight < 30 || p.currentWeight > 300) e.currentWeight = 'ใส่น้ำหนัก 30–300 kg';
    if (isNaN(p.targetWeight) || p.targetWeight < 30 || p.targetWeight > 300) e.targetWeight = 'ใส่น้ำหนักเป้าหมาย 30–300 kg';
    if (isNaN(p.height) || p.height < 120 || p.height > 230) e.height = 'ใส่ส่วนสูง 120–230 cm';
    if (isNaN(p.age) || p.age < 18 || p.age > 100) e.age = 'การคำนวณนี้ออกแบบสำหรับผู้ใหญ่อายุ 18–100 ปี';
    if (!e.currentWeight && !e.targetWeight) {
      if (p.goal === 'lose' && p.targetWeight >= p.currentWeight) e.targetWeight = 'เป้าลดน้ำหนัก ควรต่ำกว่าน้ำหนักปัจจุบัน หรือเลือก Maintain';
      if (p.goal === 'gain' && p.targetWeight <= p.currentWeight) e.targetWeight = 'เป้าเพิ่มน้ำหนัก ควรสูงกว่าน้ำหนักปัจจุบัน';
      if (!e.height && p.goal === 'lose' && p.targetWeight / Math.pow(p.height / 100, 2) < 18.5) e.targetWeight = 'เป้าหมายนี้ต่ำกว่าเกณฑ์ BMI ปกติ (18.5) ควรปรึกษาแพทย์หรือนักกำหนดอาหารก่อนตั้งเป้า';
    }
    let sw = NaN;
    if (!PF.welcome) { sw = App.num(PF.startWeight); if (PF.startWeight !== '' && (isNaN(sw) || sw < 30 || sw > 300)) e.startWeight = 'ใส่น้ำหนักเริ่มต้น 30–300 kg'; }
    if (Object.keys(e).length) { document.getElementById('pf-form').innerHTML = pfForm(e); App.toast(Object.values(e)[0], { error: true }); return; }
    btn.disabled = true;
    try {
      const td = Calc.today();
      const t = Calc.computeTargets(p);
      if (PF.welcome) {
        if (PF.clearDemo && Store.hasDemo()) await Store.clearDemo();
        const prof = Object.assign(p, { startWeight: p.currentWeight, startDate: td, history: [{ from: td, kcal: t.kcal }], demo: false });
        await Store.saveProfile(prof);
        const tw = Store.weightMap.get(td);
        if (!tw || tw.demo) await Store.putWeight({ date: td, weight: p.currentWeight, waist: null, bodyFat: null, note: '' });
        await Store.saveSettings({ welcomeSeen: true, demoActive: Store.hasDemo() });
      } else {
        const old = Store.profile || {};
        const prof = Object.assign({}, old, p, { startWeight: isNaN(sw) ? (old.startWeight || p.currentWeight) : sw, startDate: old.startDate || td, demo: false });
        prof.history = (old.history || []).filter(h => h.from !== td).concat({ from: td, kcal: t.kcal });
        await Store.saveProfile(prof);
      }
      App.sheet.close(true);
      App.render();
      App.toast(`เป้าหมายใหม่ ${N(t.kcal)} kcal/วัน · Protein ${t.protein} g`);
    } catch (err) { btn.disabled = false; App.fail(err); }
  };

  /* ---------- Demo ---------- */
  App.actions['clear-demo'] = async () => {
    const ok = await App.confirm({ title: 'ล้าง Demo Data?', message: 'ลบข้อมูลตัวอย่างทั้งหมด (อาหาร น้ำหนัก รูป แผน และโปรไฟล์ตัวอย่าง) ข้อมูลที่คุณบันทึกเองจะไม่ถูกลบ', ok: 'ล้าง Demo' });
    if (!ok) return;
    await Store.clearDemo();
    App.render(); App.toast('ล้าง Demo Data แล้ว');
    if (!Store.profile) App.openProfile({ welcome: true });
  };
  App.actions['load-demo'] = async () => {
    if (Store.hasRealData()) { App.toast('มีข้อมูลจริงอยู่แล้ว จึงไม่โหลด Demo เพื่อไม่ให้ข้อมูลปนกัน', { error: true }); return; }
    await Demo.seed(); await Store.saveSettings({ welcomeSeen: true });
    App.sheet.close(true); App.render(); App.toast('โหลด Demo Data 14 วันแล้ว');
  };

  /* ---------- Backup / Restore / CSV (#35–#39) ---------- */
  App.actions.backup = async btn => {
    const withPhotos = btn.dataset.photos === '1';
    const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> กำลังสร้างไฟล์';
    try {
      const r = await Backup.exportBackup(withPhotos);
      if (r.status === 'cancelled') App.toast('ยกเลิกการบันทึกไฟล์');
      else App.toast(`Backup แล้ว: ${r.counts.weights} น้ำหนัก · ${r.counts.entries} รายการอาหาร${withPhotos ? ' · ' + r.counts.photos + ' รูป' : ''} (${(r.size / 1048576).toFixed(1)} MB)`, { ms: 5000 });
      if (App.ui.view === 'home') App.render({ keepScroll: true });
    } catch (e) { App.fail(e, 'สร้าง Backup ไม่สำเร็จ'); }
    finally { if (document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = label; } }
  };
  App.actions.csv = async btn => {
    try { const s = await Backup.exportCSV(btn.dataset.k); if (s !== 'cancelled') App.toast('Export CSV แล้ว'); } catch (e) { App.fail(e, 'Export CSV ไม่สำเร็จ'); }
  };

  let RESTORE = null;
  App.bindRestore = () => {
    document.getElementById('in-restore').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0]; e.target.value = '';
      if (!file) return;
      try {
        if (file.size > 300 * 1048576) throw Object.assign(new Error(), { userMessage: 'ไฟล์ใหญ่เกินไป (เกิน 300 MB)' });
        const text = await file.text();
        RESTORE = Backup.parse(text);
        openRestore(file.name);
      } catch (err) { App.fail(err, 'อ่านไฟล์ Backup ไม่สำเร็จ'); }
    });
  };
  function openRestore(name) {
    const c = RESTORE.counts, m = RESTORE.meta || {};
    const cur = Backup.counts({ weights: Store.weights, entries: Store.entries, photos: [...Store.photoMeta.values()], foods: Store.foods, plans: [...Store.plans.values()], notes: [...Store.notes.values()] });
    RESTORE.mode = 'replace';
    App.sheet.open({
      title: 'Restore Backup', name: 'restore',
      body: `<div class="small muted">${esc(name)}</div>
        <div class="kv-grid">
          <div class="kv"><div class="k">Backup Date</div><div class="v" style="font-size:15px">${m.exportedAt ? Calc.fmt.day(Calc.key(new Date(m.exportedAt))) + ' ' + new Date(m.exportedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'ไม่ทราบ'}</div></div>
          <div class="kv"><div class="k">Weight Records</div><div class="v">${c.weights}</div></div>
          <div class="kv"><div class="k">Meals</div><div class="v">${c.meals}</div></div>
          <div class="kv"><div class="k">Food Entries</div><div class="v">${c.entries}</div></div>
          <div class="kv"><div class="k">รูปอาหาร</div><div class="v">${c.photos}</div></div>
          <div class="kv"><div class="k">อาหารของฉัน / แผน</div><div class="v">${c.foods} / ${c.plans}</div></div>
        </div>
        ${RESTORE.warnings ? `<div class="banner">${esc(RESTORE.warnings.join(' '))}</div>` : ''}
        <div class="field"><span class="lbl">วิธี Restore</span><div class="seg"><button class="on" data-act="rs-mode" data-m="replace">แทนที่ข้อมูลทั้งหมด</button><button data-act="rs-mode" data-m="merge">รวมกับข้อมูลเดิม</button></div></div>
        <div class="banner bad" id="rs-warn"><div class="grow"><b>ข้อมูลปัจจุบันจะถูกเขียนทับ</b><div class="small">ตอนนี้มี ${cur.weights} น้ำหนัก, ${cur.entries} รายการอาหาร, ${cur.photos} รูป ข้อมูลเหล่านี้จะถูกลบและแทนที่ด้วยไฟล์ Backup แนะนำให้ Export Backup ปัจจุบันก่อน</div></div></div>`,
      foot: `<button class="btn" data-act="sheet-close">ยกเลิก</button><button class="btn danger solid" data-act="rs-go">ยืนยัน Restore</button>`
    });
  }
  App.actions['rs-mode'] = el => {
    RESTORE.mode = el.dataset.m;
    App.$$('[data-act="rs-mode"]').forEach(b => b.classList.toggle('on', b === el));
    const w = document.getElementById('rs-warn');
    if (w) { w.className = 'banner ' + (RESTORE.mode === 'replace' ? 'bad' : ''); w.querySelector('b').textContent = RESTORE.mode === 'replace' ? 'ข้อมูลปัจจุบันจะถูกเขียนทับ' : 'รวมข้อมูล: รายการที่ซ้ำกัน (วันเดียวกัน/รหัสเดียวกัน) จะใช้ค่าจากไฟล์ Backup'; }
  };
  App.actions['rs-go'] = async btn => {
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> กำลัง Restore';
    try {
      await Backup.restore(RESTORE, RESTORE.mode);
      const c = RESTORE.counts; RESTORE = null;
      App.sheet.close(true); App.ui.view = 'home'; App.render();
      App.toast(`Restore สำเร็จ: ${c.weights} น้ำหนัก · ${c.entries} รายการอาหาร · ${c.photos} รูป`, { ms: 5000 });
    } catch (e) { btn.disabled = false; btn.textContent = 'ยืนยัน Restore'; App.fail(e, 'Restore ไม่สำเร็จ'); }
  };

  /* ---------- Reset (two steps) ---------- */
  App.actions['reset-1'] = async () => {
    const ok = await App.confirm({ title: 'Reset All Data? (ขั้นที่ 1/2)', message: 'จะลบทุกอย่างในเครื่องนี้: โปรไฟล์ น้ำหนัก อาหาร รูป แผน และอาหารของฉัน ไม่สามารถกู้คืนได้หากไม่มี Backup', ok: 'ดำเนินการต่อ', danger: true });
    if (!ok) return;
    App.sheet.open({
      title: 'ยืนยันครั้งสุดท้าย (ขั้นที่ 2/2)', name: 'reset',
      body: `<p style="margin:0">พิมพ์คำว่า <b>ลบทั้งหมด</b> เพื่อยืนยัน</p><input class="input" id="reset-word" data-in="reset-word" autocomplete="off">`,
      foot: `<button class="btn" data-act="sheet-close">ยกเลิก</button><button class="btn danger solid" id="reset-go" data-act="reset-2" disabled>ลบข้อมูลทั้งหมด</button>`
    });
  };
  App.inputs['reset-word'] = el => { document.getElementById('reset-go').disabled = el.value.trim() !== 'ลบทั้งหมด'; };
  App.actions['reset-2'] = async () => {
    if (document.getElementById('reset-word').value.trim() !== 'ลบทั้งหมด') return;
    await Store.resetAll();
    App.sheet.close(true); App.ui.view = 'home'; App.render();
    App.toast('ลบข้อมูลทั้งหมดแล้ว');
    App.openProfile({ welcome: true });
  };
})();
