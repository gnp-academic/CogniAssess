/* ============================================================
   games.js — 8 Interactive Mini-Game Implementations
   ============================================================ */

/* ---- Shared helpers -------------------------------------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function showFeedback(text, type) {
  const el = document.createElement('div');
  el.className = `feedback-popup ${type}`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ============================================================
   GAME REGISTRY
   ============================================================ */
const GAMES = [
  {
    id:        'patternMatch',
    name:      'Pattern Match',
    level:     'Level 1',
    skill:     'Pattern Recognition',
    icon:      '🔷',
    color:     '#4f46e5',
    timeLimit: 90,
    instructions: 'Look at each sequence and click the correct missing item. Sequences get harder as you go.'
  },
  {
    id:        'blockArrangement',
    name:      'Block Arrangement',
    level:     'Level 2',
    skill:     'Logical Sequencing',
    icon:      '🧩',
    color:     '#0891b2',
    timeLimit: 100,
    instructions: 'Drag the blocks from the bank into the slots below in the correct logical order.'
  },
  {
    id:        'memorySequence',
    name:      'Memory Sequence',
    level:     'Level 3',
    skill:     'Working Memory',
    icon:      '🧠',
    color:     '#7c3aed',
    timeLimit: 90,
    instructions: 'Watch the tiles light up in sequence, then repeat the sequence by clicking them in the same order.'
  },
  {
    id:        'quickReaction',
    name:      'Quick Reaction',
    level:     'Level 4',
    skill:     'Attention & Speed',
    icon:      '⚡',
    color:     '#d97706',
    timeLimit: 60,
    instructions: 'Click only the TARGET objects. Avoid the DISTRACTOR objects. Be fast and accurate!'
  },
  {
    id:        'ruleSwitching',
    name:      'Rule Switching',
    level:     'Level 5',
    skill:     'Cognitive Flexibility',
    icon:      '🔀',
    color:     '#059669',
    timeLimit: 90,
    instructions: 'Follow the current rule shown on screen. The rule changes — adapt quickly!'
  },
  {
    id:        'puzzleGrid',
    name:      'Puzzle Grid',
    level:     'Level 6',
    skill:     'Visual Reasoning',
    icon:      '◼',
    color:     '#be185d',
    timeLimit: 90,
    instructions: 'Study the 3×3 grid and select the tile that correctly fills the missing position (?).'
  },
  {
    id:        'directionMovement',
    name:      'Direction Quest',
    level:     'Level 7',
    skill:     'Spatial Reasoning',
    icon:      '🗺',
    color:     '#b45309',
    timeLimit: 90,
    instructions: 'Read the movement instructions carefully and click the cell where you will end up on the grid.'
  },
  {
    id:        'calculationSprint',
    name:      'Calculation Sprint',
    level:     'Level 8',
    skill:     'Numerical Ability',
    icon:      '🔢',
    color:     '#1d4ed8',
    timeLimit: 80,
    instructions: 'Solve each calculation as fast as you can. Click the correct answer. Build your streak for bonus points!'
  }
];

/* ============================================================
   GAME 1 — PATTERN MATCH
   ============================================================ */
