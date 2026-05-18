/* ============================================================
   script.js — Main assessment flow, timer, scoring, navigation
   ============================================================ */

(function () {
  'use strict';

  /* ---- Guards -------------------------------------------- */
  const learner = Storage.getLearnerInfo();
  let state     = Storage.getAssessmentState();

  if (!learner) { window.location.href = 'index.html'; return; }
  if (!state)   { window.location.href = 'instructions.html'; return; }

  /* If already completed, go to result */
  if (state.completed) { window.location.href = 'result.html'; return; }

  /* ---- State --------------------------------------------- */
  let currentGameIdx   = state.currentGameIdx || 0;
  let totalScore       = state.gameResults.reduce((s, g) => s + (g.score || 0), 0);
  let globalTimerId    = null;
  let gameTimerId      = null;
  let gameTimeLeft     = 0;
  let gameStartMs      = 0;
  let isTransitioning  = false;
  let tabSwitchCount   = state.tabSwitchCount || 0;

  /* ---- DOM refs ------------------------------------------ */
  const globalTimerEl   = document.getElementById('globalTimer');
  const scoreBadgeEl    = document.getElementById('scoreBadge');
  const levelLabelEl    = document.getElementById('levelLabel');
  const gameLabelEl     = document.getElementById('gameLabel');
  const globalProgressEl= document.getElementById('globalProgress');
  const progressTextEl  = document.getElementById('progressText');
  const gameTimerBarEl  = document.getElementById('gameTimerBar');
  const gameTimerLabel  = document.getElementById('gameTimerLabel');
  const introCard       = document.getElementById('gameIntroCard');
  const gameContent     = document.getElementById('gameContent');
  const transOverlay    = document.getElementById('transitionOverlay');
  const transIcon       = document.getElementById('transIcon');
  const transTitle      = document.getElementById('transTitle');
  const transScore      = document.getElementById('transScore');
  const transMsg        = document.getElementById('transMsg');
  const transNextBtn    = document.getElementById('transNextBtn');

  /* ---- Tab-switch / visibility tracking ------------------ */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !state.completed) {
      tabSwitchCount++;
      state.tabSwitchCount = tabSwitchCount;
      Storage.saveAssessmentState(state);
    }
  });

  /* ---- Warn on navigate away ----------------------------- */
  window.addEventListener('beforeunload', e => {
    if (!state.completed) {
      state.refreshCount = (state.refreshCount || 0) + 1;
      Storage.saveAssessmentState(state);
      e.preventDefault();
      e.returnValue = 'Your assessment is in progress. Are you sure you want to leave?';
    }
  });

  /* ============================================================
     GLOBAL TIMER
     ============================================================ */
  function startGlobalTimer() {
    if (globalTimerId) clearInterval(globalTimerId);
    globalTimerId = setInterval(tickGlobal, 1000);
    tickGlobal();
  }

  function tickGlobal() {
    const remaining = Storage.getRemainingSeconds(state);
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      clearInterval(globalTimerId);
      autoSubmit();
    }
  }

  function updateTimerDisplay(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const str = `⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (globalTimerEl) {
      globalTimerEl.textContent = str;
      globalTimerEl.className = 'timer-display' + (secs < 120 ? ' danger' : secs < 300 ? ' warning' : '');
    }
  }

  /* ============================================================
     PER-GAME TIMER
     ============================================================ */
  function startGameTimer(limitSecs, onExpire) {
    if (gameTimerId) clearInterval(gameTimerId);
    gameTimeLeft = limitSecs;
    gameStartMs  = Date.now();

    function tick() {
      gameTimeLeft--;
      const pct = Math.max(0, (gameTimeLeft / limitSecs) * 100);
      if (gameTimerBarEl) gameTimerBarEl.style.width = pct + '%';
      if (gameTimerLabel) gameTimerLabel.textContent = fmtSecs(gameTimeLeft);
      if (gameTimeLeft <= 0) {
        clearInterval(gameTimerId);
        onExpire();
      }
    }
    if (gameTimerBarEl) gameTimerBarEl.style.width = '100%';
    if (gameTimerLabel) gameTimerLabel.textContent = fmtSecs(limitSecs);
    gameTimerId = setInterval(tick, 1000);
  }

  function stopGameTimer() {
    if (gameTimerId) { clearInterval(gameTimerId); gameTimerId = null; }
  }

  function fmtSecs(s) {
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }

  /* ============================================================
     HEADER UPDATE
     ============================================================ */
  function updateHeader(gameIdx) {
    const g = GAMES[gameIdx];
    if (!g) return;
    levelLabelEl.textContent = g.level;
    gameLabelEl.textContent  = g.name;
    scoreBadgeEl.textContent = `⭐ ${totalScore} pts`;
    const pct = (gameIdx / GAMES.length) * 100;
    globalProgressEl.style.width = pct + '%';
    progressTextEl.textContent   = `${gameIdx} / ${GAMES.length} games`;
  }

  /* ============================================================
     SHOW INTRO CARD FOR EACH GAME
     ============================================================ */
  function showIntroCard(gameIdx) {
    const g = GAMES[gameIdx];
    introCard.classList.remove('hidden');
    gameContent.classList.add('hidden');

    introCard.innerHTML = `
      <div class="game-title">
        <div class="game-icon" style="background:${g.color}20;color:${g.color}">${g.icon}</div>
        <div>
          <div style="font-size:.8rem;color:var(--grey);font-weight:600">${g.level} of 8</div>
          <h2 style="margin:0">${g.name}</h2>
          <div style="font-size:.85rem;color:var(--grey)">Skill: ${g.skill}</div>
        </div>
      </div>
      <div class="game-instructions">${g.instructions}</div>
      <div class="flex gap-2 mb-3" style="flex-wrap:wrap">
        <span class="stat-box" style="background:#ede9fe;color:#4f46e5">⏱ ${g.timeLimit}s per game</span>
        <span class="stat-box" style="background:#d1fae5;color:#065f46">🎯 ${g.skill}</span>
      </div>
      <button id="playGameBtn" class="btn btn-primary btn-full" style="font-size:1.05rem">
        ▶ Start ${g.name}
      </button>
    `;

    document.getElementById('playGameBtn').addEventListener('click', () => {
      introCard.classList.add('hidden');
      gameContent.classList.remove('hidden');
      launchGame(gameIdx);
    });
  }

  /* ============================================================
     LAUNCH A GAME
     ============================================================ */
  function launchGame(gameIdx) {
    if (gameIdx >= GAMES.length) { finishAssessment(); return; }
    const g = GAMES[gameIdx];
    updateHeader(gameIdx);
    gameContent.innerHTML = '';

    /* Clean up any previous game */
    if (gameContent._cleanup) { gameContent._cleanup(); delete gameContent._cleanup; }

    startGameTimer(g.timeLimit, () => {
      /* Time ran out for this game — force complete with partial score */
      if (gameContent._cleanup) gameContent._cleanup();
      handleGameComplete({
        gameId:    g.id,
        score:     0,
        correct:   0,
        wrong:     0,
        missed:    0,
        responseTimes: [],
        completed: false,
        timedOut:  true
      });
    });

    renderGame(g.id, gameContent, (result) => {
      stopGameTimer();
      handleGameComplete(result);
    });
  }

  /* ============================================================
     HANDLE GAME COMPLETION
     ============================================================ */
  function handleGameComplete(result) {
    if (isTransitioning) return;
    isTransitioning = true;
    stopGameTimer();

    /* Save to state */
    const existing = state.gameResults.findIndex(r => r.gameId === result.gameId);
    if (existing >= 0) state.gameResults[existing] = result;
    else               state.gameResults.push(result);

    totalScore += (result.score || 0);
    currentGameIdx = state.currentGameIdx + 1;
    state.currentGameIdx = currentGameIdx;
    Storage.saveAssessmentState(state);

    /* Show transition */
    showTransition(result, () => {
      isTransitioning = false;
      if (currentGameIdx >= GAMES.length) {
        finishAssessment();
      } else {
        showIntroCard(currentGameIdx);
        updateHeader(currentGameIdx);
      }
    });
  }

  /* ============================================================
     TRANSITION OVERLAY
     ============================================================ */
  function showTransition(result, onNext) {
    const isLast = currentGameIdx >= GAMES.length;
    const score  = result.score || 0;
    const emoji  = score >= 80 ? '🏆' : score >= 60 ? '🎯' : score >= 40 ? '👍' : '💪';
    const msgs   = [
      'Great effort! Stay focused for the next one.',
      'Keep it up! Each game tests a different skill.',
      'Excellent work! Almost there.',
      'You\'re doing well! Stay sharp.',
      'Impressive focus! One step closer.'
    ];

    transIcon.textContent  = isLast ? '🏁' : emoji;
    transTitle.textContent = isLast ? 'Assessment Complete!' : 'Game Complete!';
    transScore.textContent = `+${score} pts`;
    transMsg.textContent   = isLast
      ? 'All 8 games done. Preparing your results…'
      : msgs[Math.floor(Math.random() * msgs.length)];
    transNextBtn.textContent = isLast ? 'View Results →' : 'Next Game →';

    transOverlay.classList.remove('hidden');
    transNextBtn.onclick = () => {
      transOverlay.classList.add('hidden');
      onNext();
    };

    /* Auto-advance after 4s */
    setTimeout(() => {
      if (!transOverlay.classList.contains('hidden')) {
        transOverlay.classList.add('hidden');
        onNext();
      }
    }, 4000);
  }

  /* ============================================================
     AUTO-SUBMIT (global timer expired)
     ============================================================ */
  function autoSubmit() {
    stopGameTimer();
    state.autoSubmitted = true;
    finishAssessment();
  }

  /* ============================================================
     FINISH ASSESSMENT
     ============================================================ */
  function finishAssessment() {
    clearInterval(globalTimerId);
    stopGameTimer();
    state.completed = true;
    state.currentGameIdx = GAMES.length;
    Storage.saveAssessmentState(state);

    /* Build and save result payload */
    const payload = Storage.buildResultPayload(learner, state, state.gameResults);
    Storage.saveResult(payload);

    /* Navigate to result page */
    window.removeEventListener('beforeunload', () => {});
    window.location.href = 'result.html';
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    /* Handle resume after refresh */
    const elapsed = Storage.getElapsedSeconds(state);
    if (elapsed >= state.totalDuration) {
      /* Time already over */
      autoSubmit();
      return;
    }

    startGlobalTimer();

    /* Resume at current game */
    if (currentGameIdx >= GAMES.length) {
      finishAssessment();
    } else {
      showIntroCard(currentGameIdx);
      updateHeader(currentGameIdx);
    }
  }

  boot();

})();
