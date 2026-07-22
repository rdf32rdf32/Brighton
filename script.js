const config = window.SITE_CONFIG;
const target = new Date(config.match.kickoff).getTime();

const els = {
  days: document.getElementById('days'),
  hours: document.getElementById('hours'),
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds'),
  meta: document.getElementById('matchMeta'),
  mode: document.getElementById('modeLabel'),
  lead: document.getElementById('heroLead')
};

els.meta.textContent = `${config.match.stage} · ${config.match.home} v ${config.match.away} · ${config.match.venue}, ${config.match.city}`;

startCountdown();
setInterval(startCountdown, 1000);
defineShareLinks();
loadFacts();
loadQuiz();
handleCookie();
initPredictor();
initBrightonXi();

function startCountdown() {
  const diff = target - Date.now();
  const day = 1000 * 60 * 60 * 24;

  if (diff <= 0) {
    document.getElementById('countdown').innerHTML = '<div class="live-now">Matchday is here</div>';
    els.mode.textContent = 'It is matchday';
    els.lead.textContent = 'Come on Brighton. Follow the match and the road to the trophy.';
    return;
  }

  if (diff < day) {
    els.mode.textContent = 'Matchday countdown';
    els.lead.textContent = 'Less than 24 hours to go. The lights are on, the road continues.';
  } else if (diff < day * 2) {
    els.mode.textContent = 'Matchday tomorrow';
  }

  const days = Math.floor(diff / day);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  els.days.textContent = String(days).padStart(2, '0');
  els.hours.textContent = String(hours).padStart(2, '0');
  els.minutes.textContent = String(minutes).padStart(2, '0');
  els.seconds.textContent = String(seconds).padStart(2, '0');
}

function loadFacts() {
  const facts = config.facts || [];
  const didYouKnow = config.didYouKnow || [];
  const randomFact = document.getElementById('randomFact');
  const ticker = document.getElementById('didYouKnow');
  randomFact.textContent = facts[Math.floor(Math.random() * facts.length)] || 'Brighton fact loading soon.';
  let index = didYouKnow.length ? new Date().getDate() % didYouKnow.length : 0;
  const setTicker = () => {
    ticker.style.opacity = 0;
    setTimeout(() => {
      ticker.textContent = didYouKnow[index] || 'More Brighton facts coming soon.';
      ticker.style.opacity = 1;
      index = didYouKnow.length ? (index + 1) % didYouKnow.length : 0;
    }, 250);
  };
  ticker.style.transition = 'opacity .25s ease';
  setTicker();
  setInterval(setTicker, 18000);
}

function loadQuiz() {
  const quizzes = shuffle([...(config.quizzes || [])]);
  const questions = quizzes.slice(0, 3);
  const container = document.getElementById('quizQuestions');
  const result = document.getElementById('quizResult');
  const refresh = document.getElementById('newQuizSet');
  if (!container || !questions.length) return;

  const answersState = new Array(questions.length).fill(null);

  const renderScore = () => {
    const answered = answersState.filter(item => item !== null).length;
    const score = answersState.filter(Boolean).length;
    if (answered < questions.length) {
      result.textContent = `${answered}/3 answered. Current score: ${score}/3.`;
      return;
    }
    const messages = {
      3: 'Perfect. 3/3. You are an Brighton expert.',
      2: 'Great effort. 2/3.',
      1: 'Not bad. 1/3.',
      0: '0/5. Time to brush up on your Brighton knowledge.'
    };
    result.textContent = messages[score];
  };

  container.innerHTML = '';
  questions.forEach((quiz, questionIndex) => {
    const card = document.createElement('article');
    card.className = 'quiz-mini-card';
    const title = document.createElement('h3');
    title.textContent = `${questionIndex + 1}. ${quiz.question}`;
    const answers = document.createElement('div');
    answers.className = 'quiz-answers';

    quiz.answers.forEach((answer, answerIndex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = answer;
      btn.addEventListener('click', () => {
        if (answersState[questionIndex] !== null) return;
        const correct = answerIndex === quiz.correct;
        answersState[questionIndex] = correct;
        [...answers.children].forEach((child, idx) => {
          child.disabled = true;
          if (idx === quiz.correct) child.classList.add('correct');
          if (idx === answerIndex && !correct) child.classList.add('wrong');
        });
        renderScore();
      });
      answers.appendChild(btn);
    });

    card.appendChild(title);
    card.appendChild(answers);
    container.appendChild(card);
  });

  result.textContent = 'Answer all three to see your score.';
  refresh?.addEventListener('click', () => loadQuiz(), { once: true });
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function defineShareLinks() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(config.shareText);
  document.getElementById('whatsappShare').href = `https://wa.me/?text=${text}%20${url}`;
  document.getElementById('facebookShare').href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  document.getElementById('emailShare').href = `mailto:?subject=${encodeURIComponent('Albion Fan Hub')}&body=${text}%0A%0A${url}`;
  document.getElementById('copyLink').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      document.getElementById('copyLink').textContent = 'Copied';
    } catch {
      document.getElementById('copyLink').textContent = 'Copy failed';
    }
  });
}

