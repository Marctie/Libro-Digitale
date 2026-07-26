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
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnFullscreen: document.getElementById('btnFullscreen'),
    btnTheme: document.getElementById('btnTheme'),
    pageSlider: document.getElementById('pageSlider'),
    pageInput: document.getElementById('pageInput'),
    btnGo: document.getElementById('btnGo'),
    btnToc: document.getElementById('btnToc'),
    btnCloseToc: document.getElementById('btnCloseToc'),
    tocPanel: document.getElementById('tocPanel'),
    tocGrid: document.getElementById('tocGrid'),
    btnSearch: document.getElementById('btnSearch'),
    btnCloseSearch: document.getElementById('btnCloseSearch'),
    searchPanel: document.getElementById('searchPanel'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
  };

  const PROGRESS_KEY = 'libro-progress';
  let saveTimer = null;

  const THEMES = ['light', 'dark', 'sepia'];
  const THEME_ICONS = { light: '🌙', dark: '☀️', sepia: '📜' };

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.15;

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
      state.zoom = 1;
      applyZoom();
      els.pageSlider.value = num;
      els.pageInput.value = num;
      saveProgress(num);
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

  function applyZoom() {
    els.pageImg.style.transform = `scale(${state.zoom})`;
  }

  function zoomIn() {
    state.zoom = Math.min(ZOOM_MAX, state.zoom + ZOOM_STEP);
    applyZoom();
  }

  function zoomOut() {
    state.zoom = Math.max(ZOOM_MIN, state.zoom - ZOOM_STEP);
    applyZoom();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function bindZoomAndFullscreen() {
    els.btnZoomIn.addEventListener('click', zoomIn);
    els.btnZoomOut.addEventListener('click', zoomOut);
    els.btnFullscreen.addEventListener('click', toggleFullscreen);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    els.btnTheme.textContent = THEME_ICONS[theme];
    localStorage.setItem('libro-theme', theme);
  }

  function cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const idx = THEMES.indexOf(current);
    applyTheme(THEMES[(idx + 1) % THEMES.length]);
  }

  function bindTheme() {
    const saved = localStorage.getItem('libro-theme') || 'light';
    applyTheme(saved);
    els.btnTheme.addEventListener('click', cycleTheme);
  }

  let tocObserver = null;

  function buildToc() {
    tocObserver = new IntersectionObserver((entries) => {
      entries.forEach((obs) => {
        if (!obs.isIntersecting) return;
        const img = obs.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        tocObserver.unobserve(img);
      });
    }, { root: els.tocGrid, rootMargin: '300px 0px' });

    const frag = document.createDocumentFragment();
    state.manifest.pages.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'toc-item';
      const img = document.createElement('img');
      img.dataset.src = entry.file;
      img.alt = `Pagina ${entry.page}`;
      const label = document.createElement('span');
      label.textContent = `Pag. ${entry.page}`;
      item.appendChild(img);
      item.appendChild(label);
      item.addEventListener('click', () => {
        goTo(entry.page);
        els.tocPanel.classList.add('hidden');
      });
      frag.appendChild(item);
      tocObserver.observe(img);
    });
    els.tocGrid.appendChild(frag);
  }

  function bindTocAndJump() {
    const total = totalPages();
    els.pageSlider.max = total;
    els.pageInput.max = total;

    els.pageSlider.addEventListener('input', () => goTo(Number(els.pageSlider.value)));

    const jump = () => {
      const n = parseInt(els.pageInput.value, 10);
      if (!isNaN(n)) goTo(n);
    };
    els.btnGo.addEventListener('click', jump);
    els.pageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') jump(); });

    let tocBuilt = false;
    els.btnToc.addEventListener('click', () => {
      if (!tocBuilt) { buildToc(); tocBuilt = true; }
      els.tocPanel.classList.remove('hidden');
    });
    els.btnCloseToc.addEventListener('click', () => {
      els.tocPanel.classList.add('hidden');
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function snippetFor(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text.slice(0, 140));
    const start = Math.max(0, idx - 50);
    const end = Math.min(text.length, idx + query.length + 90);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet += '…';
    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    return escapeHtml(snippet).replace(re, (m) => `<mark>${m}</mark>`);
  }

  let searchTimer = null;

  function runSearch(query) {
    query = query.trim();
    els.searchResults.innerHTML = '';
    if (!query) {
      els.searchResults.innerHTML = '<div class="search-empty">Digita per cercare nel testo delle pagine.</div>';
      return;
    }
    const q = query.toLowerCase();
    const matches = state.manifest.pages.filter((p) => (p.text || '').toLowerCase().includes(q));
    if (!matches.length) {
      els.searchResults.innerHTML = '<div class="search-empty">Nessun risultato.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    matches.slice(0, 200).forEach((p) => {
      const item = document.createElement('div');
      item.className = 'search-result';
      item.innerHTML = `<div class="sr-page">Pagina ${p.page} · ${p.date}</div><div class="sr-snippet">${snippetFor(p.text, query)}</div>`;
      item.addEventListener('click', () => {
        goTo(p.page);
        els.searchPanel.classList.add('hidden');
      });
      frag.appendChild(item);
    });
    els.searchResults.appendChild(frag);
  }

  function bindSearch() {
    els.btnSearch.addEventListener('click', () => {
      els.searchPanel.classList.remove('hidden');
      els.searchInput.focus();
      if (!els.searchInput.value) runSearch('');
    });
    els.btnCloseSearch.addEventListener('click', () => els.searchPanel.classList.add('hidden'));
    els.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(els.searchInput.value), 150);
    });
  }

  function bindNavigation() {
    els.prevBtn.addEventListener('click', prev);
    els.nextBtn.addEventListener('click', next);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') { els.tocPanel.classList.add('hidden'); els.searchPanel.classList.add('hidden'); }
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

  function saveProgress(num) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ page: num, ts: Date.now() }));
    }, 250);
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function showResumeToast(page) {
    const toast = document.createElement('div');
    toast.textContent = `Hai ripreso da pagina ${page} — riprendo da dove avevi lasciato`;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '84px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--accent)', color: '#fff', padding: '10px 18px',
      borderRadius: '20px', fontSize: '13px', fontFamily: 'sans-serif',
      boxShadow: '0 6px 18px rgba(0,0,0,0.3)', zIndex: 50, opacity: '0',
      transition: 'opacity 300ms',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2600);
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
    bindZoomAndFullscreen();
    bindTheme();
    bindTocAndJump();
    bindSearch();

    const saved = loadProgress();
    const startPage = saved && saved.page >= 1 && saved.page <= totalPages() ? saved.page : 1;
    renderPage(startPage, { instant: true });

    els.loading.style.opacity = '0';
    setTimeout(() => { els.loading.style.display = 'none'; }, 300);
    els.topbar.classList.remove('hidden');
    els.bottombar.classList.remove('hidden');

    if (saved && startPage > 1) {
      setTimeout(() => showResumeToast(startPage), 500);
    }
  }

  init();
})();
