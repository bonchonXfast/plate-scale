/* Plate & Scale — small SVG chart helpers (no external library, works offline). */
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function niceTicks(min, max, count = 4) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const steps = [1, 2, 2.5, 5, 10].map(s => s * mag);
    const step = steps.find(s => s >= step0) || steps[steps.length - 1];
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { lo, hi, ticks, step };
  }

  /* Weight: daily points + 7-day moving average line, optional target line. */
  function weight(el, opt) {
    const W = Math.max(280, el.clientWidth || 600);
    const H = opt.height || (W < 520 ? 210 : 260);
    const P = { l: 40, r: 14, t: 14, b: 28 };
    const { from, to, points, ma, target } = opt;
    const days = Math.max(1, Calc.diff(from, to));
    if (!points.length) { el.innerHTML = '<div class="chart-empty">ยังไม่มีข้อมูลน้ำหนักในช่วงนี้</div>'; return; }
    const vals = points.map(p => p.v).concat(ma.map(p => p.v));
    let mn = Math.min(...vals), mx = Math.max(...vals);
    const showTarget = target != null && target >= mn - Math.max(2, (mx - mn)) && target <= mx + Math.max(2, (mx - mn));
    if (showTarget) { mn = Math.min(mn, target); mx = Math.max(mx, target); }
    const pad = Math.max(0.3, (mx - mn) * 0.12);
    const T = niceTicks(mn - pad, mx + pad, 4);
    const x = k => P.l + (W - P.l - P.r) * (Calc.diff(from, k) / days);
    const y = v => P.t + (H - P.t - P.b) * (1 - (v - T.lo) / (T.hi - T.lo));
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="กราฟน้ำหนักรายวันและค่าเฉลี่ย 7 วัน">`;
    for (const t of T.ticks) {
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/>`;
      s += `<text x="${P.l - 6}" y="${y(t) + 4}" class="axis" text-anchor="end">${Calc.num(t, T.step < 1 ? 1 : 0)}</text>`;
    }
    const nx = Math.min(W < 520 ? 4 : 6, days + 1);
    for (let i = 0; i < nx; i++) {
      const k = Calc.add(from, Math.round(days * i / Math.max(1, nx - 1)));
      const anchor = i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle';
      s += `<text x="${x(k)}" y="${H - 8}" class="axis" text-anchor="${anchor}">${esc(days > 200 ? Calc.fmt.monthShort(k) : Calc.fmt.short(k))}</text>`;
    }
    if (showTarget) {
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(target)}" y2="${y(target)}" class="target"/>`;
      s += `<text x="${W - P.r}" y="${y(target) - 5}" class="axis target-label" text-anchor="end">เป้าหมาย ${Calc.num(target, 1)} kg</text>`;
    }
    if (ma.length > 1) {
      const line = ma.map((p, i) => (i ? 'L' : 'M') + x(p.d).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
      const area = line + ` L${x(ma[ma.length - 1].d).toFixed(1)} ${H - P.b} L${x(ma[0].d).toFixed(1)} ${H - P.b} Z`;
      s += `<path d="${area}" class="ma-area"/>`;
      s += `<path d="${line}" class="ma-line"/>`;
    }
    const r = points.length > 90 ? 1.6 : 3;
    for (const p of points) s += `<circle cx="${x(p.d).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${r}" class="pt"><title>${esc(Calc.fmt.day(p.d))}: ${p.v} kg</title></circle>`;
    const last = ma.length ? ma[ma.length - 1] : points[points.length - 1];
    s += `<circle cx="${x(last.d)}" cy="${y(last.v)}" r="5" class="end"/>`;
    s += '</svg>';
    el.innerHTML = s;
  }

  /* Bars with optional dashed target line. bars: [{label, value, tone, title}] */
  function bars(el, opt) {
    const W = Math.max(280, el.clientWidth || 600);
    const H = opt.height || (W < 520 ? 190 : 230);
    const P = { l: 44, r: 10, t: 16, b: 28 };
    const list = opt.bars;
    if (!list.length || list.every(b => !b.value)) { el.innerHTML = '<div class="chart-empty">' + esc(opt.empty || 'ยังไม่มีข้อมูลในช่วงนี้') + '</div>'; return; }
    const mxv = Math.max(opt.target || 0, ...list.map(b => b.value || 0)) * 1.1;
    const T = niceTicks(0, mxv, 4);
    const y = v => P.t + (H - P.t - P.b) * (1 - v / T.hi);
    const bw = (W - P.l - P.r) / list.length;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opt.aria || 'กราฟแท่ง')}">`;
    for (const t of T.ticks) {
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/>`;
      s += `<text x="${P.l - 6}" y="${y(t) + 4}" class="axis" text-anchor="end">${Calc.num(t)}</text>`;
    }
    const every = Math.ceil(list.length / (W < 520 ? 7 : 14));
    list.forEach((b, i) => {
      const x0 = P.l + i * bw + bw * 0.18, w = bw * 0.64;
      if (b.value) {
        const h = Math.max(1.5, H - P.b - y(b.value));
        s += `<rect x="${x0.toFixed(1)}" y="${(H - P.b - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, w / 3)}" class="bar ${b.tone || ''}"><title>${esc(b.title || b.label)}: ${Calc.num(b.value)} ${esc(opt.unit || '')}</title></rect>`;
      }
      if (i % every === 0 || i === list.length - 1) s += `<text x="${(P.l + i * bw + bw / 2).toFixed(1)}" y="${H - 9}" class="axis" text-anchor="middle">${esc(b.label)}</text>`;
    });
    if (opt.target) {
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(opt.target)}" y2="${y(opt.target)}" class="target"/>`;
      s += `<text x="${W - P.r}" y="${y(opt.target) - 5}" class="axis target-label" text-anchor="end">เป้า ${Calc.num(opt.target)}</text>`;
    }
    s += '</svg>';
    el.innerHTML = s;
  }

  /* line of averages (weekly/monthly weight) */
  function line(el, opt) {
    const W = Math.max(280, el.clientWidth || 600);
    const H = opt.height || 180;
    const P = { l: 40, r: 14, t: 14, b: 28 };
    const pts = opt.points.filter(p => p.v != null);
    if (pts.length < 1) { el.innerHTML = '<div class="chart-empty">ยังไม่มีข้อมูลน้ำหนักในช่วงนี้</div>'; return; }
    const vs = pts.map(p => p.v);
    const T = niceTicks(Math.min(...vs) - 0.4, Math.max(...vs) + 0.4, 4);
    const n = opt.points.length;
    const x = i => P.l + (W - P.l - P.r) * (n === 1 ? 0.5 : i / (n - 1));
    const y = v => P.t + (H - P.t - P.b) * (1 - (v - T.lo) / (T.hi - T.lo));
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opt.aria || 'กราฟเส้น')}">`;
    for (const t of T.ticks) {
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/>`;
      s += `<text x="${P.l - 6}" y="${y(t) + 4}" class="axis" text-anchor="end">${Calc.num(t, T.step < 1 ? 1 : 0)}</text>`;
    }
    const every = Math.ceil(n / (W < 520 ? 6 : 12));
    opt.points.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 9}" class="axis" text-anchor="middle">${esc(p.label)}</text>`; });
    let d = ''; let started = false;
    opt.points.forEach((p, i) => { if (p.v == null) return; d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' '; started = true; });
    s += `<path d="${d}" class="ma-line"/>`;
    opt.points.forEach((p, i) => { if (p.v != null) s += `<circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" class="end"><title>${esc(p.label)}: ${Calc.num(p.v, 1)} kg</title></circle>`; });
    s += '</svg>';
    el.innerHTML = s;
  }

  /* donut / ring as SVG strings */
  function donut(segs, size, center, sub) {
    const r = size / 2 - 10, c = 2 * Math.PI * r, cx = size / 2;
    const tot = segs.reduce((s, x) => s + (x.value || 0), 0);
    let s = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="สัดส่วนสารอาหาร"><circle cx="${cx}" cy="${cx}" r="${r}" class="ring-bg" stroke-width="16" fill="none"/>`;
    let off = 0;
    if (tot > 0) for (const g of segs) {
      const len = (g.value / tot) * c;
      if (len > 0.5) s += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(${g.color})" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2).toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
      off += len;
    }
    if (center != null) s += `<text x="${cx}" y="${cx + 2}" text-anchor="middle" class="donut-num">${esc(center)}</text>`;
    if (sub) s += `<text x="${cx}" y="${cx + 20}" text-anchor="middle" class="donut-sub">${esc(sub)}</text>`;
    return s + '</svg>';
  }

  function ring(pct, size, tone, center, sub) {
    const sw = Math.round(size * 0.09);
    const r = size / 2 - sw / 2 - 2, c = 2 * Math.PI * r, cx = size / 2;
    const p = Math.max(0, Math.min(1, pct));
    let s = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="ความคืบหน้า ${Math.round(pct * 100)}%">`;
    s += `<circle cx="${cx}" cy="${cx}" r="${r}" class="ring-bg" stroke-width="${sw}" fill="none"/>`;
    s += `<circle cx="${cx}" cy="${cx}" r="${r}" class="ring-fg ${tone}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-dasharray="${(p * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
    if (pct > 1) s += `<circle cx="${cx}" cy="${cx}" r="${r}" class="ring-over" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-dasharray="${(Math.min(1, pct - 1) * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
    if (center != null) s += `<text x="${cx}" y="${cx + 4}" text-anchor="middle" class="ring-num">${esc(center)}</text>`;
    if (sub) s += `<text x="${cx}" y="${cx + 24}" text-anchor="middle" class="ring-sub">${esc(sub)}</text>`;
    return s + '</svg>';
  }

  function spark(points, w, h) {
    const vs = points.map(p => p.v).filter(v => v != null);
    if (vs.length < 2) return '';
    const mn = Math.min(...vs), mx = Math.max(...vs), sp = mx - mn || 1;
    const n = points.length;
    const x = i => 3 + (w - 6) * (i / (n - 1));
    const y = v => 4 + (h - 8) * (1 - (v - mn) / sp);
    let d = '', st = false, last = null;
    points.forEach((p, i) => { if (p.v == null) return; d += (st ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' '; st = true; last = [x(i), y(p.v)]; });
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" class="spark"><path d="${d}" class="ma-line"/>${last ? `<circle cx="${last[0]}" cy="${last[1]}" r="3.5" class="end"/>` : ''}</svg>`;
  }

  window.Charts = { weight, bars, line, donut, ring, spark };
})();
