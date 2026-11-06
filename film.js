/* Garaj — sinematik giriş: kaydırdıkça gece sokağında bir araba yakalanır ve karta dönüşür */
(function () {
  const film = document.querySelector('.film');
  if (!film) return;
  const sahne = film.querySelector('.film-sahne');
  const cv = sahne.querySelector('canvas.sokak');
  const cx = cv.getContext('2d');
  const vizor = sahne.querySelector('.vizor');
  const tarama = sahne.querySelector('.tarama');
  const bilgiler = [...sahne.querySelectorAll('.bilgi')];
  const flas = sahne.querySelector('.film-flas');
  const karartma = sahne.querySelector('.karartma');
  const kart = sahne.querySelector('.film-kart');
  const kartDon = kart.querySelector('.kart-don');
  const kartOn = kart.querySelector('.kart-on');
  const kartFoto = kart.querySelector('canvas');
  const puanEl = kart.querySelector('[data-puan]');
  const deste = sahne.querySelector('.deste');
  const altyazilar = [...sahne.querySelectorAll('.altyazi')];
  const rayNoktalari = [...sahne.querySelectorAll('.ray i')];
  const ipucu = sahne.querySelector('.kaydir-ipucu');
  const sakin = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- yardımcılar ----------
  const kis = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ara = (p, a, b) => kis((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cikis = (t) => 1 - Math.pow(1 - t, 3);
  const yumusak = (t) => t * t * (3 - 2 * t);

  // ---------- zaman çizelgesi (kaydırma oranı 0..1) ----------
  const Z = {
    yaklas: [0.1, 0.3],
    vizorGel: [0.17, 0.23],
    kilit: [0.23, 0.3],
    flas: 0.335,
    tara: [0.37, 0.47],
    bilgi: [0.4, 0.43, 0.46],
    kartOl: [0.52, 0.63],
    don: [0.66, 0.77],
    puan: [0.73, 0.8],
    desteye: [0.84, 0.94],
  };
  const ALTYAZI = [
    [0, 0, 0.1],
    [0.13, 0.15, 0.32],
    [0.36, 0.38, 0.5],
    [0.52, 0.54, 0.64],
    [0.66, 0.68, 0.81],
    [0.84, 0.87, 1.01],
  ];

  // ---------- dünya ve kamera ----------
  let W = 0,
    H = 0,
    DPR = 1,
    f = 1,
    yh = 0,
    xv = 0;
  const KAMERA_Y = 1.2;
  const sx = (x, z) => xv + (x * f) / z;
  const sy = (y, z) => yh + ((KAMERA_Y - y) * f) / z;

  let zemin = null; // sokak arka planı (bir kez çizilir)
  let araba = null; // araba görseli (bir kez çizilir)
  const ARABA_EN_M = 1.95; // metre
  const SP = { en: 1000, zemin: 505, tavan: 136, yansima: 230 };

  // ---------- araba (önden, gece) ----------
  function arabaCiz() {
    const k = document.createElement('canvas');
    const pad = 60;
    k.width = SP.en + pad * 2;
    k.height = SP.zemin + SP.yansima + pad;
    const c = k.getContext('2d');
    c.translate(pad, pad);

    const yol = (pts) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
    };

    // gölge
    const gl = c.createRadialGradient(500, 505, 10, 500, 505, 560);
    gl.addColorStop(0, 'rgba(0,0,0,0.75)');
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gl;
    c.save();
    c.scale(1, 0.09);
    c.beginPath();
    c.arc(500, 505 / 0.09, 560, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // tekerlekler
    c.fillStyle = '#030406';
    c.beginPath();
    c.roundRect ? c.roundRect(55, 440, 130, 70, 14) : c.rect(55, 440, 130, 70);
    c.fill();
    c.beginPath();
    c.roundRect ? c.roundRect(815, 440, 130, 70, 14) : c.rect(815, 440, 130, 70);
    c.fill();

    // gövde
    // sade ve simetrik yol
    const sag = [
      [500, 136],
      [690, 148],
      [762, 258],
      [835, 270],
      [932, 300],
      [968, 385],
      [958, 470],
      [905, 505],
      [500, 505],
    ];
    const tam = sag.concat(sag.slice(1, -1).reverse().map(([x, y]) => [SP.en - x, y]));
    const g = c.createLinearGradient(0, 136, 0, 505);
    g.addColorStop(0, '#2a3446');
    g.addColorStop(0.35, '#171e2b');
    g.addColorStop(1, '#06080c');
    c.fillStyle = g;
    yol(tam);
    c.fill();

    // omuz çizgisinde sokak lambası yansıması
    c.save();
    yol(tam);
    c.clip();
    const omuz = c.createLinearGradient(0, 250, 0, 330);
    omuz.addColorStop(0, 'rgba(160,185,255,0)');
    omuz.addColorStop(0.45, 'rgba(160,185,255,0.18)');
    omuz.addColorStop(1, 'rgba(160,185,255,0)');
    c.fillStyle = omuz;
    c.fillRect(0, 250, SP.en, 80);
    // kaput ortasında yumuşak parlama
    const kaput = c.createRadialGradient(500, 280, 10, 500, 280, 300);
    kaput.addColorStop(0, 'rgba(255,255,255,0.10)');
    kaput.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = kaput;
    c.fillRect(150, 240, 700, 110);
    c.restore();

    // ön cam
    const cam = [
      [500, 152],
      [676, 162],
      [740, 254],
      [500, 248],
    ];
    const camTam = cam.concat(cam.slice(1, -1).reverse().map(([x, y]) => [SP.en - x, y]));
    const cg = c.createLinearGradient(0, 152, 0, 254);
    cg.addColorStop(0, '#2b3854');
    cg.addColorStop(1, '#090c13');
    c.fillStyle = cg;
    yol(camTam);
    c.fill();
    c.save();
    yol(camTam);
    c.clip();
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.beginPath();
    c.moveTo(560, 150);
    c.lineTo(640, 150);
    c.lineTo(520, 260);
    c.lineTo(440, 260);
    c.closePath();
    c.fill();
    c.restore();

    // aynalar
    for (const yon of [1, -1]) {
      const m = (x) => (yon === 1 ? x : SP.en - x);
      c.fillStyle = '#141a24';
      c.beginPath();
      c.moveTo(m(772), 250);
      c.lineTo(m(858), 244);
      c.lineTo(m(864), 274);
      c.lineTo(m(782), 280);
      c.closePath();
      c.fill();
    }

    // kaput çizgileri
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 3;
    for (const yon of [1, -1]) {
      c.beginPath();
      c.moveTo(500 + yon * 70, 262);
      c.lineTo(500 + yon * 100, 330);
      c.stroke();
    }

    // ızgara
    const izgara = [
      [395, 338],
      [605, 338],
      [628, 422],
      [372, 422],
    ];
    c.fillStyle = '#040507';
    yol(izgara);
    c.fill();
    c.save();
    yol(izgara);
    c.clip();
    c.strokeStyle = 'rgba(255,255,255,0.055)';
    c.lineWidth = 2;
    for (let y = 346; y < 422; y += 10) {
      c.beginPath();
      c.moveTo(360, y);
      c.lineTo(640, y);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(210,220,240,0.22)';
    c.lineWidth = 2.5;
    yol(izgara);
    c.stroke();

    // alt hava girişi
    c.fillStyle = '#030405';
    yol([
      [290, 448],
      [710, 448],
      [735, 492],
      [265, 492],
    ]);
    c.fill();

    // plaka
    c.fillStyle = '#f4f5f7';
    c.fillRect(420, 432, 160, 34);
    c.fillStyle = '#1f4fd6';
    c.fillRect(420, 432, 20, 34);
    c.fillStyle = '#fff';
    c.font = '700 11px Archivo, sans-serif';
    c.fillText('TR', 422, 461);
    c.fillStyle = '#0d1117';
    c.font = '700 22px Archivo, sans-serif';
    c.textAlign = 'center';
    c.fillText('34 GRJ 01', 512, 457);
    c.textAlign = 'left';

    // farlar (ince LED) ve gündüz ışıkları
    for (const yon of [1, -1]) {
      const m = (x) => (yon === 1 ? x : SP.en - x);
      c.save();
      c.shadowColor = 'rgba(170,205,255,0.95)';
      c.shadowBlur = 38;
      const fg = c.createLinearGradient(m(740), 0, m(915), 0);
      fg.addColorStop(0, '#dfe9ff');
      fg.addColorStop(1, '#ffffff');
      c.fillStyle = fg;
      yol([
        [m(742), 322],
        [m(906), 302],
        [m(918), 330],
        [m(752), 346],
      ]);
      c.fill();
      c.restore();
      c.save();
      c.shadowColor = 'rgba(200,225,255,1)';
      c.shadowBlur = 16;
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(m(752), 356);
      c.lineTo(m(905), 340);
      c.lineTo(m(930), 372);
      c.stroke();
      c.restore();
    }

    // ıslak yolda yansıma (aşağı doğru solan ayna görüntü)
    const ust = document.createElement('canvas');
    ust.width = k.width;
    ust.height = SP.zemin + pad;
    ust.getContext('2d').drawImage(k, 0, 0);
    c.save();
    c.setTransform(1, 0, 0, -1, 0, (SP.zemin + pad) * 2);
    c.globalAlpha = 0.16;
    c.drawImage(ust, 0, 0);
    c.restore();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    const sol = c.createLinearGradient(0, SP.zemin + pad, 0, SP.zemin + pad + SP.yansima);
    sol.addColorStop(0, 'rgba(0,0,0,0.1)');
    sol.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = sol;
    c.fillRect(0, SP.zemin + pad, k.width, SP.yansima);
    c.restore();

    return { k, pad };
  }

  // ---------- sokak (perspektif) ----------
  function zeminCiz() {
    const k = document.createElement('canvas');
    k.width = Math.ceil(W * DPR);
    k.height = Math.ceil(H * DPR);
    const c = k.getContext('2d');
    c.scale(DPR, DPR);
    const poly = (pts, renk) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fillStyle = renk;
      c.fill();
    };
    const P = (x, y, z) => [sx(x, z), sy(y, z)];
    const ZY = 0.6,
      ZU = 400;

    // gökyüzü ve şehir ışığı
    const gok = c.createLinearGradient(0, 0, 0, yh);
    gok.addColorStop(0, '#03050a');
    gok.addColorStop(1, '#0d1424');
    c.fillStyle = gok;
    c.fillRect(0, 0, W, yh + 2);
    const sehir = c.createRadialGradient(xv, yh, 0, xv, yh, Math.max(W, H) * 0.55);
    sehir.addColorStop(0, 'rgba(90,120,220,0.28)');
    sehir.addColorStop(0.4, 'rgba(120,80,190,0.08)');
    sehir.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sehir;
    c.fillRect(0, 0, W, H);

    // yer
    c.fillStyle = '#06080d';
    c.fillRect(0, yh, W, H - yh);
    // yol: ıslak asfalt
    poly([P(-5.5, 0, ZY), P(5.5, 0, ZY), P(5.5, 0, ZU), P(-5.5, 0, ZU)], '#090c13');
    const islak = c.createLinearGradient(0, yh, 0, H);
    islak.addColorStop(0, 'rgba(70,95,160,0.22)');
    islak.addColorStop(0.25, 'rgba(40,55,95,0.10)');
    islak.addColorStop(1, 'rgba(0,0,0,0)');
    c.save();
    c.beginPath();
    [P(-5.5, 0, ZY), P(5.5, 0, ZY), P(5.5, 0, ZU), P(-5.5, 0, ZU)].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.clip();
    c.fillStyle = islak;
    c.fillRect(0, yh, W, H - yh);
    c.restore();
    // kaldırımlar
    for (const s of [-1, 1]) {
      poly([P(5.5 * s, 0, ZY), P(9 * s, 0, ZY), P(9 * s, 0, ZU), P(5.5 * s, 0, ZU)], '#0c1018');
      poly([P(5.5 * s, 0, ZY), P(5.62 * s, 0, ZY), P(5.62 * s, 0, ZU), P(5.5 * s, 0, ZU)], 'rgba(150,165,200,0.22)');
    }
    // orta kesik çizgi
    for (let z = 9; z < 260; z += 7) {
      poly([P(-0.07, 0, z), P(0.07, 0, z), P(0.07, 0, z + 3.2), P(-0.07, 0, z + 3.2)], 'rgba(235,240,255,0.30)');
    }

    // binalar (iki yanda, uzaklaştıkça kararan)
    const rastgele = (() => {
      let t = 7;
      return () => ((t = (t * 16807) % 2147483647) / 2147483647);
    })();
    for (const s of [-1, 1]) {
      let z = 3;
      while (z < 220) {
        const derin = 6 + rastgele() * 12;
        const yuk = 9 + rastgele() * 18;
        const x = 9.2 * s;
        poly([P(x, 0, z), P(x, 0, z + derin), P(x, yuk, z + derin), P(x, yuk, z)], z < 30 ? '#0b0f18' : '#0a0d15');
        // pencereler
        for (let wy = 3; wy < yuk - 1.5; wy += 3) {
          for (let wz = z + 1; wz < z + derin - 1.2; wz += 2.4) {
            if (rastgele() > 0.3 || wz < 16 || (1.5 * f) / wz > 26) continue;
            const sicak = rastgele() > 0.35;
            const a = (0.35 + rastgele() * 0.5) * Math.max(0.25, 1 - z / 240);
            poly(
              [P(x, wy, wz), P(x, wy, wz + 1.3), P(x, wy + 1.5, wz + 1.3), P(x, wy + 1.5, wz)],
              sicak ? `rgba(255,190,120,${a})` : `rgba(150,190,255,${a * 0.8})`,
            );
          }
        }
        z += derin + 0.4;
      }
    }

    // sokak lambaları: direk, ışık havuzu, ıslak yolda uzayan yansıma
    for (const s of [-1, 1]) {
      for (let z = 18 + (s > 0 ? 8 : 0); z < 170; z += 16) {
        const [px, py0] = P(6.1 * s, 0, z);
        const [, py1] = P(6.1 * s, 7, z);
        const [lx, ly] = P(4.9 * s, 7, z);
        const kalin = Math.max(1, (0.14 * f) / z);
        c.strokeStyle = '#141a26';
        c.lineWidth = kalin;
        c.beginPath();
        c.moveTo(px, py0);
        c.lineTo(px, py1);
        c.lineTo(lx, ly);
        c.stroke();
        const r = Math.max(4, (1.2 * f) / z);
        let g = c.createRadialGradient(lx, ly, 0, lx, ly, r * 2.4);
        g.addColorStop(0, 'rgba(255,214,160,0.95)');
        g.addColorStop(0.18, 'rgba(255,190,120,0.28)');
        g.addColorStop(1, 'rgba(255,190,120,0)');
        c.fillStyle = g;
        c.fillRect(lx - r * 2.4, ly - r * 2.4, r * 4.8, r * 4.8);
        // yerdeki ışık
        const [gx, gy] = P(4.6 * s, 0, z);
        const hr = (4 * f) / z;
        c.save();
        c.translate(gx, gy);
        c.scale(1, 0.28);
        g = c.createRadialGradient(0, 0, 0, 0, 0, hr);
        g.addColorStop(0, 'rgba(255,190,120,0.20)');
        g.addColorStop(1, 'rgba(255,190,120,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, hr, 0, Math.PI * 2);
        c.fill();
        c.restore();
        // ıslak yansıma (izleyiciye doğru uzanan şerit)
        const uzun = Math.min(H - gy, (6 * f) / z);
        const genis = Math.max(1.5, (0.22 * f) / z);
        g = c.createLinearGradient(0, gy, 0, gy + uzun);
        g.addColorStop(0, 'rgba(255,200,140,0.16)');
        g.addColorStop(1, 'rgba(255,200,140,0)');
        c.fillStyle = g;
        c.fillRect(gx - genis / 2, gy, genis, uzun);
      }
    }

    // ufuk sisi
    const sis = c.createLinearGradient(0, yh - H * 0.08, 0, yh + H * 0.06);
    sis.addColorStop(0, 'rgba(30,40,70,0)');
    sis.addColorStop(0.5, 'rgba(40,55,95,0.35)');
    sis.addColorStop(1, 'rgba(30,40,70,0)');
    c.fillStyle = sis;
    c.fillRect(0, yh - H * 0.08, W, H * 0.14);
    return k;
  }

  // ---------- yağmur ----------
  let damlalar = [];
  function yagmurKur() {
    const n = W < 700 ? 55 : 110;
    damlalar = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      h: 0.6 + Math.random() * 0.8,
      u: 10 + Math.random() * 16,
    }));
  }
  function yagmur(dt) {
    cx.strokeStyle = 'rgba(170,195,255,0.16)';
    cx.lineWidth = 1;
    cx.beginPath();
    for (const d of damlalar) {
      if (!sakin) {
        d.y += d.h * 900 * dt;
        d.x -= d.h * 90 * dt;
        if (d.y > H) {
          d.y = -20;
          d.x = Math.random() * (W + 60);
        }
      }
      cx.moveTo(d.x, d.y);
      cx.lineTo(d.x - d.u * 0.1, d.y + d.u);
    }
    cx.stroke();
  }

  // ---------- arabanın ekrandaki yeri ----------
  function arabaKonumu(p) {
    let z, x;
    if (p < Z.yaklas[0]) {
      z = lerp(190, 120, p / Z.yaklas[0]);
      x = -1.9;
    } else {
      const t = cikis(ara(p, Z.yaklas[0], Z.yaklas[1]));
      z = lerp(120, 4.3, t);
      x = lerp(-1.9, W < 700 ? 0 : 0.85, yumusak(t));
    }
    return konumZ(z, x);
  }
  function konumZ(z, x) {
    const en = (ARABA_EN_M * f) / z;
    const olcek = en / SP.en;
    const zeminY = sy(0, z);
    return {
      z,
      en,
      olcek,
      merkezX: sx(x, z),
      zeminY,
      ustY: zeminY - (SP.zemin - SP.tavan) * olcek,
    };
  }

  function sahneyiCiz(c, p, a) {
    c.drawImage(zemin, 0, 0, W, H);
    // araba + yansıması
    const sol = a.merkezX - a.en / 2 - araba.pad * a.olcek;
    const ust = a.zeminY - SP.zemin * a.olcek - araba.pad * a.olcek;
    c.drawImage(araba.k, sol, ust, araba.k.width * a.olcek, araba.k.height * a.olcek);
    // farların ıslak yoldaki uzun yansıması
    for (const yon of [-1, 1]) {
      const fx = a.merkezX + yon * a.en * 0.33;
      const fy = a.zeminY;
      const uz = Math.min(H - fy, a.en * 1.1);
      const gen = Math.max(1.5, a.en * 0.03);
      const g = c.createLinearGradient(0, fy, 0, fy + uz);
      g.addColorStop(0, 'rgba(200,220,255,0.22)');
      g.addColorStop(1, 'rgba(200,220,255,0)');
      c.fillStyle = g;
      c.fillRect(fx - gen / 2, fy, gen, uz);
    }
    // yaklaşırken göz alan far parlaması
    const parlama = p < Z.yaklas[1] ? Math.sin(ara(p, 0, Z.yaklas[1]) * Math.PI) : 0;
    if (parlama > 0.02) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const yon of [-1, 1]) {
        const fx = a.merkezX + yon * a.en * 0.33;
        const fy = a.ustY + (322 - SP.tavan) * a.olcek;
        const r = a.en * 0.55 + 30;
        const g = c.createRadialGradient(fx, fy, 0, fx, fy, r);
        g.addColorStop(0, `rgba(210,225,255,${0.55 * parlama})`);
        g.addColorStop(1, 'rgba(210,225,255,0)');
        c.fillStyle = g;
        c.fillRect(fx - r, fy - r, r * 2, r * 2);
      }
      c.restore();
    }
  }

  // ---------- kartın fotoğrafı (yakalanan an) ----------
  let fotoHazir = false;
  function kartFotosunuCiz() {
    const a = arabaKonumu(Z.yaklas[1]);
    // dönüşüm (ölçek) hesaba katılmadan gerçek boyut
    const fw = Math.max(1, Math.round(kartFoto.clientWidth * DPR)),
      fh = Math.max(1, Math.round(kartFoto.clientHeight * DPR));
    kartFoto.width = fw;
    kartFoto.height = fh;
    const c = kartFoto.getContext('2d');
    // arabayı kadraja al
    const kadrajEn = a.en * 1.5;
    const kadrajBoy = kadrajEn * (fh / fw);
    const ol = fw / kadrajEn;
    c.setTransform(ol, 0, 0, ol, -(a.merkezX - kadrajEn / 2) * ol, -(a.zeminY - kadrajBoy * 0.72) * ol);
    sahneyiCiz(c, 1, a);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // hafif sinematik renk
    const g = c.createLinearGradient(0, 0, 0, fh);
    g.addColorStop(0, 'rgba(255,190,90,0.10)');
    g.addColorStop(1, 'rgba(10,15,30,0.25)');
    c.fillStyle = g;
    c.fillRect(0, 0, fw, fh);
    fotoHazir = true;
  }

  // ---------- nadirlik kartlarındaki küçük fotoğraflar ----------
  const TONLAR = [
    { z: 5.6, x: -0.4, renk: '#8a929c', mod: 'saturation', a: 0.85 },
    { z: 4.4, x: 0.3, renk: '#2a5cff', mod: 'color', a: 0.42 },
    { z: 3.8, x: -0.2, renk: '#ffae2e', mod: 'color', a: 0.38 },
    { z: 3.2, x: 0.15, renk: null, mod: 'color', a: 0.5 },
  ];
  function miniFotolar() {
    const oran = Math.min(2, window.devicePixelRatio || 1);
    document.querySelectorAll('canvas.mini-foto').forEach((m) => {
      const fw = Math.round(m.clientWidth * oran),
        fh = Math.round(m.clientHeight * oran);
      if (!fw || !fh) return;
      m.width = fw;
      m.height = fh;
      const t = TONLAR[Number(m.dataset.ton) || 0];
      const a = konumZ(t.z, t.x);
      const c = m.getContext('2d');
      const kadrajEn = a.en * 1.45;
      const kadrajBoy = kadrajEn * (fh / fw);
      const ol = fw / kadrajEn;
      const y0 = Math.min(a.zeminY - kadrajBoy * 0.66, H - kadrajBoy);
      c.fillStyle = '#05070c';
      c.fillRect(0, 0, fw, fh);
      c.setTransform(ol, 0, 0, ol, -(a.merkezX - kadrajEn / 2) * ol, -y0 * ol);
      sahneyiCiz(c, 1, a);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = t.mod;
      c.globalAlpha = t.a;
      if (t.renk) c.fillStyle = t.renk;
      else {
        const g = c.createLinearGradient(0, 0, fw, fh);
        ['#ff6ec7', '#ffd36b', '#6bffc8', '#6bc8ff', '#b98cff'].forEach((r, i) => g.addColorStop(i / 4, r));
        c.fillStyle = g;
      }
      c.fillRect(0, 0, fw, fh);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    });
  }

  // ---------- boyut ----------
  function boyutla() {
    const r = sahne.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width;
    H = r.height;
    DPR = Math.min(W < 700 ? 1.5 : 2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    f = Math.min(H * 1.05, W * 1.25);
    yh = H * 0.44;
    xv = W / 2;
    zemin = zeminCiz();
    yagmurKur();
    fotoHazir = false;
    hedefP = ilerleme();
    p = hedefP;
    ciz(0);
    miniFotolar();
  }

  // ---------- kaydırma ----------
  function ilerleme() {
    const r = film.getBoundingClientRect();
    const toplam = r.height - window.innerHeight;
    return toplam > 0 ? kis(-r.top / toplam) : 0;
  }
  let hedefP = 0,
    p = 0;

  // ---------- her kare ----------
  function ciz(dt) {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const a = arabaKonumu(p);
    sahneyiCiz(cx, p, a);
    yagmur(dt);

    // vizör
    const vGel = ara(p, Z.vizorGel[0], Z.vizorGel[1]);
    const vKilit = cikis(ara(p, Z.kilit[0], Z.kilit[1]));
    const kutuEn = a.en * 1.22,
      kutuBoy = (a.zeminY - a.ustY) * 1.3;
    const genisEn = Math.min(W * 0.62, 560),
      genisBoy = Math.min(H * 0.42, 360);
    const vw = lerp(genisEn, kutuEn, vKilit),
      vh = lerp(genisBoy, kutuBoy, vKilit);
    const vx = lerp(W / 2, a.merkezX, vKilit),
      vy = lerp(H * 0.52, (a.ustY + a.zeminY) / 2, vKilit);
    const vizorGorunur = vGel * (1 - ara(p, Z.kartOl[0], Z.kartOl[0] + 0.05));
    vizor.style.opacity = vizorGorunur.toFixed(3);
    vizor.style.width = vw.toFixed(1) + 'px';
    vizor.style.height = vh.toFixed(1) + 'px';
    vizor.style.transform = `translate(${(vx - vw / 2).toFixed(1)}px,${(vy - vh / 2).toFixed(1)}px)`;
    vizor.classList.toggle('kilit', vKilit > 0.98);

    // flaş
    const fl = p > Z.flas ? Math.max(0, 1 - (p - Z.flas) / 0.03) : 0;
    flas.style.opacity = fl.toFixed(3);

    // tarama çizgisi
    const t = ara(p, Z.tara[0], Z.tara[1]);
    tarama.style.opacity = t > 0 && t < 1 ? '1' : '0';
    tarama.style.width = vw.toFixed(1) + 'px';
    tarama.style.transform = `translate(${(vx - vw / 2).toFixed(1)}px,${(vy - vh / 2 + vh * t).toFixed(1)}px)`;

    // bilgi etiketleri
    const bilgiSon = 1 - ara(p, Z.kartOl[0], Z.kartOl[0] + 0.04);
    bilgiler.forEach((b, i) => {
      const g = ara(p, Z.bilgi[i], Z.bilgi[i] + 0.02) * bilgiSon;
      b.style.opacity = g.toFixed(3);
      const kay = ((1 - g) * 8).toFixed(1);
      if (W < 700) {
        // dar ekranda etiketler vizörün altında alt alta
        const by = vy + vh / 2 + 16 + i * 52;
        b.style.transform = `translate(${vx.toFixed(1)}px,${by.toFixed(1)}px) translate(-50%,0) translateY(${kay}px)`;
      } else {
        const sagda = i % 2 === 0;
        const bx = sagda ? vx + vw / 2 + 14 : vx - vw / 2 - 14;
        const by = vy - vh / 2 + vh * (0.15 + i * 0.32);
        b.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px) translate(${sagda ? '0' : '-100%'},-50%) translateY(${kay}px)`;
      }
    });

    // karartma
    const kOl = cikis(ara(p, Z.kartOl[0], Z.kartOl[1]));
    karartma.style.opacity = (kOl * 0.78).toFixed(3);

    // kart
    if (p > Z.kartOl[0] - 0.02 && !fotoHazir) kartFotosunuCiz();
    const kr = kart.offsetWidth,
      kh = kart.offsetHeight;
    const merkezX = W / 2,
      merkezY = H * (W < 700 ? 0.44 : 0.47);
    const basOlcek = kutuEn / kr;
    let kxp = lerp(vx, merkezX, kOl),
      kyp = lerp(vy, merkezY, kOl),
      ko = lerp(basOlcek, 1, kOl);
    // desteye uçuş
    const d = cikis(ara(p, Z.desteye[0], Z.desteye[1]));
    const dar = W < 700;
    const desteX = dar ? W / 2 : W * 0.7;
    const desteY = dar ? H * 0.4 : H * 0.55;
    kxp = lerp(kxp, desteX, d);
    kyp = lerp(kyp, desteY, d);
    ko = lerp(ko, 96 / kr, d);
    kart.style.opacity = ara(p, Z.kartOl[0], Z.kartOl[0] + 0.03).toFixed(3);
    kart.style.transform = `translate(${(kxp - kr / 2).toFixed(1)}px,${(kyp - kh / 2).toFixed(1)}px) scale(${ko.toFixed(4)})`;
    kart.style.setProperty('--cerceve', kOl.toFixed(3));

    // dönüş: arkası görünürken kaplama altına döner
    const don = cikis(ara(p, Z.don[0], Z.don[1]));
    const derece = don * 360;
    kartDon.style.transform = `rotateY(${derece.toFixed(1)}deg)`;
    kartOn.classList.toggle('altin', derece >= 180);
    const pu = Math.round(cikis(ara(p, Z.puan[0], Z.puan[1])) * 184500 / 100) * 100;
    puanEl.textContent = pu.toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'tr-TR');

    // deste
    deste.style.opacity = ara(p, Z.desteye[0] - 0.02, Z.desteye[0] + 0.05).toFixed(3);
    deste.style.transform = `translate(${desteX.toFixed(1)}px,${desteY.toFixed(1)}px)`;
    deste.style.setProperty('--ac', cikis(ara(p, Z.desteye[0], Z.desteye[1])).toFixed(3));

    // altyazılar
    ALTYAZI.forEach(([a0, a1, b], i) => {
      const el = altyazilar[i];
      if (!el) return;
      const gir = a1 > a0 ? ara(p, a0, a1) : 1;
      const cik = i === ALTYAZI.length - 1 ? 1 : 1 - ara(p, b - 0.02, b);
      const o = gir * cik;
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - gir) * 18).toFixed(1)}px)`;
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    });
    // ilerleme rayı
    const sahneNo = ALTYAZI.reduce((n, [a0], i) => (p >= a0 ? i : n), 0);
    rayNoktalari.forEach((r, i) => r.classList.toggle('aktif', i === sahneNo));
    if (ipucu) ipucu.style.opacity = (1 - ara(p, 0.01, 0.06)).toFixed(3);
  }

  // ---------- döngü ----------
  let gorunur = true,
    son = 0,
    calisiyor = false;
  function kare(zaman) {
    if (!gorunur || document.hidden) {
      calisiyor = false;
      return;
    }
    const dt = Math.min(0.05, son ? (zaman - son) / 1000 : 0.016);
    son = zaman;
    hedefP = ilerleme();
    p = sakin ? hedefP : p + (hedefP - p) * (1 - Math.exp(-dt * 9));
    if (Math.abs(hedefP - p) < 0.0002) p = hedefP;
    ciz(dt);
    requestAnimationFrame(kare);
  }
  function baslat() {
    if (!zemin || calisiyor || !gorunur || document.hidden) return;
    calisiyor = true;
    son = 0;
    requestAnimationFrame(kare);
  }

  // Yazı tipi gelince plakadaki yazı doğru çizilsin diye arabayı sonra hazırla
  const hazirla = () => {
    araba = arabaCiz();
    boyutla();
    baslat();
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(hazirla);

  let bekleyen = 0;
  new ResizeObserver(() => {
    if (!araba) return;
    cancelAnimationFrame(bekleyen);
    bekleyen = requestAnimationFrame(boyutla);
  }).observe(sahne);
  new IntersectionObserver((g) => {
    gorunur = g[0].isIntersecting;
    baslat();
  }).observe(sahne);
  document.addEventListener('visibilitychange', baslat);
  window.addEventListener('scroll', baslat, { passive: true });

  // Üst çubuk sahnenin üstündeyken koyu kalsın
  const ust = document.querySelector('.ust');
  if (ust) {
    const kontrol = () => {
      const r = film.getBoundingClientRect();
      ust.classList.toggle('sahnede', r.bottom > 64);
    };
    kontrol();
    window.addEventListener('scroll', kontrol, { passive: true });
  }
})();

