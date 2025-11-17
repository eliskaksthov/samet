// highlightgame.js
// Umožní vložit/nahrát text, zvýrazňovat písmena, vytvářet pool a skládat tajenku.
// Uloží assembled tajenku do localStorage.collectedChars[11] a přidá 11 do completedTasks.
// Nezasahuje do script.js; pouze volá updateProgress(), pokud existuje.

(function () {
  const TASK_NUM = 12;
  const STORAGE_KEYS = {
    rawText: 'ukol12_rawText',
    highlights: 'ukol12_highlights',       // array of positions {idx, char}
    poolOrder: 'ukol12_poolOrder',         // array of indices into highlights
    assembled: 'ukol12_assembled'
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
  const statusEl = document.getElementById('status');

  // State
  // highlights: map from position index in text to boolean (highlighted)
  // poolOrder: array of positions in order of selection
  function getRawText() { return localStorage.getItem(STORAGE_KEYS.rawText) || ''; }
  function setRawText(s) { localStorage.setItem(STORAGE_KEYS.rawText, s || ''); }

  function getHighlights() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.highlights) || '{}');
    } catch { return {}; }
  }
  function setHighlights(obj) {
    localStorage.setItem(STORAGE_KEYS.highlights, JSON.stringify(obj || {}));
  }

  function getPoolOrder() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.poolOrder) || '[]');
    } catch { return []; }
  }
  function setPoolOrder(arr) {
    localStorage.setItem(STORAGE_KEYS.poolOrder, JSON.stringify(arr || []));
  }

  function getAssembled() { return localStorage.getItem(STORAGE_KEYS.assembled) || ''; }
  function setAssembled(s) { localStorage.setItem(STORAGE_KEYS.assembled, s || ''); }

  // Utility: render the raw text into spans per character
  function renderTextToDOM(text) {
    rendered.innerHTML = '';
    if (!text) {
      rendered.textContent = '';
      return;
    }
    const highlights = getHighlights();
    // Each character gets a span with data-idx
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const span = document.createElement('span');
      span.className = 'char';
      span.dataset.idx = i;
      span.textContent = ch;
      // Only allow clicking letters (but we can allow any visible char)
      if (highlights && highlights[i]) {
        span.classList.add('highlight');
      }
      // Toggle on click
      span.addEventListener('click', (ev) => {
        // If shift key pressed, allow bulk? For now single toggles; Shift handled in UI note only
        toggleHighlight(i, span);
      }, { passive: true });
      rendered.appendChild(span);
    }
  }

  function toggleHighlight(idx, domSpan) {
    const highlights = getHighlights();
    const pool = getPoolOrder();
    const text = getRawText();
    const ch = text[idx] || '';
    if (!ch) return;
    if (highlights[idx]) {
      // remove highlight
      delete highlights[idx];
      // remove idx from pool array where present
      const pos = pool.indexOf(idx);
      if (pos !== -1) pool.splice(pos, 1);
      if (domSpan) domSpan.classList.remove('highlight');
    } else {
      // set highlight
      highlights[idx] = ch;
      pool.push(idx);
      if (domSpan) domSpan.classList.add('highlight');
    }
    setHighlights(highlights);
    setPoolOrder(pool);
    renderPool();
  }

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
      // klik => přidat znak do assembled input
      btn.addEventListener('click', () => {
        assembledInput.value += ch;
        setAssembled(assembledInput.value);
      }, { passive: true });
      // pravé kliknutí (contextmenu) => odstranit z poolu
      btn.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        // un-highlight this index
        const span = rendered.querySelector(`.char[data-idx="${idx}"]`);
        toggleHighlight(idx, span);
      });
      poolEl.appendChild(btn);
    }
  }

  // Handlery tlačítek
  renderBtn?.addEventListener('click', () => {
    const txt = inputText.value;
    setRawText(txt);
    // reset highlights unless already present for this text length
    // simple heuristic: if existing highlights map is larger than new text, reset.
    const highlights = getHighlights();
    let reset = false;
    if (Object.keys(highlights).length === 0) {
      // nothing
    } else {
      const maxIdx = Math.max(...Object.keys(highlights).map(k => parseInt(k,10)));
      if (maxIdx >= txt.length) reset = true;
    }
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
    // pool a highlights jsou už v localStorage, tak jen informovat uživatele
    status('Pool uložen (localStorage).');
  });

  submitBtn?.addEventListener('click', () => {
    const assembled = assembledInput.value.trim();
    if (!assembled) {
      if (!confirm('Tajenku odesíláš prázdnou. Opravdu chceš pokračovat?')) return;
    }
    // uložíme do collectedChars: zachováme existující objekt a přidáme key TASK_NUM
    try {
      const collected = JSON.parse(localStorage.getItem('collectedChars') || '{}');
      collected[TASK_NUM] = assembled || '';
      localStorage.setItem('collectedChars', JSON.stringify(collected));
      // přidáme TASK_NUM do completedTasks pokud tam není
      const completed = JSON.parse(localStorage.getItem('completedTasks') || '[]');
      if (!completed.includes(TASK_NUM)) {
        completed.push(TASK_NUM);
        localStorage.setItem('completedTasks', JSON.stringify(completed));
      }
      // uložit assembled i do interního klíče
      setAssembled(assembled);
      status('Tajenku odesláno a úkol označen jako splněný (úkol č. ' + TASK_NUM + ').');
      // zavolat updateProgress pokud existuje
      if (typeof updateProgress === 'function') {
        try { updateProgress(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('Chyba při ukládání výsledku', e);
      status('Chyba při ukládání — podívej se do konzole.');
    }
  });

  resetHighlightsBtn?.addEventListener('click', () => {
    if (!confirm('Opravdu odstranit všechna zvýraznění a pool?')) return;
    setHighlights({});
    setPoolOrder([]);
    renderTextToDOM(getRawText());
    renderPool();
    status('Zvýraznění a pool vymazány.');
  });

  wipeStorageBtn?.addEventListener('click', () => {
    if (!confirm('Opravdu vymazat interní stav tohoto modulu (necelkový progress)?')) return;
    localStorage.removeItem(STORAGE_KEYS.rawText);
    localStorage.removeItem(STORAGE_KEYS.highlights);
    localStorage.removeItem(STORAGE_KEYS.poolOrder);
    localStorage.removeItem(STORAGE_KEYS.assembled);
    // nezmažeme collectedChars/ completedTasks (to jsou globální progressy)
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

  // init / restore
  function status(msg) {
    statusEl.textContent = msg;
    setTimeout(() => {
      // po 6s clear
      if (statusEl.textContent === msg) statusEl.textContent = '';
    }, 6000);
  }

  function restoreState() {
    const text = getRawText();
    inputText.value = text;
    renderTextToDOM(text);
    renderPool();
    const assembled = getAssembled();
    assembledInput.value = assembled;
  }

  // Allow keyboard selection: when Shift key is held, clicking and dragging could be supported later.
  // For now, simple click toggles are fine.

  // On load
  document.addEventListener('DOMContentLoaded', () => {
    restoreState();
    // Bind dynamic clicks in case user loads text from other place
  });

  // Save assembled input on change
  assembledInput?.addEventListener('input', () => {
    setAssembled(assembledInput.value);
  });

})();