function renderPatternMatch(container, onComplete) {
  const rounds = [
    { seq: ['▲','●','▲','●','▲'], answer: '●', options: ['▲','●','■','◆'], difficulty: 'easy' },
    { seq: ['1','2','3','4','5'], answer: '6', options: ['6','7','5','8'], difficulty: 'easy' },
    { seq: ['🔴','🔵','🔴','🔵','🔴'], answer: '🔵', options: ['🔴','🔵','🟡','🟢'], difficulty: 'easy' },
    { seq: ['2','4','8','16'], answer: '32', options: ['24','32','18','64'], difficulty: 'medium' },
    { seq: ['A','C','E','G'], answer: 'I', options: ['H','I','J','K'], difficulty: 'medium' },
    { seq: ['▲','▲▲','▲▲▲'], answer: '▲▲▲▲', options: ['▲▲▲','▲▲▲▲','▲▲▲▲▲','▲▲'], difficulty: 'medium' },
    { seq: ['1','1','2','3','5','8'], answer: '13', options: ['11','12','13','14'], difficulty: 'hard' },
    { seq: ['Z','X','V','T'], answer: 'R', options: ['Q','R','S','P'], difficulty: 'hard' },
    { seq: ['3','6','12','24'], answer: '48', options: ['36','48','42','60'], difficulty: 'hard' }
  ];

  let idx = 0;
  const metrics = { correct: 0, wrong: 0, score: 0, responseTimes: [], completed: false };
  let roundStart = Date.now();
  let answered = false;

  function renderRound() {
    if (idx >= rounds.length) return finish();
    answered = false;
    roundStart = Date.now();
    const r = rounds[idx];
    const diffColor = r.difficulty === 'easy' ? '#10b981' : r.difficulty === 'medium' ? '#f59e0b' : '#ef4444';

    container.innerHTML = `
      <div class="flex justify-between mb-2">
        <span class="text-muted">Question ${idx+1} / ${rounds.length}</span>
        <span style="color:${diffColor};font-weight:600;font-size:.85rem;text-transform:uppercase">${r.difficulty}</span>
      </div>
      <div class="progress-bar-wrap mb-3">
        <div class="progress-bar-fill" style="width:${(idx/rounds.length)*100}%"></div>
      </div>
      <p class="mb-2" style="font-weight:600">What comes next in the sequence?</p>
      <div class="pattern-sequence" id="patSeq"></div>
      <div class="pattern-options" id="patOpts"></div>
    `;

    const seqEl = document.getElementById('patSeq');
    r.seq.forEach(s => {
      const d = document.createElement('div');
      d.className = 'pattern-item';
      d.textContent = s;
      seqEl.appendChild(d);
    });
    const qm = document.createElement('div');
    qm.className = 'pattern-item question-mark';
    qm.textContent = '?';
    seqEl.appendChild(qm);

    const opts = shuffle(r.options);
    const optsEl = document.getElementById('patOpts');
    opts.forEach(opt => {
      const btn = document.createElement('div');
      btn.className = 'pattern-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectAnswer(btn, opt, r.answer));
      optsEl.appendChild(btn);
    });
  }

  function selectAnswer(btn, chosen, correct) {
    if (answered) return;
    answered = true;
    const rt = Date.now() - roundStart;
    metrics.responseTimes.push(rt);
    const isCorrect = chosen === correct;
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      /* Highlight correct */
      document.querySelectorAll('.pattern-option').forEach(b => {
        if (b.textContent === correct) b.classList.add('correct');
      });
    }
    if (isCorrect) {
      metrics.correct++;
      const bonus = rt < 3000 ? 12 : rt < 6000 ? 10 : 8;
      metrics.score += bonus;
      showFeedback(`+${bonus} pts`, 'correct');
    } else {
      metrics.wrong++;
      showFeedback('Wrong!', 'wrong');
    }
    idx++;
    setTimeout(renderRound, 900);
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'patternMatch', ...metrics });
  }

  renderRound();
}

/* ============================================================
   GAME 2 — BLOCK ARRANGEMENT
   ============================================================ */