/* Nadirlik kartları: imleçle eğilme */
(function () {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.nk-kart').forEach((k) => {
    k.addEventListener('pointermove', (e) => {
      const r = k.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width,
        y = (e.clientY - r.top) / r.height;
      k.classList.add('egik');
      k.style.setProperty('--ry', ((x - 0.5) * 16).toFixed(2) + 'deg');
      k.style.setProperty('--rx', ((0.5 - y) * 12).toFixed(2) + 'deg');
      k.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      k.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    k.addEventListener('pointerleave', () => {
      k.classList.remove('egik');
      k.style.removeProperty('--rx');
      k.style.removeProperty('--ry');
    });
  });
})();

/* Oyun modları: sekmeler, kendiliğinden ilerleme */
(function () {
  const sekmeler = [...document.querySelectorAll('.mod-sekme')];
  if (!sekmeler.length) return;
  const sakin = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SURE = 6000;
  let aktif = 0,
    otomatik = !sakin,
    bas = 0,
    gorunur = false;

  function sec(i, odakla) {
    aktif = (i + sekmeler.length) % sekmeler.length;
    sekmeler.forEach((s, k) => {
      const secili = k === aktif;
      s.setAttribute('aria-selected', String(secili));
      s.tabIndex = secili ? 0 : -1;
      s.style.setProperty('--ilerleme', otomatik ? '0' : '1');
      document.getElementById(s.getAttribute('aria-controls')).hidden = !secili;
    });
    if (odakla) sekmeler[aktif].focus();
    // telefonda seçili sekme görünür kalsın
    const liste = sekmeler[aktif].parentElement;
    if (liste.scrollWidth > liste.clientWidth) {
      liste.scrollTo({ left: sekmeler[aktif].offsetLeft - 20, behavior: sakin ? 'auto' : 'smooth' });
    }
    bas = performance.now();
  }

  sekmeler.forEach((s, i) => {
    s.addEventListener('click', () => {
      otomatik = false;
      sec(i);
    });
    s.addEventListener('keydown', (e) => {
      const yon = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!yon) return;
      e.preventDefault();
      otomatik = false;
      sec(aktif + yon, true);
    });
  });

  const dongu = (t) => {
    if (!otomatik || !gorunur) return;
    const ilerleme = Math.min(1, (t - bas) / SURE);
    sekmeler[aktif].style.setProperty('--ilerleme', ilerleme.toFixed(3));
    if (ilerleme >= 1) sec(aktif + 1);
    requestAnimationFrame(dongu);
  };
  new IntersectionObserver(
    (g) => {
      const once = gorunur;
      gorunur = g[0].isIntersecting;
      if (gorunur && !once && otomatik) {
        bas = performance.now();
        requestAnimationFrame(dongu);
      }
    },
    { threshold: 0.35 },
  ).observe(document.querySelector('.modlar'));
  sec(0);
})();