function handleCookie() {
  const cookieNotice = document.getElementById('cookieNotice');
  if (localStorage.getItem('tlcCookieOK') === 'yes') cookieNotice?.remove();
  document.getElementById('acceptCookies')?.addEventListener('click', () => {
    localStorage.setItem('tlcCookieOK', 'yes');
    cookieNotice?.remove();
  });
}

function initPredictor() {
  const scorer = document.getElementById('firstScorer');
  if (!scorer) return;
  (config.firstScorers || []).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    scorer.appendChild(option);
  });
  const saved = JSON.parse(localStorage.getItem('tlcPrediction') || 'null');
  if (saved) {
    document.getElementById('homeScore').value = saved.home;
    document.getElementById('awayScore').value = saved.away;
    scorer.value = saved.scorer;
    document.getElementById('predictionMessage').value = saved.message || '';
    renderPrediction(saved);
  } else {
    updatePredictionShare('My prediction: Palace 1–2 Brighton. First Brighton scorer: Harry Kane. Come on Brighton!');
  }
  document.getElementById('savePrediction')?.addEventListener('click', () => {
    const prediction = {
      home: clampScore(document.getElementById('homeScore').value),
      away: clampScore(document.getElementById('awayScore').value),
      scorer: scorer.value || 'Harry Kane',
      message: (document.getElementById('predictionMessage').value || 'Come on Brighton!').trim().slice(0, 90)
    };
    localStorage.setItem('tlcPrediction', JSON.stringify(prediction));
    renderPrediction(prediction);
  });
  document.getElementById('copyPrediction')?.addEventListener('click', async () => {
    const text = document.getElementById('predictionResult').textContent || document.getElementById('predictionPreview').textContent || 'My Brighton prediction is ready.';
    try {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      document.getElementById('copyPrediction').textContent = 'Copied';
    } catch {
      document.getElementById('copyPrediction').textContent = 'Copy failed';
    }
  });
}

function clampScore(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return 0;
  return Math.max(0, Math.min(15, number));
}

function renderPrediction(prediction) {
  const message = prediction.message ? ` ${prediction.message}` : '';
  const text = `My prediction: Palace ${prediction.home}–${prediction.away} Brighton. First Brighton scorer: ${prediction.scorer}.${message}`;
  document.getElementById('predictionResult').textContent = text;
  const preview = document.getElementById('predictionPreview');
  if (preview) preview.textContent = text.replace('My prediction: ', '');
  updatePredictionShare(text);
}

function updatePredictionShare(text) {
  const url = encodeURIComponent(window.location.href);
  const encoded = encodeURIComponent(text);
  const fb = document.getElementById('predictionFacebook');
  const wa = document.getElementById('predictionWhatsapp');
  if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encoded}`;
  if (wa) wa.href = `https://wa.me/?text=${encoded}%20${url}`;
}

