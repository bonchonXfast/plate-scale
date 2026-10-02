/* Plate & Scale — Progress (weight, dashboard, weekly review, calendar). */
(function () {
  const { esc, icon } = App;
  const N = (v, d = 0) => App.n(v, d);

  App.views.progress = function () {
    const tab = App.ui.progTab;
    const tabs = [['weight', 'น้ำหนัก'], ['dashboard', 'Dashboard'], ['weekly', 'Weekly Review'], ['calendar', 'ปฏิทิน']];
    let h = `<div class="seg" style="margin-bottom:14px">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="prog-tab" data-tab="${k}">${l}</button>`).join('')}</div>`;
    if (!Store.profile) return h + `<div class="card"><p>ตั้งค่าโปรไฟล์ก่อน</p><button class="btn primary" data-act="profile-welcome">Calculate My Plan</button></div>`;
    if (tab === 'weight') h += weightTab();
    else if (tab === 'dashboard') h += dashTab();
    else if (tab === 'weekly') h += weeklyTab();
    else h += calendarTab();
    return h;
  };
  App.actions['prog-tab'] = el => { App.ui.progTab = el.dataset.tab; App.render({ keepScroll: true }); };

  /* ---------- Weight (#7, #8) ---------- */
  function weightTab() {
    const st = Calc.weightStats();
    const goalDown = Store.profile.goal !== 'gain';
    const R = [['7', '7 Days'], ['30', '30 Days'], ['90', '3 Months'], ['180', '6 Months'], ['365', '1 Year'], ['all', 'All']];
    const list = Store.weights.slice().reverse();
    const shown = App.ui.wAll ? list : list.slice(0, 20);
    return `<div class="grid">
      <section class="card"><div class="card-h"><h2>สรุปน้ำหนัก</h2><button class="btn sm primary" data-act="add-weight">${icon('plus')} บันทึกน้ำหนัก</button></div>
        <div class="kv-grid">
          <div class="kv"><div class="k">Today's Weight</div><div class="v">${N(st.today, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Starting Weight</div><div class="v">${N(st.start, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Target Weight</div><div class="v">${N(st.target, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Change from Yesterday</div><div class="v">${App.deltaHTML(st.vsYesterday, 1, 'kg', goalDown)}</div></div>
          <div class="kv"><div class="k">Total Weight Change</div><div class="v">${App.deltaHTML(st.total, 1, 'kg', goalDown)}</div></div>
          <div class="kv"><div class="k">7-Day Average</div><div class="v">${N(st.ma7, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Weekly Change</div><div class="v">${App.deltaHTML(st.weekly, 2, 'kg', goalDown)}</div></div>
        </div>
        <p class="small" style="margin:12px 0 0"><b>Weight Trend:</b> ${esc(Calc.trendLabel(st.trend))}</p></section>
      <section class="card"><div class="card-h"><h2>Daily Weight + 7-Day Moving Average</h2></div>
        <div class="seg" style="margin-bottom:12px">${R.map(([k, l]) => `<button class="${App.ui.wRange === k ? 'on' : ''}" data-act="w-range" data-r="${k}">${l}</button>`).join('')}</div>
        ${App.chart(el => App.drawWeight(el, App.ui.wRange))}
        <div class="legend"><span><i class="dot"></i>น้ำหนักรายวัน</span><span><i style="background:var(--accent)"></i>ค่าเฉลี่ย 7 วัน</span><span><i class="dash"></i>เป้าหมาย</span></div>
        <p class="help" style="margin:8px 0 0">น้ำหนักรายวันขึ้นลงได้ 0.2–1 kg จากน้ำ เกลือ และอาหารในท้อง ให้ดูเส้นค่าเฉลี่ย 7 วันเป็นหลัก</p></section>
      <section class="card wlist"><div class="card-h"><h2>ประวัติน้ำหนัก</h2><span class="sub">${list.length} รายการ</span></div>
        ${shown.length ? shown.map((w, i) => {
          const prev = list[i + 1]; const d = prev ? w.weight - prev.weight : null;
          return `<button class="wrow" data-act="weight-row" data-date="${w.date}"><span class="wd"><span style="display:block">${Calc.fmt.day(w.date)}</span><span class="tiny muted">เฉลี่ย 7 วัน ${N(Calc.ma7(w.date), 1)}${w.waist ? ' · เอว ' + w.waist + ' cm' : ''}${w.bodyFat ? ' · BF ' + w.bodyFat + '%' : ''}${w.note ? ' · ' + esc(w.note) : ''}</span></span>
            ${d != null ? App.deltaHTML(d, 1, '', goalDown) : ''}<span class="wv">${N(w.weight, 1)}</span></button>`;
        }).join('') : '<div class="empty">ยังไม่มีบันทึกน้ำหนัก</div>'}
        ${list.length > 20 ? `<button class="btn ghost block" data-act="w-all">${App.ui.wAll ? 'แสดงน้อยลง' : 'แสดงทั้งหมด ' + list.length + ' รายการ'}</button>` : ''}</section>
    </div>`;
  }
  App.actions['w-range'] = el => { App.ui.wRange = el.dataset.r; App.render({ keepScroll: true }); };
  App.actions['w-all'] = () => { App.ui.wAll = !App.ui.wAll; App.render({ keepScroll: true }); };

  /* ---------- Dashboard Daily / Weekly / Monthly (#20) ---------- */
  function periods(kind) {
    const td = Calc.today();
    if (kind === 'daily') return Calc.range(Calc.add(td, -13), td).map(d => ({ from: d, to: d, label: Calc.parse(d).getDate() + '', full: Calc.fmt.day(d) }));
    if (kind === 'weekly') { const ws = Calc.weekStart(td); return Array.from({ length: 8 }, (_, i) => { const s = Calc.add(ws, -7 * (7 - i)); return { from: s, to: Calc.add(s, 6), label: Calc.fmt.short(s), full: Calc.fmt.short(s) + ' – ' + Calc.fmt.short(Calc.add(s, 6)) }; }); }
    const ms = td.slice(0, 8) + '01';
    return Array.from({ length: 6 }, (_, i) => { const s = Calc.addMonths(ms, -(5 - i)); return { from: s, to: Calc.monthEnd(s), label: Calc.fmt.monthShort(s), full: Calc.fmt.month(s) }; });
  }

  function dashTab() {
    const kind = App.ui.dash;
    const ps = periods(kind);
    const td = Calc.today();
    const winFrom = ps[0].from, winTo = ps[ps.length - 1].to;
    const W = Calc.periodStats(winFrom, winTo);
    const t = Calc.targets();
    const rows = ps.map(p => {
      const s = kind === 'daily' ? null : Calc.periodStats(p.from, p.to);
      if (kind === 'daily') {
        const tot = Calc.dayTotals(p.from);
        return { p, kcal: tot.count ? tot.kcal : null, protein: tot.count ? tot.protein : null, carbs: tot.count ? tot.carbs : null, fat: tot.count ? tot.fat : null, fiber: tot.count ? tot.fiber : null, sodium: tot.count ? tot.sodium : null, weight: Calc.weightOn(p.from), status: Calc.dayStatus(p.from), logged: tot.count ? 1 : 0, days: 1 };
      }
      return { p, kcal: s.avg.kcal, protein: s.avg.protein, carbs: s.avg.carbs, fat: s.avg.fat, fiber: s.avg.fiber, sodium: s.avg.sodium, weight: s.avgWeight, logged: s.loggedDays, days: s.doneDays, within: s.within };
    });
    const st = Calc.weightStats();
    const achievement = W.loggedDays ? W.within / W.loggedDays : null;
    const meal = W.mealShare;
    const statusDays = Calc.range(kind === 'monthly' ? Calc.add(td, -89) : kind === 'weekly' ? Calc.add(td, -55) : Calc.add(td, -13), td);
    const avgTot = { protein: W.avg.protein || 0, carbs: W.avg.carbs || 0, fat: W.avg.fat || 0 };
    return `<div class="seg" style="margin-bottom:14px">${[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([k, l]) => `<button class="${kind === k ? 'on' : ''}" data-act="dash" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="grid">
      <section class="card"><div class="card-h"><h2>ค่าเฉลี่ยในช่วงนี้</h2><span class="sub">${Calc.fmt.short(winFrom)} – ${Calc.fmt.short(winTo > td ? td : winTo)} · นับวันที่มีบันทึก</span></div>
        <div class="kv-grid">
          <div class="kv"><div class="k">Average Weight</div><div class="v">${N(W.avgWeight, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Average Calories</div><div class="v">${N(W.avg.kcal)} <small>kcal</small></div></div>
          <div class="kv"><div class="k">Average Protein</div><div class="v">${N(W.avg.protein)} <small>g</small></div></div>
          <div class="kv"><div class="k">Average Carbs</div><div class="v">${N(W.avg.carbs)} <small>g</small></div></div>
          <div class="kv"><div class="k">Average Fat</div><div class="v">${N(W.avg.fat)} <small>g</small></div></div>
          <div class="kv"><div class="k">Average Fiber</div><div class="v">${N(W.avg.fiber, 1)} <small>g</small></div></div>
          <div class="kv"><div class="k">Average Sodium</div><div class="v">${N(W.avg.sodium)} <small>mg</small></div></div>
          <div class="kv"><div class="k">Calorie Target Achievement</div><div class="v">${achievement != null ? N(achievement * 100) + '%' : '–'} <small>${W.within}/${W.loggedDays} วัน</small></div></div>
          <div class="kv"><div class="k">Weekly Weight Change</div><div class="v">${App.deltaHTML(st.weekly, 2, 'kg', Store.profile.goal !== 'gain')}</div></div>
          <div class="kv"><div class="k">Logging Consistency</div><div class="v">${W.consistency != null ? N(W.consistency * 100) + '%' : '–'} <small>${W.loggedDays}/${W.doneDays} วัน</small></div></div>
        </div></section>
      <div class="grid g2">
        <section class="card"><div class="card-h"><h2>Calories ${kind === 'daily' ? 'รายวัน' : 'เฉลี่ยต่อวัน'}</h2><span class="sub">เส้นประ = เป้าหมาย</span></div>
          ${App.chart(el => Charts.bars(el, { bars: rows.map(r => ({ label: r.p.label, value: r.kcal || 0, tone: kind === 'daily' ? (r.status || 'muted') : (r.kcal ? App.tone(r.kcal, t.kcal) : 'muted'), title: r.p.full })), target: t.kcal, unit: 'kcal', aria: 'Calories' }))}
          <div class="legend"><span><i style="background:var(--ok)"></i>ใกล้เป้า ±10%</span><span><i style="background:var(--warn)"></i>ต่าง 10–25%</span><span><i style="background:var(--bad)"></i>ต่างเกิน 25%</span></div></section>
        <section class="card"><div class="card-h"><h2>Weight Trend</h2><span class="sub">${kind === 'daily' ? 'รายวัน + เฉลี่ย 7 วัน' : 'น้ำหนักเฉลี่ยต่อช่วง'}</span></div>
          ${kind === 'daily' ? App.chart(el => App.drawWeight(el, '14')) : App.chart(el => Charts.line(el, { points: rows.map(r => ({ label: r.p.label, v: r.weight })), aria: 'น้ำหนักเฉลี่ย' }))}</section>
        <section class="card"><div class="card-h"><h2>Macro Distribution</h2><span class="sub">เฉลี่ยต่อวัน</span></div>${App.macroDist(avgTot, t, 124)}</section>
        <section class="card"><div class="card-h"><h2>Meal Pattern</h2><span class="sub">สัดส่วน Calories แต่ละมื้อ</span></div>
          <div class="stack-bar">${Calc.MEALS.map((m, i) => `<div class="${['c-b', 'c-l', 'c-d', 'c-s'][i]}" style="width:${(meal[m] * 100).toFixed(1)}%" title="${Calc.MEAL_TH[m]} ${N(meal[m] * 100)}%"></div>`).join('')}</div>
          <div class="legend">${Calc.MEALS.map((m, i) => `<span><i class="${['c-b', 'c-l', 'c-d', 'c-s'][i]}" style="height:10px;width:10px;border-radius:3px"></i>${Calc.MEAL_TH[m]} ${N(meal[m] * 100)}% · บันทึก ${W.mealDays[m]} วัน</span>`).join('')}</div>
          <div class="divider"></div>
          <div class="card-h" style="margin-bottom:8px"><h2>Logging Consistency</h2><span class="sub">${statusDays.length} วันล่าสุด</span></div>
          <div class="consistency">${statusDays.map(d => `<span class="${Calc.dayStatus(d) || ''}" title="${Calc.fmt.day(d)}"></span>`).join('')}</div>
          <div class="legend"><span><i style="background:var(--ok)"></i>ตามเป้า</span><span><i style="background:var(--warn)"></i>ใกล้เคียง</span><span><i style="background:var(--bad)"></i>ห่างเป้า</span><span><i style="background:var(--surface-2)"></i>ไม่ได้บันทึก</span></div></section>
      </div>
      <section class="card"><div class="card-h"><h2>ตารางเปรียบเทียบ${kind === 'daily' ? 'รายวัน' : kind === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}</h2><span class="sub">ค่าเฉลี่ยต่อวัน</span></div>
        <div class="table-wrap"><table class="stat-table"><thead><tr><th>${kind === 'daily' ? 'วัน' : kind === 'weekly' ? 'สัปดาห์' : 'เดือน'}</th><th>น้ำหนัก</th><th>kcal</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Fiber</th><th>Sodium</th><th>${kind === 'daily' ? 'สถานะ' : 'บันทึก'}</th></tr></thead>
        <tbody>${rows.slice().reverse().map(r => `<tr><td>${esc(r.p.full)}</td><td>${N(r.weight, 1)}</td><td>${N(r.kcal)}</td><td>${N(r.protein)}</td><td>${N(r.carbs)}</td><td>${N(r.fat)}</td><td>${N(r.fiber, 1)}</td><td>${N(r.sodium)}</td><td>${kind === 'daily' ? (r.status ? `<span class="pill ${r.status === 'progress' ? 'accent' : r.status}"><span class="dot"></span>${{ ok: 'ตามเป้า', warn: 'ใกล้เคียง', bad: 'ห่างเป้า', progress: 'วันนี้' }[r.status]}</span>` : '–') : `${r.logged}/${r.days} วัน`}</td></tr>`).join('')}</tbody></table></div></section>
    </div>`;
  }
  App.actions.dash = el => { App.ui.dash = el.dataset.k; App.render({ keepScroll: true }); };

  /* ---------- Weekly Review (#23, #24, #25, #55) ---------- */
  function weeklyTab() {
    const td = Calc.today();
    const cur = Calc.weekStart(td);
    const ws = App.ui.reviewWeek || Calc.add(cur, -7);
    const r = Calc.weekReview(ws), prev = r.prev;
    const t = Calc.targets();
    const latestComplete = Calc.add(cur, -7);
    const decided = Store.reviews.get(ws);
    const goalDown = Store.profile.goal !== 'gain';
    const sug = r.complete ? Calc.suggestPlan(ws) : null;

    const cmp = (label, a, b, d, unit, eps, better) => {
      const delta = a != null && b != null ? a - b : null;
      const ar = Calc.arrow(delta, eps);
      let cls = ar.dir;
      if (better && delta != null && ar.dir !== 'flat') cls = (better === 'down') === (ar.dir === 'down') ? 'good' : 'attn';
      return `<div class="cmp-row"><span>${label}</span><span class="vals">${b == null ? '–' : N(b, d)} → <b>${a == null ? '–' : N(a, d)}</b> ${unit}</span><span class="arr ${cls}">${ar.sym} ${ar.label}</span></div>`;
    };
    let h = `<div class="date-nav">
        <button class="icon-btn" data-act="wk-nav" data-d="-7" aria-label="สัปดาห์ก่อนหน้า">${icon('left')}</button>
        <div class="d">${Calc.fmt.short(ws)} – ${Calc.fmt.short(Calc.add(ws, 6))}<small>${ws === cur ? 'สัปดาห์นี้ (ยังไม่จบสัปดาห์)' : ws === latestComplete ? 'สัปดาห์ที่แล้ว' : Calc.fmt.month(ws)}</small></div>
        <button class="icon-btn" data-act="wk-nav" data-d="7" aria-label="สัปดาห์ถัดไป" ${ws >= cur ? 'disabled' : ''}>${icon('right')}</button>
      </div>
      <div class="grid">
      <section class="card"><div class="card-h"><h2>Your Weekly Review</h2><span class="sub">นับวันที่จบแล้วเท่านั้น</span></div>
        ${r.loggedDays === 0 && !r.weights.length ? `<div class="empty">ไม่มีข้อมูลในสัปดาห์นี้</div>` : `
        <div class="kv-grid">
          <div class="kv"><div class="k">Starting Weight</div><div class="v">${N(r.startWeight, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Ending Weight</div><div class="v">${N(r.endWeight, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Average Weight</div><div class="v">${N(r.avgWeight, 1)} <small>kg</small></div></div>
          <div class="kv"><div class="k">Weekly Weight Change</div><div class="v">${App.deltaHTML(r.weightChange, 2, 'kg', goalDown)}</div></div>
          <div class="kv"><div class="k">Average Calories</div><div class="v">${N(r.avg.kcal)} <small>/ ${N(r.avgTarget || t.kcal)}</small></div></div>
          <div class="kv"><div class="k">Average Protein</div><div class="v">${N(r.avg.protein)} <small>/ ${t.protein} g</small></div></div>
          <div class="kv"><div class="k">Average Carbs</div><div class="v">${N(r.avg.carbs)} <small>g</small></div></div>
          <div class="kv"><div class="k">Average Fat</div><div class="v">${N(r.avg.fat)} <small>g</small></div></div>
          <div class="kv"><div class="k">Average Fiber</div><div class="v">${N(r.avg.fiber, 1)} <small>g</small></div></div>
          <div class="kv"><div class="k">Average Sodium</div><div class="v">${N(r.avg.sodium)} <small>mg</small></div></div>
          <div class="kv"><div class="k">Days Within / Over / Under</div><div class="v">${r.within} / ${r.over} / ${r.under}</div></div>
          <div class="kv"><div class="k">Logging Consistency</div><div class="v">${r.loggedDays}/${r.doneDays} <small>วัน</small></div></div>
        </div>
        <div style="margin-top:14px">${App.chart(el => Charts.bars(el, { bars: Calc.range(ws, Calc.add(ws, 6)).map(d => ({ label: Calc.fmt.dowShort[Calc.parse(d).getDay()], value: Calc.dayTotals(d).kcal, tone: Calc.dayStatus(d) || 'muted', title: Calc.fmt.day(d) })), target: r.avgTarget || t.kcal, unit: 'kcal', height: 170, aria: 'Calories รายวันในสัปดาห์' }))}</div>`}
      </section>
      <section class="card"><div class="card-h"><h2>This Week vs Previous Week</h2><span class="sub">${Calc.fmt.short(Calc.add(ws, -7))} → ${Calc.fmt.short(ws)}</span></div>
        ${cmp('Average Weight', r.avgWeight, prev.avgWeight, 1, 'kg', 0.1, goalDown ? 'down' : 'up')}
        ${cmp('Average Calories', r.avg.kcal, prev.avg.kcal, 0, 'kcal', 30)}
        ${cmp('Protein', r.avg.protein, prev.avg.protein, 0, 'g', 3, 'up')}
        ${cmp('Carbs', r.avg.carbs, prev.avg.carbs, 0, 'g', 5)}
        ${cmp('Fat', r.avg.fat, prev.avg.fat, 0, 'g', 3)}
        ${cmp('Fiber', r.avg.fiber, prev.avg.fiber, 1, 'g', 1, 'up')}
        ${cmp('Sodium', r.avg.sodium, prev.avg.sodium, 0, 'mg', 100, 'down')}
        ${cmp('วันที่บันทึก', r.loggedDays, prev.loggedDays, 0, 'วัน', 0, 'up')}
      </section>`;
    if (sug) {
      const isLatest = ws === latestComplete;
      h += `<section class="card"><div class="card-h"><h2>Suggested Plan for Next Week</h2><span class="sub">ทุกข้อมีเหตุผลประกอบ (Why?)</span></div>
        <div class="stack">${sug.items.map(it => `<div class="sugg tone-${it.tone === 'bad' ? 'bad' : it.tone === 'warn' ? 'warn' : it.tone === 'ok' ? 'ok' : 'neutral'}"><h3>${esc(it.title)}</h3><div class="why"><b>Why?</b> ${esc(it.why)}</div></div>`).join('')}</div>
        <div class="callout" style="margin-top:12px">${sug.delta ? `ข้อเสนอ: เป้า Calories <b>${N(sug.currentKcal)} → ${N(sug.newKcal)} kcal/วัน</b> (คำนวณใหม่ด้วยน้ำหนักเฉลี่ยล่าสุด ${N(sug.newWeight, 1)} kg)` : `ข้อเสนอ: คงเป้า Calories ${N(sug.currentKcal)} kcal/วัน`}</div>
        ${decided ? `<p class="small" style="margin:12px 0 0"><span class="pill ${decided.decision === 'applied' ? 'ok' : ''}"><span class="dot"></span>${decided.decision === 'applied' ? 'ใช้แผนที่แนะนำแล้ว' : 'คงแผนเดิมไว้'}</span> <span class="muted">เมื่อ ${Calc.fmt.day(decided.updatedAt.slice(0, 10))}</span></p>`
          : isLatest ? `<div class="row wrap" style="margin-top:12px">${sug.delta ? `<button class="btn primary" data-act="wk-apply" data-week="${ws}">${icon('check')} Apply Suggested Plan</button>` : ''}<button class="btn ${sug.delta ? '' : 'primary'}" data-act="wk-keep" data-week="${ws}">Keep Current Plan</button></div>
            <p class="help" style="margin:8px 0 0">ระบบจะไม่เปลี่ยนเป้าหมายจนกว่าคุณจะกดยืนยัน</p>` : '<p class="help" style="margin:12px 0 0">ตัดสินใจได้เฉพาะสัปดาห์ล่าสุดที่จบแล้ว</p>'}
      </section>`;
    } else h += `<section class="card"><p class="muted" style="margin:0">ข้อเสนอแผนสัปดาห์หน้าจะสร้างเมื่อจบสัปดาห์ (หลังวันอาทิตย์) เพื่อไม่ตัดสินจากข้อมูลไม่ครบ</p></section>`;
    return h + '</div>';
  }
  App.actions['wk-nav'] = el => {
    const cur = Calc.weekStart(Calc.today());
    const ws = Calc.add(App.ui.reviewWeek || Calc.add(cur, -7), +el.dataset.d);
    if (ws > cur) return;
    App.ui.reviewWeek = ws; App.render({ keepScroll: true });
  };
  App.actions['wk-apply'] = async el => {
    const ws = el.dataset.week; const s = Calc.suggestPlan(ws);
    const ok = await App.confirm({ title: 'Apply Suggested Plan?', message: `เปลี่ยนเป้า Calories จาก ${N(s.currentKcal)} เป็น ${N(s.newKcal)} kcal/วัน เริ่มตั้งแต่วันนี้ สามารถแก้ไขได้ภายหลังในหน้าตั้งค่า`, ok: 'ใช้แผนนี้' });
    if (!ok) return;
    const p = Object.assign({}, Store.profile, { calorieAdjust: s.newAdjust, currentWeight: s.newWeight, demo: Store.profile.demo });
    const kcal = Calc.computeTargets(p).kcal;
    p.history = (p.history || []).filter(h => h.from !== Calc.today()).concat({ from: Calc.today(), kcal });
    await Store.saveProfile(p);
    await Store.putReview({ weekStart: ws, decision: 'applied', fromKcal: s.currentKcal, toKcal: kcal, items: s.items.map(i => i.type), demo: !!Store.profile.demo });
    App.render({ keepScroll: true }); App.toast(`ใช้เป้าใหม่ ${N(kcal)} kcal/วัน แล้ว`);
  };
  App.actions['wk-keep'] = async el => {
    const ws = el.dataset.week; const s = Calc.suggestPlan(ws);
    await Store.putReview({ weekStart: ws, decision: 'kept', fromKcal: s.currentKcal, toKcal: s.currentKcal, items: s.items.map(i => i.type), demo: !!Store.profile.demo });
    App.render({ keepScroll: true }); App.toast('คงแผนเดิมไว้');
  };

  /* ---------- Calendar (#30) ---------- */
  function calendarTab() {
    const td = Calc.today();
    const m0 = App.ui.calMonth || (td.slice(0, 8) + '01');
    const start = Calc.weekStart(m0);
    const end = Calc.add(Calc.weekStart(Calc.monthEnd(m0)), 6);
    const days = Calc.range(start, end);
    const t = Calc.targets();
    const dows = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    return `<div class="date-nav">
        <button class="icon-btn" data-act="cal-nav" data-d="-1" aria-label="เดือนก่อนหน้า">${icon('left')}</button>
        <div class="d">${Calc.fmt.month(m0)}</div>
        <button class="icon-btn" data-act="cal-nav" data-d="1" aria-label="เดือนถัดไป">${icon('right')}</button></div>
      <section class="card">
        <div class="cal-grid">${dows.map(d => `<div class="cal-dow">${d}</div>`).join('')}
        ${days.map(d => {
          const tot = Calc.dayTotals(d), w = Calc.weightOn(d), st = Calc.dayStatus(d);
          const out = d.slice(0, 7) !== m0.slice(0, 7);
          return `<button class="cal-day ${out ? 'out' : ''} ${d === td ? 'today' : ''}" data-act="day" data-date="${d}" aria-label="${Calc.fmt.long(d)}">
            <span class="dn">${Calc.parse(d).getDate()}${st ? `<i class="${st}"></i>` : ''}</span>
            ${w != null ? `<span class="cv"><b>${N(w, 1)}</b><span class="hide-mobile"> kg</span></span>` : ''}
            ${tot.count ? `<span class="cv"><span class="hide-mobile">${N(tot.kcal)} kcal</span><span class="mob-only">${(tot.kcal / 1000).toFixed(1)}k</span></span><span class="cv hide-mobile">P ${N(tot.protein)}${t ? '/' + t.protein : ''} g</span>` : ''}
          </button>`;
        }).join('')}</div>
        <div class="legend"><span><i style="background:var(--ok);height:8px;width:8px;border-radius:50%"></i>On Target ±10%</span><span><i style="background:var(--warn);height:8px;width:8px;border-radius:50%"></i>Attention 10–25%</span><span><i style="background:var(--bad);height:8px;width:8px;border-radius:50%"></i>เกิน 25%</span><span>กดวันที่เพื่อดูรายละเอียด</span></div>
      </section>`;
  }
  App.actions['cal-nav'] = el => { const m0 = App.ui.calMonth || (Calc.today().slice(0, 8) + '01'); App.ui.calMonth = Calc.addMonths(m0, +el.dataset.d); App.render({ keepScroll: true }); };
})();
