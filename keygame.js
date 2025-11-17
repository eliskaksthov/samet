// Mini hra: Lov na klíče
// Nezasahuje do script.js, ale při splnění přidá úkol 10 do completedTasks a zavolá updateProgress()

(function () {
  const DURATION_MS = 60 * 1000; // 60 sekund
  const SHOW_MS = 1500; // 1 s per klíč (appearance)
  const SPAWN_INTERVAL_MS = 500; // spawn každých 0.5s
  const TARGET_COUNT = 89;
  const TASK_NUMBER = 10; // číslo úkolu, které označíme jako splněné při úspěchu

  // Klíčový obrázek - adjust path pokud je jinde
  const KEY_SRC = 'images/key.png';

  // Storage keys pro zachování stavu mezi reloady
  const STORAGE_KEYS = {
    timeEnd: 'ukol10_timeEnd',
    count: 'ukol10_keysCollected',
    running: 'ukol10_running'
  };

  // DOM
  const area = document.getElementById('kg-area');
  const timeEl = document.getElementById('kg-time');
  const countEl = document.getElementById('kg-count');
  const statusEl = document.getElementById('kg-status');
  const startBtn = document.getElementById('kg-start');
  const restartBtn = document.getElementById('kg-restart');
  const resetStorageBtn = document.getElementById('kg-reset-storage');
  const resultEl = document.getElementById('kg-result');

  let spawnInterval = null;
  let timerInterval = null;

  // Utility
  function formatTime(ms) {
    if (ms <= 0) return '00:00';
    const s = Math.ceil(ms / 1000);
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  function getStoredCount() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.count) || '0', 10);
  }
  function setStoredCount(n) {
    localStorage.setItem(STORAGE_KEYS.count, String(n));
  }
  function getStoredTimeEnd() {
    const v = localStorage.getItem(STORAGE_KEYS.timeEnd);
    return v ? parseInt(v, 10) : 0;
  }
  function setStoredTimeEnd(ts) {
    localStorage.setItem(STORAGE_KEYS.timeEnd, String(ts));
  }
  function setRunning(flag) {
    localStorage.setItem(STORAGE_KEYS.running, flag ? '1' : '0');
  }
  function isRunningStored() {
    return localStorage.getItem(STORAGE_KEYS.running) === '1';
  }

  function updateHUD() {
    const now = Date.now();
    const end = getStoredTimeEnd();
    const remaining = Math.max(0, end - now);
    timeEl.textContent = formatTime(remaining);
    countEl.textContent = getStoredCount();
    if (isRunningStored()) {
      statusEl.textContent = remaining > 0 ? 'Běží' : 'Dokončeno';
    } else {
      statusEl.textContent = 'Čeká';
    }
  }

  function spawnKeyOnce() {
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const el = document.createElement('img');
    el.src = KEY_SRC;
    el.className = 'key-sprite';
    // náhodná pozice — nech margin 8 px od okrajů
    const margin = 8;
    const w = 48, h = 24;
    const maxLeft = Math.max(0, rect.width - w - margin);
    const maxTop = Math.max(0, rect.height - h - margin);
    const left = Math.floor(Math.random() * (maxLeft + 1));
    const top = Math.floor(Math.random() * (maxTop + 1));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.opacity = '1';

    let clicked = false;
    const collect = () => {
      if (clicked) return;
      clicked = true;
      // přičíst 1
      const current = getStoredCount();
      const next = current + 1;
      setStoredCount(next);
      countEl.textContent = next;
      // vizuální feedback
      el.style.transform = 'scale(1.2) rotate(10deg)';
      el.style.opacity = '0.7';
      // zrušit po krátké době
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 100);
      // zkontrolovat vítězství
      if (next >= TARGET_COUNT) {
        finishSuccess();
      }
    };

    el.addEventListener('click', collect, { once: true, passive: true });

    // v případě, že hráč stihne kliknout dřív než element bude odstraněn,
    // `collect` zajistí že se přičte jen jednou.
    area.appendChild(el);

    // odebrat po SHOW_MS
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, SHOW_MS);
  }

  function startSpawning() {
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(() => {
      // spawn klíče každých SPAWN_INTERVAL_MS
      // pokud hra už doběhla, nepřidávat další
      const end = getStoredTimeEnd();
      if (Date.now() >= end) return;
      spawnKeyOnce();
    }, SPAWN_INTERVAL_MS);
  }

  function stopSpawning() {
    if (spawnInterval) {
      clearInterval(spawnInterval);
      spawnInterval = null;
    }
  }

  function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      updateHUD();
      const end = getStoredTimeEnd();
      if (Date.now() >= end) {
        // čas vypršel
        stopSpawning();
        setRunning(false);
        updateHUD();
        // zkontrolovat zda vítězství nebo prohra
        const collected = getStoredCount();
        if (collected >= TARGET_COUNT) {
          // už ošetřeno v collect, ale necháme i zde safety
          finishSuccess();
        } else {
          finishFail();
        }
      }
    }, 250);
  }

  function clearGameArea() {
    if (area) {
      while (area.firstChild) area.removeChild(area.firstChild);
    }
  }

  function startGame(resume = false) {
    // Pokud resume = true a už máme timeEnd, pokračuj
    let timeEnd = getStoredTimeEnd();
    if (!resume || !timeEnd || timeEnd <= Date.now()) {
      timeEnd = Date.now() + DURATION_MS;
      setStoredTimeEnd(timeEnd);
      setStoredCount(0);
    }
    setRunning(true);
    resultEl.textContent = '';
    startBtn.disabled = true;
    restartBtn.classList.add('hidden');
    clearGameArea();
    updateHUD();
    startSpawning();
    startTimerLoop();
  }

  function finishSuccess() {
    stopSpawning();
    setRunning(false);
    updateHUD();
    resultEl.textContent = '🎉 Úspěch! Sesbíral(a) jsi 89 klíčů.';
    startBtn.disabled = false;
    restartBtn.classList.add('hidden');
    // Uložit úkol do completedTasks (kompatibilita se script.js)
    try {
      const completed = JSON.parse(localStorage.getItem('completedTasks') || '[]');
      if (!completed.includes(TASK_NUMBER)) {
        completed.push(TASK_NUMBER);
        localStorage.setItem('completedTasks', JSON.stringify(completed));
      }
      // volat updateProgress() pokud existuje v globalním scope (ze script.js)
      if (typeof updateProgress === 'function') {
        try { updateProgress(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('Chyba při ukládání completedTasks', e);
    }
  }

  function finishFail() {
    stopSpawning();
    setRunning(false);
    updateHUD();
    resultEl.textContent = '⛔ Konec! Nesplnil(a) jsi cíl — musíš restartovat a zkusit to znovu.';
    startBtn.disabled = false;
    restartBtn.classList.remove('hidden');
  }

  function restartGame() {
    // úplné vyresetování této minihry a spuštění znovu
    setStoredCount(0);
    setStoredTimeEnd(0);
    setRunning(false);
    clearGameArea();
    resultEl.textContent = '';
    updateHUD();
    startGame(false);
  }

  function resetStorage() {
    localStorage.removeItem(STORAGE_KEYS.count);
    localStorage.removeItem(STORAGE_KEYS.timeEnd);
    localStorage.removeItem(STORAGE_KEYS.running);
    clearGameArea();
    resultEl.textContent = 'Interní stav minihry smazán.';
    updateHUD();
  }

  // Eventy tlačítek
  startBtn?.addEventListener('click', () => startGame(false));
  restartBtn?.addEventListener('click', () => restartGame());
  resetStorageBtn?.addEventListener('click', () => {
    if (confirm('Opravdu vymazat interní stav minihry (ne celkový progress)?')) resetStorage();
  });

  // On load: restore state pokud probíhala hra
  document.addEventListener('DOMContentLoaded', () => {
    const running = isRunningStored();
    const timeEnd = getStoredTimeEnd();
    if (running && timeEnd > Date.now()) {
      // obnovit hru
      startGame(true);
    } else {
      // příprava UI
      updateHUD();
    }
  });

  // Clean-up při unload (uklidíme intervaly)
  window.addEventListener('beforeunload', () => {
    if (timerInterval) clearInterval(timerInterval);
    if (spawnInterval) clearInterval(spawnInterval);
  });
})();