function playerName(player) {
  return typeof player === 'string' ? player : player.name;
}

function playerLabel(player) {
  return typeof player === 'string' ? player : `${player.no ? player.no + '. ' : ''}${player.name} · ${player.position}`;
}

const FORMATIONS = {
  '433': {
    label: '4-3-3',
    rows: [['lw', 'st', 'rw'], ['cm1', 'am', 'cm2'], ['lb', 'cb1', 'cb2', 'rb'], ['gk']],
    slots: {
      gk: ['GK', 'Goalkeeper only'], lb: ['LB', 'Left-back'], cb1: ['CB', 'Centre-back'], cb2: ['CB', 'Centre-back'], rb: ['RB', 'Right-back'],
      cm1: ['CM', 'Midfield'], am: ['AM', 'Attacking midfield'], cm2: ['CM', 'Midfield'], lw: ['LW', 'Left wing'], st: ['ST', 'Striker'], rw: ['RW', 'Right wing']
    }
  },
  '4231': {
    label: '4-2-3-1',
    rows: [['st'], ['lw', 'am', 'rw'], ['dm1', 'dm2'], ['lb', 'cb1', 'cb2', 'rb'], ['gk']],
    slots: {
      gk: ['GK', 'Goalkeeper only'], lb: ['LB', 'Left-back'], cb1: ['CB', 'Centre-back'], cb2: ['CB', 'Centre-back'], rb: ['RB', 'Right-back'],
      dm1: ['DM', 'Holding midfield'], dm2: ['DM', 'Holding midfield'], lw: ['LW', 'Left wing'], am: ['AM', 'No 10'], rw: ['RW', 'Right wing'], st: ['ST', 'Striker']
    }
  },
  '352': {
    label: '3-5-2',
    rows: [['st1', 'st2'], ['lwb', 'cm1', 'am', 'cm2', 'rwb'], ['cb1', 'cb2', 'cb3'], ['gk']],
    slots: {
      gk: ['GK', 'Goalkeeper only'], cb1: ['CB', 'Centre-back'], cb2: ['CB', 'Centre-back'], cb3: ['CB', 'Centre-back'], lwb: ['LWB', 'Left wing-back'], rwb: ['RWB', 'Right wing-back'],
      cm1: ['CM', 'Midfield'], am: ['AM', 'Attacking midfield'], cm2: ['CM', 'Midfield'], st1: ['ST', 'Striker'], st2: ['ST', 'Striker']
    }
  },
  '442': {
    label: '4-4-2',
    rows: [['st1', 'st2'], ['lm', 'cm1', 'cm2', 'rm'], ['lb', 'cb1', 'cb2', 'rb'], ['gk']],
    slots: {
      gk: ['GK', 'Goalkeeper only'], lb: ['LB', 'Left-back'], cb1: ['CB', 'Centre-back'], cb2: ['CB', 'Centre-back'], rb: ['RB', 'Right-back'],
      lm: ['LM', 'Left midfield'], cm1: ['CM', 'Midfield'], cm2: ['CM', 'Midfield'], rm: ['RM', 'Right midfield'], st1: ['ST', 'Striker'], st2: ['ST', 'Striker']
    }
  }
};

function getFormationKey() {
  return localStorage.getItem('tlcFormation') || '433';
}

function activeFormation() {
  return FORMATIONS[getFormationKey()] || FORMATIONS['433'];
}

function activeSlotIds() {
  return activeFormation().rows.flat();
}