function renderBlockArrangement(container, onComplete) {
  const puzzles = [
    { label: 'Number Sequence', items: ['1','2','3','4','5'], difficulty: 'easy' },
    { label: 'Alphabet Skip', items: ['A','C','E','G','I'], difficulty: 'easy' },
    { label: 'Doubling', items: ['2','4','8','16','32'], difficulty: 'medium' },
    { label: 'Reverse Count', items: ['10','8','6','4','2'], difficulty: 'medium' },
    { label: 'Fibonacci', items: ['1','1','2','3','5','8'], difficulty: 'hard' },
    { label: 'Powers of 3', items: ['1','3','9','27','81'], difficulty: 'hard' }
  ];

  let idx = 0;
  const metrics = { correct: 0, wrong: 0, score: 0, responseTimes: [], completed: false };

  function renderPuzzle() {
    if (idx >= puzzles.length) return finish();
    const p = puzzles[idx];
    const shuffled = shuffle([...p.items]);
    const slots = Array(p.items.length).fill(null);
    let moveCount = 0;
    const puzzleStart = Date.now();

    container.innerHTML = `
      <div class="flex justify-between mb-2">
        <span class="text-muted">${p.label} — Puzzle ${idx+1}/${puzzles.length}</span>
        <span style="color:${p.difficulty==='easy'?'#10b981':p.difficulty==='medium'?'#f59e0b':'#ef4444'};font-weight:600;font-size:.85rem">${p.difficulty}</span>
      </div>
      <div class="progress-bar-wrap mb-3">
        <div class="progress-bar-fill" style="width:${(idx/puzzles.length)*100}%"></div>
      </div>
      <p class="mb-1" style="font-weight:600">Arrange these blocks in the correct logical order:</p>
      <div class="block-source" id="blockSource"></div>
      <p class="mt-2 mb-1 text-muted" style="font-size:.85rem">Drop blocks here in order →</p>
      <div class="block-target" id="blockTarget"></div>
      <button id="checkBtn" class="btn btn-primary mt-2" style="width:100%" disabled>Check Order</button>
    `;

    const source = document.getElementById('blockSource');
    const target = document.getElementById('blockTarget');
    const checkBtn = document.getElementById('checkBtn');

    /* Render source blocks */
    shuffled.forEach((val, i) => {
      const block = createDragBlock(val, i);
      source.appendChild(block);
    });

    /* Render target slots */
    p.items.forEach((_, si) => {
      const slot = document.createElement('div');
      slot.className = 'block-slot';
      slot.dataset.idx = si;
      slot.textContent = si + 1;
      setupDropZone(slot, slots, source, target, p.items, checkBtn);
      target.appendChild(slot);
    });

    checkBtn.addEventListener('click', () => {
      const rt = Date.now() - puzzleStart;
      metrics.responseTimes.push(rt);
      /* Compare slots to correct order */
      let allCorrect = true;
      target.querySelectorAll('.block-slot').forEach((slot, si) => {
        const block = slot.querySelector('.drag-block');
        const isCorrect = block && block.dataset.val === p.items[si];
        slot.classList.add(isCorrect ? 'correct' : (block ? 'wrong' : ''));
        if (!isCorrect) allCorrect = false;
      });
      if (allCorrect) {
        metrics.correct++;
        const bonus = rt < 15000 ? 16 : rt < 30000 ? 13 : 10;
        metrics.score += bonus;
        showFeedback(`+${bonus} pts — Correct!`, 'correct');
      } else {
        metrics.wrong++;
        const partial = slots.filter((v,i) => v === p.items[i]).length;
        const pts = Math.round((partial / p.items.length) * 8);
        metrics.score += pts;
        showFeedback(pts > 0 ? `Partial +${pts}` : 'Incorrect', 'wrong');
      }
      moveCount = 0;
      idx++;
      setTimeout(renderPuzzle, 1200);
    });
  }

  function createDragBlock(val, i) {
    const block = document.createElement('div');
    block.className = 'drag-block';
    block.textContent = val;
    block.dataset.val = val;
    block.draggable = true;
    block.dataset.sourceIdx = i;

    /* Mouse drag */
    block.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', val);
      block.classList.add('dragging');
      setTimeout(() => block.classList.add('dragging'), 0);
    });
    block.addEventListener('dragend', () => block.classList.remove('dragging'));

    /* Touch drag (pointer events) */
    let clone = null;
    block.addEventListener('pointerdown', e => {
      e.preventDefault();
      block.setPointerCapture(e.pointerId);
      clone = block.cloneNode(true);
      clone.style.cssText = `position:fixed;opacity:.7;pointer-events:none;z-index:9999;width:${block.offsetWidth}px`;
      document.body.appendChild(clone);
      moveClone(e);
    });
    block.addEventListener('pointermove', e => { if (clone) moveClone(e); });
    block.addEventListener('pointerup', e => {
      if (!clone) return;
      clone.remove(); clone = null;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const slot = target?.closest('.block-slot');
      if (slot) dropBlockInSlot(block, slot);
    });

    return block;
  }

  function moveClone(e) {
    if (!arguments[0]) return;
    const ev = arguments[0];
    const clone = document.querySelector('[style*="pointer-events:none"][style*="fixed"]');
    if (clone) {
      clone.style.left = (ev.clientX - 30) + 'px';
      clone.style.top  = (ev.clientY - 20) + 'px';
    }
  }

  function dropBlockInSlot(block, slot) {
    /* If slot occupied, return block to source */
    const existing = slot.querySelector('.drag-block');
    if (existing) {
      document.getElementById('blockSource').appendChild(existing);
    }
    slot.appendChild(block);
    block.classList.add('placed');
    /* Update check button */
    const allFilled = [...document.querySelectorAll('.block-slot')].every(s => s.querySelector('.drag-block'));
    document.getElementById('checkBtn').disabled = !allFilled;
  }

  function setupDropZone(slot) {
    slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('over'));
    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('over');
      const val = e.dataTransfer.getData('text/plain');
      const block = document.querySelector(`.drag-block[data-val="${val}"]`);
      if (block) dropBlockInSlot(block, slot);
    });
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'blockArrangement', ...metrics });
  }

  renderPuzzle();
}

/* ============================================================
   GAME 3 — MEMORY SEQUENCE
   ============================================================ */
