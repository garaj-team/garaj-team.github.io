/* =====================================================================
   GARAJ — site ayarları
   Aşağıdaki iki satırı kendi bilginle değiştir; sitedeki her yere otomatik yazılır.
   ===================================================================== */
const AYAR = {
  eposta: 'destek@garajteam.com', // ← iletişim / destek e-postan
  gelistirici: 'Ticen', // ← geliştiricinin adı (Play Console'daki geliştirici adıyla aynı olmalı)
  playLinki: 'https://play.google.com/store/apps/details?id=com.enestaskiran.garaj',
  playYayinda: false, // uygulama Play Store'da herkese açılınca true yap
  // Sosyal medya kullanıcı adları (başında @ olmadan). Boş bırakılan "Yakında" görünür.
  sosyal: {
    instagram: 'teamgaraj',
    tiktok: 'teamgaraj',
    youtube: 'TeamGaraj',
    x: 'TeamGaraj',
  },
};

(function () {
  const kok = document.documentElement;

  // ---- Tema (açık / koyu) ----
  const sistemKoyu = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  let tema = null;
  try {
    tema = localStorage.getItem('garaj-tema');
  } catch (e) {}
  const temaUygula = (t) => {
    kok.setAttribute('data-tema', t);
    const dugme = document.querySelector('.tema-dugme');
    if (dugme) {
      const tr = kok.lang === 'en' ? (t === 'koyu' ? 'Switch to light theme' : 'Switch to dark theme') : t === 'koyu' ? 'Açık temaya geç' : 'Koyu temaya geç';
      dugme.setAttribute('aria-label', tr);
      dugme.setAttribute('title', tr);
    }
    document.dispatchEvent(new Event('garajtema'));
  };
  temaUygula(tema === 'koyu' || tema === 'acik' ? tema : sistemKoyu() ? 'koyu' : 'acik');
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    let kayitli = null;
    try {
      kayitli = localStorage.getItem('garaj-tema');
    } catch (err) {}
    if (!kayitli) temaUygula(e.matches ? 'koyu' : 'acik');
  });

  // ---- Dil (Türkçe varsayılan, İngilizce isteğe bağlı) ----
  const adres = new URLSearchParams(location.search);
  let dil = adres.get('lang') || adres.get('dil');
  if (dil !== 'en' && dil !== 'tr') {
    try {
      dil = localStorage.getItem('garaj-dil');
    } catch (e) {}
  }
  if (dil !== 'en') dil = 'tr';
  const dilUygula = (d) => {
    kok.lang = d;
    document.querySelectorAll('.dil button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dil === d)));
    const baslik = document.querySelector(`meta[name="baslik-${d}"]`);
    if (baslik) document.title = baslik.content;
    document.querySelectorAll('[data-aria-en]').forEach((el) => {
      if (!el.dataset.ariaTr) el.dataset.ariaTr = el.getAttribute('aria-label') || '';
      el.setAttribute('aria-label', d === 'en' ? el.dataset.ariaEn : el.dataset.ariaTr);
    });
    temaUygula(kok.getAttribute('data-tema'));
  };
  dilUygula(dil);

  document.addEventListener('DOMContentLoaded', () => {
    dilUygula(kok.lang);

    // Ayar değerlerini yerine yaz
    document.querySelectorAll('[data-ayar="eposta"]').forEach((el) => {
      el.textContent = AYAR.eposta;
      if (el.tagName === 'A') el.href = 'mailto:' + AYAR.eposta;
    });
    document.querySelectorAll('[data-ayar="gelistirici"]').forEach((el) => (el.textContent = AYAR.gelistirici));
    const SOS_URL = { instagram: 'https://instagram.com/', tiktok: 'https://www.tiktok.com/@', youtube: 'https://www.youtube.com/@', x: 'https://x.com/' };
    document.querySelectorAll('[data-sosyal]').forEach((el) => {
      const k = el.dataset.sosyal, ad = (AYAR.sosyal[k] || '').replace(/^@/, '');
      const yazi = el.querySelector('[data-sosyal-ad]');
      if (ad) {
        el.href = SOS_URL[k] + ad;
        if (yazi) yazi.textContent = '@' + ad;
      } else {
        el.classList.add('yakinda');
        el.removeAttribute('href');
        el.setAttribute('aria-disabled', 'true');
        if (yazi) yazi.innerHTML = '<span data-l="tr">Yakında</span><span data-l="en">Coming soon</span>';
      }
    });
    document.querySelectorAll('[data-ayar="yil"]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
    document.querySelectorAll(AYAR.playYayinda ? '[data-yakinda]' : '[data-simdi]').forEach((x) => x.remove());
    document.querySelectorAll('[data-play]').forEach((el) => {
      if (AYAR.playYayinda) {
        el.href = AYAR.playLinki;
      } else {
        el.removeAttribute('href');
        el.setAttribute('aria-disabled', 'true');
      }
    });

    // Dil düğmeleri
    document.querySelectorAll('.dil button').forEach((b) =>
      b.addEventListener('click', () => {
        dilUygula(b.dataset.dil);
        try {
          localStorage.setItem('garaj-dil', b.dataset.dil);
        } catch (e) {}
        const u = new URL(location.href);
        u.searchParams.delete('lang');
        u.searchParams.delete('dil');
        history.replaceState(null, '', u);
      }),
    );

    // Tema düğmesi
    document.querySelector('.tema-dugme')?.addEventListener('click', () => {
      const yeni = kok.getAttribute('data-tema') === 'koyu' ? 'acik' : 'koyu';
      temaUygula(yeni);
      try {
        localStorage.setItem('garaj-tema', yeni);
      } catch (e) {}
    });

    // Kaydırınca üst çubuğa ince çizgi
    const ust = document.querySelector('.ust');
    const kaydir = () => ust && ust.classList.toggle('kaydi', window.scrollY > 8);
    kaydir();
    window.addEventListener('scroll', kaydir, { passive: true });

    // Plaka: görününce harfler havaalanı tabelası gibi dönerek yerine oturur
    const plaka = document.querySelector('.plaka .yazi');
    const sakin = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (plaka && !sakin && 'IntersectionObserver' in window) {
      const harfler = 'ABCDEFGHJKLMNPRSTUVYZ';
      const cevir = () => {
        plaka.querySelectorAll('.harf').forEach((el, i) => {
          const hedef = el.dataset.h || (el.dataset.h = el.textContent);
          const bitis = 450 + i * 90;
          const bas = performance.now();
          const don = (t) => {
            if (t - bas >= bitis) {
              el.textContent = hedef;
              return;
            }
            el.textContent = /[0-9]/.test(hedef) ? String(Math.floor(Math.random() * 10)) : harfler[Math.floor(Math.random() * harfler.length)];
            setTimeout(() => requestAnimationFrame(don), 55);
          };
          requestAnimationFrame(don);
        });
      };
      const io = new IntersectionObserver((g) => {
        if (g[0].isIntersecting) {
          cevir();
          io.disconnect();
        }
      }, { threshold: 0.6 });
      io.observe(plaka);
    }
  });
})();