function initBrightonXi() {
  const squadList = document.getElementById('squadList');
  const pitch = document.getElementById('xiPitch');
  if (!squadList || !pitch) return;

  const formationSelect = document.getElementById('formationSelect');
  if (formationSelect) formationSelect.value = getFormationKey();

  let assignments = loadXiAssignments();
  let activePlayerName = '';
  const players = config.players || [];
  const groups = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'];

  const selectedNames = () => Object.values(assignments).filter(Boolean);
  const playerByName = name => players.find(player => player.name === name) || { name, position: '', group: '' };

  const save = () => {
    const valid = activeSlotIds();
    const clean = {};
    valid.forEach(slotId => clean[slotId] = assignments[slotId] || '');
    assignments = clean;
    localStorage.setItem('tlcBrightonXiSlots', JSON.stringify(assignments));
    localStorage.setItem('tlcBrightonXi', JSON.stringify(selectedNames()));
  };

  const findPlayerSlot = name => Object.keys(assignments).find(slotId => assignments[slotId] === name);

  const assignPlayerToSlot = (name, slotId) => {
    if (!name || !slotId || !activeSlotIds().includes(slotId)) return;
    const player = playerByName(name);
    if (!canUseSlot(player, slotId)) {
      const result = document.getElementById('xiResult');
      if (result) result.textContent = slotId === 'gk' ? 'Only a goalkeeper can go in goal.' : 'Goalkeepers can only be placed in goal.';
      return;
    }

    const currentName = assignments[slotId];
    const previousSlot = findPlayerSlot(name);
    if (previousSlot) assignments[previousSlot] = '';
    if (currentName && currentName !== name) {
      const swapSlot = previousSlot || firstFreeSlotFor(playerByName(currentName));
      if (swapSlot && swapSlot !== slotId && canUseSlot(playerByName(currentName), swapSlot)) assignments[swapSlot] = currentName;
    }
    assignments[slotId] = name;
    activePlayerName = '';
    save();
    render();
  };

  const firstFreeSlotFor = player => {
    const preferred = preferredSlotsFor(player).filter(id => activeSlotIds().includes(id));
    return preferred.find(slotId => !assignments[slotId]) || activeSlotIds().find(slotId => !assignments[slotId]);
  };

  const removeFromSlot = slotId => {
    assignments[slotId] = '';
    save();
    render();
  };

  const selectPlayer = player => {
    activePlayerName = activePlayerName === player.name ? '' : player.name;
    render();
  };

  const handleSlotTap = slotId => {
    const currentName = assignments[slotId];
    if (activePlayerName) {
      if (currentName === activePlayerName) removeFromSlot(slotId);
      else assignPlayerToSlot(activePlayerName, slotId);
    } else if (currentName) {
      activePlayerName = currentName;
      render();
    }
  };

  const quickPick = () => {
    const pick = {
      gk: 'Jordan Pickford', lb: "Nico O'Reilly", lwb: "Nico O'Reilly", cb1: 'Marc Guéhi', cb2: 'John Stones', cb3: 'Ezri Konsa', rb: 'Reece James', rwb: 'Reece James',
      dm1: 'Declan Rice', dm2: 'Kobbie Mainoo', cm1: 'Declan Rice', cm2: 'Elliot Anderson', am: 'Jude Bellingham', lm: 'Anthony Gordon', rm: 'Bukayo Saka',
      lw: 'Marcus Rashford', rw: 'Bukayo Saka', st: 'Harry Kane', st1: 'Harry Kane', st2: 'Ollie Watkins'
    };
    assignments = emptyAssignments();
    activeSlotIds().forEach(slotId => { assignments[slotId] = pick[slotId] || ''; });
    activePlayerName = '';
    save();
    render();
  };

  const render = () => {
    ensureValidAssignments(assignments);
    renderPitchSlots(pitch, assignments, assignPlayerToSlot, handleSlotTap, playerByName, activePlayerName);
    renderSquadList(squadList, groups, players, selectedNames(), selectPlayer, assignPlayerToSlot, activePlayerName);
    document.getElementById('xiCounter').textContent = `${selectedNames().length}/11 selected`;
    const result = document.getElementById('xiResult');
    if (result) {
      if (selectedNames().length === 11) result.textContent = `Your ${activeFormation().label} Brighton XI is ready to share.`;
      else if (activePlayerName) result.textContent = `${activePlayerName} selected. Tap a position on the pitch.`;
      else result.textContent = 'Tap a player, then tap a shirt position. Desktop users can also drag and drop.';
    }
    updateXiShare(selectedNames(), assignments, playerByName);
  };

  formationSelect?.addEventListener('change', () => {
    localStorage.setItem('tlcFormation', formationSelect.value);
    assignments = migrateAssignments(assignments);
    activePlayerName = '';
    save();
    render();
  });

  document.getElementById('quickPickXi')?.addEventListener('click', quickPick);

  document.getElementById('clearXi')?.addEventListener('click', () => {
    assignments = emptyAssignments();
    activePlayerName = '';
    localStorage.removeItem('tlcBrightonXiSlots');
    localStorage.removeItem('tlcBrightonXi');
    render();
  });

  document.getElementById('copyXi')?.addEventListener('click', async () => {
    const text = selectedNames().length ? `My Brighton XI (${activeFormation().label}): ${formatXiByLine(assignments, playerByName)}.` : 'I am choosing my Brighton XI.';
    try {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      document.getElementById('copyXi').textContent = 'Copied';
    } catch {
      document.getElementById('copyXi').textContent = 'Copy failed';
    }
  });

  render();
}

