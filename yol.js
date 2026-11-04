/* Garaj — giriş sahnesi: yukarıdan görünen cadde, vizörle araba yakalama */
(function () {
  const sahne = document.querySelector('.yol-sahne');
  if (!sahne) return;
  const cv = sahne.querySelector('canvas');
  const cx = cv.getContext('2d');
  const vizor = sahne.querySelector('.vizor');
  const ipucu = sahne.querySelector('.ipucu');
  const sayacEl = document.querySelector('[data-sayac]');
  const tepsi = document.querySelector('.tepsi-liste');
  const sakin = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  // ---------- Araba tipleri (birimler: şerit yüksekliği 70 kabul edilerek) ----------
  // kabin: arka cam başı, tavan başı, tavan sonu, ön cam sonu (boyun oranı, merkezden)
  const TIP = {
    hatch: { u: 74, g: 37, rf: 0.42, rr: 0.3, kabin: [-0.43, -0.3, 0.06, 0.22], tr: 'Hatchback', en: 'Hatchback', nad: [0.84, 0.15, 0.01, 0], w: 27 },
    sedan: { u: 88, g: 38, rf: 0.4, rr: 0.32, kabin: [-0.31, -0.19, 0.08, 0.23], tr: 'Sedan', en: 'Saloon', nad: [0.72, 0.24, 0.04, 0], w: 31 },
    suv: { u: 92, g: 42, rf: 0.3, rr: 0.24, kabin: [-0.43, -0.34, 0.1, 0.24], tr: 'SUV', en: 'SUV', nad: [0.58, 0.34, 0.07, 0.01], w: 22 },
    spor: { u: 86, g: 41, rf: 0.55, rr: 0.36, kabin: [-0.28, -0.14, 0.02, 0.19], tr: 'Spor', en: 'Sports car', nad: [0, 0.46, 0.38, 0.16], w: 12 },
    klasik: { u: 98, g: 38, rf: 0.34, rr: 0.34, kabin: [-0.24, -0.15, 0.05, 0.16], tr: 'Klasik', en: 'Classic', nad: [0, 0.22, 0.58, 0.2], w: 8 },
  };
  const TIPLER = Object.keys(TIP);
  const RENK = {
    olagan: ['#eef0f2', '#eef0f2', '#1b1e23', '#1b1e23', '#a6adb5', '#5e656f', '#24324d', '#7c1f27', '#2f463b', '#c4b590'],
    spor: ['#e5b400', '#cf3a1f', '#2a62d6', '#eef0f2', '#1b1e23', '#5c6b2a'],
    klasik: ['#8a2a2a', '#e8e0ca', '#22435f', '#3f5a3b', '#1b1e23'],
  };
  const NADIR = [
    { tr: 'Yaygın', en: 'Common', y: '★', r: '#aeb6c0', min: 1200, max: 6000, k: 100 },
    { tr: 'Nadir', en: 'Rare', y: '★★', r: '#4f86ff', min: 12000, max: 60000, k: 500 },
    { tr: 'Efsanevi', en: 'Legendary', y: '★★★', r: '#e4ad2c', min: 110000, max: 320000, k: 1000 },
    { tr: 'Mistik', en: 'Mythic', y: '★★★★', r: '#c27bff', min: 420000, max: 900000, k: 1000 },
  ];

  const sec = (a) => a[Math.floor(Math.random() * a.length)];
  const agirlikli = (ag) => {
    let t = Math.random() * ag.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ag.length; i++) if ((t -= ag[i]) <= 0) return i;
    return ag.length - 1;
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const ton = (h, a) => {
    const [r, g, b] = hex(h);
    const f = (c) => Math.round(a >= 0 ? c + (255 - c) * a : c * (1 + a));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  };
  const yuvarlak = (c, x, y, w, h, r) => {
    // r: [sol-üst, sağ-üst, sağ-alt, sol-alt]
    const [a, b, d, e] = typeof r === 'number' ? [r, r, r, r] : r;
    c.beginPath();
    c.moveTo(x + a, y);
    c.lineTo(x + w - b, y);
    c.quadraticCurveTo(x + w, y, x + w, y + b);
    c.lineTo(x + w, y + h - d);
    c.quadraticCurveTo(x + w, y + h, x + w - d, y + h);
    c.lineTo(x + e, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - e);
    c.lineTo(x, y + a);
    c.quadraticCurveTo(x, y, x + a, y);
    c.closePath();
  };

  // ---------- Bir arabayı çiz (merkez 0,0; burun +x yönünde) ----------
  function arabaCiz(c, t, renk, s, gece) {
    const L = t.u * s,
      W = t.g * s;
    const rf = W * t.rf,
      rr = W * t.rr;
    const govde = () => yuvarlak(c, -L / 2, -W / 2, L, W, [rr, rf, rf, rr]);

    if (gece) {
      // farlar yola düşen ışık
      const uz = L * 1.25;
      const g = c.createLinearGradient(L / 2, 0, L / 2 + uz, 0);
      g.addColorStop(0, 'rgba(255,236,190,0.34)');
      g.addColorStop(1, 'rgba(255,236,190,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(L / 2 - 2 * s, -W * 0.36);
      c.lineTo(L / 2 + uz, -W * 0.9);
      c.lineTo(L / 2 + uz, W * 0.9);
      c.lineTo(L / 2 - 2 * s, W * 0.36);
      c.closePath();
      c.fill();
      // stop lambası parıltısı
      for (const yy of [-W * 0.3, W * 0.3]) {
        const rg = c.createRadialGradient(-L / 2, yy, 0, -L / 2, yy, W * 0.42);
        rg.addColorStop(0, 'rgba(255,40,40,0.45)');
        rg.addColorStop(1, 'rgba(255,40,40,0)');
        c.fillStyle = rg;
        c.fillRect(-L / 2 - W * 0.45, yy - W * 0.45, W * 0.9, W * 0.9);
      }
    }

    // gölge
    c.save();
    c.shadowColor = gece ? 'rgba(0,0,0,0.65)' : 'rgba(12,18,28,0.32)';
    c.shadowBlur = 9 * s;
    c.shadowOffsetY = 4 * s;
    c.fillStyle = renk;
    govde();
    c.fill();
    c.restore();

    // gövde: yanlardan ortaya doğru kavis
    const g = c.createLinearGradient(0, -W / 2, 0, W / 2);
    g.addColorStop(0, ton(renk, -0.3));
    g.addColorStop(0.16, renk);
    g.addColorStop(0.5, ton(renk, 0.13));
    g.addColorStop(0.84, renk);
    g.addColorStop(1, ton(renk, -0.3));
    c.fillStyle = g;
    govde();
    c.fill();

    // kaput ve bagaj üzerinde yumuşak parlama
    const p = c.createLinearGradient(-L / 2, 0, L / 2, 0);
    p.addColorStop(0, 'rgba(255,255,255,0)');
    p.addColorStop(0.75, 'rgba(255,255,255,0.10)');
    p.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = p;
    govde();
    c.fill();

    const [a, b, d, e] = t.kabin.map((f) => f * L);
    const wr = W * 0.33,
      wg = W * 0.4;
    const cam = c.createLinearGradient(a, 0, e, 0);
    cam.addColorStop(0, gece ? '#06080c' : '#141a23');
    cam.addColorStop(1, gece ? '#141a24' : '#2c3746');

    // yan camlar
    c.fillStyle = gece ? 'rgba(6,8,12,0.85)' : 'rgba(20,26,35,0.8)';
    c.beginPath();
    c.moveTo(a, -wg);
    c.lineTo(e, -wg);
    c.lineTo(d, -wr);
    c.lineTo(b, -wr);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(a, wg);
    c.lineTo(e, wg);
    c.lineTo(d, wr);
    c.lineTo(b, wr);
    c.closePath();
    c.fill();

    // ön cam
    c.fillStyle = cam;
    c.beginPath();
    c.moveTo(d, -wr);
    c.lineTo(e, -wg);
    c.quadraticCurveTo(e + W * 0.08, 0, e, wg);
    c.lineTo(d, wr);
    c.closePath();
    c.fill();
    // arka cam
    c.beginPath();
    c.moveTo(b, -wr);
    c.lineTo(a, -wg);
    c.quadraticCurveTo(a - W * 0.06, 0, a, wg);
    c.lineTo(b, wr);
    c.closePath();
    c.fill();
    // ön camda ince yansıma
    c.strokeStyle = 'rgba(255,255,255,0.14)';
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.moveTo(d + (e - d) * 0.35, -wr * 0.8);
    c.lineTo(d + (e - d) * 0.75, -wr * 0.1);
    c.stroke();

    // tavan
    const tv = c.createLinearGradient(0, -wr, 0, wr);
    tv.addColorStop(0, ton(renk, -0.08));
    tv.addColorStop(0.5, ton(renk, 0.18));
    tv.addColorStop(1, ton(renk, -0.08));
    c.fillStyle = tv;
    yuvarlak(c, b, -wr, d - b, wr * 2, W * 0.1);
    c.fill();

    // aynalar
    c.fillStyle = ton(renk, -0.15);
    yuvarlak(c, d - 4 * s, -W / 2 - 3 * s, 6 * s, 4 * s, 1.5 * s);
    c.fill();
    yuvarlak(c, d - 4 * s, W / 2 - 1 * s, 6 * s, 4 * s, 1.5 * s);
    c.fill();

    // tipe özel ayrıntılar
    if (t === TIP.suv) {
      c.strokeStyle = ton(renk, -0.35);
      c.lineWidth = 1.6 * s;
      for (const yy of [-wr * 0.72, wr * 0.72]) {
        c.beginPath();
        c.moveTo(b + 3 * s, yy);
        c.lineTo(d - 3 * s, yy);
        c.stroke();
      }
    }
    if (t === TIP.spor) {
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.lineWidth = 1.2 * s;
      for (let i = 1; i <= 4; i++) {
        const xx = -L / 2 + (a + L / 2) * (i / 5.2);
        c.beginPath();
        c.moveTo(xx, -W * 0.22);
        c.lineTo(xx, W * 0.22);
        c.stroke();
      }
    }
    if (t === TIP.klasik) {
      c.fillStyle = '#d6dbe1';
      yuvarlak(c, L / 2 - 2.2 * s, -W * 0.44, 3.2 * s, W * 0.88, 1.5 * s);
      c.fill();
      yuvarlak(c, -L / 2 - 1 * s, -W * 0.44, 3.2 * s, W * 0.88, 1.5 * s);
      c.fill();
    }

    // farlar ve stoplar
    c.fillStyle = gece ? '#fffaf0' : '#f6f1df';
    for (const yy of [-W * 0.33, W * 0.33]) {
      yuvarlak(c, L / 2 - 4.5 * s, yy - W * 0.09, 3.6 * s, W * 0.18, 1.4 * s);
      c.fill();
    }
    c.fillStyle = gece ? '#ff3b30' : '#a8121a';
    for (const yy of [-W * 0.32, W * 0.32]) {
      yuvarlak(c, -L / 2 + 0.6 * s, yy - W * 0.1, 2.6 * s, W * 0.2, 1 * s);
      c.fill();
    }
  }

  // Sprite önbelleği: her araba her karede yeniden çizilmez, bir kez hazırlanır
  const onbellek = new Map();
  function sprite(tipAd, renk, s, gece) {
    const anahtar = tipAd + renk + s.toFixed(3) + gece;
    let sp = onbellek.get(anahtar);
    if (sp) return sp;
    const t = TIP[tipAd];
    const L = t.u * s,
      W = t.g * s,
      pad = 16 * s;
    const on = gece ? L * 1.3 : pad;
    const arka = gece ? Math.max(pad, W * 0.5) : pad;
    const w = L + on + arka,
      h = gece ? Math.max(W * 1.9, W + 2 * pad) : W + 2 * pad;
    const k = document.createElement('canvas');
    k.width = Math.ceil(w * DPR);
    k.height = Math.ceil(h * DPR);
    const c = k.getContext('2d');
    c.scale(DPR, DPR);
    c.translate(arka + L / 2, h / 2);
    arabaCiz(c, t, renk, s, gece);
    sp = { k, w, h, ox: arka + L / 2, oy: h / 2 };
    onbellek.set(anahtar, sp);
    return sp;
  }

  // Kart için yukarı bakan küçük resim
  const kartResmi = new Map();
  function kartGorseli(tipAd, renk) {
    const anahtar = tipAd + renk;
    if (kartResmi.has(anahtar)) return kartResmi.get(anahtar);
    const t = TIP[tipAd];
    const s = 0.9,
      L = t.u * s,
      W = t.g * s,
      pad = 10;
    const k = document.createElement('canvas');
    k.width = (W + pad * 2) * 2;
    k.height = (L + pad * 2) * 2;
    const c = k.getContext('2d');
    c.scale(2, 2);
    c.translate(W / 2 + pad, L / 2 + pad);
    c.rotate(-Math.PI / 2);
    arabaCiz(c, t, renk, s, false);
    const url = k.toDataURL('image/png');
    kartResmi.set(anahtar, url);
    return url;
  }

  // ---------- Sahne durumu ----------
  let W = 0,
    H = 0,
    s = 1,
    y0 = 0,
    lh = 0,
    kenar = 0;
  let renkler = {};
  let gece = false;
  let zemin = null;
  const seritler = [[], [], [], []];
  const YON = [-1, -1, 1, 1];
  const HIZ = [92, 128, 118, 84];
  const bosluk = [0, 0, 0, 0];
  let sayac = 0;
  let id = 0;

  function renkleriOku() {
    const st = getComputedStyle(document.documentElement);
    const al = (n) => st.getPropertyValue(n).trim();
    renkler = { yol: al('--yol'), kaldirim: al('--kaldirim'), serit: al('--serit'), sari: al('--sari') };
    gece = al('--gece') === '1';
  }

  function zeminCiz() {
    zemin = document.createElement('canvas');
    zemin.width = Math.ceil(W * DPR);
    zemin.height = Math.ceil(H * DPR);
    const c = zemin.getContext('2d');
    c.scale(DPR, DPR);
    c.fillStyle = renkler.yol;
    c.fillRect(0, 0, W, H);
    // asfalt dokusu
    const n = Math.round((W * H) / 260);
    for (let i = 0; i < n; i++) {
      c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
      c.fillRect(Math.random() * W, y0 + Math.random() * lh * 4, 1.4, 1.4);
    }
    // kaldırımlar
    c.fillStyle = renkler.kaldirim;
    c.fillRect(0, 0, W, kenar);
    c.fillRect(0, H - kenar, W, kenar);
    c.strokeStyle = gece ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    c.lineWidth = 1;
    const kare = 44 * s;
    for (let x = 0; x < W; x += kare) {
      c.beginPath();
      c.moveTo(x + 0.5, 0);
      c.lineTo(x + 0.5, kenar);
      c.moveTo(x + 0.5 + kare / 2, H - kenar);
      c.lineTo(x + 0.5 + kare / 2, H);
      c.stroke();
    }
    // bordür
    c.fillStyle = gece ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.13)';
    c.fillRect(0, kenar, W, 3);
    c.fillRect(0, H - kenar - 3, W, 3);
    // kenar çizgileri
    c.fillStyle = renkler.serit;
    c.fillRect(0, y0 + 7 * s, W, 2 * s);
    c.fillRect(0, y0 + lh * 4 - 9 * s, W, 2 * s);
    // kesik şerit çizgileri
    const kes = 30 * s,
      ara = 34 * s;
    for (const yy of [y0 + lh, y0 + lh * 3]) {
      for (let x = -((W / 2) % (kes + ara)); x < W; x += kes + ara) c.fillRect(x, yy - 1.2 * s, kes, 2.4 * s);
    }
    // orta çift sarı çizgi
    c.fillStyle = renkler.sari;
    c.globalAlpha = gece ? 0.75 : 1;
    c.fillRect(0, y0 + lh * 2 - 4 * s, W, 2.4 * s);
    c.fillRect(0, y0 + lh * 2 + 1.6 * s, W, 2.4 * s);
    c.globalAlpha = 1;
    // gece: sokak lambalarının ışığı
    if (gece) {
      const aralik = Math.max(300, 380 * s);
      let i = 0;
      for (let x = aralik * 0.3; x < W + aralik; x += aralik / 2, i++) {
        const yy = i % 2 ? 0 : H;
        const r = 190 * s;
        const rg = c.createRadialGradient(x, yy, 0, x, yy, r);
        rg.addColorStop(0, 'rgba(255,205,140,0.16)');
        rg.addColorStop(1, 'rgba(255,205,140,0)');
        c.fillStyle = rg;
        c.fillRect(x - r, yy - r, r * 2, r * 2);
      }
    }
  }

  function araba(serit) {
    const tipAd = TIPLER[agirlikli(TIPLER.map((k) => TIP[k].w))];
    const t = TIP[tipAd];
    const renk = sec(tipAd === 'spor' ? RENK.spor : tipAd === 'klasik' ? RENK.klasik : RENK.olagan);
    const n = agirlikli(t.nad);
    return { id: ++id, tipAd, t, renk, n, serit, hiz: HIZ[serit] * (0.9 + Math.random() * 0.2), anlik: 0, x: 0, yak: false };
  }
  const boy = (a) => a.t.u * s;
  const en = (a) => a.t.g * s;
  const yAl = (a) => y0 + lh * (a.serit + 0.5) + (a.serit < 2 ? 1 : -1) * 1.5 * s;

  function guncelle(dt) {
    for (let i = 0; i < 4; i++) {
      const dz = seritler[i],
        yon = YON[i];
      // ilerle; öndeki yavaşsa ona uy
      for (let j = 0; j < dz.length; j++) {
        const a = dz[j];
        let v = a.hiz * s;
        if (j > 0) {
          const o = dz[j - 1];
          const mesafe = yon > 0 ? o.x - boy(o) / 2 - (a.x + boy(a) / 2) : a.x - boy(a) / 2 - (o.x + boy(o) / 2);
          if (mesafe < 40 * s) v = Math.min(v, o.anlik * (mesafe < 16 * s ? 0.85 : 1));
        }
        a.anlik = a.anlik ? a.anlik + (v - a.anlik) * Math.min(1, dt * 4) : v;
        a.x += yon * a.anlik * dt;
      }
      // ekrandan çıkanı sil
      while (dz.length && (yon > 0 ? dz[0].x - boy(dz[0]) / 2 > W + 40 : dz[0].x + boy(dz[0]) / 2 < -40)) dz.shift();
      // yeni araba
      const son = dz[dz.length - 1];
      const girisBos = !son || (yon > 0 ? son.x - boy(son) / 2 > bosluk[i] : son.x + boy(son) / 2 < W - bosluk[i]);
      if (girisBos) {
        const a = araba(i);
        a.x = yon > 0 ? -boy(a) / 2 - 30 : W + boy(a) / 2 + 30;
        a.anlik = a.hiz * s;
        if (son) a.anlik = Math.min(a.anlik, son.anlik);
        dz.push(a);
        bosluk[i] = (30 + Math.random() * Math.random() * 380) * s;
      }
    }
  }

  // ---------- Vizör ----------
  const vz = { x: 0, y: 0, w: 110, h: 72 };
  let hx = 0,
    hy = 0; // nişan noktası
  let kilitli = null,
    kilitSure = 0;
  let oto = true,
    otoHedef = null,
    otoBekle = 0,
    sonDokunus = 0,
    elleYakaladi = false;

  function altindaki(px, py, pay) {
    let en_iyi = null,
      enYakin = Infinity;
    for (const dz of seritler)
      for (const a of dz) {
        const dx = Math.abs(px - a.x),
          dy = Math.abs(py - yAl(a));
        if (dx < boy(a) / 2 + pay && dy < en(a) / 2 + pay) {
          const d = dx + dy;
          if (d < enYakin) {
            enYakin = d;
            en_iyi = a;
          }
        }
      }
    return en_iyi;
  }

  function yakala(a) {
    if (!a || a.yak) return;
    a.yak = true;
    vizor.classList.remove('cek');
    void vizor.offsetWidth;
    vizor.classList.add('cek');
    sayac++;
    if (sayacEl) sayacEl.textContent = String(sayac);

    const N = NADIR[a.n];
    const puan = Math.round((N.min + Math.random() * (N.max - N.min)) / N.k) * N.k;
    const puanYazi = puan.toLocaleString('tr-TR');

    const et = document.createElement('div');
    et.className = 'etiket';
    et.style.setProperty('--n', N.r);
    const ex = Math.max(8, Math.min(W - 160, a.x - 60));
    const ey = Math.max(kenar + 4, yAl(a) - en(a) / 2 - 42);
    et.style.setProperty('--x', ex + 'px');
    et.style.setProperty('--y', ey + 'px');
    et.innerHTML = `<span><strong><span data-l="tr">${N.tr}</span><span data-l="en">${N.en}</span></strong> +${puanYazi}</span>`;
    sahne.appendChild(et);
    setTimeout(() => et.remove(), 1700);

    if (tepsi) {
      tepsi.querySelector('.tepsi-bos')?.remove();
      const li = document.createElement('li');
      li.className = 'kk n' + a.n;
      li.innerHTML = `<div class="kk-ic"><div class="kk-ust"><span><span data-l="tr">${N.tr}</span><span data-l="en">${N.en}</span></span><i>${N.y}</i></div><img alt="" src="${kartGorseli(a.tipAd, a.renk)}"><div class="kk-alt"><span><span data-l="tr">${a.t.tr}</span><span data-l="en">${a.t.en}</span></span><em><s>TR</s>${puanYazi}</em></div></div>`;
      tepsi.prepend(li);
      while (tepsi.children.length > 9) tepsi.lastElementChild.remove();
    }
  }

  // işaretçi
  const konum = (e) => {
    const r = sahne.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  sahne.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    [hx, hy] = konum(e);
    oto = false;
    otoHedef = null;
    sonDokunus = performance.now();
  });
  sahne.addEventListener('pointerleave', () => (sonDokunus = performance.now()));
  sahne.addEventListener('pointerdown', (e) => {
    const [px, py] = konum(e);
    hx = px;
    hy = py;
    oto = false;
    otoHedef = null;
    sonDokunus = performance.now();
    const a = altindaki(px, py, 18 * s);
    if (e.pointerType !== 'mouse') {
      vz.x = px;
      vz.y = py;
    }
    if (a && !a.yak) {
      kilitli = a;
      yakala(a);
      if (!elleYakaladi) {
        elleYakaladi = true;
        ipucu?.classList.add('gitti');
      }
    }
  });

  function vizorGuncelle(dt, simdi) {
    if (!oto && simdi - sonDokunus > 4500) oto = true;

    if (oto && !sakin) {
      if (otoHedef && (otoHedef.yak || otoHedef.x < 30 || otoHedef.x > W - 30)) otoHedef = null;
      if (!otoHedef && simdi > otoBekle) {
        const adaylar = [];
        for (const dz of seritler)
          for (const a of dz) {
            const ileri = YON[a.serit] > 0 ? a.x : W - a.x;
            if (!a.yak && ileri > W * 0.18 && ileri < W * 0.62) adaylar.push(a);
          }
        if (adaylar.length) otoHedef = sec(adaylar);
      }
      if (otoHedef) {
        hx = otoHedef.x;
        hy = yAl(otoHedef);
      }
    }

    const a = altindaki(hx, hy, 6 * s);
    if (a !== kilitli) kilitSure = 0;
    kilitli = a && !a.yak ? a : null;
    if (kilitli) kilitSure += dt;

    if (oto && kilitli && kilitli === otoHedef && kilitSure > 0.6) {
      yakala(kilitli);
      otoHedef = null;
      otoBekle = simdi + 1300 + Math.random() * 1200;
    }

    const hedef = kilitli ? { x: kilitli.x, y: yAl(kilitli), w: boy(kilitli) + 24 * s, h: en(kilitli) + 22 * s } : { x: hx, y: hy, w: 104 * s, h: 70 * s };
    const k = 1 - Math.exp(-dt * (kilitli ? 22 : oto ? 5 : 16));
    const kb = 1 - Math.exp(-dt * 14);
    vz.x += (hedef.x - vz.x) * k;
    vz.y += (hedef.y - vz.y) * k;
    vz.w += (hedef.w - vz.w) * kb;
    vz.h += (hedef.h - vz.h) * kb;
    vizor.style.width = vz.w.toFixed(1) + 'px';
    vizor.style.height = vz.h.toFixed(1) + 'px';
    vizor.style.transform = `translate(${(vz.x - vz.w / 2).toFixed(1)}px, ${(vz.y - vz.h / 2).toFixed(1)}px)`;
    vizor.classList.toggle('kilit', !!kilitli);
  }

  function ciz() {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.drawImage(zemin, 0, 0, W, H);
    for (const dz of seritler)
      for (const a of dz) {
        const sp = sprite(a.tipAd, a.renk, s, gece);
        const y = yAl(a);
        if (YON[a.serit] > 0) {
          cx.drawImage(sp.k, a.x - sp.ox, y - sp.oy, sp.w, sp.h);
        } else {
          cx.save();
          cx.translate(a.x, y);
          cx.scale(-1, 1);
          cx.drawImage(sp.k, -sp.ox, -sp.oy, sp.w, sp.h);
          cx.restore();
        }
        if (a.yak) {
          // yakalanan arabanın tavanında nadirlik rengi
          cx.beginPath();
          cx.arc(a.x, y, 4.5 * s, 0, Math.PI * 2);
          cx.fillStyle = NADIR[a.n].r;
          cx.fill();
          cx.lineWidth = 2 * s;
          cx.strokeStyle = '#fff';
          cx.stroke();
        }
      }
  }

  // ---------- Boyut ve tema ----------
  function boyutla() {
    const r = sahne.getBoundingClientRect();
    const yeniW = Math.round(r.width),
      yeniH = Math.round(r.height);
    if (!yeniW || !yeniH) return;
    const ilk = !W;
    W = yeniW;
    H = yeniH;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    kenar = Math.round(H * 0.085);
    y0 = kenar;
    lh = (H - kenar * 2) / 4;
    s = lh / 70;
    renkleriOku();
    zeminCiz();
    if (ilk) {
      hx = W * 0.5;
      hy = y0 + lh * 2.5;
      vz.x = hx;
      vz.y = hy;
      // yol baştan dolu görünsün: birkaç saniyelik trafiği hızlıca işle
      for (let i = 0; i < 400; i++) guncelle(0.05);
    }
    ciz();
  }

  document.addEventListener('garajtema', () => {
    renkleriOku();
    onbellek.clear();
    if (W) {
      zeminCiz();
      ciz();
    }
  });

  // ---------- Döngü ----------
  let gorunur = true,
    son = 0,
    calisiyor = false;
  function kare(t) {
    if (!gorunur || document.hidden) {
      calisiyor = false;
      return;
    }
    const dt = Math.min(0.05, son ? (t - son) / 1000 : 0.016);
    son = t;
    if (!sakin) guncelle(dt);
    vizorGuncelle(dt, t);
    ciz();
    requestAnimationFrame(kare);
  }
  function baslat() {
    if (calisiyor || !gorunur || document.hidden) return;
    calisiyor = true;
    son = 0;
    requestAnimationFrame(kare);
  }

  boyutla();
  new ResizeObserver(boyutla).observe(sahne);
  new IntersectionObserver((g) => {
    gorunur = g[0].isIntersecting;
    baslat();
  }).observe(sahne);
  document.addEventListener('visibilitychange', baslat);
  baslat();

  // nadirlik panelleri: imleçle oynayan parlama
  document.querySelectorAll('.panel').forEach((p) => {
    p.addEventListener('pointermove', (e) => {
      const r = p.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100,
        y = ((e.clientY - r.top) / r.height) * 100;
      p.style.setProperty('--x', x + '%');
      p.style.setProperty('--y', y + '%');
      p.style.setProperty('--h', Math.round(x * 2.4));
    });
    p.addEventListener('pointerleave', () => {
      p.style.removeProperty('--x');
      p.style.removeProperty('--y');
      p.style.removeProperty('--h');
    });
  });
})();