function renderMemorySequence(container, onComplete) {
  const COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ec4899'];
  const COLS = 4;
  const TILES = 8;

  const rounds = [
    { length: 3, label: 'Easy', diffColor: '#10b981' },
    { length: 4, label: 'Easy+', diffColor: '#10b981' },
    { length: 5, label: 'Medium', diffColor: '#f59e0b' },
    { length: 6, label: 'Medium+', diffColor: '#f59e0b' },
    { length: 7, label: 'Hard', diffColor: '#ef4444' },
    { length: 8, label: 'Hard+', diffColor: '#ef4444' }
  ];

  let idx = 0;
  const metrics = { correct: 0, wrong: 0, score: 0, responseTimes: [], completed: false,
                    longestSequence: 0 };

  function buildGrid() {
    const grid = document.getElementById('memGrid');
    grid.innerHTML = '';
    for (let i = 0; i < TILES; i++) {
      const tile = document.createElement('div');
      tile.className = 'memory-tile';
      tile.style.background = COLORS[i % COLORS.length];
      tile.dataset.idx = i;
      grid.appendChild(tile);
    }
  }

  async function renderRound() {
    if (idx >= rounds.length) return finish();
    const r = rounds[idx];

    container.innerHTML = `
      <div class="flex justify-between mb-2">
        <span class="text-muted">Round ${idx+1} / ${rounds.length}</span>
        <span style="color:${r.diffColor};font-weight:600;font-size:.85rem">${r.label} — ${r.length} tiles</span>
      </div>
      <div class="progress-bar-wrap mb-3">
        <div class="progress-bar-fill" style="width:${(idx/rounds.length)*100}%"></div>
      </div>
      <div id="memStatus" style="text-align:center;font-weight:600;color:#4f46e5;margin-bottom:.8rem;font-size:1rem">
        👀 Watch the sequence...
      </div>
      <div class="memory-grid" id="memGrid" style="pointer-events:none"></div>
    `;
    buildGrid();

    /* Generate sequence */
    const seq = [];
    for (let i = 0; i < r.length; i++) seq.push(randInt(0, TILES - 1));

    /* Play sequence */
    await delay(600);
    for (const tileIdx of seq) {
      const tile = document.querySelector(`[data-idx="${tileIdx}"]`);
      tile.classList.add('active');
      await delay(550);
      tile.classList.remove('active');
      await delay(250);
    }

    /* Now user repeats */
    document.getElementById('memStatus').textContent = '🖱 Now repeat the sequence!';
    const grid = document.getElementById('memGrid');
    grid.style.pointerEvents = 'auto';

    let userSeq = [];
    const roundStart = Date.now();

    grid.querySelectorAll('.memory-tile').forEach(tile => {
      tile.addEventListener('click', function handler() {
        const ti = parseInt(this.dataset.idx);
        userSeq.push(ti);
        this.classList.add('active');
        setTimeout(() => this.classList.remove('active'), 250);

        const pos = userSeq.length - 1;
        if (userSeq[pos] !== seq[pos]) {
          /* Wrong */
          this.classList.add('wrong-click');
          setTimeout(() => this.classList.remove('wrong-click'), 400);
          grid.querySelectorAll('.memory-tile').forEach(t => t.removeEventListener('click', handler));
          const rt = Date.now() - roundStart;
          metrics.responseTimes.push(rt);
          metrics.wrong++;
          showFeedback('Wrong sequence!', 'wrong');
          idx++;
          setTimeout(renderRound, 1000);
          return;
        }

        if (userSeq.length === seq.length) {
          /* Correct! */
          grid.querySelectorAll('.memory-tile').forEach(t => t.removeEventListener('click', handler));
          const rt = Date.now() - roundStart;
          metrics.responseTimes.push(rt);
          metrics.correct++;
          if (r.length > metrics.longestSequence) metrics.longestSequence = r.length;
          const pts = r.length * 3;
          metrics.score += pts;
          showFeedback(`+${pts} pts — Perfect!`, 'correct');
          document.getElementById('memStatus').textContent = '✅ Correct!';
          idx++;
          setTimeout(renderRound, 900);
        }
      });
    });
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'memorySequence', ...metrics });
  }

  renderRound();
}

/* ============================================================
   GAME 4 — QUICK REACTION
   ============================================================ */