function emptyAssignments() {
  const assignments = {};
  activeSlotIds().forEach(slotId => assignments[slotId] = '');
  return assignments;
}

function ensureValidAssignments(assignments) {
  const validSlots = activeSlotIds();
  Object.keys(assignments).forEach(slotId => { if (!validSlots.includes(slotId)) delete assignments[slotId]; });
  validSlots.forEach(slotId => { if (!(slotId in assignments)) assignments[slotId] = ''; });
  const seen = new Set();
  validSlots.forEach(slotId => {
    const name = assignments[slotId];
    if (!name) return;
    if (seen.has(name)) assignments[slotId] = '';
    else seen.add(name);
  });
}

function loadXiAssignments() {
  const empty = emptyAssignments();
  try {
    const savedSlots = JSON.parse(localStorage.getItem('tlcBrightonXiSlots') || 'null');
    if (savedSlots && typeof savedSlots === 'object') return migrateAssignments({ ...savedSlots });
  } catch {}
  try {
    const oldSaved = JSON.parse(localStorage.getItem('tlcBrightonXi') || '[]');
    const names = Array.isArray(oldSaved) ? oldSaved.map(item => typeof item === 'string' ? item : item.name).filter(Boolean).slice(0, 11) : [];
    const assignments = { ...empty };
    names.forEach(name => {
      const player = (config.players || []).find(p => p.name === name) || { name, position: '', group: '' };
      const slotId = preferredSlotsFor(player).find(id => activeSlotIds().includes(id) && !assignments[id]) || activeSlotIds().find(id => !assignments[id]);
      if (slotId) assignments[slotId] = name;
    });
    return assignments;
  } catch {
    return empty;
  }
}

function migrateAssignments(oldAssignments) {
  const newAssignments = emptyAssignments();
  const names = Object.values(oldAssignments || {}).filter(Boolean);
  names.forEach(name => {
    const player = (config.players || []).find(p => p.name === name) || { name, position: '', group: '' };
    const slotId = preferredSlotsFor(player).find(id => activeSlotIds().includes(id) && !newAssignments[id]) || activeSlotIds().find(id => !newAssignments[id]);
    if (slotId && canUseSlot(player, slotId)) newAssignments[slotId] = name;
  });
  return newAssignments;
}

