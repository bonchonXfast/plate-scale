/* Plate & Scale — demo data (14 days) and generated placeholder food photos.
   Every demo record carries demo:true so "Clear Demo Data" removes exactly these. */
(function () {
  function rng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }

  /* ---------- photo painter ---------- */
  function paint(kind, seed) {
    const S = 720, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); const R = rng(seed);
    const circ = (x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); };
    const ell = (x, y, rx, ry, rot, fill) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); };
    const blob = (x, y, r, pts, jitter) => { g.beginPath(); const ps = []; for (let i = 0; i < pts; i++) { const a = i / pts * Math.PI * 2; const rr = r * (1 - jitter / 2 + R() * jitter); ps.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } g.moveTo((ps[0][0] + ps[pts - 1][0]) / 2, (ps[0][1] + ps[pts - 1][1]) / 2); for (let i = 0; i < pts; i++) { const n = ps[(i + 1) % pts]; g.quadraticCurveTo(ps[i][0], ps[i][1], (ps[i][0] + n[0]) / 2, (ps[i][1] + n[1]) / 2); } g.closePath(); };

    // table: warm wood
    const tg = g.createLinearGradient(0, 0, S, S); tg.addColorStop(0, '#9a6a45'); tg.addColorStop(1, '#6e4529');
    g.fillStyle = tg; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(45,22,8,${0.04 + R() * 0.09})`; g.lineWidth = 1 + R() * 3;
      const y = R() * S; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + R() * 24 - 12, S * 0.65, y + R() * 24 - 12, S, y + R() * 20 - 10); g.stroke();
    }
    const cx = S / 2, cy = S / 2;
    const bowl = kind === 'noodle';
    // plate / bowl
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 36; g.shadowOffsetY = 14;
    circ(cx, cy, S * 0.43, '#f3f1ec'); g.restore();
    const pg = g.createRadialGradient(cx - 40, cy - 50, 20, cx, cy, S * 0.43);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.8, '#f1eee7'); pg.addColorStop(1, '#d9d4c9');
    circ(cx, cy, S * 0.43, pg);
    if (bowl) {
      g.strokeStyle = '#2f5d8a'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, S * 0.405, 0, Math.PI * 2); g.stroke();
      const br = g.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, S * 0.36);
      br.addColorStop(0, '#e4b06a'); br.addColorStop(1, '#a8682b');
      circ(cx, cy, S * 0.36, br);
    } else {
      g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, S * 0.33, 0, Math.PI * 2); g.stroke();
    }

    const rice = (x, y, r, tint) => {
      const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
      rg.addColorStop(0, tint ? '#e8d9c4' : '#fffefa'); rg.addColorStop(1, tint ? '#b89a7a' : '#e6e0d1');
      blob(x, y, r, 14, 0.12); g.fillStyle = rg; g.fill();
      for (let i = 0; i < r * 5; i++) {
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.92;
        ell(x + Math.cos(a) * d, y + Math.sin(a) * d, 6, 2.6, R() * Math.PI, tint ? `rgba(${120 + R() * 40},${80 + R() * 30},${60 + R() * 20},.8)` : `rgba(255,255,255,${0.75 + R() * 0.25})`);
      }
    };
    const egg = (x, y, r) => {
      blob(x, y, r, 12, 0.3); const eg = g.createRadialGradient(x, y, r * 0.3, x, y, r * 1.1);
      eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.85, '#f6f1e6'); eg.addColorStop(1, '#c58a43'); g.fillStyle = eg; g.fill();
      const yg = g.createRadialGradient(x - r * 0.12, y - r * 0.12, 2, x, y, r * 0.38);
      yg.addColorStop(0, '#ffd75a'); yg.addColorStop(1, '#f0920a'); circ(x + r * 0.05, y, r * 0.36, yg);
      circ(x - r * 0.08, y - r * 0.1, r * 0.07, 'rgba(255,255,255,.7)');
    };
    const leaves = (x, y, r, n, col) => {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, d = R() * r, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d, rot = R() * Math.PI;
        ell(lx, ly, 20 + R() * 10, 9 + R() * 4, rot, col || (R() > 0.5 ? '#2f6b2a' : '#3f8a35'));
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx - Math.cos(rot) * 16, ly - Math.sin(rot) * 16); g.lineTo(lx + Math.cos(rot) * 16, ly + Math.sin(rot) * 16); g.stroke();
      }
    };

    if (kind === 'rice') {
      rice(cx - 70, cy + 10, 120);
      for (let i = 0; i < 6; i++) {
        g.save(); g.translate(cx + 95, cy - 80 + i * 34); g.rotate(-0.25 + R() * 0.1);
        const mg = g.createLinearGradient(-60, 0, 60, 0); mg.addColorStop(0, '#f0d6ae'); mg.addColorStop(1, '#c79458');
        g.beginPath(); g.roundRect ? g.roundRect(-62, -15, 124, 30, 12) : g.rect(-62, -15, 124, 30); g.fillStyle = mg; g.fill();
        g.strokeStyle = 'rgba(110,60,20,.45)'; g.lineWidth = 3; for (let k = -40; k < 50; k += 26) { g.beginPath(); g.moveTo(k, -14); g.lineTo(k + 12, 14); g.stroke(); }
        g.restore();
      }
      egg(cx + 10, cy + 150, 70);
      leaves(cx - 150, cy - 130, 30, 4, '#5c9e46');
      ell(cx + 150, cy + 120, 22, 14, 0.4, '#d8e8c2');
    } else if (kind === 'kaprao') {
      rice(cx - 85, cy - 10, 125);
      for (let i = 0; i < 260; i++) {
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 120;
        circ(cx + 85 + Math.cos(a) * d, cy + 10 + Math.sin(a) * d * 0.9, 4 + R() * 7, ['#6b3a1e', '#7d4524', '#5a2f17', '#8a5230'][Math.floor(R() * 4)]);
      }
      leaves(cx + 85, cy + 10, 100, 16);
      for (let i = 0; i < 9; i++) { const a = R() * Math.PI * 2, d = R() * 100; circ(cx + 85 + Math.cos(a) * d, cy + 10 + Math.sin(a) * d, 7, '#d42a1f'); circ(cx + 85 + Math.cos(a) * d, cy + 10 + Math.sin(a) * d, 3, '#f7d58a'); }
      egg(cx - 40, cy + 165, 72);
    } else if (kind === 'noodle') {
      g.lineCap = 'round';
      for (let i = 0; i < 46; i++) {
        g.strokeStyle = `rgba(${242 + R() * 12},${228 + R() * 14},${196 + R() * 20},.95)`; g.lineWidth = 5 + R() * 3;
        const x0 = cx - 220 + R() * 440, y0 = cy - 160 + R() * 320;
        g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 60 - R() * 120, y0 + 60 - R() * 120, x0 + 60 - R() * 120, y0 + 60 - R() * 120, x0 + 80 - R() * 160, y0 + 80 - R() * 160); g.stroke();
      }
      g.save(); g.beginPath(); g.arc(cx, cy, S * 0.36, 0, Math.PI * 2); g.clip();
      for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.42; const x = cx + Math.cos(a) * 140, y = cy + Math.sin(a) * 140; g.save(); g.translate(x, y); g.rotate(a); ell(0, 0, 52, 30, 0, '#d48c84'); ell(0, -6, 44, 18, 0, '#e8aaa1'); g.restore(); }
      for (let i = 0; i < 7; i++) { const a = 1.9 + i * 0.36, x = cx + Math.cos(a) * 120, y = cy + Math.sin(a) * 120; const mbg = g.createRadialGradient(x - 6, y - 6, 2, x, y, 22); mbg.addColorStop(0, '#d9c3a7'); mbg.addColorStop(1, '#8f7258'); circ(x, y, 21, mbg); }
      for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2, d = R() * 220; ell(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 7, 3, R() * 3, '#3e8a35'); }
      for (let i = 0; i < 14; i++) { g.strokeStyle = '#f8f5e6'; g.lineWidth = 4; const x = cx - 60 + R() * 120, y = cy - 40 + R() * 80; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 18, x + 38, y + 4); g.stroke(); }
      g.restore();
    } else if (kind === 'fruit') {
      for (let i = 0; i < 5; i++) {
        g.save(); g.translate(cx - 120 + i * 18, cy - 60 + i * 30); g.rotate(-0.6 + i * 0.1);
        g.beginPath(); g.moveTo(-90, 0); g.quadraticCurveTo(0, -48, 90, 0); g.quadraticCurveTo(0, 22, -90, 0); g.fillStyle = '#f7923a'; g.fill();
        g.beginPath(); g.moveTo(-80, 2); g.quadraticCurveTo(0, 18, 80, 2); g.strokeStyle = '#b8642a'; g.lineWidth = 4; g.stroke(); g.restore();
      }
      for (let i = 0; i < 4; i++) {
        g.save(); g.translate(cx + 120, cy - 90 + i * 70); g.rotate(0.3 - i * 0.08);
        g.beginPath(); g.moveTo(-70, 26); g.lineTo(0, -60); g.lineTo(70, 26); g.closePath(); g.fillStyle = '#e8483f'; g.fill();
        g.fillStyle = '#9ccf6a'; g.fillRect(-72, 22, 144, 8); g.fillStyle = '#2f7a2f'; g.fillRect(-72, 30, 144, 10);
        for (let k = 0; k < 6; k++) ell(-30 + k * 12, -4 + (k % 2) * 14, 3, 5, 0.3, '#1d1d1d');
        g.restore();
      }
      for (let i = 0; i < 6; i++) { const x = cx - 150 + i * 46, y = cy + 170 - (i % 2) * 20; circ(x, y, 26, '#f6e7b0'); circ(x, y, 18, '#fbf1cf'); for (let k = 0; k < 5; k++) circ(x + Math.cos(k * 1.26) * 6, y + Math.sin(k * 1.26) * 6, 1.6, '#8a6a3a'); }
    } else if (kind === 'healthy') {
      rice(cx - 110, cy - 90, 95, true);
      leaves(cx + 110, cy - 100, 70, 22, null);
      for (let i = 0; i < 5; i++) { g.save(); g.translate(cx - 100 + i * 12, cy + 110 + i * 6); g.rotate(-0.4); const sg = g.createLinearGradient(-50, 0, 50, 0); sg.addColorStop(0, '#f49a6c'); sg.addColorStop(1, '#e07045'); g.beginPath(); g.roundRect ? g.roundRect(-55, -20, 110, 40, 10) : g.rect(-55, -20, 110, 40); g.fillStyle = sg; g.fill(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; for (let k = -40; k < 50; k += 18) { g.beginPath(); g.moveTo(k, -18); g.quadraticCurveTo(k + 8, 0, k, 18); g.stroke(); } g.restore(); }
      for (let i = 0; i < 7; i++) { const x = cx + 70 + (i % 3) * 52, y = cy + 70 + Math.floor(i / 3) * 50; const tg2 = g.createRadialGradient(x - 7, y - 7, 2, x, y, 22); tg2.addColorStop(0, '#ff6b5a'); tg2.addColorStop(1, '#c4261b'); circ(x, y, 21, tg2); circ(x - 7, y - 7, 4, 'rgba(255,255,255,.6)'); }
      for (let i = 0; i < 4; i++) { g.save(); g.translate(cx + 20, cy - 10 + i * 4); g.rotate(-1 + i * 0.32); g.beginPath(); g.arc(0, 0, 60, 0.2, 1.3); g.arc(0, 0, 34, 1.3, 0.2, true); g.closePath(); g.fillStyle = '#a9c95a'; g.fill(); g.restore(); }
    }
    // label
    g.fillStyle = 'rgba(15,20,18,.62)';
    g.beginPath(); g.roundRect ? g.roundRect(S - 132, S - 58, 112, 38, 10) : g.rect(S - 132, S - 58, 112, 38); g.fill();
    g.fillStyle = '#fff'; g.font = '600 20px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('DEMO', S - 76, S - 32);
    return c;
  }

  /* ---------- demo menus (14 days, oldest first) ---------- */
  const DAYS = [
    { b: [['f020', 2], ['f005', 2], ['f131', 1]], l: [['f040', 1]], d: [['f001', 1], ['f085', 1], ['f086', 1], ['f025', 1]], s: [['f110', 1]] },
    { b: [['f053', 1], ['f131', 1]], l: [['f044', 1]], d: [['f002', 1.5], ['f030', 1.5], ['f097', 1]], s: [['f150', 1], ['f112', 1], ['f160', 1]] },
    { b: [['f007', 1], ['f110', 1], ['f136', 1]], l: [['f063', 1], ['f020', 1]], d: [['f001', 1.5], ['f082', 1], ['f087', 1], ['f020', 1]], s: [['f132', 1]] },
    { b: [['f055', 1], ['f131', 1]], l: [['f046', 1]], d: [['f060', 1], ['f081', 1], ['f166', 1]], s: [['f141', 2]], note: 'งานเลี้ยงวันเกิดเพื่อน กินเยอะกว่าปกติ' },
    { b: [['f052', 1], ['f020', 1]], l: [['f041', 1]], d: [['f002', 1], ['f024', 1], ['f087', 1]], s: [['f138', 1], ['f110', 1]] },
    { b: [['f020', 2], ['f005', 2], ['f136', 1]], l: [['f069', 1], ['f020', 1]], d: [['f088', 1], ['f025', 1], ['f003', 2]], s: [['f115', 1], ['f133', 1]] },
    { b: [['f150', 1], ['f112', 1], ['f160', 1]], l: [['f001', 1], ['f082', 1], ['f087', 1]], d: [['f065', 1], ['f001', 1], ['f020', 1]], s: [['f131', 1], ['f164', 1]] },
    { b: [['f053', 1], ['f136', 1]], l: [['f040', 1], ['f097', 1]], d: [['f001', 1.5], ['f093', 1], ['f086', 1]], s: [['f110', 1], ['f150', 1]] },
    { b: [['f007', 1], ['f110', 1], ['f138', 1]], l: [['f044', 1]], d: [['f070', 1], ['f020', 1]], s: [['f134', 1]] },
    { b: [['f020', 2], ['f005', 2], ['f131', 1]], l: [['f060', 1]], d: [['f002', 1], ['f032', 1], ['f095', 1]], s: [['f115', 1], ['f136', 1]] },
    { b: [['f052', 1], ['f020', 1]], l: [['f047', 1]], d: [['f001', 1], ['f028', 1], ['f097', 1]], s: [['f171', 1], ['f132', 1]] },
    { b: [['f137', 1], ['f164', 1], ['f020', 1]], l: [['f063', 1], ['f020', 1], ['f117', 1]], d: [['f002', 1], ['f024', 1], ['f087', 1], ['f085', 1]], s: [['f150', 1], ['f114', 1]] },
    { b: [['f131', 1], ['f055', 1]], l: [['f041', 1]], d: [['f001', 1], ['f083', 1], ['f097', 1]], s: [['f110', 1]] },
    { b: [['f053', 1], ['f131', 1]], l: [['f040', 1]], d: [['f002', 1.5], ['f024', 1.5], ['f087', 1]], s: [['f150', 1], ['f112', 1]] }
  ];
  const TODAY = { b: [['f020', 2], ['f005', 2], ['f131', 1]], l: [['f044', 1]] };
  const PHOTO_FOR = { f040: 'kaprao', f041: 'kaprao', f063: 'noodle', f065: 'noodle', f070: 'noodle', f069: 'noodle', f002: 'healthy', f001: 'rice', f044: 'rice', f110: 'fruit', f112: 'fruit', f114: 'fruit', f115: 'fruit' };
  const MEALKEY = { b: 'breakfast', l: 'lunch', d: 'dinner', s: 'snack' };
  const HOUR = { b: 7, l: 12, d: 18, s: 15 };

  async function seed() {
    const td = Calc.today();
    const start = Calc.add(td, -14);
    const profile = {
      id: 'profile_demo', demo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      currentWeight: 74.6, startWeight: 74.6, startDate: start, targetWeight: 68, height: 172, age: 45, sex: 'male', activity: 1.55,
      goal: 'lose', rate: 0.5, calorieAdjust: 0, history: []
    };
    profile.history.push({ from: start, kcal: Calc.computeTargets(profile).kcal });
    await DB.put('kv', { key: 'profile', value: profile });

    // photos
    const photoIds = {};
    let seedN = 11;
    for (const kind of ['rice', 'kaprao', 'noodle', 'fruit', 'healthy']) {
      try {
        const cv = paint(kind, seedN++ * 977);
        const p = await Photos.fromCanvas(cv);
        const id = 'ph_demo_' + kind;
        await DB.put('photos', { id, blob: p.blob, thumb: p.thumb, size: p.blob.size, createdAt: new Date().toISOString(), demo: true, mime: 'image/jpeg' });
        photoIds[kind] = id;
      } catch (e) { /* canvas unavailable: entries simply have no photo */ }
    }

    const entries = [];
    let n = 0;
    const addMeal = (date, mk, items, withPhoto) => {
      items.forEach(([fid, q], i) => {
        const f = Foods.BY_ID.get(fid);
        const created = new Date(Calc.parse(date)); created.setHours(HOUR[mk], 5 + i, 0, 0);
        const kind = PHOTO_FOR[items[0][0]];
        entries.push({
          id: 'fe_demo_' + (n++), demo: true, date, meal: MEALKEY[mk], foodId: fid, name: f.name, serving: f.serving, qty: q,
          base: Object.assign({}, f.n), note: '', photoId: withPhoto && i === 0 && kind && photoIds[kind] ? photoIds[kind] : null,
          createdAt: created.toISOString(), updatedAt: created.toISOString()
        });
      });
    };
    const notes = [];
    DAYS.forEach((day, i) => {
      const date = Calc.add(start, i);
      for (const mk of ['b', 'l', 'd', 's']) addMeal(date, mk, day[mk], mk === 'l' || mk === 'd' || (mk === 's' && i % 3 === 0));
      if (day.note) notes.push({ id: 'note_demo_' + i, date, text: day.note, demo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    });
    for (const mk of ['b', 'l']) addMeal(td, mk, TODAY[mk], true);
    await DB.putMany('entries', entries);
    if (notes.length) await DB.putMany('notes', notes);

    // weights: trend ~ -0.6 kg/week with daily noise, a water bump after the party day, two skipped mornings
    const R = rng(20261002);
    const weights = [];
    for (let i = 0; i <= 14; i++) {
      if (i === 7 || i === 11) continue;
      const date = Calc.add(start, i);
      let w = 74.6 - 0.088 * i + (R() - 0.5) * 0.5;
      if (i === 4) w += 0.7; if (i === 5) w += 0.35;
      weights.push({ id: 'w_demo_' + i, date, weight: Calc.round(w, 1), waist: i % 7 === 0 ? Calc.round(96 - i * 0.12, 1) : null, bodyFat: null, note: i === 4 ? 'หลังงานเลี้ยง' : '', demo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    weights[0].weight = 74.6;
    await DB.putMany('weights', weights);

    // a plan for today, so "Planned vs Actual" has something to compare
    const planItems = [['breakfast', 'f020', 2], ['breakfast', 'f005', 2], ['breakfast', 'f136', 1], ['lunch', 'f044', 1], ['dinner', 'f002', 1], ['dinner', 'f024', 1.5], ['dinner', 'f087', 1], ['snack', 'f150', 1]]
      .map(([meal, fid, q], i) => { const f = Foods.BY_ID.get(fid); return { id: 'pi_demo_' + i, meal, foodId: fid, name: f.name, serving: f.serving, qty: q, base: Object.assign({}, f.n) }; });
    await DB.put('plans', { id: 'plan_demo', date: td, items: planItems, demo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    await DB.put('kv', { key: 'settings', demoActive: true, welcomeSeen: false, favorites: ['f020', 'f024', 'f150'], recent: [], aiVision: false, lastBackupAt: null });
    await Store.load();
  }

  window.Demo = { seed, paint };
})();