function renderQuickReaction(container, onComplete) {
  const TARGET_CONFIG = { shape: '●', color: '#10b981', label: 'GREEN CIRCLE', size: 52 };
  const DISTRACTORS = [
    { shape: '●', color: '#ef4444', label: 'red circle' },
    { shape: '■', color: '#10b981', label: 'green square' },
    { shape: '▲', color: '#3b82f6', label: 'blue triangle' },
    { shape: '◆', color: '#ef4444', label: 'red diamond' }
  ];
  const TOTAL_OBJECTS = 18;
  const GAME_SECS = 45;

  const metrics = { correct: 0, wrong: 0, missed: 0, score: 0, responseTimes: [], completed: false };
  let spawnedTargets = 0;
  let timerId;
  let remaining = GAME_SECS;
  let gameOver = false;

  container.innerHTML = `
    <div class="flex justify-between mb-2" id="reactionStats">
      <span class="stat-box stat-correct">✓ <span id="rcCorrect">0</span></span>
      <span style="font-weight:700;color:#4f46e5" id="rcTimer">${GAME_SECS}s</span>
      <span class="stat-box stat-wrong">✗ <span id="rcWrong">0</span></span>
    </div>
    <div class="game-instructions mb-2">
      🎯 Click only <strong style="color:${TARGET_CONFIG.color}">${TARGET_CONFIG.label}</strong>. Avoid all other shapes!
    </div>
    <div class="reaction-arena" id="arena"></div>
    <p class="text-muted text-center mt-1" style="font-size:.85rem">Objects disappear after 1.5 seconds — be quick!</p>
  `;

  const arena = document.getElementById('arena');

  /* Countdown timer */
  timerId = setInterval(() => {
    remaining--;
    const el = document.getElementById('rcTimer');
    if (el) el.textContent = remaining + 's';
    if (remaining <= 0) {
      clearInterval(timerId);
      endGame();
    }
  }, 1000);

  /* Spawn objects */
  let spawned = 0;
  const spawnInterval = setInterval(() => {
    if (gameOver || spawned >= TOTAL_OBJECTS) { clearInterval(spawnInterval); return; }
    spawnObject();
    spawned++;
  }, 1800);

  function spawnObject() {
    const isTarget = Math.random() < 0.45;
    const cfg = isTarget ? TARGET_CONFIG : DISTRACTORS[randInt(0, DISTRACTORS.length - 1)];
    if (isTarget) spawnedTargets++;

    const obj = document.createElement('div');
    obj.className = 'reaction-object';
    const sz = TARGET_CONFIG.size + randInt(-6, 6);
    obj.style.cssText = `
      width:${sz}px;height:${sz}px;
      background:${cfg.color};
      left:${randInt(5, 85)}%;top:${randInt(5, 75)}%;
      font-size:${sz * 0.45}px;
      transform:translate(-50%,-50%);
    `;
    obj.textContent = cfg.shape;
    obj.dataset.isTarget = isTarget ? '1' : '0';
    arena.appendChild(obj);

    const clickStart = Date.now();
    obj.addEventListener('click', () => {
      if (!obj.parentNode) return;
      const rt = Date.now() - clickStart;
      metrics.responseTimes.push(rt);
      if (isTarget) {
        metrics.correct++;
        const pts = rt < 600 ? 6 : rt < 1200 ? 5 : 4;
        metrics.score += pts;
        showFeedback(`+${pts}`, 'correct');
        updateStats();
      } else {
        metrics.wrong++;
        metrics.score = Math.max(0, metrics.score - 3);
        showFeedback('-3', 'wrong');
        updateStats();
      }
      obj.remove();
    });

    /* Auto-remove after 1.5s (missed) */
    setTimeout(() => {
      if (obj.parentNode) {
        if (isTarget) metrics.missed++;
        obj.remove();
      }
    }, 1500);
  }

  function updateStats() {
    const c = document.getElementById('rcCorrect');
    const w = document.getElementById('rcWrong');
    if (c) c.textContent = metrics.correct;
    if (w) w.textContent = metrics.wrong;
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    clearInterval(timerId);
    clearInterval(spawnInterval);
    /* Remove remaining objects */
    arena.querySelectorAll('.reaction-object').forEach(o => o.remove());
    finish();
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'quickReaction', ...metrics });
  }

  /* Expose cleanup for external timer */
  container._cleanup = () => { clearInterval(timerId); clearInterval(spawnInterval); gameOver = true; };
}

/* ============================================================
   GAME 5 — RULE SWITCHING
   ============================================================ */
function renderRuleSwitching(container, onComplete) {
  const RULES = [
    { text: 'Click the LARGEST number', fn: opts => Math.max(...opts.map(Number)).toString() },
    { text: 'Click the SMALLEST number', fn: opts => Math.min(...opts.map(Number)).toString() },
    { text: 'Click the ODD number', fn: opts => opts.find(o => parseInt(o) % 2 !== 0) },
    { text: 'Click the EVEN number', fn: opts => opts.find(o => parseInt(o) % 2 === 0) }
  ];

  const TOTAL_ROUNDS = 16;
  let round = 0;
  let ruleIdx = 0;
  let correctStreak = 0;
  const metrics = { correct: 0, wrong: 0, score: 0, responseTimes: [], completed: false };
  let answered = false;
  let roundStart;

  function nextRule() {
    /* Switch rule every 4 correct answers */
    const candidates = RULES.filter((_, i) => i !== ruleIdx);
    ruleIdx = RULES.indexOf(candidates[randInt(0, candidates.length - 1)]);
  }

  function renderRound() {
    if (round >= TOTAL_ROUNDS) return finish();
    answered = false;
    roundStart = Date.now();

    /* Switch rule at rounds 4, 8, 12 */
    if (round > 0 && round % 4 === 0) nextRule();

    const rule = RULES[ruleIdx];
    /* Generate options */
    const nums = [];
    while (nums.length < 4) {
      const n = randInt(1, 99).toString();
      if (!nums.includes(n)) nums.push(n);
    }
    const correct = rule.fn(nums);

    container.innerHTML = `
      <div class="flex justify-between mb-2">
        <span class="text-muted">Round ${round+1} / ${TOTAL_ROUNDS}</span>
        <span style="color:#059669;font-weight:700">Streak: ${correctStreak}</span>
      </div>
      <div class="progress-bar-wrap mb-3">
        <div class="progress-bar-fill" style="width:${(round/TOTAL_ROUNDS)*100}%"></div>
      </div>
      <div class="rule-display" id="ruleText">${rule.text}</div>
      <div class="rule-options" id="ruleOpts"></div>
    `;

    const optsEl = document.getElementById('ruleOpts');
    shuffle(nums).forEach(n => {
      const btn = document.createElement('div');
      btn.className = 'rule-option';
      btn.textContent = n;
      btn.addEventListener('click', () => choose(btn, n, correct, nums));
      optsEl.appendChild(btn);
    });
  }

  function choose(btn, chosen, correct, nums) {
    if (answered) return;
    answered = true;
    const rt = Date.now() - roundStart;
    metrics.responseTimes.push(rt);
    const isCorrect = chosen === correct;
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      document.querySelectorAll('.rule-option').forEach(b => {
        if (b.textContent === correct) b.classList.add('correct');
      });
      correctStreak = 0;
    }
    if (isCorrect) {
      metrics.correct++;
      correctStreak++;
      const pts = rt < 2000 ? 7 : rt < 4000 ? 6 : 5;
      metrics.score += pts + (correctStreak >= 3 ? 2 : 0);
      showFeedback(correctStreak >= 3 ? `+${pts+2} 🔥` : `+${pts}`, 'correct');
    } else {
      metrics.wrong++;
      showFeedback('Wrong rule!', 'wrong');
    }
    round++;
    setTimeout(renderRound, 800);
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'ruleSwitching', ...metrics });
  }

  renderRound();
}

