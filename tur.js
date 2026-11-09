/* Garaj — uygulama turu ve sosyal bölüm */
(function () {
  const az = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Uygulama turu ----------
  const tur = document.querySelector('.tur');
  if (tur) {
    const adlar = [...tur.querySelectorAll('.tur-ad')];
    const videolar = [...tur.querySelectorAll('.tur-video')];
    const n = adlar.length;
    const sahne = tur.querySelector('.tur-sahne');
    const noktalar = document.createElement('div');
    noktalar.className = 'tur-noktalar';
    noktalar.setAttribute('aria-hidden', 'true');
    noktalar.innerHTML = adlar.map(() => '<i></i>').join('');
    sahne.appendChild(noktalar);
    const nk = [...noktalar.children];
    let aktif = -1, gorunur = false;

    const sec = (i) => {
      if (i === aktif) return;
      aktif = i;
      adlar.forEach((a, j) => { a.classList.toggle('ak', j === i); a.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      nk.forEach((d, j) => d.classList.toggle('ak', j === i));
      tur.style.setProperty('--tur-renk', adlar[i].style.getPropertyValue('--r'));
      videolar.forEach((v, j) => {
        if (j === i) {
          if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
          v.classList.add('ak');
          if (gorunur && !az) v.play().catch(() => {});
        } else {
          v.classList.remove('ak');
          v.pause();
        }
      });
      // bir sonrakini önceden yükle
      const s = videolar[i + 1];
      if (s && s.preload === 'none') { s.preload = 'auto'; s.load(); }
    };

    const guncelle = () => {
      const r = tur.getBoundingClientRect();
      const toplam = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / toplam));
      const konum = p * n;
      const i = Math.min(n - 1, Math.floor(konum));
      sec(i);
      adlar.forEach((a, j) => {
        const d = a.querySelector('.tur-dolum');
        const f = j < i ? 1 : j > i ? 0 : konum - i;
        d.style.height = `calc((100% - 26px) * ${f.toFixed(3)})`;
      });
      if (!az) {
        tur.style.setProperty('--tur-y', `${(-14 + 28 * ((konum % 1))).toFixed(2)}deg`);
        tur.style.setProperty('--tur-aci', `${(p * 540).toFixed(1)}deg`);
      }
    };
    let bekleyen = false;
    addEventListener('scroll', () => { if (!bekleyen) { bekleyen = true; requestAnimationFrame(() => { bekleyen = false; guncelle(); }); } }, { passive: true });
    addEventListener('resize', guncelle);

    new IntersectionObserver((g) => {
      gorunur = g[0].isIntersecting;
      const v = videolar[aktif];
      if (v) gorunur && !az ? v.play().catch(() => {}) : v.pause();
    }).observe(tur);

    adlar.forEach((a, j) => a.addEventListener('click', () => {
      const ust = tur.getBoundingClientRect().top + scrollY;
      const toplam = tur.offsetHeight - innerHeight;
      scrollTo({ top: ust + toplam * ((j + 0.5) / n), behavior: az ? 'auto' : 'smooth' });
    }));
    guncelle();
  }

  // ---------- Sosyal kartlar: fare noktasından dolan renk ----------
  document.querySelectorAll('.sos').forEach((k) => {
    k.addEventListener('pointermove', (e) => {
      const r = k.getBoundingClientRect();
      k.style.setProperty('--mx', `${e.clientX - r.left}px`);
      k.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // ---------- Reel videosu: görününce oynat ----------
  const reel = document.querySelector('.reel-video');
  const ses = document.querySelector('.reel-ses');
  if (reel) {
    new IntersectionObserver((g) => {
      if (g[0].isIntersecting) {
        if (reel.preload === 'none') { reel.preload = 'auto'; reel.load(); }
        if (!az) reel.play().catch(() => {});
      } else reel.pause();
    }, { threshold: 0.35 }).observe(reel);
    ses?.addEventListener('click', () => {
      reel.muted = !reel.muted;
      if (!reel.muted) reel.play().catch(() => {});
      ses.setAttribute('aria-pressed', String(!reel.muted));
      const en = document.documentElement.lang === 'en';
      ses.setAttribute('aria-label', reel.muted ? (en ? 'Turn sound on' : 'Sesi aç') : (en ? 'Mute' : 'Sesi kapat'));
    });
  }
})();