function preferredSlotsFor(player) {
  const position = `${player.position || ''} ${player.group || ''}`.toLowerCase();
  if (position.includes('goalkeeper')) return ['gk'];
  if (position.includes('right winger')) return ['rw', 'rm', 'rwb', 'st2'];
  if (position.includes('left winger')) return ['lw', 'lm', 'lwb', 'st2'];
  if (position.includes('centre-forward') || position.includes('striker') || position.includes('forward')) return ['st', 'st1', 'st2', 'lw', 'rw'];
  if (position.includes('attacking midfielder')) return ['am', 'cm2', 'cm1', 'lw', 'rw'];
  if (position.includes('defensive midfielder')) return ['dm1', 'dm2', 'cm1', 'cm2'];
  if (position.includes('central midfielder') || position.includes('midfielder')) return ['cm1', 'cm2', 'dm1', 'dm2', 'am', 'lm', 'rm'];
  if (position.includes('right-back')) return ['rb', 'rwb', 'cb3', 'cb2'];
  if (position.includes('left-back')) return ['lb', 'lwb', 'cb1', 'cm1'];
  if (position.includes('centre-back')) return ['cb1', 'cb2', 'cb3', 'rb', 'lb'];
  if (position.includes('full-back')) return ['rb', 'lb', 'rwb', 'lwb', 'cb1', 'cb2'];
  if (position.includes('defender')) return ['cb1', 'cb2', 'cb3', 'rb', 'lb'];
  return ['cm1', 'cm2', 'am'];
}

function canUseSlot(player, slotId) {
  const position = (player.position || '').toLowerCase();
  if (slotId === 'gk') return position.includes('goalkeeper');
  if (position.includes('goalkeeper')) return false;
  return true;
}

function renderPitchSlots(pitch, assignments, assignPlayerToSlot, handleSlotTap, playerByName, activePlayerName) {
  pitch.innerHTML = '';
  pitch.dataset.formation = getFormationKey();
  activeFormation().rows.forEach(lineSlots => {
    const row = document.createElement('div');
    row.className = `xi-line xi-slot-line slots-${lineSlots.length}`;
    lineSlots.forEach(slotId => {
      const slot = activeFormation().slots[slotId];
      const name = assignments[slotId];
      const player = name ? playerByName(name) : null;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `xi-slot ${name ? 'filled' : 'empty'} ${activePlayerName && (!name || name === activePlayerName) ? 'targetable' : ''} ${name === activePlayerName ? 'active-player' : ''}`;
      el.dataset.slot = slotId;
      el.innerHTML = name
        ? `<span class="slot-pos">${slot[0]}</span><span class="shirt-icon">${player.no || ''}</span><strong>${safeName(player.name)}</strong><small>${player.position || ''}</small>`
        : `<span class="slot-pos">${slot[0]}</span><span class="empty-shirt">+</span><strong>${activePlayerName ? 'Place here' : 'Tap position'}</strong><small>${slot[1]}</small>`;
      el.addEventListener('click', () => handleSlotTap(slotId));
      el.addEventListener('dragover', event => event.preventDefault());
      el.addEventListener('drop', event => {
        event.preventDefault();
        assignPlayerToSlot(event.dataTransfer.getData('text/plain'), slotId);
      });
      if (name) {
        el.draggable = true;
        el.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', name));
      }
      row.appendChild(el);
    });
    pitch.appendChild(row);
  });
}

function renderSquadList(squadList, groups, players, selected, selectPlayer, assignPlayerToSlot, activePlayerName) {
  squadList.innerHTML = '';
  groups.forEach(group => {
    const groupPlayers = players.filter(player => (player.group || groupFromPosition(player.position)) === group);
    if (!groupPlayers.length) return;
    const heading = document.createElement('div');
    heading.className = 'squad-group-heading';
    heading.textContent = group;
    squadList.appendChild(heading);
    groupPlayers.forEach(player => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'player-button draggable-player';
      btn.draggable = true;
      btn.dataset.player = player.name;
      btn.innerHTML = `<span class="player-no">${player.no || ''}</span><span><strong>${safeName(player.name)}</strong><small>${player.position || ''}</small></span>`;
      const isSelected = selected.includes(player.name);
      btn.classList.toggle('selected', isSelected);
      btn.classList.toggle('active-player', activePlayerName === player.name);
      btn.addEventListener('click', () => selectPlayer(player));
      btn.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', player.name));
      enableTouchSlide(btn, player.name, assignPlayerToSlot);
      squadList.appendChild(btn);
    });
  });
}

