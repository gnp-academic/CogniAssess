/* ============================================================
   storage.js — LocalStorage management, submission, retry
   ============================================================ */

const Storage = (() => {

  const KEYS = {
    LEARNER:    'cga_learner',
    STATE:      'cga_state',
    RESULT:     'cga_result',
    PENDING:    'cga_pending_submission',
    SUBMITTED:  'cga_submitted_ids'
  };

  /* ---------- Learner Info --------------------------------- */
  function setLearnerInfo(info) {
    localStorage.setItem(KEYS.LEARNER, JSON.stringify(info));
  }
  function getLearnerInfo() {
    try { return JSON.parse(localStorage.getItem(KEYS.LEARNER)); }
    catch { return null; }
  }

  /* ---------- Assessment State ----------------------------- */
  function initAssessmentState() {
    const state = {
      startTime:       new Date().toISOString(),
      currentGameIdx:  0,
      totalDuration:   25 * 60, // seconds
      tabSwitchCount:  0,
      refreshCount:    0,
      completed:       false,
      autoSubmitted:   false,
      gameResults:     []   // filled as each game completes
    };
    localStorage.setItem(KEYS.STATE, JSON.stringify(state));
    return state;
  }
  function getAssessmentState() {
    try { return JSON.parse(localStorage.getItem(KEYS.STATE)); }
    catch { return null; }
  }
  function saveAssessmentState(state) {
    localStorage.setItem(KEYS.STATE, JSON.stringify(state));
  }

  /* ---------- Time helpers --------------------------------- */
  function getElapsedSeconds(state) {
    if (!state || !state.startTime) return 0;
    return Math.floor((Date.now() - new Date(state.startTime)) / 1000);
  }
  function getRemainingSeconds(state) {
    if (!state) return 0;
    return Math.max(0, state.totalDuration - getElapsedSeconds(state));
  }

  /* ---------- Result --------------------------------------- */
  function saveResult(result) {
    localStorage.setItem(KEYS.RESULT, JSON.stringify(result));
  }
  function getResult() {
    try { return JSON.parse(localStorage.getItem(KEYS.RESULT)); }
    catch { return null; }
  }

  /* ---------- Pending submission (for retry) --------------- */
  function savePendingSubmission(payload) {
    localStorage.setItem(KEYS.PENDING, JSON.stringify(payload));
  }
  function getPendingSubmission() {
    try { return JSON.parse(localStorage.getItem(KEYS.PENDING)); }
    catch { return null; }
  }
  function clearPendingSubmission() {
    localStorage.removeItem(KEYS.PENDING);
  }

  /* ---------- Duplicate-submission guard ------------------- */
  function markAsSubmitted(attemptId) {
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem(KEYS.SUBMITTED)) || []; } catch {}
    if (!ids.includes(attemptId)) ids.push(attemptId);
    localStorage.setItem(KEYS.SUBMITTED, JSON.stringify(ids));
  }
  function isAlreadySubmitted(attemptId) {
    try {
      const ids = JSON.parse(localStorage.getItem(KEYS.SUBMITTED)) || [];
      return ids.includes(attemptId);
    } catch { return false; }
  }

  /* ---------- Submit to Google Apps Script ---------------- */
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzbxLaTzEqkEZfDy8Sul3gPaHiMLM4JTGYOZpaG1BAQGjZ4a4EUmKTOuqouAcfBp5_0/exec';
  // Replace the string above with your deployed Apps Script Web App URL.

  async function submitResult(payload) {
    /* Duplicate guard (client-side) */
    if (isAlreadySubmitted(payload.attemptId)) {
      return { success: false, error: 'duplicate', message: 'This attempt has already been submitted.' };
    }

    if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_GOOGLE')) {
      /* Dev mode: log to console, pretend success */
      console.log('[Dev] Submission payload:', payload);
      markAsSubmitted(payload.attemptId);
      return { success: true, dev: true };
    }

    try {
      const resp = await fetch(WEB_APP_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' }, // avoids preflight CORS
        body:    JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();

      if (json.status === 'success') {
        markAsSubmitted(payload.attemptId);
        clearPendingSubmission();
        return { success: true };
      } else if (json.status === 'duplicate') {
        markAsSubmitted(payload.attemptId);
        return { success: false, error: 'duplicate', message: json.message };
      } else {
        throw new Error(json.message || 'Server error');
      }
    } catch (err) {
      /* Save for retry */
      savePendingSubmission(payload);
      return { success: false, error: 'network', message: err.message };
    }
  }

  /* ---------- Build result payload from state -------------- */
  function buildResultPayload(learner, state, gameResults) {
    const endTime    = new Date().toISOString();
    const elapsed    = getElapsedSeconds(state);
    const totalSec   = Math.min(elapsed, state.totalDuration);

    /* Aggregate scores */
    const maxPerGame = 100;
    const maxTotal   = gameResults.length * maxPerGame;
    const totalScore = gameResults.reduce((sum, g) => sum + (g.score || 0), 0);
    const pct        = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

    const perfLevel =
      pct >= 81 ? 'Strong' :
      pct >= 61 ? 'Good'   :
      pct >= 41 ? 'Basic'  : 'Needs Improvement';

    /* Skill map */
    const skill = {
      patternRecognition: _gameScore(gameResults, 'patternMatch'),
      memory:             _gameScore(gameResults, 'memorySequence'),
      attention:          _gameScore(gameResults, 'quickReaction'),
      logicalReasoning:   Math.round((_gameScore(gameResults,'ruleSwitching') + _gameScore(gameResults,'blockArrangement')) / 2),
      spatialReasoning:   Math.round((_gameScore(gameResults,'puzzleGrid') + _gameScore(gameResults,'directionMovement')) / 2),
      reactionSpeed:      _gameScore(gameResults, 'quickReaction'),
      numericalAbility:   _gameScore(gameResults, 'calculationSprint'),
      decisionMaking:     _gameScore(gameResults, 'ruleSwitching')
    };

    /* Interaction totals */
    const correct = gameResults.reduce((s,g) => s + (g.correct || 0), 0);
    const wrong   = gameResults.reduce((s,g) => s + (g.wrong   || 0), 0);
    const missed  = gameResults.reduce((s,g) => s + (g.missed  || 0), 0);
    const avgRT   = _avgResponseTime(gameResults);
    const fastRT  = _fastestRT(gameResults);
    const slowRT  = _slowestRT(gameResults);

    return {
      /* Meta */
      timestamp:          new Date().toISOString(),
      attemptId:          learner.attemptId,
      /* Learner */
      name:               learner.name,
      email:              learner.email,
      mobile:             learner.mobile,
      batch:              learner.batch,
      /* Assessment */
      startTime:          state.startTime,
      endTime:            endTime,
      totalTimeSec:       totalSec,
      totalTimeMin:       (totalSec / 60).toFixed(2),
      autoSubmitted:      state.autoSubmitted ? 'Yes' : 'No',
      /* Overall */
      totalScore:         totalScore,
      maxScore:           maxTotal,
      percentage:         pct,
      performanceLevel:   perfLevel,
      completionPct:      Math.round((gameResults.filter(g=>g.completed).length / 8) * 100),
      /* Game-wise */
      scorePatternMatch:  _gameScore(gameResults, 'patternMatch'),
      scoreBlockArrange:  _gameScore(gameResults, 'blockArrangement'),
      scoreMemory:        _gameScore(gameResults, 'memorySequence'),
      scoreReaction:      _gameScore(gameResults, 'quickReaction'),
      scoreRuleSwitching: _gameScore(gameResults, 'ruleSwitching'),
      scorePuzzleGrid:    _gameScore(gameResults, 'puzzleGrid'),
      scoreDirection:     _gameScore(gameResults, 'directionMovement'),
      scoreCalcSprint:    _gameScore(gameResults, 'calculationSprint'),
      /* Skill-wise */
      skillPatternRecog:  skill.patternRecognition,
      skillMemory:        skill.memory,
      skillAttention:     skill.attention,
      skillLogical:       skill.logicalReasoning,
      skillSpatial:       skill.spatialReasoning,
      skillReaction:      skill.reactionSpeed,
      skillNumerical:     skill.numericalAbility,
      skillDecision:      skill.decisionMaking,
      /* Behaviour */
      totalCorrect:       correct,
      totalWrong:         wrong,
      totalMissed:        missed,
      avgResponseTimeMs:  avgRT,
      fastestResponseMs:  fastRT,
      slowestResponseMs:  slowRT,
      tabSwitchCount:     state.tabSwitchCount || 0,
      refreshCount:       state.refreshCount   || 0,
      duplicateFlag:      'No'
    };
  }

  function _gameScore(results, id) {
    const g = results.find(r => r.gameId === id);
    return g ? (g.score || 0) : 0;
  }
  function _avgResponseTime(results) {
    const times = results.flatMap(g => g.responseTimes || []).filter(t => t > 0);
    if (!times.length) return 0;
    return Math.round(times.reduce((a,b) => a+b, 0) / times.length);
  }
  function _fastestRT(results) {
    const times = results.flatMap(g => g.responseTimes || []).filter(t => t > 0);
    return times.length ? Math.min(...times) : 0;
  }
  function _slowestRT(results) {
    const times = results.flatMap(g => g.responseTimes || []).filter(t => t > 0);
    return times.length ? Math.max(...times) : 0;
  }

  /* ---------- Clear all (after submission) ----------------- */
  function clearSession() {
    localStorage.removeItem(KEYS.STATE);
    /* Keep LEARNER and RESULT for result.html to read */
  }

  return {
    setLearnerInfo, getLearnerInfo,
    initAssessmentState, getAssessmentState, saveAssessmentState,
    getElapsedSeconds, getRemainingSeconds,
    saveResult, getResult,
    savePendingSubmission, getPendingSubmission, clearPendingSubmission,
    markAsSubmitted, isAlreadySubmitted,
    submitResult,
    buildResultPayload,
    clearSession
  };
})();
