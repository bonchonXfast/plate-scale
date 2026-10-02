/* Plate & Scale — rule-based Nutrition Assistant (#26, #27).
   Answers only from data stored on this device. No invented records.
   Structure: intents -> handler(ctx) -> {lines[], tone}. A future AI provider can implement the same
   answer(question) contract and receive the same context summary. */
(function () {
  const C = () => window.Calc;
  const NOT_ENOUGH = 'ยังมีข้อมูลไม่เพียงพอสำหรับการวิเคราะห์แนวโน้ม';
  const DOCTOR = 'ควรปรึกษาแพทย์หรือนักกำหนดอาหารเพื่อประเมินเพิ่มเติม';

  const QUESTIONS = [
    'วันนี้เหลือกินได้กี่ kcal?', 'Protein ยังขาดเท่าไร?', 'มื้อเย็นควรกินประมาณเท่าไร?', 'วันนี้กินเกินเป้าหมายหรือไม่?',
    'สัปดาห์นี้น้ำหนักเปลี่ยนเท่าไร?', 'น้ำหนักเฉลี่ยเท่าไร?', 'Protein สัปดาห์นี้เพียงพอหรือไม่?', 'ควรปรับแผนสัปดาห์หน้าหรือไม่?',
    'เปรียบเทียบสัปดาห์นี้กับสัปดาห์ก่อน', 'ทำไมน้ำหนักวันนี้เพิ่ม?'
  ];

  function ctx() {
    const c = C(), t = c.targets(), td = c.today();
    return { c, t, td, tot: c.dayTotals(td), tk: c.targetKcalFor(td) || (t && t.kcal) };
  }
  const n = (v, d = 0) => C().num(v, d);

  const intents = [
    { id: 'symptom', test: q => C().SYMPTOMS.some(s => q.includes(s)) || /อาการ|เจ็บ|ปวด|แพ้/.test(q),
      run: () => ({ tone: 'bad', lines: ['ระบบนี้เป็นเครื่องมือบันทึกและเรียนรู้ ไม่สามารถวินิจฉัยอาการได้', DOCTOR] }) },
    { id: 'why_up', test: q => /ทำไม/.test(q) && /(เพิ่ม|ขึ้น)/.test(q), run: whyUp },
    { id: 'compare', test: q => /เปรียบเทียบ|เทียบ/.test(q), run: compareWeeks },
    { id: 'adjust', test: q => /ปรับแผน|ปรับเป้า|สัปดาห์หน้า/.test(q), run: adjust },
    { id: 'week_protein', test: q => /(protein|โปรตีน)/i.test(q) && /สัปดาห์|เพียงพอ|พอไหม|พอหรือ/.test(q), run: weekProtein },
    { id: 'protein', test: q => /(protein|โปรตีน)/i.test(q), run: proteinToday },
    { id: 'week_weight', test: q => /สัปดาห์/.test(q) && /น้ำหนัก/.test(q), run: weekWeight },
    { id: 'avg_weight', test: q => /เฉลี่ย/.test(q) && /น้ำหนัก/.test(q), run: avgWeight },
    { id: 'dinner', test: q => /มื้อเย็น|dinner|มื้อถัดไป|มื้อต่อไป/i.test(q), run: dinner },
    { id: 'over', test: q => /เกิน/.test(q), run: overToday },
    { id: 'remain', test: q => /เหลือ|กินได้|kcal|แคล|calorie/i.test(q), run: remainToday },
    { id: 'weight', test: q => /น้ำหนัก/.test(q), run: avgWeight }
  ];

  function remainToday() {
    const x = ctx();
    if (!x.t) return { lines: ['ยังไม่ได้ตั้งค่าเป้าหมาย ไปที่ ตั้งค่า > โปรไฟล์ก่อน'] };
    const r = x.tk - x.tot.kcal;
    const lines = [`เป้าหมายวันนี้ ${n(x.tk)} kcal ได้รับแล้ว ${n(x.tot.kcal)} kcal`];
    lines.push(r >= 0 ? `เหลือกินได้อีกประมาณ ${n(r)} kcal (ค่าประมาณ)` : `เกินเป้าไปแล้ว ${n(-r)} kcal มื้อที่เหลือเลือกผักและโปรตีนไขมันต่ำปริมาณเบา ๆ ได้`);
    if (!x.tot.count) lines.push('วันนี้ยังไม่มีบันทึกอาหาร');
    return { lines, tone: r >= 0 ? 'ok' : 'warn' };
  }

  function proteinToday() {
    const x = ctx(); if (!x.t) return { lines: ['ยังไม่ได้ตั้งค่าเป้าหมาย'] };
    const r = x.t.protein - x.tot.protein;
    const lines = [`Protein วันนี้ ${n(x.tot.protein)} / ${x.t.protein} g`];
    if (r > 0) {
      lines.push(`ยังขาดอีกประมาณ ${n(r)} g`);
      const ideas = x.c.suggestFoods(Math.max(150, x.tk - x.tot.kcal), r, 3);
      if (ideas.length) lines.push('ตัวเลือกที่ช่วยได้: ' + ideas.map(f => `${f.name} (${f.serving}, P ${f.n.protein} g, ${f.n.kcal} kcal)`).join(', '));
    } else lines.push('ถึงเป้า Protein แล้ว');
    return { lines, tone: r > 0 ? 'warn' : 'ok' };
  }

  function dinner() {
    const x = ctx(); if (!x.t) return { lines: ['ยังไม่ได้ตั้งค่าเป้าหมาย'] };
    const r = x.tk - x.tot.kcal;
    const lines = [];
    if (x.tot.mealCounts.dinner > 0) lines.push(`บันทึกมื้อเย็นไปแล้ว ${n(x.tot.meals.dinner)} kcal`);
    if (r <= 0) {
      lines.push(`วันนี้ได้รับ ${n(x.tot.kcal)} kcal เกินเป้าแล้ว มื้อเย็นเลือกเบา ๆ ประมาณ 200–300 kcal เช่น ต้มจืด ผักลวก กับโปรตีนไขมันต่ำ ไม่จำเป็นต้องงดมื้อ`);
      return { lines, tone: 'warn' };
    }
    const snack = x.tot.mealCounts.snack ? 0 : Math.min(150, Math.round(r * 0.15 / 10) * 10);
    const dk = r - snack;
    lines.push(`มื้อเย็นควรอยู่ราว ${n(dk)} kcal${snack ? ` (เผื่อของว่างอีก ~${snack} kcal)` : ''}`);
    const pr = x.t.protein - x.tot.protein;
    if (pr > 0) lines.push(`ควรมี Protein ประมาณ ${n(Math.min(pr, 60))} g ในมื้อนี้`);
    const ideas = x.c.suggestFoods(dk, pr, 3);
    if (ideas.length) lines.push('ตัวอย่าง: ' + ideas.map(f => `${f.name} (${f.n.kcal} kcal)`).join(', '));
    return { lines, tone: 'ok' };
  }

  function overToday() {
    const x = ctx(); if (!x.t) return { lines: ['ยังไม่ได้ตั้งค่าเป้าหมาย'] };
    const d = x.tot.kcal - x.tk;
    if (!x.tot.count) return { lines: ['วันนี้ยังไม่มีบันทึกอาหาร'] };
    if (d > 0) return { tone: 'warn', lines: [`ใช่ ตอนนี้เกินเป้าประมาณ ${n(d)} kcal (${n(x.tot.kcal)} / ${n(x.tk)})`, 'ไม่ต้องลดอาหารพรุ่งนี้อย่างรุนแรงเพื่อชดเชย ระบบดูค่าเฉลี่ย 7 วันเป็นหลัก'] };
    return { tone: 'ok', lines: [`ยังไม่เกิน ได้รับ ${n(x.tot.kcal)} จาก ${n(x.tk)} kcal`] };
  }

  function weekWeight() {
    const c = C(); const td = c.today(); const ws = c.weekStart(td);
    const r = c.weekReview(ws);
    const st = c.weightStats();
    const lines = [];
    if (st.weekly != null) lines.push(`ค่าเฉลี่ย 7 วันเปลี่ยน ${c.signed(st.weekly, 2)} kg เทียบกับ 7 วันก่อนหน้า`);
    if (r.weights.length >= 2) lines.push(`สัปดาห์นี้ (ตั้งแต่ ${c.fmt.short(ws)}) ชั่ง ${r.weights.length} ครั้ง จาก ${n(r.startWeight, 1)} เป็น ${n(r.endWeight, 1)} kg`);
    if (!lines.length) return { lines: [NOT_ENOUGH, 'ชั่งน้ำหนักตอนเช้าอย่างน้อย 3 วันต่อสัปดาห์'] };
    lines.push('แนวโน้ม 14 วัน: ' + c.trendLabel(st.trend));
    return { lines };
  }

  function avgWeight() {
    const c = C(); const st = c.weightStats();
    if (st.ma7 == null) return { lines: ['ยังไม่มีบันทึกน้ำหนัก'] };
    const lines = [`น้ำหนักเฉลี่ย 7 วันล่าสุด ${n(st.ma7, 1)} kg`];
    if (st.latest) lines.push(`ชั่งล่าสุด ${n(st.latest.weight, 1)} kg (${c.fmt.rel(st.latest.date)})`);
    if (st.total != null) lines.push(`เปลี่ยนจากเริ่มต้น ${c.signed(st.total, 1)} kg`);
    return { lines };
  }

  function weekProtein() {
    const c = C(); const t = c.targets(); const td = c.today();
    const ps = c.periodStats(c.add(td, -7), c.add(td, -1));
    if (ps.loggedDays < 3) return { lines: [NOT_ENOUGH, `มีบันทึกอาหาร ${ps.loggedDays} วันใน 7 วันล่าสุด`] };
    const ok = ps.avg.protein >= t.protein * 0.9;
    return { tone: ok ? 'ok' : 'warn', lines: [`Protein เฉลี่ย 7 วัน ${n(ps.avg.protein)} g เป้าหมาย ${t.protein} g (${n(ps.avg.protein / t.protein * 100)}%)`, ok ? 'เพียงพอแล้ว' : 'ยังน้อยกว่าเป้า เพิ่มแหล่ง Protein มื้อละ 1 อย่าง เช่น ไข่ อกไก่ ปลา เต้าหู้'] };
  }

  function adjust() {
    const c = C(); const td = c.today();
    const ws = c.add(c.weekStart(td), -7);
    const s = c.suggestPlan(ws);
    const lines = [`จากสัปดาห์ ${c.fmt.short(ws)} – ${c.fmt.short(c.add(ws, 6))}:`];
    s.items.forEach(it => lines.push(`${it.title}: ${it.why}`));
    if (s.delta) lines.push(`ข้อเสนอ: เป้า Calories ${n(s.currentKcal)} → ${n(s.newKcal)} kcal/วัน กด "Apply Suggested Plan" ในหน้า Weekly Review หากต้องการเปลี่ยน`);
    return { lines };
  }

  function compareWeeks() {
    const c = C(); const td = c.today();
    const a = c.periodStats(c.add(td, -7), c.add(td, -1));
    const b = c.periodStats(c.add(td, -14), c.add(td, -8));
    if (a.loggedDays < 3 || b.loggedDays < 3) return { lines: [NOT_ENOUGH, `7 วันล่าสุดบันทึก ${a.loggedDays} วัน, 7 วันก่อนหน้าบันทึก ${b.loggedDays} วัน`] };
    const row = (label, x, y, d, unit) => `${label}: ${y == null ? '–' : n(y, d)} → ${x == null ? '–' : n(x, d)} ${unit} ${x != null && y != null ? c.arrow(x - y, d ? 0.1 : 30).sym : ''}`;
    return { lines: [
      '7 วันก่อนหน้า → 7 วันล่าสุด',
      row('น้ำหนักเฉลี่ย', a.avgWeight, b.avgWeight, 1, 'kg'),
      row('Calories เฉลี่ย', a.avg.kcal, b.avg.kcal, 0, 'kcal'),
      row('Protein', a.avg.protein, b.avg.protein, 0, 'g'),
      row('Carbs', a.avg.carbs, b.avg.carbs, 0, 'g'),
      row('Fat', a.avg.fat, b.avg.fat, 0, 'g')
    ] };
  }

  function whyUp() {
    const c = C(); const td = c.today();
    const w = c.weightOn(td);
    const prev = c.latestWeight(c.add(td, -1));
    if (w == null || !prev) return { lines: ['ยังไม่มีน้ำหนักวันนี้หรือวันก่อนหน้าให้เปรียบเทียบ'] };
    const d = w - prev.weight;
    const lines = [];
    if (d <= 0) lines.push(`น้ำหนักวันนี้ไม่ได้เพิ่ม (${c.signed(d, 1)} kg เทียบกับ ${c.fmt.rel(prev.date)})`);
    else {
      lines.push(`วันนี้เพิ่ม ${n(d, 1)} kg เทียบกับ ${c.fmt.rel(prev.date)} การขึ้นลงรายวัน 0.2–1 kg เป็นเรื่องปกติและส่วนใหญ่มาจากน้ำ`);
      const y = c.add(td, -1); const yt = c.dayTotals(y);
      const ps = c.periodStats(c.add(td, -8), c.add(td, -2));
      if (yt.count) {
        if (ps.avg.sodium && yt.sodium > ps.avg.sodium * 1.2) lines.push(`เมื่อวานโซเดียม ~${n(yt.sodium)} mg สูงกว่าค่าเฉลี่ย (${n(ps.avg.sodium)} mg) ร่างกายจึงเก็บน้ำเพิ่ม`);
        if (ps.avg.carbs && yt.carbs > ps.avg.carbs * 1.2) lines.push(`เมื่อวาน Carbs ~${n(yt.carbs)} g สูงกว่าปกติ ร่างกายเก็บไกลโคเจนพร้อมน้ำ`);
        if (ps.avg.kcal && yt.kcal > ps.avg.kcal * 1.15) lines.push(`เมื่อวานได้รับ ${n(yt.kcal)} kcal มากกว่าค่าเฉลี่ย น้ำหนักอาหารที่ยังอยู่ในทางเดินอาหารก็มีผล`);
      } else lines.push('เมื่อวานไม่มีบันทึกอาหาร จึงบอกสาเหตุจากอาหารไม่ได้');
      const st = c.weightStats();
      lines.push('ดูแนวโน้มแทนตัวเลขวันเดียว: ' + c.trendLabel(st.trend));
    }
    return { lines };
  }

  function answer(q) {
    const qq = String(q || '').trim();
    if (!qq) return { lines: ['พิมพ์คำถาม หรือเลือกคำถามด้านบน'] };
    for (const it of intents) if (it.test(qq)) return Object.assign({ intent: it.id }, it.run(qq));
    return { intent: 'unknown', lines: ['ยังตอบคำถามนี้ไม่ได้ Assistant แบบออฟไลน์ตอบได้เรื่อง Calories ที่เหลือ, Protein, มื้อถัดไป, น้ำหนักเฉลี่ย, การเปลี่ยนแปลงรายสัปดาห์ และการปรับแผน'] };
  }

  window.Assistant = { QUESTIONS, answer, NOT_ENOUGH, DOCTOR };
})();