function enableTouchSlide(button, playerName, assignPlayerToSlot) {
  let ghost = null;
  let startX = 0;
  let startY = 0;

  button.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    startX = event.clientX;
    startY = event.clientY;
    button.setPointerCapture?.(event.pointerId);
  });

  button.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') return;
    const dx = Math.abs(event.clientX - startX);
    const dy = Math.abs(event.clientY - startY);
    if (!ghost && (dx > 16 || dy > 16)) {
      ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.textContent = button.querySelector('strong')?.textContent || playerName;
      document.body.appendChild(ghost);
    }
    if (ghost) {
      ghost.style.left = `${event.clientX}px`;
      ghost.style.top = `${event.clientY}px`;
      document.querySelectorAll('.xi-slot').forEach(slot => slot.classList.remove('hover-target'));
      document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.xi-slot')?.classList.add('hover-target');
    }
  });

  button.addEventListener('pointerup', event => {
    if (event.pointerType === 'mouse') return;
    document.querySelectorAll('.xi-slot').forEach(slot => slot.classList.remove('hover-target'));
    if (ghost) {
      ghost.remove();
      ghost = null;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.xi-slot');
      if (target?.dataset?.slot) {
        event.preventDefault();
        event.stopPropagation();
        assignPlayerToSlot(playerName, target.dataset.slot);
      }
    }
  });
}

function safeName(name = '') {
  return String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function groupFromPosition(position = '') {
  if (position.includes('Goalkeeper')) return 'Goalkeepers';
  if (position.includes('Defender') || position.includes('back') || position.includes('Back')) return 'Defenders';
  if (position.includes('Centre-forward') || position.includes('Forward') || position.includes('winger') || position.includes('Winger')) return 'Forwards';
  return 'Midfielders';
}

function shirtName(player) {
  return `${player.no ? player.no + '. ' : ''}${player.name}`;
}

function playerLine(player = {}) {
  const position = (player.position || '').toLowerCase();
  if (position.includes('goalkeeper')) return 'GK';
  if (position.includes('back') || position.includes('defender')) return 'DEF';
  if (position.includes('midfielder')) return 'MID';
  return 'FWD';
}

function formatXiByLine(assignments, playerByName) {
  const line = (label, ids) => {
    const players = ids.map(id => assignments[id]).filter(Boolean).map(name => shirtName(playerByName(name))).join(', ');
    return players ? `${label}: ${players}` : '';
  };
  return [
    line('GK', ['gk']),
    line('Defence', ['lb', 'lwb', 'cb1', 'cb2', 'cb3', 'rb', 'rwb']),
    line('Midfield', ['lm', 'dm1', 'cm1', 'am', 'cm2', 'dm2', 'rm']),
    line('Attack', ['lw', 'st', 'st1', 'st2', 'rw'])
  ].filter(Boolean).join('; ');
}

function updateXiShare(selected, assignments = null, playerByName = null) {
  const url = encodeURIComponent(window.location.href);
  let text = 'Choose your Brighton XI on Albion Fan Hub.';
  if (selected.length) {
    text = assignments && playerByName
      ? `My Brighton XI (${activeFormation().label}): ${formatXiByLine(assignments, playerByName)}.`
      : `My Brighton XI: ${selected.join(', ')}.`;
  }
  const encoded = encodeURIComponent(text);
  const fb = document.getElementById('xiFacebook');
  const wa = document.getElementById('xiWhatsapp');
  if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encoded}`;
  if (wa) wa.href = `https://wa.me/?text=${encoded}%20${url}`;
}
