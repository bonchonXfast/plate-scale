/* Plate & Scale — photo processing (resize + compress before storing). */
(function () {
  const MAX_INPUT = 40 * 1024 * 1024;
  const FULL_EDGE = 1280, THUMB_EDGE = 320;

  function err(msg) { const e = new Error(msg); e.userMessage = msg; return e; }

  async function decode(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall through */ }
      try { return await createImageBitmap(file); } catch (e) { /* fall through */ }
    }
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(err('เปิดรูปนี้ไม่ได้ ลองเลือกรูปอื่น หรือถ่ายใหม่อีกครั้ง')); };
      img.src = url;
    });
  }

  function toBlob(canvas, q) {
    return new Promise((resolve, reject) => {
      if (canvas.toBlob) canvas.toBlob(b => b ? resolve(b) : reject(err('บีบอัดรูปไม่สำเร็จ')), 'image/jpeg', q);
      else {
        try {
          const d = canvas.toDataURL('image/jpeg', q);
          resolve(dataURLtoBlob(d));
        } catch (e) { reject(err('บีบอัดรูปไม่สำเร็จ')); }
      }
    });
  }

  function dataURLtoBlob(d) {
    const [h, b] = d.split(',');
    const mime = (h.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(b); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  async function scaleTo(src, edge, q) {
    const w = src.width, h = src.height;
    const s = Math.min(1, edge / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    return { blob: await toBlob(c, q), w: c.width, h: c.height };
  }

  async function process(file) {
    if (!file) throw err('ไม่ได้เลือกรูป');
    const isImg = /^image\//.test(file.type || '') || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(file.name || '');
    if (!isImg) throw err('ไฟล์นี้ไม่ใช่รูปภาพ เลือกไฟล์รูป เช่น JPG หรือ PNG');
    if (file.size > MAX_INPUT) throw err('รูปใหญ่เกินไป (เกิน 40 MB) ลองถ่ายใหม่หรือเลือกรูปที่เล็กลง');
    const src = await decode(file);
    try {
      const full = await scaleTo(src, FULL_EDGE, 0.78);
      const thumb = await scaleTo(src, THUMB_EDGE, 0.72);
      return { blob: full.blob, thumb: thumb.blob, w: full.w, h: full.h, originalSize: file.size };
    } finally { if (src.close) try { src.close(); } catch (e) {} }
  }

  async function fromCanvas(canvas) {
    const full = await toBlob(canvas, 0.82);
    const thumb = await scaleTo(canvas, THUMB_EDGE, 0.72);
    return { blob: full, thumb: thumb.blob };
  }

  window.Photos = { process, fromCanvas, blobToDataURL, dataURLtoBlob, MAX_INPUT };
})();
