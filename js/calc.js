/* Plate & Scale — calculations and rule-based analysis.
   Every number here is an estimate. Functions read from window.Store. */
(function () {
  const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
  const MEAL_TH = { breakfast: 'มื้อเช้า', lunch: 'มื้อกลางวัน', dinner: 'มื้อเย็น', snack: 'ของว่าง' };
  const MEAL_EN = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
  const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
  const ACTIVITY = [
    { v: 1.2, label: 'นั่งทำงานเป็นหลัก ไม่ค่อยออกกำลังกาย' },
    { v: 1.375, label: 'ออกกำลังกายเบา 1–3 วัน/สัปดาห์' },
    { v: 1.55, label: 'ออกกำลังกายปานกลาง 3–5 วัน/สัปดาห์' },
    { v: 1.725, label: 'ออกกำลังกายหนัก 6–7 วัน/สัปดาห์' },
    { v: 1.9, label: 'งานใช้แรงมาก หรือฝึกหนักวันละ 2 ครั้ง' }
  ];

  /* ---------- dates (local time, YYYY-MM-DD keys) ---------- */
  const pad = n => String(n).padStart(2, '0');
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
  function add(k, n) { const d = parse(k); d.setDate(d.getDate() + n); return key(d); }
  function diff(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  function today() { return key(new Date()); }
  function weekStart(k) { const d = parse(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return key(d); }
  function range(from, to) { const out = []; for (let k = from; k <= to; k = add(k, 1)) out.push(k); return out; }
  function addMonths(k, n) { const d = parse(k); d.setDate(1); d.setMonth(d.getMonth() + n); return key(d); }
  function monthEnd(k) { const d = parse(k); return key(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }

  const TH_DAY = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const TH_DAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const fmt = {
    short(k) { const d = parse(k); return d.getDate() + ' ' + TH_MON[d.getMonth()]; },
    day(k) { const d = parse(k); return TH_DAY[d.getDay()] + ' ' + d.getDate() + ' ' + TH_MON[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(2); },
    long(k) { const d = parse(k); return TH_DAY_FULL[d.getDay()] + ' ' + d.getDate() + ' ' + TH_MON[d.getMonth()] + ' ' + (d.getFullYear() + 543); },
    month(k) { const d = parse(k); return TH_MON_FULL[d.getMonth()] + ' ' + (d.getFullYear() + 543); },
    monthShort(k) { const d = parse(k); return TH_MON[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(2); },
    rel(k) { const t = today(); const n = diff(t, k); return n === 0 ? 'วันนี้' : n === 1 ? 'พรุ่งนี้' : n === -1 ? 'เมื่อวาน' : fmt.day(k); },
    dowShort: TH_DAY
  };

  /* ---------- numbers ---------- */
  const round = (n, d = 0) => { const m = Math.pow(10, d); return Math.round((+n || 0) * m) / m; };
  const num = (n, d = 0) => round(n, d).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const signed = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n), d);

  /* ---------- profile targets ---------- */
  function bmiCategory(b) {
    if (b < 18.5) return { label: 'น้ำหนักน้อย', tone: 'warn' };
    if (b < 23) return { label: 'ปกติ', tone: 'ok' };
    if (b < 25) return { label: 'น้ำหนักเกิน', tone: 'warn' };
    if (b < 30) return { label: 'อ้วนระดับ 1', tone: 'warn' };
    return { label: 'อ้วนระดับ 2', tone: 'bad' };
  }

  function computeTargets(p) {
    if (!p) return null;
    const w = +p.currentWeight, hcm = +p.height, age = +p.age;
    const h = hcm / 100;
    const bmi = w / (h * h);
    const bmr = 10 * w + 6.25 * hcm - 5 * age + (p.sex === 'male' ? 5 : -161);
    const tdee = bmr * (+p.activity || 1.2);
    const dir = p.goal === 'lose' ? -1 : p.goal === 'gain' ? 1 : 0;
    const goalDelta = dir * (+p.rate || 0) * 7700 / 7;
    const floor = p.sex === 'male' ? 1500 : 1200;
    let kcal = tdee + goalDelta + (+p.calorieAdjust || 0);
    let floorApplied = false;
    if (kcal < floor) { kcal = floor; floorApplied = true; }
    kcal = Math.round(kcal / 10) * 10;
    const refW = bmi >= 30 ? 27 * h * h : w;
    const perKg = p.goal === 'lose' ? 1.6 : p.goal === 'gain' ? 1.8 : 1.4;
    const protein = Math.round(refW * perKg / 5) * 5;
    const fat = Math.round(kcal * 0.28 / 9);
    const carbs = Math.max(100, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const fiber = Math.max(25, Math.round(kcal / 1000 * 14));
    return {
      bmi, bmiCat: bmiCategory(bmi), bmr, tdee, kcal, protein, carbs, fat, fiber,
      sodium: 2000, sugar: Math.round(kcal * 0.1 / 4), floor, floorApplied, goalDelta
    };
  }

  function targets() { return computeTargets(Store.profile); }

  /* target calories that applied on a given date (history keeps past targets honest) */
  function targetKcalFor(date) {
    const p = Store.profile; if (!p) return null;
    const hist = (p.history || []).filter(h => h.from <= date).sort((a, b) => a.from < b.from ? -1 : 1);
    if (hist.length) return hist[hist.length - 1].kcal;
    return targets().kcal;
  }

  /* ---------- food entries ---------- */
  function entryTotals(e) {
    const q = +e.qty || 0, o = {};
    for (const k of NUTRIENTS) o[k] = (+((e.base || {})[k]) || 0) * q;
    return o;
  }
  function sumTotals(list) {
    const o = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    for (const e of list) { const t = entryTotals(e); for (const k of NUTRIENTS) o[k] += t[k]; }
    return o;
  }
  function dayEntries(date) { return Store.byDate.get(date) || []; }
  function mealEntries(date, meal) { return dayEntries(date).filter(e => e.meal === meal); }
  function dayTotals(date) {
    const list = dayEntries(date);
    const t = sumTotals(list);
    t.count = list.length;
    t.meals = {};
    for (const m of MEALS) t.meals[m] = sumTotals(list.filter(e => e.meal === m)).kcal;
    t.mealCounts = {};
    for (const m of MEALS) t.mealCounts[m] = list.filter(e => e.meal === m).length;
    return t;
  }
  function isLogged(date) { return dayEntries(date).length > 0; }

  function dayStatus(date) {
    if (!isLogged(date)) return null;
    const tk = targetKcalFor(date); if (!tk) return null;
    const r = dayTotals(date).kcal / tk;
    if (date === today()) return 'progress';
    if (Math.abs(r - 1) <= 0.1) return 'ok';
    if (Math.abs(r - 1) <= 0.25) return 'warn';
    return 'bad';
  }

  function macroSplit(t) {
    const pk = t.protein * 4, ck = t.carbs * 4, fk = t.fat * 9;
    const tot = pk + ck + fk || 1;
    return {
      protein: { g: t.protein, kcal: pk, pct: pk / tot * 100 },
      carbs: { g: t.carbs, kcal: ck, pct: ck / tot * 100 },
      fat: { g: t.fat, kcal: fk, pct: fk / tot * 100 }
    };
  }

  /* ---------- weight ---------- */
  function weights() { return Store.weights; } // sorted asc by date
  function weightOn(date) { const w = Store.weightMap.get(date); return w ? w.weight : null; }
  function latestWeight(beforeOrOn) {
    const ws = weights();
    for (let i = ws.length - 1; i >= 0; i--) if (!beforeOrOn || ws[i].date <= beforeOrOn) return ws[i];
    return null;
  }
  function ma7(date) {
    const from = add(date, -6);
    const v = weights().filter(w => w.date >= from && w.date <= date).map(w => w.weight);
    return v.length ? avg(v) : null;
  }
  function slopePerWeek(endDate, days = 14) {
    const from = add(endDate, -(days - 1));
    const pts = weights().filter(w => w.date >= from && w.date <= endDate);
    if (pts.length < 5 || diff(pts[0].date, pts[pts.length - 1].date) < 7) return null;
    const xs = pts.map(p => diff(from, p.date)), ys = pts.map(p => p.weight);
    const mx = avg(xs), my = avg(ys);
    let nu = 0, de = 0;
    xs.forEach((x, i) => { nu += (x - mx) * (ys[i] - my); de += (x - mx) * (x - mx); });
    return de ? nu / de * 7 : null;
  }
  function weightStats() {
    const t = today();
    const latest = latestWeight(t);
    const todayW = weightOn(t);
    const prev = latest ? latestWeight(add(latest.date, -1)) : null;
    const p = Store.profile || {};
    const start = p.startWeight || (weights()[0] && weights()[0].weight) || null;
    const ma = latest ? ma7(latest.date) : null;
    const maPrev = latest ? ma7(add(latest.date, -7)) : null;
    const trend = latest ? slopePerWeek(latest.date) : null;
    return {
      today: todayW, latest, start, target: p.targetWeight || null,
      vsYesterday: latest && prev ? latest.weight - prev.weight : null,
      prevDate: prev ? prev.date : null,
      total: latest && start ? latest.weight - start : null,
      ma7: ma, weekly: ma != null && maPrev != null ? ma - maPrev : null,
      trend, toGo: latest && p.targetWeight ? latest.weight - p.targetWeight : null
    };
  }
  function trendLabel(slope) {
    if (slope == null) return 'ยังมีข้อมูลไม่เพียงพอสำหรับการวิเคราะห์แนวโน้ม';
    if (Math.abs(slope) < 0.1) return 'ทรงตัว (เปลี่ยนน้อยกว่า 0.1 kg/สัปดาห์)';
    return (slope < 0 ? 'ลดลง' : 'เพิ่มขึ้น') + ' ประมาณ ' + num(Math.abs(slope), 2) + ' kg/สัปดาห์';
  }
  function arrow(delta, eps) {
    if (delta == null) return { sym: '–', label: 'ไม่มีข้อมูล', dir: 'none' };
    if (Math.abs(delta) <= eps) return { sym: '→', label: 'คงที่', dir: 'flat' };
    return delta > 0 ? { sym: '↑', label: 'เพิ่มขึ้น', dir: 'up' } : { sym: '↓', label: 'ลดลง', dir: 'down' };
  }

  /* ---------- period statistics ---------- */
  function periodStats(from, to) {
    const t = today();
    const days = range(from, to > t ? t : to);
    const done = days.filter(d => d < t);
    const logged = done.filter(isLogged);
    const totals = logged.map(dayTotals);
    const a = {};
    for (const k of NUTRIENTS) a[k] = totals.length ? avg(totals.map(x => x[k])) : null;
    const ws = weights().filter(w => w.date >= from && w.date <= to);
    let within = 0, over = 0, under = 0, targetSum = 0;
    logged.forEach((d, i) => {
      const tk = targetKcalFor(d) || 0; targetSum += tk;
      const r = totals[i].kcal / (tk || 1);
      if (Math.abs(r - 1) <= 0.1) within++; else if (r > 1) over++; else under++;
    });
    const mealKcal = {}; let mealTot = 0;
    for (const m of MEALS) { mealKcal[m] = totals.reduce((s, x) => s + x.meals[m], 0); mealTot += mealKcal[m]; }
    const mealShare = {}; for (const m of MEALS) mealShare[m] = mealTot ? mealKcal[m] / mealTot : 0;
    const mealDays = {}; for (const m of MEALS) mealDays[m] = totals.filter(x => x.mealCounts[m] > 0).length;
    return {
      from, to, days: days.length, doneDays: done.length, loggedDays: logged.length, logged,
      avg: a, avgTarget: logged.length ? targetSum / logged.length : null,
      weights: ws, avgWeight: ws.length ? avg(ws.map(w => w.weight)) : null,
      startWeight: ws.length ? ws[0].weight : null, endWeight: ws.length ? ws[ws.length - 1].weight : null,
      within, over, under, mealShare, mealDays,
      consistency: done.length ? logged.length / done.length : null
    };
  }

  function weekReview(ws) {
    const r = periodStats(ws, add(ws, 6));
    const prev = periodStats(add(ws, -7), add(ws, -1));
    r.prev = prev;
    r.weightChange = r.avgWeight != null && prev.avgWeight != null ? r.avgWeight - prev.avgWeight
      : (r.weights.length >= 2 ? r.endWeight - r.startWeight : null);
    r.complete = add(ws, 6) < today();
    return r;
  }

  /* ---------- weekly plan adjustment (rule-based, needs user confirmation) ---------- */
  function suggestPlan(ws) {
    const r = weekReview(ws), prev = r.prev;
    const p = Store.profile, t = targets();
    const items = [];
    let delta = 0;
    const W = r.avgWeight || p.currentWeight;
    const ch = r.weightChange;
    const add_ = (type, title, why, tone) => items.push({ type, title, why, tone });

    if (r.loggedDays < 4) {
      add_('logging', 'Improve Logging Consistency', `บันทึกอาหารได้ ${r.loggedDays} จาก ${r.doneDays || 7} วัน ข้อมูลน้อยกว่า 4 วันยังไม่พอจะตัดสินว่าเป้าหมาย Calories เหมาะหรือไม่ จึงยังไม่ปรับตัวเลข ลองบันทึกให้ครบอย่างน้อย 5 วันในสัปดาห์หน้า`, 'warn');
    } else if (ch == null) {
      add_('keep', 'Keep Current Plan', 'ยังไม่มีข้อมูลน้ำหนักพอสำหรับเทียบสองสัปดาห์ ชั่งน้ำหนักตอนเช้าอย่างน้อย 3 วันต่อสัปดาห์เพื่อให้ระบบเห็นแนวโน้มจริง', 'neutral');
    } else {
      const adherence = r.avg.kcal / (r.avgTarget || t.kcal);
      const rate = +p.rate || 0;
      const prevReview = weekReview(add(ws, -7));
      const prevChange = prevReview.loggedDays >= 4 ? prevReview.weightChange : null;
      const chTxt = `${ch < 0 ? 'ลดลง' : ch > 0 ? 'เพิ่มขึ้น' : 'ไม่เปลี่ยน'}ประมาณ ${num(Math.abs(ch), 2)} kg`;
      if (p.goal === 'lose') {
        const fastLimit = -Math.max(1.0, 0.01 * W);
        if (ch < fastLimit) {
          delta = 150;
          add_('increase', 'Slightly Increase Calories', `น้ำหนักเฉลี่ย${chTxt} ในสัปดาห์เดียว เร็วกว่าราว 1% ของน้ำหนักตัวต่อสัปดาห์ การลดเร็วเกินไปอาจเสียกล้ามเนื้อและทำต่อได้ยาก จึงแนะนำเพิ่ม 150 kcal/วัน หากลดเร็วแบบนี้ต่อเนื่อง ควรปรึกษาแพทย์หรือนักกำหนดอาหารเพื่อประเมินเพิ่มเติม`, 'warn');
        } else if (adherence > 1.1) {
          add_('keep', 'Keep Current Plan', `เฉลี่ยได้รับ ${num(r.avg.kcal)} kcal สูงกว่าเป้า ${num((adherence - 1) * 100)}% ผลลัพธ์จึงยังสะท้อนการทำตามแผนมากกว่าตัวเลขเป้าหมาย ยังไม่ควรลด Calories เพิ่ม ลองทำตามเป้าเดิมให้ใกล้ขึ้นก่อน`, 'neutral');
        } else if (ch > -rate * 0.4) {
          if (prevChange != null && prevChange > -rate * 0.4) {
            delta = -150;
            add_('reduce', 'Slightly Reduce Calories', `สองสัปดาห์ติดกันน้ำหนักเฉลี่ยเปลี่ยนน้อยกว่าเป้าหมาย (${signed(prevChange, 2)} และ ${signed(ch, 2)} kg) ขณะที่ทำตามเป้า Calories ได้ใกล้เคียง จึงแนะนำลดลงเล็กน้อย 150 kcal/วัน`, 'neutral');
          } else {
            add_('keep', 'Keep Current Plan', `สัปดาห์นี้น้ำหนักเฉลี่ย${chTxt} ช้ากว่าเป้า ${num(rate, 2)} kg แต่เป็นข้อมูลเพียง 1 สัปดาห์ น้ำหนักแกว่งได้จากน้ำและเกลือ จึงขอดูอีก 1 สัปดาห์ก่อนตัดสินใจปรับ`, 'neutral');
          }
        } else {
          add_('keep', 'Keep Current Plan', `น้ำหนักเฉลี่ย${chTxt} ใกล้เคียงเป้าหมาย ${num(rate, 2)} kg/สัปดาห์ จึงยังไม่มีเหตุผลเพียงพอที่จะลด Calories เพิ่ม`, 'ok');
        }
      } else if (p.goal === 'gain') {
        const fastLimit = Math.max(0.75, 0.0075 * W);
        if (ch > fastLimit) {
          delta = -150;
          add_('reduce', 'Slightly Reduce Calories', `น้ำหนักเฉลี่ย${chTxt} เร็วกว่าที่แนะนำ ส่วนเกินอาจเป็นไขมันมากกว่ากล้ามเนื้อ แนะนำลด 150 kcal/วัน`, 'warn');
        } else if (adherence < 0.9) {
          add_('keep', 'Keep Current Plan', `เฉลี่ยได้รับ ${num(r.avg.kcal)} kcal ต่ำกว่าเป้า ${num((1 - adherence) * 100)}% ลองทำตามเป้าเดิมให้ได้ก่อน`, 'neutral');
        } else if (ch < rate * 0.4 && prevChange != null && prevChange < rate * 0.4) {
          delta = 150;
          add_('increase', 'Slightly Increase Calories', `สองสัปดาห์ติดกันน้ำหนักเพิ่มน้อยกว่าเป้า (${signed(prevChange, 2)} และ ${signed(ch, 2)} kg) แนะนำเพิ่ม 150 kcal/วัน`, 'neutral');
        } else {
          add_('keep', 'Keep Current Plan', `น้ำหนักเฉลี่ย${chTxt} ยังอยู่ในแนวทางของเป้าหมาย จึงคงแผนเดิมไว้`, 'ok');
        }
      } else {
        if (Math.abs(ch) > 0.4 && prevChange != null && Math.sign(prevChange) === Math.sign(ch) && Math.abs(prevChange) > 0.3) {
          delta = ch > 0 ? -100 : 100;
          add_(delta > 0 ? 'increase' : 'reduce', delta > 0 ? 'Slightly Increase Calories' : 'Slightly Reduce Calories', `เป้าหมายคือรักษาน้ำหนัก แต่สองสัปดาห์ติดกันน้ำหนักเฉลี่ย${ch > 0 ? 'เพิ่มขึ้น' : 'ลดลง'}ต่อเนื่อง จึงแนะนำปรับ ${signed(delta, 0)} kcal/วัน`, 'neutral');
        } else {
          add_('keep', 'Keep Current Plan', `น้ำหนักเฉลี่ย${chTxt} อยู่ในช่วงปกติของการรักษาน้ำหนัก`, 'ok');
        }
      }
    }

    if (r.loggedDays >= 3) {
      if (r.avg.protein < t.protein * 0.85) add_('protein', 'Increase Protein', `Protein เฉลี่ย ${num(r.avg.protein)} g ต่ำกว่าเป้า ${t.protein} g ช่วยให้อิ่มนานและรักษากล้ามเนื้อ ลองเพิ่มไข่ อกไก่ ปลา เต้าหู้ หรือโยเกิร์ตกรีกมื้อละ 1 อย่าง`, 'warn');
      if (r.avg.fiber < t.fiber * 0.7) add_('fiber', 'Increase Fiber', `ใยอาหารเฉลี่ย ${num(r.avg.fiber)} g ต่ำกว่าเป้า ${t.fiber} g ลองเพิ่มผักลวก 1 ถ้วยต่อมื้อ เปลี่ยนเป็นข้าวกล้อง หรือเพิ่มผลไม้อย่างฝรั่ง`, 'warn');
      const late = (r.mealShare.dinner || 0) + (r.mealShare.snack || 0);
      if (late > 0.5 || r.mealDays.breakfast < r.loggedDays / 2) add_('distribution', 'Improve Meal Distribution', late > 0.5 ? `พลังงาน ${num(late * 100)}% มาจากมื้อเย็นและของว่าง การกระจายไปมื้อเช้าและกลางวันมากขึ้นช่วยลดความหิวช่วงค่ำ` : `บันทึกมื้อเช้าเพียง ${r.mealDays.breakfast} จาก ${r.loggedDays} วัน มื้อเช้าที่มี Protein ช่วยคุมความหิวทั้งวัน`, 'neutral');
      if (r.avg.kcal < t.floor) add_('safety', 'Low Intake', `เฉลี่ยได้รับเพียง ${num(r.avg.kcal)} kcal ต่ำกว่าระดับขั้นต่ำที่แนะนำ (${t.floor} kcal) ควรปรึกษาแพทย์หรือนักกำหนดอาหารเพื่อประเมินเพิ่มเติม`, 'bad');
    }
    if (r.loggedDays >= 4 && r.loggedDays < 6) add_('logging', 'Improve Logging Consistency', `บันทึกครบ ${r.loggedDays} จาก ${r.doneDays} วัน ยิ่งบันทึกครบ การวิเคราะห์ยิ่งแม่นยำ`, 'neutral');

    // clamp to floor
    let newKcal = null, newAdjust = null, newWeight = null;
    if (delta !== 0) {
      const latest = latestWeight(add(ws, 6));
      newWeight = latest ? round(ma7(latest.date) || latest.weight, 1) : p.currentWeight;
      newAdjust = (+p.calorieAdjust || 0) + delta;
      const preview = computeTargets(Object.assign({}, p, { calorieAdjust: newAdjust, currentWeight: newWeight }));
      newKcal = preview.kcal;
      if (preview.floorApplied) items.push({ type: 'note', title: 'Minimum Calories', why: `ระบบจะไม่ตั้งเป้าต่ำกว่า ${preview.floor} kcal/วัน`, tone: 'neutral' });
    }
    return { review: r, items, delta, newAdjust, newKcal, newWeight, currentKcal: t.kcal };
  }

  /* ---------- food suggestions ---------- */
  function suggestFoods(kcalMax, proteinNeed, n = 3) {
    if (kcalMax < 60) return [];
    const pool = Foods.LIST.filter(f => f.n.kcal <= kcalMax && f.n.kcal >= Math.min(80, kcalMax * 0.3) && f.cat !== 'dessert' && f.cat !== 'drink' || (f.id === 'f138' && f.n.kcal <= kcalMax));
    const score = f => proteinNeed > 10 ? f.n.protein / f.n.kcal * 100 + f.n.fiber : f.n.fiber * 2 + f.n.protein / f.n.kcal * 30;
    return pool.sort((a, b) => score(b) - score(a)).slice(0, n);
  }

  /* ---------- daily recommendation (#18, #21, #22, #27) ---------- */
  function dailyAdvice(date) {
    const t = targets(); if (!t) return { lines: [], tone: 'neutral' };
    const tk = targetKcalFor(date) || t.kcal;
    const tot = dayTotals(date);
    const isToday = date === today();
    const hour = new Date().getHours();
    const lines = [];
    let tone = 'neutral';
    const remain = tk - tot.kcal, pRemain = t.protein - tot.protein;
    if (!tot.count) {
      lines.push(isToday ? 'ยังไม่มีบันทึกอาหารวันนี้ เริ่มจากถ่ายรูปมื้อแรกหรือเพิ่มอาหารได้เลย' : 'วันนี้ไม่มีบันทึกอาหาร');
      return { lines, tone, remain, pRemain, foods: [] };
    }
    let foods = [];
    if (isToday && hour < 21 && tot.mealCounts.dinner === 0) {
      if (remain > 0) {
        lines.push(`วันนี้เหลือได้อีกประมาณ ${num(remain)} kcal และ Protein อีก ${num(Math.max(0, pRemain))} g`);
        foods = suggestFoods(remain, pRemain);
        if (pRemain > 20) lines.push('มื้อถัดไปเลือกอาหารที่มี Protein สูง เพื่อให้ถึงเป้าโดยไม่เกิน Calories');
        tone = 'ok';
      } else {
        lines.push(`ตอนนี้ได้รับ ${num(tot.kcal)} kcal เกินเป้าไปแล้ว ${num(-remain)} kcal มื้อที่เหลือเลือกผัก ต้มจืด หรือโปรตีนไขมันต่ำปริมาณเบา ๆ`);
        lines.push('ไม่ต้องอดมื้อ การกินเกินหนึ่งวันไม่ทำให้แผนเสีย ระบบดูแนวโน้ม 7 วันเป็นหลัก');
        tone = 'warn';
      }
    } else {
      const d = tot.kcal - tk;
      const pShort = t.protein - tot.protein;
      let s = `${isToday ? 'วันนี้' : 'วันนั้น'}ได้รับพลังงาน ${num(tot.kcal)} kcal `;
      s += Math.abs(d) <= tk * 0.1 ? `ใกล้เคียงเป้าหมาย (${signed(d, 0)} kcal)` : d > 0 ? `สูงกว่าเป้าหมาย ${num(d)} kcal` : `ต่ำกว่าเป้าหมาย ${num(-d)} kcal`;
      if (pShort > 5) s += ` และ Protein ต่ำกว่าเป้าหมาย ${num(pShort)} g`;
      lines.push(s);
      tone = Math.abs(d) <= tk * 0.1 ? 'ok' : Math.abs(d) <= tk * 0.25 ? 'warn' : 'bad';
      if (d > tk * 0.1) lines.push('พรุ่งนี้กลับเข้าสู่เป้าหมายปกติ ไม่จำเป็นต้องลดอาหารอย่างรุนแรงเพื่อชดเชยวันนี้');
      if (d < -tk * 0.25) lines.push('พลังงานต่ำกว่าเป้ามาก ถ้าบันทึกครบแล้ว พรุ่งนี้ควรกินให้ถึงเป้าเพื่อรักษาพลังงานและกล้ามเนื้อ');
      if (pShort > 15) lines.push('พรุ่งนี้เน้นอาหาร Protein สูงขึ้น เช่น ไข่ อกไก่ ปลา เต้าหู้ ในทุกมื้อ');
    }
    if (tot.fiber < t.fiber * 0.5 && (!isToday || hour >= 18)) lines.push(`ใยอาหาร ${num(tot.fiber)} g ยังน้อย เพิ่มผักหรือผลไม้ในมื้อถัดไป`);
    if (tot.sodium > 2400) lines.push(`โซเดียมประมาณ ${num(tot.sodium)} mg สูงกว่าคำแนะนำ น้ำหนักพรุ่งนี้อาจขึ้นชั่วคราวจากน้ำ ไม่ใช่ไขมัน`);
    return { lines, tone, remain, pRemain, foods };
  }

  /* tomorrow targets + recommendation (#21) */
  function tomorrowAdvice() {
    const t = targets(); if (!t) return null;
    const td = today();
    const tot = dayTotals(td);
    const ws = periodStats(add(td, -7), add(td, -1));
    const lines = [];
    if (tot.count) {
      const d = tot.kcal - t.kcal;
      if (d > t.kcal * 0.1) lines.push('พรุ่งนี้กลับเข้าสู่เป้าหมายปกติ ไม่จำเป็นต้องลดอาหารอย่างรุนแรงเพื่อชดเชยวันนี้');
      else lines.push('ใช้เป้าหมายปกติ ไม่ต้องปรับตามตัวเลขวันนี้ ระบบดูแนวโน้ม 7 วันเป็นหลัก');
      if (t.protein - tot.protein > 15) lines.push('เน้นอาหาร Protein สูงขึ้นทุกมื้อ');
    }
    if (ws.loggedDays >= 4) {
      if (ws.avg.fiber < t.fiber * 0.7) lines.push(`ใยอาหารเฉลี่ย 7 วัน ${num(ws.avg.fiber)} g เพิ่มผักลวกหรือผลไม้ 1–2 ที่`);
      if (ws.avg.sodium > 2400) lines.push('โซเดียมเฉลี่ยสูง ลดน้ำซุปและเครื่องปรุง');
    }
    if (!lines.length) lines.push('ใช้เป้าหมายปกติ แล้ววางแผนมื้อล่วงหน้าเพื่อให้ถึงเป้าง่ายขึ้น');
    return { t, lines };
  }

  /* ---------- safety flags (#44) ---------- */
  const SYMPTOMS = ['เวียนหัว', 'หน้ามืด', 'ใจสั่น', 'เป็นลม', 'อ่อนเพลียมาก', 'เจ็บหน้าอก', 'ปวดท้อง', 'ท้องเสีย', 'อาเจียน', 'ไม่สบาย', 'ป่วย', 'ผมร่วง', 'ประจำเดือนขาด'];
  function safetyFlags() {
    const flags = [];
    const td = today();
    const t = targets(); if (!t) return flags;
    const s14 = slopePerWeek(td, 14);
    const lw = latestWeight(td);
    if (s14 != null && lw && s14 < -Math.max(1.0, lw.weight * 0.01)) flags.push(`น้ำหนักลดเร็ว ประมาณ ${num(-s14, 1)} kg/สัปดาห์ในช่วง 2 สัปดาห์ล่าสุด`);
    const ps = periodStats(add(td, -7), add(td, -1));
    const low = ps.logged.filter(d => dayTotals(d).kcal < t.floor * 0.85).length;
    if (low >= 3) flags.push(`ได้รับพลังงานต่ำมาก (ต่ำกว่า ${num(t.floor * 0.85)} kcal) ${low} วันใน 7 วันล่าสุด`);
    const notes = [...Store.notes.values()].filter(n => n.date >= add(td, -7));
    if (notes.some(n => SYMPTOMS.some(s => (n.text || '').includes(s)))) flags.push('มีบันทึกที่กล่าวถึงอาการผิดปกติ');
    return flags;
  }

  /* ---------- automatic meal plan ---------- */
  function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  function autoPlan(date, variant = 0) {
    const t = targets();
    const T = Foods.TEMPLATES;
    const rnd = seeded(parseInt(date.replace(/-/g, ''), 10) * 7 + variant * 101);
    const tot = tpl => tpl.reduce((o, [id, q]) => { const f = Foods.BY_ID.get(id); o.k += f.n.kcal * q; o.p += f.n.protein * q; return o; }, { k: 0, p: 0 });
    const pre = {}; for (const m of MEALS) pre[m] = T[m].map(tpl => ({ tpl, ...tot(tpl) }));
    const cands = [];
    for (const b of pre.breakfast) for (const l of pre.lunch) for (const d of pre.dinner) for (const s of pre.snack) {
      const k = b.k + l.k + d.k + s.k, p = b.p + l.p + d.p + s.p;
      const score = Math.abs(k - t.kcal) / t.kcal + 1.5 * Math.max(0, t.protein - p) / t.protein + rnd() * 0.06;
      cands.push([score, [b, l, d, s]]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    const pick = cands[Math.floor(rnd() * Math.min(6, cands.length))][1];
    const items = [];
    pick.forEach((c, i) => c.tpl.forEach(([id, q]) => items.push({ meal: MEALS[i], foodId: id, qty: q })));
    return items;
  }

  window.Calc = {
    MEALS, MEAL_TH, MEAL_EN, NUTRIENTS, ACTIVITY,
    key, parse, add, diff, today, weekStart, range, addMonths, monthEnd, fmt,
    round, num, avg, signed,
    computeTargets, targets, targetKcalFor, bmiCategory,
    entryTotals, sumTotals, dayEntries, mealEntries, dayTotals, isLogged, dayStatus, macroSplit,
    weightOn, latestWeight, ma7, slopePerWeek, weightStats, trendLabel, arrow,
    periodStats, weekReview, suggestPlan, suggestFoods, dailyAdvice, tomorrowAdvice, safetyFlags, autoPlan, SYMPTOMS
  };
})();
