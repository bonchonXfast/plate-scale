/* Plate & Scale — startup. */
(function () {
  async function boot() {
    App.mountShell();
    App.bindFileInputs();
    App.bindRestore();
    await DB.open();
    try { await Store.load(); }
    catch (e) { console.error(e); App.toast('เปิดฐานข้อมูลในเครื่องไม่สำเร็จ ข้อมูลอาจไม่ถูกบันทึก', { error: true, ms: 7000 }); }

    // first open: show demo data (at least 7 days) behind the welcome screen
    const fresh = !Store.profile && !Store.entries.length && !Store.weights.length && !Store.settings.welcomeSeen;
    if (fresh) { try { await Demo.seed(); } catch (e) { console.error(e); } }

    const td = Calc.today();
    App.ui.foodDate = td;
    App.ui.reviewWeek = Calc.add(Calc.weekStart(td), -7);
    App.render();
    if (!Store.settings.welcomeSeen) App.openProfile({ welcome: true });
    if (DB.mode === 'memory') App.toast('เบราว์เซอร์นี้ไม่อนุญาตให้เก็บข้อมูล (เช่น โหมดส่วนตัว) ข้อมูลจะหายเมื่อปิดหน้า', { error: true, ms: 8000 });

    // offline cache (standalone PWA only; the Claude viewer does not run service workers)
    if (!App.isArtifact && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
        const s = document.getElementById('sw-status'); if (s) s.textContent = 'พร้อมใช้งานออฟไลน์แล้ว';
      }).catch(() => {
        const s = document.getElementById('sw-status'); if (s) s.textContent = 'เบราว์เซอร์นี้ไม่รองรับโหมดออฟไลน์ ใช้งานออนไลน์ได้ตามปกติ';
      });
    }

    // optional AI vision (only inside the Claude viewer)
    if (App.isArtifact) Vision.aiAvailable().then(ok => { App.aiAvailable = ok; if (ok && App.ui.view === 'settings') App.render({ keepScroll: true }); }).catch(() => {});

    // day rollover while the app stays open
    let day = Calc.today();
    setInterval(() => { const d = Calc.today(); if (d !== day) { day = d; if (!App.sheet.isOpen) App.render({ keepScroll: true }); } }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Calc.today() !== day) { day = Calc.today(); App.ui.foodDate = day; if (!App.sheet.isOpen) App.render(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
