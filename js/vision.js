/* Plate & Scale — AI Vision provider interface (#14 Future AI Vision Ready).
   Flow: Photo -> provider.estimate() -> detected items with estimated portion & nutrition
         -> user confirmation in the food editor -> Save.
   The default "manual" provider never invents results: the user picks the food from the database.
   An optional provider (Claude, only when this page runs inside the Claude viewer and the user
   switches it on) sends the photo out of the device, so the app asks before every send. */
(function () {
  const providers = {};
  let active = null;

  function register(p) { providers[p.id] = p; }

  /* manual provider: database matching, fully offline */
  register({
    id: 'manual', label: 'เลือกจากฐานข้อมูล (ออฟไลน์)', sendsData: false,
    async available() { return true; },
    async estimate() { return { items: [], note: 'เลือกหรือพิมพ์ชื่ออาหาร แล้วระบบจะคำนวณจากฐานข้อมูล' }; }
  });

  /* Claude provider via the artifact runtime `sample` capability */
  const claudeProvider = {
    id: 'claude', label: 'Claude วิเคราะห์รูป (ส่งรูปออกจากเครื่อง)', sendsData: true, sample: null, checked: false,
    async available() {
      if (this.checked) return !!this.sample;
      this.checked = true;
      try {
        if (!window.claude || typeof window.claude.use !== 'function') return false;
        const s = await window.claude.use('sample');
        if (!s) return false;
        const lim = await s.limits().catch(() => null);
        if (!lim || !lim.images) return false;
        this.sample = s;
        return true;
      } catch (e) { return false; }
    },
    async estimate(blob, hint, signal) {
      const prompt = [
        'You estimate nutrition from a food photo for a personal food diary used in Thailand.',
        'Identify each distinct food or drink item visible. For each, estimate the visible portion and its nutrition.',
        hint ? ('The user says the food is: "' + String(hint).slice(0, 120) + '".') : '',
        'Reply with ONLY JSON in this shape:',
        '{"items":[{"name_th":"ข้าวกะเพราหมูสับ","serving":"1 จาน","kcal":580,"protein_g":25,"carbs_g":68,"fat_g":22,"fiber_g":2,"sugar_g":6,"sodium_mg":1200,"confidence":"medium"}],"note_th":"short Thai note about uncertainty"}',
        'Use Thai food names when the dish is Thai. confidence is low, medium or high. If the photo shows no food, return {"items":[],"note_th":"..."}.',
        'These are estimates; never claim precision.'
      ].filter(Boolean).join('\n');
      const data = await this.sample.json(prompt, { images: blob, signal, modelTier: 'default' });
      const items = Array.isArray(data && data.items) ? data.items : [];
      const n = v => Math.max(0, Math.round((+v || 0) * 10) / 10);
      return {
        note: (data && data.note_th) || '',
        items: items.slice(0, 6).map(it => ({
          name: String(it.name_th || it.name || 'อาหาร').slice(0, 80),
          serving: String(it.serving || '1 ที่').slice(0, 40),
          confidence: ['low', 'medium', 'high'].includes(it.confidence) ? it.confidence : 'low',
          base: { kcal: n(it.kcal), protein: n(it.protein_g), carbs: n(it.carbs_g), fat: n(it.fat_g), fiber: n(it.fiber_g), sugar: n(it.sugar_g), sodium: n(it.sodium_mg) }
        }))
      };
    }
  };
  register(claudeProvider);

  const ERR = {
    not_granted: 'ไม่ได้รับอนุญาตให้ใช้ AI ในหน้านี้ ใช้การเลือกจากฐานข้อมูลแทนได้',
    sampling_disabled: 'บัญชีนี้ใช้ AI วิเคราะห์รูปไม่ได้ ใช้การเลือกจากฐานข้อมูลแทนได้',
    images_unavailable: 'หน้าจอนี้ส่งรูปให้ AI ไม่ได้ ใช้การเลือกจากฐานข้อมูลแทนได้',
    image_rejected: 'AI เปิดรูปนี้ไม่ได้ ลองถ่ายใหม่ให้เห็นอาหารชัดขึ้น',
    rate_limited: 'ใช้ AI ถี่เกินไป รอสักครู่แล้วลองใหม่',
    invalid_json: 'AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองกดอีกครั้ง',
    refused: 'AI ไม่สามารถวิเคราะห์รูปนี้ได้',
    session_expired: 'กรุณาเข้าสู่ระบบ Claude อีกครั้ง',
    cancelled: 'ยกเลิกแล้ว'
  };
  function message(e) { return (e && ERR[e.code]) || 'วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง หรือเลือกอาหารจากฐานข้อมูล'; }

  window.Vision = {
    providers, register, message,
    async aiAvailable() { return claudeProvider.available(); },
    get ai() { return claudeProvider; }
  };
})();