/* ============================================================
   GAME 6 — PUZZLE GRID (3×3 Matrix Reasoning)
   ============================================================ */
function renderPuzzleGrid(container, onComplete) {
  const puzzles = [
    {
      label: 'Shape progression',
      grid: ['▲','▲▲','▲▲▲','●','●●','●●●','■','■■','?'],
      answer: '■■■',
      options: ['■■■','■■■■','▲▲▲','■'],
      difficulty: 'easy'
    },
    {
      label: 'Number grid',
      grid: ['1','2','3','2','4','6','3','6','?'],
      answer: '9',
      options: ['9','8','7','12'],
      difficulty: 'easy'
    },
    {
      label: 'Color sequence',
      grid: ['🔴','🔴','🔵','🔴','🔵','🟡','🔵','🟡','?'],
      answer: '🟢',
      options: ['🟢','🔴','🟡','🔵'],
      difficulty: 'medium'
    },
    {
      label: 'Rotation pattern',
      grid: ['→','↗','↑','↗','↑','↖','↑','↖','?'],
      answer: '←',
      options: ['←','↙','↓','↖'],
      difficulty: 'medium'
    },
    {
      label: 'Arithmetic grid',
      grid: ['2','4','8','3','9','27','4','16','?'],
      answer: '64',
      options: ['64','32','48','20'],
      difficulty: 'hard'
    },
    {
      label: 'Symbol rule',
      grid: ['◆','◆◆','◆◆◆','★','★★','★★★','♠','♠♠','?'],
      answer: '♠♠♠',
      options: ['♠♠♠','♠♠','★★★','♠'],
      difficulty: 'hard'
    }
  ];

  let idx = 0;
  const metrics = { correct: 0, wrong: 0, score: 0, responseTimes: [], completed: false };

  function renderPuzzle() {
    if (idx >= puzzles.length) return finish();
    const p = puzzles[idx];
    const answered = { val: false };
    const roundStart = Date.now();
    const diffColor = p.difficulty === 'easy' ? '#10b981' : p.difficulty === 'medium' ? '#f59e0b' : '#ef4444';

    container.innerHTML = `
      <div class="flex justify-between mb-2">
        <span class="text-muted">${p.label} — Puzzle ${idx+1}/${puzzles.length}</span>
        <span style="color:${diffColor};font-weight:600;font-size:.85rem">${p.difficulty}</span>
      </div>
      <div class="progress-bar-wrap mb-3">
        <div class="progress-bar-fill" style="width:${(idx/puzzles.length)*100}%"></div>
      </div>
      <p class="mb-2" style="font-weight:600">Which tile completes the pattern?</p>
      <div class="puzzle-matrix" id="puzGrid"></div>
      <div class="puzzle-options" id="puzOpts"></div>
    `;

    const grid = document.getElementById('puzGrid');
    p.grid.forEach(cell => {
      const div = document.createElement('div');
      div.className = cell === '?' ? 'puzzle-cell missing' : 'puzzle-cell';
      div.textContent = cell === '?' ? '?' : cell;
      grid.appendChild(div);
    });

    const optsEl = document.getElementById('puzOpts');
    shuffle(p.options).forEach(opt => {
      const btn = document.createElement('div');
      btn.className = 'puzzle-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (answered.val) return;
        answered.val = true;
        const rt = Date.now() - roundStart;
        metrics.responseTimes.push(rt);
        const isCorrect = opt === p.answer;
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
          optsEl.querySelectorAll('.puzzle-option').forEach(b => {
            if (b.textContent === p.answer) b.classList.add('correct');
          });
        }
        if (isCorrect) {
          metrics.correct++;
          const pts = rt < 5000 ? 17 : rt < 10000 ? 14 : 11;
          metrics.score += pts;
          showFeedback(`+${pts} pts`, 'correct');
        } else {
          metrics.wrong++;
          showFeedback('Incorrect', 'wrong');
        }
        idx++;
        setTimeout(renderPuzzle, 900);
      });
      optsEl.appendChild(btn);
    });
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'puzzleGrid', ...metrics });
  }

  renderPuzzle();
}

