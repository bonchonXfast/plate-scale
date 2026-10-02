/* Plate & Scale — app core: shell, rendering, sheets, toasts, events. */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    food: '<path d="M4 3v8a3 3 0 0 0 3 3v7"/><path d="M10 3v8a3 3 0 0 1-3 3"/><path d="M7 3v8"/><path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 6.5V13H17"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chart: '<path d="M5 20V11M11 20V5M17 20v-7M3 20h18"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.6-2.2h5.8L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    scale: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7.5 10a5 5 0 0 1 9 0"/><path d="m12 10 1.8-2.4"/>',
    note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h5"/>',
    chat: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L4 20.5l1.1-4.3A8.5 8.5 0 1 1 21 12z"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 21h14"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    plan: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M9 10h6M9 14h6M9 18h4"/>',
    offline: '<path d="M3 3l18 18M8.6 16.6a5 5 0 0 1 6.8 0M5 13.1a10 10 0 0 1 5-2.9M12 20h.01M19 13.1a10 10 0 0 0-2.5-1.8M2 9.5a15 15 0 0 1 4.6-2.8M22 9.5a15 15 0 0 0-10-3.6"/>',
    plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/>',
    file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'
  };
  const icon = (n, cls = '') => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${P[n] || ''}</svg>`;

  const App = window.App = {
    esc, $, $$, icon,
    isArtifact: !!(window.claude && typeof window.claude.use === 'function'),
    ui: { view: 'home', foodDate: null, foodTab: 'log', progTab: 'weight', wRange: '30', dash: 'daily', reviewWeek: null, calMonth: null },
    views: {}, actions: {}, inputs: {}, changes: {},
    charts: [],
    photoTarget: 'new',
    online: navigator.onLine !== false,
    aiAvailable: false
  };

  /* ---------- formatting helpers shared by views ---------- */
  App.n = (v, d = 0) => v == null || !isFinite(v) ? '–' : Calc.num(v, d);
  App.kcal = v => App.n(v) + ' kcal';
  App.tone = (val, target, tol = 0.1) => { if (!target) return 'neutral'; const r = val / target; return Math.abs(r - 1) <= tol ? 'ok' : Math.abs(r - 1) <= 0.25 ? 'warn' : 'bad'; };
  App.deltaHTML = (d, dec = 1, unit = 'kg', goodDown = true) => {
    if (d == null) return '<span class="delta flat">–</span>';
    const a = Calc.arrow(d, dec ? 0.05 : 1);
    let cls = a.dir === 'flat' ? 'flat' : (a.dir === 'down') === goodDown ? 'down' : 'up';
    return `<span class="delta ${cls}">${a.sym} ${Calc.num(Math.abs(d), dec)} ${unit}</span>`;
  };
  App.initial = name => { const t = String(name || '?').trim().replace(/^[เแโใไ]/, ''); return esc(t[0] || '?'); };
  App.thumb = (photoId, name, cls = 'thumb') => photoId
    ? `<span class="${cls}" data-photo="${esc(photoId)}" aria-hidden="true">${App.initial(name)}</span>`
    : `<span class="${cls}" aria-hidden="true">${App.initial(name)}</span>`;

  App.chart = (fn) => { const id = 'ch_' + App.charts.length + '_' + Math.random().toString(36).slice(2, 6); App.charts.push({ id, fn }); return `<div class="chart" id="${id}"></div>`; };

  /* ---------- shell ---------- */
  const NAV = [
    { v: 'home', label: 'Home', th: 'หน้าหลัก', i: 'home' },
    { v: 'food', label: 'Food', th: 'อาหาร', i: 'food' },
    { v: 'progress', label: 'Progress', th: 'ความคืบหน้า', i: 'chart' },
    { v: 'settings', label: 'Settings', th: 'ตั้งค่า', i: 'settings' }
  ];

  App.mountShell = function () {
    const root = $('#app');
    root.innerHTML = `
      <div class="shell">
        <aside class="sidebar" aria-label="เมนูหลัก">
          <div class="brand"><span class="brand-mark">${icon('plate')}</span>Plate &amp; Scale</div>
          ${NAV.map(n => `<button class="side-btn" data-act="nav" data-view="${n.v}">${icon(n.i)}<span>${n.th}</span></button>`).join('')}
          <button class="side-btn" data-act="assistant">${icon('chat')}<span>Nutrition Assistant</span></button>
          <button class="btn primary side-add" data-act="quickadd">${icon('plus')} เพิ่มรายการ</button>
          <label class="btn soft" for="in-camera" data-pick="new">${icon('camera')} ถ่ายรูปอาหาร</label>
          <div class="side-foot" id="side-foot"></div>
        </aside>
        <div class="main-col">
          <header class="topbar">
            <div class="brand"><span class="brand-mark">${icon('plate')}</span></div>
            <div class="title-wrap"><h1 id="page-title" style="font-size:18px">หน้าหลัก</h1><div class="page-date" id="page-date"></div></div>
            <span id="net-pill"></span>
            <button class="icon-btn" data-act="assistant" aria-label="Nutrition Assistant">${icon('chat')}</button>
          </header>
          <main id="main" tabindex="-1"></main>
        </div>
        <nav class="bottomnav" aria-label="เมนูหลัก">
          <button class="nav-btn" data-act="nav" data-view="home">${icon('home')}<span>Home</span></button>
          <button class="nav-btn" data-act="nav" data-view="food">${icon('food')}<span>Food</span></button>
          <div class="nav-add"><button data-act="quickadd" aria-label="เพิ่มรายการ">${icon('plus')}</button></div>
          <button class="nav-btn" data-act="nav" data-view="progress">${icon('chart')}<span>Progress</span></button>
          <button class="nav-btn" data-act="nav" data-view="settings">${icon('settings')}<span>Settings</span></button>
        </nav>
      </div>
      <div id="sheet-root"></div>
      <div class="toast-root" id="toast-root" aria-live="polite"></div>
      <input type="file" id="in-camera" class="file-input" accept="image/*" capture="environment" tabindex="-1" aria-hidden="true">
      <input type="file" id="in-library" class="file-input" accept="image/*" tabindex="-1" aria-hidden="true">
      <input type="file" id="in-restore" class="file-input" accept="application/json,.json" tabindex="-1" aria-hidden="true">`;
    App.updateNet();
  };

  App.updateNet = function () {
    const el = $('#net-pill'); if (!el) return;
    el.innerHTML = App.online ? '' : `<span class="pill warn">${icon('offline').replace('class=""', 'style="width:14px;height:14px"')} ออฟไลน์</span>`;
  };

  App.render = function (opts = {}) {
    const v = App.ui.view;
    const main = $('#main');
    App.charts = [];
    let html = '';
    try { html = App.views[v](); }
    catch (e) { console.error(e); html = `<div class="card"><h2>เกิดข้อผิดพลาดในการแสดงผล</h2><p class="muted">${esc(e.message)}</p><button class="btn" data-act="nav" data-view="home">กลับหน้าหลัก</button></div>`; }
    main.innerHTML = html;
    $$('[data-act="nav"]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    const nav = NAV.find(n => n.v === v);
    $('#page-title').textContent = nav ? nav.th : '';
    $('#page-date').textContent = Calc.fmt.long(Calc.today());
    const sf = $('#side-foot'); if (sf) sf.textContent = 'ข้อมูลเก็บในเครื่องนี้เท่านั้น';
    App.hydrate(main);
    if (!opts.keepScroll) window.scrollTo(0, 0);
  };

  App.hydrate = function (root) {
    for (const c of App.charts) { const el = document.getElementById(c.id); if (el) try { c.fn(el); } catch (e) { console.error(e); el.innerHTML = '<div class="chart-empty">แสดงกราฟไม่ได้</div>'; } }
    App.loadPhotos(root);
  };

  let io = null;
  App.loadPhotos = function (root) {
    const els = $$('[data-photo]', root || document).filter(el => !el.dataset.loaded);
    const load = async el => {
      el.dataset.loaded = '1';
      try {
        const url = await Store.photoURL(el.dataset.photo, el.dataset.kind || 'thumb');
        if (url) el.innerHTML = `<img src="${url}" alt="" loading="lazy">`;
      } catch (e) { /* keep initial */ }
    };
    if ('IntersectionObserver' in window) {
      if (!io) io = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); load(en.target); } }), { rootMargin: '200px' });
      els.forEach(el => io.observe(el));
    } else els.forEach(load);
  };

  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { for (const c of App.charts) { const el = document.getElementById(c.id); if (el) try { c.fn(el); } catch (e) {} } }, 180);
  });

  /* ---------- toast ---------- */
  App.toast = function (msg, opt = {}) {
    const root = $('#toast-root'); if (!root) return;
    const t = document.createElement('div');
    t.className = 'toast' + (opt.error ? ' err' : '');
    t.setAttribute('role', opt.error ? 'alert' : 'status');
    t.innerHTML = `<span>${esc(msg)}</span>`;
    if (opt.action) {
      const b = document.createElement('button'); b.textContent = opt.action.label;
      b.onclick = () => { t.remove(); opt.action.fn(); };
      t.appendChild(b);
    }
    root.appendChild(t);
    setTimeout(() => t.remove(), opt.ms || (opt.action ? 6000 : 3200));
  };
  App.fail = function (e, fallback) {
    console.error(e);
    App.toast((e && (e.userMessage || (e.code && e.message))) || fallback || 'เกิดข้อผิดพลาด ลองอีกครั้ง', { error: true, ms: 5000 });
  };

  /* ---------- sheet ---------- */
  App.sheet = {
    el: null, onClose: null, name: null,
    open({ title, body, foot = '', wide = false, onClose = null, name = '' }) {
      this.close(true);
      const root = $('#sheet-root');
      root.innerHTML = `
        <div class="sheet-backdrop" data-act="sheet-backdrop">
          <div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
            <div class="sheet-h"><h2 id="sheet-title">${title}</h2><button class="icon-btn" data-act="sheet-close" aria-label="ปิด">${icon('x')}</button></div>
            <div class="sheet-b" id="sheet-body">${body}</div>
            ${foot ? `<div class="sheet-f" id="sheet-foot">${foot}</div>` : ''}
          </div>
        </div>`;
      this.el = root.firstElementChild;
      this.onClose = onClose; this.name = name;
      document.documentElement.style.overflow = 'hidden';
      App.charts = App.charts || [];
      App.loadPhotos(this.el);
      return this.el;
    },
    body(html) { const b = $('#sheet-body'); if (b) { b.innerHTML = html; App.loadPhotos(b); } },
    foot(html) { const f = $('#sheet-foot'); if (f) f.innerHTML = html; },
    close(silent) {
      if (!this.el) return;
      const cb = this.onClose;
      $('#sheet-root').innerHTML = '';
      this.el = null; this.onClose = null; this.name = null;
      document.documentElement.style.overflow = '';
      if (!silent && cb) cb();
    },
    get isOpen() { return !!this.el; }
  };

  /* in-page confirmation (window.confirm is not available everywhere) */
  App.confirm = function ({ title, message, ok = 'ยืนยัน', danger = false, cancel = 'ยกเลิก' }) {
    return new Promise(resolve => {
      App._confirmResolve = resolve;
      App.sheet.open({
        title: esc(title), name: 'confirm',
        body: `<p style="margin:0">${message}</p>`,
        foot: `<button class="btn" data-act="confirm-no">${esc(cancel)}</button><button class="btn ${danger ? 'danger solid' : 'primary'}" data-act="confirm-yes">${esc(ok)}</button>`,
        onClose: () => { const r = App._confirmResolve; App._confirmResolve = null; r && r(false); }
      });
    });
  };
  App.actions['confirm-yes'] = () => { const r = App._confirmResolve; App._confirmResolve = null; App.sheet.close(true); r && r(true); };
  App.actions['confirm-no'] = () => { App.sheet.close(); };
  App.actions['sheet-close'] = () => App.sheet.close();
  App.actions['sheet-backdrop'] = (el, e) => { if (e.target === el) App.sheet.close(); };

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { App.photoTarget = pick.dataset.pick; App.ui.pendingMeal = pick.dataset.meal || null; App.ui.pendingDate = pick.dataset.date || null; }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const fn = App.actions[t.dataset.act];
    if (!fn) return;
    if (t.tagName === 'A' || t.tagName === 'BUTTON') e.preventDefault();
    try { const r = fn(t, e); if (r && r.catch) r.catch(err => App.fail(err)); } catch (err) { App.fail(err); }
  });
  document.addEventListener('input', e => {
    const t = e.target.closest('[data-in]'); if (!t) return;
    const fn = App.inputs[t.dataset.in]; if (fn) fn(t, e);
  });
  document.addEventListener('change', e => {
    const t = e.target.closest('[data-ch]'); if (!t) return;
    const fn = App.changes[t.dataset.ch]; if (fn) { const r = fn(t, e); if (r && r.catch) r.catch(err => App.fail(err)); }
  });
  document.addEventListener('submit', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && App.sheet.isOpen) App.sheet.close();
    if (e.key === 'Enter' && e.target.matches('[data-enter]')) { e.preventDefault(); const fn = App.actions[e.target.dataset.enter]; fn && fn(e.target, e); }
  });
  window.addEventListener('online', () => { App.online = true; App.updateNet(); });
  window.addEventListener('offline', () => { App.online = false; App.updateNet(); App.toast('ออฟไลน์อยู่ บันทึกข้อมูลได้ตามปกติ ข้อมูลอยู่ในเครื่องนี้'); });

  App.actions.nav = el => App.go(el.dataset.view, el.dataset);
  App.go = function (view, data = {}) {
    App.ui.view = view;
    if (data.date) App.ui.foodDate = data.date;
    if (data.tab && view === 'food') App.ui.foodTab = data.tab;
    if (data.tab && view === 'progress') App.ui.progTab = data.tab;
    if (App.sheet.isOpen) App.sheet.close(true);
    App.render();
  };

  /* parse a numeric input safely */
  App.num = function (v) { if (v == null) return NaN; const s = String(v).replace(/,/g, '.').replace(/[^\d.\-]/g, ''); return s === '' ? NaN : parseFloat(s); };
})();
