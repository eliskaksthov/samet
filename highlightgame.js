// highlightgame.js — systémové (pořadatelem nastavené) zvýraznění
// Pořadatel může zapnout "režim pořadatele" a nastavit zvýraznění; hráči vidí zvýraznění pouze a nemohou je měnit.
// Kontrola tajenky funguje (porovnání s uloženým řešením); při úspěchu se uloží collectedChars[11] a přidá se úkol 11 do completedTasks.

(function () {
  const TASK_NUM = 12;
  const STORAGE_KEYS = {
    rawText: 'ukol12_rawText',
    highlights: 'ukol12_highlights',   // object: { idx: char } - pořadí je v poolOrder
    poolOrder: 'ukol12_poolOrder',     // array of idx in selection order
    assembled: 'ukol12_assembled',
    solution: 'ukol12_solution',
    organizerMode: 'ukol11_organizerMode'
  };

  // DOM
  const inputText = document.getElementById('inputText');
  const fileInput = document.getElementById('fileInput');
  const renderBtn = document.getElementById('renderBtn');
  const clearBtn = document.getElementById('clearBtn');
  const rendered = document.getElementById('rendered');
  const poolEl = document.getElementById('pool');
  const assembledInput = document.getElementById('assembled');
  const savePoolBtn = document.getElementById('savePoolBtn');
  const submitBtn = document.getElementById('submitBtn');
  const resetHighlightsBtn = document.getElementById('resetHighlightsBtn');
  const wipeStorageBtn = document.getElementById('wipeStorageBtn');
  const backspaceBtn = document.getElementById('backspaceBtn');
  const clearAssemblyBtn = document.getElementById('clearAssemblyBtn');

  // Organizer controls
  const toggleOrganizerBtn = document.getElementById('toggleOrganizerBtn');
  const saveHighlightsBtn = document.getElementById('saveHighlightsBtn');
  const exportHighlightsBtn = document.getElementById('exportHighlightsBtn');
  const importHighlightsBtn = document.getElementById('importHighlightsBtn');
  const solutionInput = document.getElementById('solutionInput');
  const saveSolutionBtn = document.getElementById('saveSolutionBtn');
  const clearSolutionBtn = document.getElementById('clearSolutionBtn');

  const statusEl = document.getElementById('status');

  // State helpers
  function getRawText() { return localStorage.getItem(STORAGE_KEYS.rawText) || ''; }
  function setRawText(s) { localStorage.setItem(STORAGE_KEYS.rawText, s || ''); }

  function getHighlights() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.highlights) || '{}'); }
    catch { return {}; }
  }
  function setHighlights(obj) { localStorage.setItem(STORAGE_KEYS.highlights, JSON.stringify(obj || {})); }

  function getPoolOrder() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.poolOrder) || '[]'); }
    catch { return []; }
  }
  function setPoolOrder(arr) { localStorage.setItem(STORAGE_KEYS.poolOrder, JSON.stringify(arr || [])); }

  function getAssembled() { return localStorage.getItem(STORAGE_KEYS.assembled) || ''; }
  function setAssembled(s) { localStorage.setItem(STORAGE_KEYS.assembled, s || ''); }

  function getSolution() { return localStorage.getItem(STORAGE_KEYS.solution) || ''; }
  function setSolution(s) { if (s) localStorage.setItem(STORAGE_KEYS.solution, s); else localStorage.removeItem(STORAGE_KEYS.solution); }

  function isOrganizerMode() { return localStorage.getItem(STORAGE_KEYS.organizerMode) === '1'; }
  function setOrganizerMode(flag) { localStorage.setItem(STORAGE_KEYS.organizerMode, flag ? '1' : '0'); }

  // Normalization for comparison
  function normalizeForCompare(s) {
    if (!s && s !== '') return '';
    let r = String(s).trim().toLowerCase();
    r = r.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    r = r.replace(/\s+/g, ' ');
    return r;
  }

  // Render text into spans; if organizer mode is on, spans are clickable for editing highlights
  function renderTextToDOM(text) {
    rendered.innerHTML = '';
    if (!text) {
      rendered.textContent = '';
      return;
    }
    const highlights = getHighlights();
    const organizer = isOrganizerMode();
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const span = document.createElement('span');
      span.className = 'char';
      span.dataset.idx = i;
      span.textContent = ch;
      if (highlights && highlights[i]) {
        span.classList.add('highlight');
      }
      // If organizer mode, make editable (click toggles highlight)
      if (organizer) {
        span.classList.add('editable');
        span.title = 'Klikni pro přidat/odebrat zvýraznění (režim pořadatele)';
        span.addEventListener('click', (ev) => {
          organizerToggleHighlight(i, span);
        }, { passive: true });
      } else {
        // ensure no click handlers remain
        span.classList.remove('editable');
        span.title = '';
      }
      rendered.appendChild(span);
    }
  }

  // Organizer toggle highlight (can change highlights)
  function organizerToggleHighlight(idx, domSpan) {
    const highlights = getHighlights();
    const pool = getPoolOrder();
    const text = getRawText();
    const ch = text[idx] || '';
    if (!ch) return;
    if (highlights[idx]) {
      delete highlights[idx];
      const pos = pool.indexOf(idx);
      if (pos !== -1) pool.splice(pos, 1);
      if (domSpan) domSpan.classList.remove('highlight');
    } else {
      highlights[idx] = ch;
      pool.push(idx);
      if (domSpan) domSpan.classList.add('highlight');
    }
    setHighlights(highlights);
    setPoolOrder(pool);
    renderPool();
  }

  // Player pool: shows highlights in order; clicking adds to assembled
  function renderPool() {
    poolEl.innerHTML = '';
    const pool = getPoolOrder();
    const highlights = getHighlights();
    if (!pool.length) {
      poolEl.textContent = '(žádná zvýrazněná písmena)';
      return;
    }
    for (let i = 0; i < pool.length; i++) {
      const idx = pool[i];
      const ch = highlights[idx] !== undefined ? highlights[idx] : '';
      const btn = document.createElement('button');
      btn.className = 'tile';
      btn.dataset.idx = idx;
      btn.textContent = ch;
      // left click: přidat do tajenky
      btn.addEventListener('click', () => {
        assembledInput.value += ch;
        setAssembled(assembledInput.value);
      }, { passive: true });
      // right click: pokud je organizer mode povolený, pravým klikem lze odstranit z poolu (odznačit)
      btn.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        if (isOrganizerMode()) {
          const span = rendered.querySelector(`.char[data-idx="${idx}"]`);
          organizerToggleHighlight(idx, span);
        } else {
          // pokud hráč, nabídnout nápovědu
          status('Pro odstranění položky z poolu zapněte režim pořadatele.');
        }
      });
      poolEl.appendChild(btn);
    }
  }

  // Button handlers
  renderBtn?.addEventListener('click', () => {
    const txt = inputText.value;
    setRawText(txt);
    // If existing highlights point beyond new text length, reset them
    const highlights = getHighlights();
    let reset = false;
    const keys = Object.keys(highlights).map(k => parseInt(k,10)).filter(n => !Number.isNaN(n));
    if (keys.length && Math.max(...keys) >= txt.length) reset = true;
    if (reset) {
      setHighlights({});
      setPoolOrder([]);
    }
    renderTextToDOM(txt);
    renderPool();
    status('Text vykreslený.');
  });

  clearBtn?.addEventListener('click', () => {
    inputText.value = '';
    setRawText('');
    setHighlights({});
    setPoolOrder([]);
    setAssembled('');
    assembledInput.value = '';
    renderTextToDOM('');
    renderPool();
    status('Text a zvýraznění vymazáno.');
  });

  fileInput?.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    if (!f.type.match('text.*') && !f.name.endsWith('.txt')) {
      alert('Prosím nahraj textový soubor (.txt).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      inputText.value = String(reader.result || '');
      renderBtn.click();
    };
    reader.readAsText(f, 'utf-8');
  });

  savePoolBtn?.addEventListener('click', () => {
    status('Pool (zvýraznění) uložen do interního úložiště.');
  });

  submitBtn?.addEventListener('click', () => {
    const assembled = assembledInput.value.trim();
    const solution = getSolution();
    if (!solution) {
      if (!confirm('Pořadatel nenastavil očekávané řešení. Chceš přesto odeslat a uložit tajenku jako splněný úkol?')) {
        status('Odeslání zrušeno.');
        return;
      }
      finalizeAsSuccess(assembled);
      return;
    }
    const normGiven = normalizeForCompare(assembled);
    const normSolution = normalizeForCompare(solution);
    if (normGiven === normSolution) {
      finalizeAsSuccess(assembled);
    } else {
      status('❌ Tajenka není správná. Zkus to znovu.');
      console.warn('Ověření selhalo. Očekávané(normalized):', normSolution, 'Zadané(normalized):', normGiven);
      return;
    }
  });

  function finalizeAsSuccess(assembled) {
    try {
      const collected = JSON.parse(localStorage.getItem('collectedChars') || '{}');
      collected[TASK_NUM] = assembled || '';
      localStorage.setItem('collectedChars', JSON.stringify(collected));
      const completed = JSON.parse(localStorage.getItem('completedTasks') || '[]');
      if (!completed.includes(TASK_NUM)) {
        completed.push(TASK_NUM);
        localStorage.setItem('completedTasks', JSON.stringify(completed));
      }
      setAssembled(assembled);
      status('🎉 Tajenka správná! Úkol ' + TASK_NUM + ' uložen jako splněný.');
      if (typeof updateProgress === 'function') {
        try { updateProgress(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('Chyba při ukládání výsledku', e);
      status('Chyba při ukládání výsledku — podívej se do konzole.');
    }
  }

  resetHighlightsBtn?.addEventListener('click', () => {
    if (!confirm('Opravdu odstranit všechna zvýraznění a pool?')) return;
    setHighlights({});
    setPoolOrder([]);
    renderTextToDOM(getRawText());
    renderPool();
    status('Zvýraznění a pool vymazány.');
  });

  wipeStorageBtn?.addEventListener('click', () => {
    if (!confirm('Opravdu vymazat interní stav tohoto modulu (ne celkový progress)?')) return;
    localStorage.removeItem(STORAGE_KEYS.rawText);
    localStorage.removeItem(STORAGE_KEYS.highlights);
    localStorage.removeItem(STORAGE_KEYS.poolOrder);
    localStorage.removeItem(STORAGE_KEYS.assembled);
    localStorage.removeItem(STORAGE_KEYS.solution);
    localStorage.removeItem(STORAGE_KEYS.organizerMode);
    inputText.value = '';
    assembledInput.value = '';
    renderTextToDOM('');
    renderPool();
    status('Interní stav modulu smazán.');
  });

  backspaceBtn?.addEventListener('click', () => {
    const val = assembledInput.value;
    assembledInput.value = val.slice(0, -1);
    setAssembled(assembledInput.value);
  });
  clearAssemblyBtn?.addEventListener('click', () => {
    assembledInput.value = '';
    setAssembled('');
  });

  // Organizer controls
  toggleOrganizerBtn?.addEventListener('click', () => {
    const cur = isOrganizerMode();
    if (!cur) {
      // enable
      if (!confirm('Zapnout režim pořadatele? V tomto režimu můžeš klikáním upravovat zvýraznění.')) return;
      setOrganizerMode(true);
      toggleOrganizerBtn.textContent = 'Vypnout režim pořadatele';
      status('Režim pořadatele zapnut. Klikni na písmena pro nastavení zvýraznění.');
    } else {
      setOrganizerMode(false);
      toggleOrganizerBtn.textContent = 'Zapnout režim pořadatele';
      status('Režim pořadatele vypnut. Hráči nyní neuvidí možnost úprav.');
    }
    renderTextToDOM(getRawText());
    renderPool();
  });

  saveHighlightsBtn?.addEventListener('click', () => {
    // highlights jsou už v localStorage průběžně aktualizovány; toto slouží jako potvrzení pro pořadatele
    status('Zvýraznění uloženo.');
  });

  exportHighlightsBtn?.addEventListener('click', async () => {
    try {
      const out = {
        text: getRawText(),
        highlights: getHighlights(),
        poolOrder: getPoolOrder()
      };
      const json = JSON.stringify(out);
      await navigator.clipboard.writeText(json);
      status('JSON zvýraznění zkopírován do schránky.');
    } catch (e) {
      console.error('Export selhal', e);
      status('Export selhal — zkontroluj konzoli nebo povolení schránky.');
    }
  });

  importHighlightsBtn?.addEventListener('click', () => {
    const json = prompt('Vlož JSON exportu (text, highlights, poolOrder):');
    if (!json) return;
    try {
      const obj = JSON.parse(json);
      if (obj.text && obj.text !== getRawText()) {
        if (!confirm('Importovaný text se liší od aktuálního. Chceš přepsat aktuální text?')) return;
        setRawText(obj.text);
        inputText.value = obj.text;
      }
      if (obj.highlights) setHighlights(obj.highlights);
      if (obj.poolOrder) setPoolOrder(obj.poolOrder);
      renderTextToDOM(getRawText());
      renderPool();
      status('Import proveden.');
    } catch (e) {
      console.error('Import selhal', e);
      status('Import JSONu selhal — nekorektní formát.');
    }
  });

  // Solution handlers
  saveSolutionBtn?.addEventListener('click', () => {
    const s = solutionInput.value;
    if (!s) {
      if (!confirm('Chceš uložit prázdné řešení (tím se odstraní existující řešení)?')) return;
    }
    setSolution(s || '');
    solutionInput.value = '';
    status('Řešení uloženo lokálně.');
  });
  clearSolutionBtn?.addEventListener('click', () => {
    if (!confirm('Smazat uložené řešení?')) return;
    setSolution('');
    status('Řešení smazáno.');
  });

  // init / restore
  function status(msg) {
    statusEl.textContent = msg;
    setTimeout(() => {
      if (statusEl.textContent === msg) statusEl.textContent = '';
    }, 7000);
  }

  function restoreState() {
    const text = getRawText();
    inputText.value = text;
    // Ensure toggle button reflects saved organizer mode
    if (isOrganizerMode()) {
      toggleOrganizerBtn.textContent = 'Vypnout režim pořadatele';
    } else {
      toggleOrganizerBtn.textContent = 'Zapnout režim pořadatele';
    }
    renderTextToDOM(text);
    renderPool();
    assembledInput.value = getAssembled();
  }

  assembledInput?.addEventListener('input', () => {
    setAssembled(assembledInput.value);
  });

  document.addEventListener('DOMContentLoaded', () => {
    restoreState();
  });

})();
