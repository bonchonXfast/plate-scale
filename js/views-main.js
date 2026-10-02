/* Plate & Scale — Home and Food views. */
(function () {
  const { esc, icon } = App;
  const N = (v, d = 0) => App.n(v, d);
  const GDA = { kcal: 2000, sugar: 65, fat: 65, sodium: 2400 };

  /* ---------- banners shared by Home ---------- */
  function banners() {
    let h = '';
    if (DB.mode === 'memory') h += `<div class="banner bad">${icon('info')}<div class="grow"><b>เบราว์เซอร์นี้บันทึกข้อมูลถาวรไม่ได้</b><div class="small">อาจเป็นโหมดส่วนตัว (Private) ข้อมูลจะหายเมื่อปิดหน้า เปิดในโหมดปกติ หรือ Backup ก่อนปิด</div></div></div>`;
    if (Store.hasDemo()) h += `<div class="banner demo">${icon('info')}<div class="grow"><b>กำลังแสดงข้อมูลตัวอย่าง (Demo)</b><div class="small">รูปอาหารเป็นภาพจำลองที่มีป้าย DEMO ข้อมูลจริงของคุณจะไม่ถูกลบเมื่อล้าง Demo</div><div class="row wrap" style="margin-top:8px">${Store.profile && !Store.profile.demo ? '' : `<button class="btn sm primary" data-act="profile-welcome">ตั้งค่าของฉัน</button>`}<button class="btn sm" data-act="clear-demo">ล้าง Demo Data</button></div></div></div>`;
    const flags = Store.profile ? Calc.safetyFlags() : [];
    if (flags.length) h += `<div class="banner bad">${icon('shield')}<div class="grow"><b>ควรปรึกษาแพทย์หรือนักกำหนดอาหารเพื่อประเมินเพิ่มเติม</b><div class="small">${flags.map(esc).join(' · ')}</div></div></div>`;
    if (Store.profile) {
      const ws = Calc.add(Calc.weekStart(Calc.today()), -7);
      const rv = Store.reviews.get(ws);
      const r = Calc.periodStats(ws, Calc.add(ws, 6));
      if (!rv && r.loggedDays >= 3) h += `<div class="banner accent">${icon('calendar')}<div class="grow"><b>Weekly Review พร้อมแล้ว</b><div class="small">สรุปสัปดาห์ ${Calc.fmt.short(ws)} – ${Calc.fmt.short(Calc.add(ws, 6))} พร้อมข้อเสนอแผนสัปดาห์หน้า</div></div><button class="btn sm primary" data-act="open-review" data-week="${ws}">ดู</button></div>`;
    }
    const last = Store.settings.lastBackupAt;
    if (Store.hasRealData() && (!last || (Date.now() - new Date(last)) > 7 * 864e5)) h += `<div class="banner">${icon('download')}<div class="grow"><b>${last ? 'ไม่ได้ Backup มากกว่า 7 วัน' : 'ยังไม่เคย Backup ข้อมูล'}</b><div class="small">ข้อมูลเก็บในเบราว์เซอร์ ซึ่งอาจถูกลบได้ในบางกรณี เก็บไฟล์สำรองไว้ใน Files หรือ iCloud Drive</div></div><button class="btn sm" data-act="backup" data-photos="1">Backup</button></div>`;
    return h;
  }
  App.actions['open-review'] = el => { App.ui.reviewWeek = el.dataset.week; App.go('progress', { tab: 'weekly' }); };

  /* ---------- reusable pieces ---------- */
  App.macroBars = function (tot, t) {
    const row = (k, label, unit, d = 0) => {
      const v = tot[k], tg = t[k];
      const pct = tg ? v / tg : 0;
      const left = tg - v;
      return `<div class="mbar"><div class="top"><span><span class="dot-i c-${k}"></span>${label}</span><span><b>${N(v, d)}</b> / ${N(tg)} ${unit} <span class="muted small">· ${left >= 0 ? 'เหลือ ' + N(left, d) : 'เกิน ' + N(-left, d)}</span></span></div>
        <div class="track"><div class="fill c-${k} ${pct > 1 ? 'over' : ''}" style="width:${Math.min(100, pct * 100).toFixed(1)}%"></div></div></div>`;
    };
    return `<div class="macro-bars">${row('protein', 'Protein', 'g')}${row('carbs', 'Carbs', 'g')}${row('fat', 'Fat', 'g')}${row('fiber', 'Fiber', 'g', 1)}</div>`;
  };

  App.macroDist = function (tot, t, size = 132) {
    const m = Calc.macroSplit(tot);
    const total = m.protein.kcal + m.carbs.kcal + m.fat.kcal;
    const tm = Calc.macroSplit({ protein: t.protein, carbs: t.carbs, fat: t.fat });
    return `<div class="donut-row">
      ${Charts.donut([{ value: m.protein.kcal, color: '--protein' }, { value: m.carbs.kcal, color: '--carbs' }, { value: m.fat.kcal, color: '--fat' }], size, total ? N(total) : '–', 'kcal')}
      <div><table class="macro-table"><thead><tr><th></th><th>กรัม</th><th>kcal</th><th>%</th><th>เป้า %</th></tr></thead><tbody>
        ${['protein', 'carbs', 'fat'].map(k => `<tr><td><span class="dot-i c-${k}"></span>${k === 'protein' ? 'Protein' : k === 'carbs' ? 'Carbs' : 'Fat'}</td><td>${N(m[k].g)}</td><td>${N(m[k].kcal)}</td><td>${total ? N(m[k].pct) : '–'}</td><td class="muted">${N(tm[k].pct)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  };

  function gdaStrip(tot) {
    const cell = (k, label, unit, d) => `<div><div class="gk">${label}${unit ? ' (' + unit.trim() + ')' : ''}</div><div class="gv">${N(tot[k], d)}</div><div class="gp">${N(tot[k] / GDA[k] * 100)}%</div></div>`;
    return `<div class="gda" aria-label="ฉลากโภชนาการแบบ GDA">${cell('kcal', 'พลังงาน', '', 0)}${cell('sugar', 'น้ำตาล', ' ก.', 0)}${cell('fat', 'ไขมัน', ' ก.', 0)}${cell('sodium', 'โซเดียม', ' มก.', 0)}</div>
      <div class="gda-cap">ร้อยละของปริมาณสูงสุดที่บริโภคได้ต่อวัน (Thai GDA: พลังงาน 2,000 kcal, น้ำตาล 65 ก., ไขมัน 65 ก., โซเดียม 2,400 มก.)</div>`;
  }

  function weightCard() {
    const st = Calc.weightStats();
    const td = Calc.today();
    const from = Calc.add(td, -13);
    const sp = Calc.range(from, td).map(d => ({ v: Calc.ma7(d) }));
    const shown = st.today != null ? st.today : st.latest ? st.latest.weight : null;
    return `<section class="card span-5" aria-labelledby="h-weight">
      <div class="card-h"><h2 id="h-weight">น้ำหนัก (Weight)</h2><span class="sub">${st.today != null ? 'วันนี้' : st.latest ? 'ล่าสุด ' + Calc.fmt.rel(st.latest.date) : ''}</span></div>
      <div class="weight-top">
        <div>
          <div class="big-num">${shown != null ? N(shown, 1) : '–'}<span class="unit">kg</span></div>
          <div style="margin-top:6px">${st.vsYesterday != null ? App.deltaHTML(st.vsYesterday, 1, 'kg', Store.profile ? Store.profile.goal !== 'gain' : true) + ' <span class="small muted">จาก' + Calc.fmt.rel(st.prevDate) + '</span>' : '<span class="small muted">ยังไม่มีข้อมูลเปรียบเทียบ</span>'}</div>
        </div>
        <div>${Charts.spark(sp, 150, 52)}<div class="tiny muted" style="text-align:right">ค่าเฉลี่ย 7 วัน · 14 วัน</div></div>
      </div>
      <div class="kv-grid" style="margin-top:14px">
        <div class="kv"><div class="k">เฉลี่ย 7 วัน</div><div class="v">${N(st.ma7, 1)} <small>kg</small></div></div>
        <div class="kv"><div class="k">เปลี่ยนรายสัปดาห์</div><div class="v">${st.weekly != null ? Calc.signed(st.weekly, 2) : '–'} <small>kg</small></div></div>
        <div class="kv"><div class="k">รวมตั้งแต่เริ่ม</div><div class="v">${st.total != null ? Calc.signed(st.total, 1) : '–'} <small>kg</small></div></div>
        <div class="kv"><div class="k">เหลือถึงเป้า ${st.target ? N(st.target, 1) : ''}</div><div class="v">${st.toGo != null ? N(Math.abs(st.toGo), 1) : '–'} <small>kg</small></div></div>
      </div>
      <p class="small" style="margin:12px 0 0"><span class="muted">แนวโน้ม:</span> ${esc(Calc.trendLabel(st.trend))}</p>
      <div class="row wrap" style="margin-top:12px"><button class="btn soft" data-act="add-weight">${icon('scale')} ${st.today != null ? 'แก้ไขน้ำหนักวันนี้' : 'บันทึกน้ำหนักวันนี้'}</button><button class="btn ghost" data-act="nav" data-view="progress" data-tab="weight">ดูกราฟ</button></div>
    </section>`;
  }

  function caloriesCard() {
    const td = Calc.today(), t = Calc.targets(), tot = Calc.dayTotals(td), tk = Calc.targetKcalFor(td) || t.kcal;
    const pct = tot.kcal / tk;
    const remain = tk - tot.kcal;
    const tone = pct > 1.25 ? 'bad' : pct > 1.05 ? 'warn' : '';
    return `<section class="card span-7" aria-labelledby="h-cal">
      <div class="card-h"><h2 id="h-cal">Calories วันนี้</h2><span class="est">Estimated</span></div>
      <div class="cal-wrap">
        <div class="cal-ring">${Charts.ring(pct, 136, tone, N(tot.kcal), '/ ' + N(tk) + ' kcal')}</div>
        <div class="cal-figs">
          <div class="line"><span class="muted">Daily Target</span><b>${N(tk)} kcal</b></div>
          <div class="line"><span class="muted">Consumed</span><b>${N(tot.kcal)} kcal</b></div>
          <div class="divider" style="margin:6px 0"></div>
          <div class="muted small">${remain >= 0 ? 'Remaining' : 'เกินเป้า'}</div>
          <div class="remain" style="color:${remain >= 0 ? 'var(--ok)' : 'var(--warn)'}">${N(Math.abs(remain))} kcal</div>
          <div class="small muted">Protein ${t.protein - tot.protein >= 0 ? 'เหลือ ' + N(t.protein - tot.protein) : 'เกิน ' + N(tot.protein - t.protein)} g</div>
        </div>
      </div>
      ${App.macroBars(tot, t)}
    </section>`;
  }

  App.mealList = function (date, opts = {}) {
    return Calc.MEALS.map(m => {
      const list = Calc.mealEntries(date, m);
      const kc = Calc.sumTotals(list).kcal;
      const photos = [...new Set(list.filter(e => e.photoId).map(e => e.photoId))].slice(0, 3);
      if (opts.compact) return `<div class="meal"><div class="meal-h"><span class="name">${Calc.MEAL_TH[m]}<small>${Calc.MEAL_EN[m]}</small></span>
          <span class="mini-thumbs">${photos.map(id => `<span class="thumb" data-photo="${esc(id)}"></span>`).join('')}</span>
          <span class="kcal">${list.length ? N(kc) + ' kcal' : ''}</span>
          <button class="btn sm soft" data-act="add-food" data-date="${date}" data-meal="${m}" aria-label="เพิ่มอาหาร${Calc.MEAL_TH[m]}">${icon('plus')}</button></div>
        ${list.length ? `<div class="small muted" style="margin-top:2px">${list.map(e => esc(e.name)).join(' · ')}</div>` : `<div class="meal-empty">ยังไม่มีบันทึก</div>`}</div>`;
      return `<section class="card" aria-label="${Calc.MEAL_TH[m]}">
        <div class="meal-h"><span class="name">${Calc.MEAL_TH[m]}<small>${Calc.MEAL_EN[m]}</small></span><span class="kcal">${N(kc)} kcal</span>
          <button class="icon-btn" data-act="meal-menu" data-date="${date}" data-meal="${m}" aria-label="ตัวเลือก${Calc.MEAL_TH[m]}">${icon('more')}</button></div>
        <div style="margin-top:6px">${list.length ? list.map(e => { const t = Calc.entryTotals(e); return `<button class="entry" data-act="entry" data-id="${e.id}">
            ${App.thumb(e.photoId, e.name)}
            <span class="info"><span class="nm" style="display:block">${esc(e.name)}</span><span class="meta" style="display:block">${e.qty !== 1 ? e.qty + ' × ' : ''}${esc(e.serving)} · P ${N(t.protein)} · C ${N(t.carbs)} · F ${N(t.fat)}${e.note ? ' · ' + esc(e.note) : ''}</span></span>
            <span class="kc">${N(t.kcal)}<small>kcal</small></span></button>`; }).join('') : `<div class="meal-empty">ยังไม่มีบันทึก</div>`}</div>
        <div class="meal-actions">
          <label class="btn sm soft" for="in-camera" data-pick="new" data-act="set-meal" data-date="${date}" data-meal="${m}">${icon('camera')} ถ่ายรูป</label>
          <button class="btn sm" data-act="add-food" data-date="${date}" data-meal="${m}">${icon('plus')} เพิ่มอาหาร</button>
        </div></section>`;
    }).join('');
  };
  /* remember which meal a camera tap came from (label click still opens the camera natively) */
  App.actions['set-meal'] = el => { App.ui.pendingMeal = el.dataset.meal; App.ui.foodDate = el.dataset.date; };

  function adviceCard() {
    const a = Calc.dailyAdvice(Calc.today());
    return `<section class="card span-5 tone-${a.tone}" aria-labelledby="h-adv">
      <div class="card-h"><h2 id="h-adv">คำแนะนำวันนี้</h2><span class="sub">Today's Recommendation</span></div>
      <div class="advice">${a.lines.map((l, i) => `<p class="${i ? '' : 'lead'}">${esc(l)}</p>`).join('')}</div>
      ${a.foods && a.foods.length ? `<div style="margin-top:10px"><div class="tiny muted" style="margin-bottom:6px">ตัวเลือกที่พอดีกับที่เหลือ</div><div class="food-pills">${a.foods.map(f => `<span class="food-pill">${esc(f.name)} · ${f.n.kcal} kcal · P ${f.n.protein}</span>`).join('')}</div></div>` : ''}
      <button class="btn soft" data-act="assistant" style="margin-top:12px">${icon('chat')} ถาม Nutrition Assistant</button>
    </section>`;
  }

  function quickCard() {
    return `<section class="card span-12" aria-label="Quick Add">
      <div class="quick">
        <label class="q primary" for="in-camera" data-pick="new">${icon('camera')}ถ่ายรูปอาหาร<small>Take Food Photo</small></label>
        <button class="q" data-act="add-food">${icon('food')}เพิ่มอาหาร<small>Add Food</small></button>
        <button class="q" data-act="add-weight">${icon('scale')}บันทึกน้ำหนัก<small>Add Weight</small></button>
        <button class="q" data-act="add-note">${icon('note')}บันทึกโน้ต<small>Add Note</small></button>
      </div></section>`;
  }

  function tomorrowCard() {
    const a = Calc.tomorrowAdvice(); if (!a) return '';
    const t = a.t, tm = Calc.add(Calc.today(), 1);
    const plan = Store.plans.get(tm);
    const planned = plan ? Calc.sumTotals(plan.items || []) : null;
    return `<section class="card span-6" aria-labelledby="h-tom">
      <div class="card-h"><h2 id="h-tom">แผนพรุ่งนี้</h2><span class="sub">Tomorrow's Plan · ${Calc.fmt.short(tm)}</span></div>
      <div class="kv-grid tight">
        <div class="kv"><div class="k">Calories</div><div class="v">${N(t.kcal)} <small>kcal</small></div></div>
        <div class="kv"><div class="k">Protein</div><div class="v">${t.protein} <small>g</small></div></div>
        <div class="kv"><div class="k">Carbs</div><div class="v">${t.carbs} <small>g</small></div></div>
        <div class="kv"><div class="k">Fat</div><div class="v">${t.fat} <small>g</small></div></div>
        <div class="kv"><div class="k">Fiber</div><div class="v">${t.fiber} <small>g</small></div></div>
      </div>
      <div class="advice" style="margin-top:12px">${a.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
      ${planned ? `<p class="small" style="margin:10px 0 0">วางแผนไว้แล้ว ${N(planned.kcal)} kcal · Protein ${N(planned.protein)} g</p>` : ''}
      <div class="row wrap" style="margin-top:12px">
        <button class="btn soft" data-act="nav" data-view="food" data-date="${tm}" data-tab="plan">${icon('plan')} ${planned ? 'ดู/แก้แผน' : 'วางแผนมื้อพรุ่งนี้'}</button>
        ${Calc.isLogged(Calc.today()) ? `<button class="btn ghost" data-act="plan-from" data-src="${Calc.today()}" data-date="${tm}">ใช้มื้อวันนี้เป็นแผนพรุ่งนี้</button>` : ''}
      </div></section>`;
  }

  function setupCard() {
    return `<section class="card span-12">
      <h2 style="font-size:20px">เริ่มต้นใช้งาน</h2>
      <p class="muted">ตั้งค่าน้ำหนัก ส่วนสูง และเป้าหมาย ระบบจะคำนวณ Calories และสารอาหารที่ควรได้รับต่อวัน (ค่าประมาณ)</p>
      <div class="row wrap"><button class="btn primary" data-act="profile-welcome">Calculate My Plan</button>${!Store.hasDemo() && !Store.hasRealData() ? `<button class="btn" data-act="load-demo">ลองดู Demo Data</button>` : ''}</div>
    </section>`;
  }

  App.views.home = function () {
    const p = Store.profile;
    let h = banners();
    if (!p) return h + `<div class="grid home-grid">${setupCard()}${quickCard()}</div>`;
    const td = Calc.today(), t = Calc.targets(), tot = Calc.dayTotals(td);
    h += `<div class="grid home-grid">
      ${weightCard()}
      ${caloriesCard()}
      <section class="card span-7" aria-labelledby="h-meals">
        <div class="card-h"><h2 id="h-meals">มื้ออาหารวันนี้</h2><button class="btn sm ghost" data-act="nav" data-view="food" data-date="${td}" data-tab="log">ดูทั้งหมด ${icon('right')}</button></div>
        ${App.mealList(td, { compact: true })}
      </section>
      ${adviceCard()}
      ${quickCard()}
      <section class="card span-6" aria-labelledby="h-macro">
        <div class="card-h"><h2 id="h-macro">สัดส่วนสารอาหาร</h2><span class="sub">Macro Distribution</span></div>
        ${App.macroDist(tot, t)}
        ${gdaStrip(tot)}
      </section>
      ${tomorrowCard()}
      <section class="card span-6 desk-only"><div class="card-h"><h2>น้ำหนัก 30 วัน</h2><span class="sub">Daily + 7-Day Average</span></div>${App.chart(el => App.drawWeight(el, '30'))}</section>
      <section class="card span-6 desk-only"><div class="card-h"><h2>Calories 14 วัน</h2><span class="sub">เทียบเป้าหมาย</span></div>${App.chart(el => App.drawDailyBars(el, 14))}</section>
    </div>`;
    return h;
  };

  /* ---------- chart drawers shared with Progress ---------- */
  App.drawWeight = function (el, rangeKey) {
    const td = Calc.today();
    const ws = Store.weights;
    let from;
    if (rangeKey === 'all') from = ws.length ? ws[0].date : Calc.add(td, -29);
    else from = Calc.add(td, -(parseInt(rangeKey, 10) - 1));
    if (from > td) from = td;
    const points = ws.filter(w => w.date >= from && w.date <= td).map(w => ({ d: w.date, v: w.weight }));
    const ma = Calc.range(from, td).map(d => ({ d, v: Calc.ma7(d) })).filter(p => p.v != null);
    Charts.weight(el, { from, to: td, points, ma, target: Store.profile ? Store.profile.targetWeight : null });
  };
  App.drawDailyBars = function (el, days) {
    const td = Calc.today();
    const bars = Calc.range(Calc.add(td, -(days - 1)), td).map(d => {
      const st = Calc.dayStatus(d);
      return { label: Calc.parse(d).getDate() + '', value: Calc.dayTotals(d).kcal, tone: st || 'muted', title: Calc.fmt.day(d) };
    });
    Charts.bars(el, { bars, target: Calc.targets() ? Calc.targets().kcal : null, unit: 'kcal', aria: 'Calories รายวัน', empty: 'ยังไม่มีบันทึกอาหาร' });
  };

  /* =================== FOOD VIEW =================== */
  App.views.food = function () {
    const date = App.ui.foodDate || Calc.today();
    const tab = App.ui.foodTab;
    const td = Calc.today();
    let h = `<div class="date-nav">
        <button class="icon-btn" data-act="food-day" data-d="-1" aria-label="วันก่อนหน้า">${icon('left')}</button>
        <div class="d">${Calc.fmt.rel(date)}<small>${Calc.fmt.long(date)}</small></div>
        <button class="icon-btn" data-act="food-day" data-d="1" aria-label="วันถัดไป">${icon('right')}</button>
      </div>
      <div class="seg" style="margin-bottom:10px"><button class="${tab === 'log' ? 'on' : ''}" data-act="food-tab" data-tab="log">บันทึกอาหาร (Diary)</button><button class="${tab === 'plan' ? 'on' : ''}" data-act="food-tab" data-tab="plan">แผน (Meal Plan)</button></div>
      <div class="row wrap" style="margin-bottom:12px;justify-content:flex-end">
        ${date !== td ? `<button class="btn sm" data-act="food-today">กลับไปวันนี้</button>` : ''}
        <input type="date" class="input" style="width:auto;min-height:38px;padding:4px 10px" value="${date}" data-ch="food-date" aria-label="เลือกวันที่">
      </div>`;
    if (!Store.profile) return h + `<div class="card"><p>ตั้งค่าโปรไฟล์ก่อนเพื่อคำนวณเป้าหมาย</p><button class="btn primary" data-act="profile-welcome">Calculate My Plan</button></div>`;
    return h + (tab === 'plan' ? planView(date) : logView(date));
  };
  App.actions['food-day'] = el => { App.ui.foodDate = Calc.add(App.ui.foodDate || Calc.today(), +el.dataset.d); App.render({ keepScroll: true }); };
  App.actions['food-today'] = () => { App.ui.foodDate = Calc.today(); App.render(); };
  App.actions['food-tab'] = el => { App.ui.foodTab = el.dataset.tab; App.render({ keepScroll: true }); };
  App.changes['food-date'] = el => { if (el.value) { App.ui.foodDate = el.value; App.render({ keepScroll: true }); } };

  function totalsStrip(tot, t, tk) {
    const cell = (label, v, tg, unit) => `<div class="ts"><div class="k">${label}</div><div class="v">${N(v)}</div><div class="k">/ ${N(tg)} ${unit || 'kcal'}</div></div>`;
    return `<div class="totals-strip">${cell('Calories', tot.kcal, tk, '')}${cell('Protein', tot.protein, t.protein, 'g')}${cell('Carbs', tot.carbs, t.carbs, 'g')}${cell('Fat', tot.fat, t.fat, 'g')}</div>`;
  }

  function pvaTable(date) {
    const plan = Store.plans.get(date);
    if (!plan || !(plan.items || []).length) return '';
    const rows = Calc.MEALS.map(m => {
      const p = Calc.sumTotals(plan.items.filter(i => i.meal === m)).kcal;
      const a = Calc.sumTotals(Calc.mealEntries(date, m)).kcal;
      return `<tr><td>${Calc.MEAL_TH[m]}</td><td>${N(p)}</td><td>${N(a)}</td><td>${p || a ? Calc.signed(a - p, 0) : '–'}</td></tr>`;
    }).join('');
    const P = Calc.sumTotals(plan.items), A = Calc.dayTotals(date);
    return `<section class="card"><div class="card-h"><h2>Planned vs Actual</h2><span class="sub">แผนเทียบกับที่กินจริง</span></div>
      <div class="table-wrap"><table class="pva"><thead><tr><th>มื้อ</th><th>แผน kcal</th><th>จริง kcal</th><th>ต่าง</th></tr></thead><tbody>${rows}
      <tr><td><b>รวม Calories</b></td><td><b>${N(P.kcal)}</b></td><td><b>${N(A.kcal)}</b></td><td><b>${Calc.signed(A.kcal - P.kcal, 0)}</b></td></tr>
      <tr><td>Protein (g)</td><td>${N(P.protein)}</td><td>${N(A.protein)}</td><td>${Calc.signed(A.protein - P.protein, 0)}</td></tr>
      <tr><td>Carbs (g)</td><td>${N(P.carbs)}</td><td>${N(A.carbs)}</td><td>${Calc.signed(A.carbs - P.carbs, 0)}</td></tr>
      <tr><td>Fat (g)</td><td>${N(P.fat)}</td><td>${N(A.fat)}</td><td>${Calc.signed(A.fat - P.fat, 0)}</td></tr></tbody></table></div></section>`;
  }

  function logView(date) {
    const t = Calc.targets(), tot = Calc.dayTotals(date), tk = Calc.targetKcalFor(date) || t.kcal;
    const note = Store.notes.get(date);
    const adv = Calc.dailyAdvice(date);
    return `<div class="grid">
      <section class="card">${totalsStrip(tot, t, tk)}
        <div class="row wrap" style="margin-top:12px">
          <label class="btn primary camera" for="in-camera" data-pick="new" data-act="set-meal" data-date="${date}" data-meal="${App.guessMeal()}" style="flex:1">${icon('camera')} ถ่ายรูปอาหาร</label>
          <button class="btn camera" data-act="add-food" data-date="${date}" style="flex:1">${icon('plus')} เพิ่มอาหาร</button>
        </div></section>
      <div class="grid g2">${App.mealList(date)}</div>
      ${pvaTable(date)}
      <div class="grid g2">
        <section class="card tone-${adv.tone}"><div class="card-h"><h2>Daily Summary</h2><span class="est">Estimated</span></div>
          <div class="small muted" style="margin-bottom:8px">Fiber ${N(tot.fiber, 1)} / ${t.fiber} g · Sugar ${N(tot.sugar)} g · Sodium ${N(tot.sodium)} mg</div>
          <div class="advice">${adv.lines.map((l, i) => `<p class="${i ? '' : 'lead'}">${esc(l)}</p>`).join('')}</div></section>
        <section class="card"><div class="card-h"><h2>โน้ตประจำวัน</h2><button class="btn sm" data-act="add-note" data-date="${date}">${icon('edit')} ${note ? 'แก้ไข' : 'เพิ่ม'}</button></div>
          ${note ? `<p style="margin:0;white-space:pre-wrap">${esc(note.text)}</p>` : '<p class="muted small" style="margin:0">ยังไม่มีโน้ต</p>'}</section>
      </div></div>`;
  }

  /* ---------- Meal Planner (#28, #29) ---------- */
  function planView(date) {
    const t = Calc.targets();
    const plan = Store.plans.get(date) || { date, items: [] };
    const items = plan.items || [];
    const P = Calc.sumTotals(items);
    const prev = Calc.add(date, -1);
    const isTomorrow = date === Calc.add(Calc.today(), 1);
    const remainCell = (label, v, tg, unit) => {
      const r = tg - v;
      return `<div class="kv"><div class="k">${label}</div><div class="v">${N(v)} <small>/ ${N(tg)} ${unit}</small></div><div class="tiny ${r >= 0 ? 'muted' : ''}" style="${r < 0 ? 'color:var(--warn)' : ''}">${r >= 0 ? 'เหลือ ' + N(r) : 'เกิน ' + N(-r)} ${unit}</div></div>`;
    };
    const adv = isTomorrow ? Calc.tomorrowAdvice() : null;
    let h = `<div class="grid">
      <section class="card"><div class="card-h"><h2>${isTomorrow ? "Tomorrow's Meal Plan" : 'Meal Plan'}</h2><span class="est">Estimated</span></div>
        <div class="kv-grid">${remainCell('Planned Calories', P.kcal, t.kcal, 'kcal')}${remainCell('Planned Protein', P.protein, t.protein, 'g')}${remainCell('Planned Carbs', P.carbs, t.carbs, 'g')}${remainCell('Planned Fat', P.fat, t.fat, 'g')}</div>
        ${adv ? `<div class="advice" style="margin-top:12px">${adv.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
        <div class="row wrap" style="margin-top:12px">
          <button class="btn soft" data-act="plan-from" data-src="${prev}" data-date="${date}" ${Calc.isLogged(prev) ? '' : 'disabled'}>${icon('copy')} ${isTomorrow ? "Use Today's Meals as Tomorrow's Plan" : 'ใช้มื้อของ ' + Calc.fmt.rel(prev) + ' เป็นแผน'}</button>
          <button class="btn" data-act="plan-auto" data-date="${date}">${icon('sparkle')} แนะนำแผนอัตโนมัติ</button>
          ${items.length ? `<button class="btn ghost" data-act="plan-clear" data-date="${date}">ล้างแผน</button>` : ''}
        </div>
        <p class="help" style="margin:10px 0 0">แผนอัตโนมัติเลือกจากเมนูไทยทั่วไปให้ใกล้เป้า Calories และ Protein ปรับหรือเปลี่ยนได้ทุกรายการ</p>
      </section>
      <div class="grid g2">`;
    for (const m of Calc.MEALS) {
      const list = items.filter(i => i.meal === m);
      h += `<section class="card"><div class="meal-h"><span class="name">${Calc.MEAL_TH[m]}<small>${Calc.MEAL_EN[m]}</small></span><span class="kcal">${N(Calc.sumTotals(list).kcal)} kcal</span></div>
        <div style="margin-top:6px">${list.length ? list.map(i => { const tt = Calc.entryTotals(i); return `<div class="row" style="gap:6px"><button class="entry" data-act="plan-item" data-date="${date}" data-id="${i.id}" style="flex:1;min-width:0">
          ${App.thumb(null, i.name)}<span class="info"><span class="nm" style="display:block">${esc(i.name)}</span><span class="meta" style="display:block">${i.qty !== 1 ? i.qty + ' × ' : ''}${esc(i.serving)} · P ${N(tt.protein)}</span></span><span class="kc">${N(tt.kcal)}<small>kcal</small></span></button>
          <button class="btn sm soft" data-act="plan-eat" data-date="${date}" data-id="${i.id}" title="บันทึกว่ากินแล้ว" aria-label="บันทึก ${esc(i.name)} ว่ากินแล้ว">${icon('check')}</button></div>`; }).join('') : '<div class="meal-empty">ยังไม่มีในแผน</div>'}</div>
        <div class="meal-actions"><button class="btn sm" data-act="plan-add" data-date="${date}" data-meal="${m}">${icon('plus')} เพิ่มในแผน</button></div></section>`;
    }
    h += `</div>${date <= Calc.today() ? pvaTable(date) : ''}</div>`;
    return h;
  }
  App.actions['plan-add'] = el => App.openEditor({ mode: 'plan', date: el.dataset.date, meal: el.dataset.meal });
  App.actions['plan-item'] = el => {
    const plan = Store.plans.get(el.dataset.date); const it = plan && plan.items.find(i => i.id === el.dataset.id);
    if (it) App.openEditor({ mode: 'plan', date: el.dataset.date, planItem: it });
  };
  App.actions['plan-eat'] = async el => {
    const date = el.dataset.date;
    const plan = Store.plans.get(date); const it = plan && plan.items.find(i => i.id === el.dataset.id); if (!it) return;
    const logDate = date > Calc.today() ? Calc.today() : date;
    await Store.putEntry({ date: logDate, meal: it.meal, foodId: it.foodId || null, name: it.name, serving: it.serving, qty: it.qty, base: Object.assign({}, it.base), note: 'จากแผน', photoId: null });
    App.render({ keepScroll: true });
    App.toast(`บันทึก "${it.name}" ลง${Calc.MEAL_TH[it.meal]} ${Calc.fmt.rel(logDate)} แล้ว`);
  };
  App.actions['plan-from'] = async el => {
    const src = el.dataset.src, date = el.dataset.date;
    const list = Calc.dayEntries(src);
    if (!list.length) { App.toast('วันนั้นไม่มีบันทึกอาหาร', { error: true }); return; }
    const ex = Store.plans.get(date);
    if (ex && (ex.items || []).length) {
      const ok = await App.confirm({ title: 'แทนที่แผนเดิม?', message: `แผนวันที่ ${Calc.fmt.day(date)} มีอยู่ ${ex.items.length} รายการ จะถูกแทนที่ด้วยมื้ออาหารของ ${Calc.fmt.day(src)}`, ok: 'แทนที่' });
      if (!ok) return;
    }
    await Store.putPlan({ date, items: list.map(e => ({ id: Store.uid('pi'), meal: e.meal, foodId: e.foodId || null, name: e.name, serving: e.serving, qty: e.qty, base: Object.assign({}, e.base) })) });
    App.ui.foodDate = date; App.ui.foodTab = 'plan';
    App.go('food');
    App.toast(`สร้างแผน ${Calc.fmt.rel(date)} จาก ${list.length} รายการแล้ว`);
  };
  let autoVariant = 0;
  App.actions['plan-auto'] = async el => {
    const date = el.dataset.date;
    const ex = Store.plans.get(date);
    if (ex && (ex.items || []).length) {
      const ok = await App.confirm({ title: 'สร้างแผนใหม่?', message: 'แผนเดิมจะถูกแทนที่ด้วยแผนที่แนะนำ', ok: 'สร้างแผนใหม่' });
      if (!ok) return;
    }
    const items = Calc.autoPlan(date, autoVariant++).map(i => { const f = Foods.BY_ID.get(i.foodId); return { id: Store.uid('pi'), meal: i.meal, foodId: f.id, name: f.name, serving: f.serving, qty: i.qty, base: Object.assign({}, f.n) }; });
    await Store.putPlan({ date, items });
    App.render({ keepScroll: true });
    App.toast('สร้างแผนแนะนำแล้ว กดอีกครั้งเพื่อสุ่มเมนูใหม่');
  };
  App.actions['plan-clear'] = async el => {
    const ok = await App.confirm({ title: 'ล้างแผน?', message: `ลบรายการทั้งหมดในแผนวันที่ ${Calc.fmt.day(el.dataset.date)}`, ok: 'ล้างแผน', danger: true });
    if (!ok) return;
    await Store.delPlan(el.dataset.date); App.render({ keepScroll: true });
  };
})();