/* ============================================================
   GAME 7 — DIRECTION MOVEMENT
   ============================================================ */
function renderDirectionMovement(container, onComplete) {
  const GRID = 7; // 7×7 grid, center = [3,3]
  const puzzles = [
    { instructions: ['Start at center', '→ 2 right', '↑ 1 up'], start: [3,3], moves: [[0,2],[−1,0]], answer: [2,5] },
    { instructions: ['Start at center', '↓ 2 down', '← 1 left'], start: [3,3], moves: [[2,0],[0,−1]], answer: [5,2] },
    { instructions: ['Start at center', '→ 3 right', '↑ 2 up', '← 1 left'], start: [3,3], moves: [[0,3],[−2,0],[0,−1]], answer: [1,5] },
    { instructions: ['Start at center', '↑ 2 up', '→ 3 right', '↓ 1 down'], start: [3,3], moves: [[−2,0],[0,3],[1,0]], answer: [2,6] },
    { instructions: ['Start at center', '← 2 left', '↑ 3 up', '→ 1 right', '↓ 2 down'], start: [3,3], moves: [[0,−2],[−3,0],[0,1],[2,0]], answer: [2,2] },
    { instructions: ['Start at center', '↓ 3 down', '→ 2 right', '↑ 4 up', '← 3 left'], start: [3,3], moves: [[3,0],[0,2],[−4,0],[0,−3]], answer: [2,2] }
  ];

  /* Pre-compute final positions */
  puzzles.forEach(p => {
    let r = p.start[0], c = p.start[1];
    p.moves.forEach(([dr, dc]) => { r += dr; c += dc; });
    p.computed = [r, c];
  });

  let idx = 0;
  const metrics = { correct: 0, wrong: 0, score: 0, responseTimes: [], completed: false };

  function renderPuzzle() {
    if (idx >= puzzles.length) return finish();
    const p = puzzles[idx];
    const ans = p.computed;
    let selected = null;
    const roundStart = Date.now();

    container.innerHTML = `
      <div class="flex justify-between mb-2">
        <span class="text-muted">Puzzle ${idx+1} / ${puzzles.length}</span>
        <span style="color:#b45309;font-weight:600;font-size:.85rem">${idx < 2 ? 'easy' : idx < 4 ? 'medium' : 'hard'}</span>
      </div>
      <div class="progress-bar-wrap mb-3">
        <div class="progress-bar-fill" style="width:${(idx/puzzles.length)*100}%"></div>
      </div>
      <div class="direction-instructions">
        ${p.instructions.map((s,i) => `<div>${i===0?'📍':['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i-1]||'➡'} ${s}</div>`).join('')}
      </div>
      <p class="mb-2" style="font-weight:600">Click the cell where you will end up:</p>
      <div class="direction-grid" id="dirGrid" style="grid-template-columns:repeat(${GRID},1fr)"></div>
      <button id="dirCheck" class="btn btn-primary mt-2 w-full" disabled>Confirm Position</button>
    `;

    const grid = document.getElementById('dirGrid');
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cell = document.createElement('div');
        cell.className = 'dir-cell';
        cell.dataset.r = r; cell.dataset.c = c;
        if (r === p.start[0] && c === p.start[1]) {
          cell.classList.add('start');
          cell.textContent = '📍';
        }
        cell.addEventListener('click', () => {
          grid.querySelectorAll('.dir-cell').forEach(cl => {
            if (!cl.classList.contains('start')) cl.classList.remove('selected-answer');
          });
          if (!cell.classList.contains('start')) {
            cell.classList.add('selected-answer');
            selected = [r, c];
            document.getElementById('dirCheck').disabled = false;
          }
        });
        grid.appendChild(cell);
      }
    }

    document.getElementById('dirCheck').addEventListener('click', () => {
      if (!selected) return;
      const rt = Date.now() - roundStart;
      metrics.responseTimes.push(rt);
      const isCorrect = selected[0] === ans[0] && selected[1] === ans[1];
      /* Show answer */
      grid.querySelectorAll('.dir-cell').forEach(cl => {
        const r = parseInt(cl.dataset.r), c = parseInt(cl.dataset.c);
        if (r === ans[0] && c === ans[1]) cl.classList.add('target');
      });
      if (isCorrect) {
        metrics.correct++;
        const pts = rt < 10000 ? 17 : rt < 20000 ? 13 : 10;
        metrics.score += pts;
        showFeedback(`+${pts} pts`, 'correct');
      } else {
        metrics.wrong++;
        showFeedback('Wrong position!', 'wrong');
      }
      idx++;
      setTimeout(renderPuzzle, 1200);
    });
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'directionMovement', ...metrics });
  }

  renderPuzzle();
}

/* ============================================================
   GAME 8 — CALCULATION SPRINT
   ============================================================ */
function renderCalculationSprint(container, onComplete) {
  const problems = [
    { q:'12 + 15',   a:'27',  opts:['27','25','29','24'], diff:'easy'   },
    { q:'48 ÷ 6',    a:'8',   opts:['6','8','7','9'],     diff:'easy'   },
    { q:'9 × 7',     a:'63',  opts:['63','54','72','56'], diff:'easy'   },
    { q:'100 - 37',  a:'63',  opts:['63','67','73','57'], diff:'easy'   },
    { q:'15% of 80', a:'12',  opts:['12','15','10','8'],  diff:'medium' },
    { q:'3² + 4²',   a:'25',  opts:['25','14','49','7'],  diff:'medium' },
    { q:'144 ÷ 12',  a:'12',  opts:['12','11','13','14'], diff:'medium' },
    { q:'7 × 13',    a:'91',  opts:['91','81','97','84'], diff:'medium' },
    { q:'√144',      a:'12',  opts:['12','14','11','13'], diff:'medium' },
    { q:'25% of 240',a:'60',  opts:['60','55','65','50'], diff:'medium' },
    { q:'17 × 16',   a:'272', opts:['272','256','288','264'], diff:'hard' },
    { q:'3³ + 2⁴',   a:'43',  opts:['43','35','49','27'], diff:'hard'   },
    { q:'480 ÷ 15',  a:'32',  opts:['32','30','36','28'], diff:'hard'   },
    { q:'8% of 375', a:'30',  opts:['30','28','32','35'], diff:'hard'   },
    { q:'19² - 18²', a:'37',  opts:['37','19','361','1'], diff:'hard'   }
  ];

  let idx = 0;
  let streak = 0;
  const metrics = { correct: 0, wrong: 0, score: 0, responseTimes: [], completed: false };
  let answered = false;
  let roundStart;

  function renderProblem() {
    if (idx >= problems.length) return finish();
    answered = false;
    roundStart = Date.now();
    const p = problems[idx];
    const diffColor = p.diff === 'easy' ? '#10b981' : p.diff === 'medium' ? '#f59e0b' : '#ef4444';

    container.innerHTML = `
      <div class="flex justify-between mb-2">
        <span class="text-muted">Problem ${idx+1} / ${problems.length}</span>
        <span style="color:${diffColor};font-weight:600;font-size:.85rem">${p.diff}</span>
      </div>
      <div class="progress-bar-wrap mb-2">
        <div class="progress-bar-fill" style="width:${(idx/problems.length)*100}%"></div>
      </div>
      <div class="calc-card">
        <div class="calc-problem">${p.q} = ?</div>
        <div class="calc-streak">🔥 Streak: ${streak}</div>
      </div>
      <div class="calc-options" id="calcOpts"></div>
    `;

    const optsEl = document.getElementById('calcOpts');
    shuffle(p.opts).forEach(opt => {
      const btn = document.createElement('div');
      btn.className = 'calc-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => pick(btn, opt, p.a));
      optsEl.appendChild(btn);
    });
  }

  function pick(btn, chosen, correct) {
    if (answered) return;
    answered = true;
    const rt = Date.now() - roundStart;
    metrics.responseTimes.push(rt);
    const isCorrect = chosen === correct;
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      document.querySelectorAll('.calc-option').forEach(b => {
        if (b.textContent === correct) b.classList.add('correct');
      });
      streak = 0;
    }
    if (isCorrect) {
      metrics.correct++;
      streak++;
      const base = rt < 3000 ? 8 : rt < 6000 ? 6 : 4;
      const streakBonus = Math.min(streak - 1, 4);
      const pts = base + streakBonus;
      metrics.score += pts;
      showFeedback(streak > 1 ? `+${pts} 🔥 ×${streak}` : `+${pts}`, 'correct');
    } else {
      metrics.wrong++;
      showFeedback('Incorrect', 'wrong');
    }
    idx++;
    setTimeout(renderProblem, 800);
  }

  function finish() {
    metrics.completed = true;
    metrics.score = Math.min(100, metrics.score);
    onComplete({ gameId: 'calculationSprint', ...metrics });
  }

  renderProblem();
}

/* ============================================================
   GAME DISPATCHER
   ============================================================ */
function renderGame(gameId, container, onComplete) {
  container.innerHTML = '';
  switch (gameId) {
    case 'patternMatch':      renderPatternMatch(container, onComplete);      break;
    case 'blockArrangement':  renderBlockArrangement(container, onComplete);  break;
    case 'memorySequence':    renderMemorySequence(container, onComplete);    break;
    case 'quickReaction':     renderQuickReaction(container, onComplete);     break;
    case 'ruleSwitching':     renderRuleSwitching(container, onComplete);     break;
    case 'puzzleGrid':        renderPuzzleGrid(container, onComplete);        break;
    case 'directionMovement': renderDirectionMovement(container, onComplete); break;
    case 'calculationSprint': renderCalculationSprint(container, onComplete); break;
    default: onComplete({ gameId, score: 0, completed: false, error: 'Unknown game' });
  }
}
