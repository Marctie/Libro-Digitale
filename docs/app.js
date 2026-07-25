(function () {
  'use strict';

  const state = {
    manifest: null,
    current: 1,
    zoom: 1,
  };

  const els = {
    loading: document.getElementById('loading'),
    topbar: document.getElementById('topbar'),
    bottombar: document.getElementById('bottombar'),
    pageImg: document.getElementById('pageImg'),
    pageMeta: document.getElementById('pageMeta'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    reader: document.getElementById('reader'),
  };

  function totalPages() {
    return state.manifest ? state.manifest.total : 0;
  }

  function renderPage(num, { instant = false } = {}) {
    const total = totalPages();
    if (!total) return;
    num = Math.min(Math.max(1, num), total);
    state.current = num;
    const entry = state.manifest.pages[num - 1];

    const apply = () => {
      els.pageImg.src = entry.file;
      els.pageMeta.textContent = `Pagina ${num} / ${total} · ${entry.date} ${entry.time}`;
      els.pageImg.classList.remove('turning');
    };

    if (instant) {
      apply();
    } else {
      els.pageImg.classList.add('turning');
      setTimeout(apply, 120);
    }
  }

  function goTo(num) {
    renderPage(num);
  }

  function next() { goTo(state.current + 1); }
  function prev() { goTo(state.current - 1); }

  function toggleBars() {
    els.topbar.classList.toggle('hidden');
    els.bottombar.classList.toggle('hidden');
  }

  function bindNavigation() {
    els.prevBtn.addEventListener('click', prev);
    els.nextBtn.addEventListener('click', next);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') { /* handled by other modules */ }
    });

    els.pageImg.addEventListener('click', toggleBars);

    // swipe touch support
    let touchStartX = null;
    els.reader.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    els.reader.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 60) {
        if (dx < 0) next(); else prev();
      }
      touchStartX = null;
    }, { passive: true });
  }

  async function init() {
    try {
      const res = await fetch('manifest.json', { cache: 'no-cache' });
      state.manifest = await res.json();
    } catch (err) {
      console.error('Impossibile caricare manifest.json', err);
      els.loading.querySelector('p').textContent = 'Errore nel caricamento del libro.';
      return;
    }

    bindNavigation();
    renderPage(1, { instant: true });

    els.loading.style.opacity = '0';
    setTimeout(() => { els.loading.style.display = 'none'; }, 300);
    els.topbar.classList.remove('hidden');
    els.bottombar.classList.remove('hidden');
  }

  init();
})();
