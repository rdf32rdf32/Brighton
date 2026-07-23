(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.ALBION_CONTENT || {};
  const Q = window.ALBION_QUIZ || [];
  const squad = C.squad || [];
  const MATCH = C.nextMatch || {opponent:'Aston Villa',dateLong:'Sunday 23 August 2026',dateShort:'23 Aug',time:'14:00',venue:'Amex Stadium',dateISO:'2026-08-23T14:00:00+01:00'};
  let playSfx = () => {};
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const shuffle = array => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function countdown() {
    const el = $('countdown');
    if (!el) return;
    const remaining = new Date(MATCH.dateISO) - new Date();
    if (remaining <= 0) { el.textContent = 'Matchday'; return; }
    const days = Math.floor(remaining / 864e5);
    const hours = Math.floor((remaining % 864e5) / 36e5);
    const minutes = Math.floor((remaining % 36e5) / 6e4);
    el.innerHTML = `<b>${days}</b> days <b>${hours}</b> hrs <b>${minutes}</b> mins`;
  }

  function matchConfiguration() {
    const title = `Albion v ${MATCH.opponent}`;
    const shortOpponent = MATCH.opponent.replace(/^Aston /, '');
    $('heroMatchTitle').textContent = title;
    $('heroMatchDetail').textContent = `${MATCH.dateLong} · ${MATCH.time} · ${MATCH.venue}`;
    $('stickyMatchTitle').textContent = `Next: ${title}`;
    $('stickyMatchDetail').textContent = `${MATCH.dateShort} · ${MATCH.time} · ${MATCH.venue.replace(' Stadium','')}`;
    $('dashboardOpponent').textContent = MATCH.opponent;
    $('centreMatchTitle').textContent = title;
    $('centreMatchDate').textContent = MATCH.dateLong.replace(/^[A-Za-z]+ /, '');
    $('centreMatchTime').textContent = MATCH.time;
    $('centreMatchVenue').textContent = MATCH.venue;
    $('predictorMatchTitle').textContent = title;
    $('awayScoreLabel').textContent = `${shortOpponent} goals`;
    $('fixtureCheckedDate').textContent = `Fixture list checked: ${C.lastUpdated}. Dates and kick-off times may change.`;
    $('globalUpdated').textContent = `Information checked ${C.lastUpdated}.`;
    const matchGap = new Date(MATCH.dateISO) - new Date();
    document.body.classList.toggle('matchday-mode', matchGap <= 864e5 && matchGap >= -216e5);
  }

  const groupOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  function renderSquad() {
    const labels = {Goalkeeper:'Goalkeepers', Defender:'Defenders', Midfielder:'Midfielders', Forward:'Forwards'};
    $('squadBrowser').innerHTML = groupOrder.map(group => `
      <section class="position-group">
        <h3>${labels[group]}</h3>
        <ul>${squad.filter(player => player.position === group).map(player => `<li>${esc(player.name)}</li>`).join('')}</ul>
      </section>`).join('');
  }

  const formations = {
    '4-2-3-1':['GK','RB','CB','CB','LB','DM','DM','RW','AM','LW','ST'],
    '4-3-3':['GK','RB','CB','CB','LB','CM','CM','CM','RW','ST','LW'],
    '4-4-2':['GK','RB','CB','CB','LB','RW','CM','CM','LW','ST','ST'],
    '3-4-2-1':['GK','CB','CB','CB','RWB','CM','CM','LWB','AM','AM','ST']
  };
  const preferred = {GK:'Bart Verbruggen', RB:'Jack Hinshelwood', CB:'Lewis Dunk', LB:'Maxim De Cuyper', DM:'Carlos Baleba', CM:'Mats Wieffer', RWB:'Ferdi Kadioglu', LWB:'Kaoru Mitoma', RW:'Yankuba Minteh', AM:'Georginio Rutter', LW:'Kaoru Mitoma', ST:'Danny Welbeck'};
  function optionsForRole(role) {
    const eligible = {
      GK:['Goalkeeper'], RB:['Defender','Midfielder'], LB:['Defender','Midfielder'], CB:['Defender'],
      DM:['Midfielder'], CM:['Midfielder'], RWB:['Defender','Midfielder'], LWB:['Defender','Midfielder'],
      RW:['Midfielder','Forward'], LW:['Midfielder','Forward'], AM:['Midfielder','Forward'], ST:['Forward']
    };
    return squad.filter(player => eligible[role].includes(player.position));
  }
  function renderPitch(values = []) {
    const pitch = $('pitch');
    pitch.innerHTML = '';
    formations[$('formation').value].forEach((role, index) => {
      const cell = document.createElement('label');
      cell.className = 'player-slot';
      cell.innerHTML = `<span>${role}</span><select aria-label="${role} position"><option value="">Select player</option>${optionsForRole(role).map(player => `<option>${esc(player.name)}</option>`).join('')}</select>`;
      pitch.appendChild(cell);
      cell.querySelector('select').value = values[index] || '';
    });
    pitch.querySelectorAll('select').forEach(select => select.addEventListener('change', saveXI));
  }
  function renderBench(values = []) {
    const bench = $('bench');
    bench.innerHTML = Array.from({length:7}, (_, index) => `<label><span>Sub ${index + 1}</span><select aria-label="Substitute ${index + 1}"><option value="">Select player</option>${squad.map(player => `<option>${esc(player.name)}</option>`).join('')}</select></label>`).join('');
    bench.querySelectorAll('select').forEach((select, index) => { select.value = values[index] || ''; select.addEventListener('change', saveXI); });
  }
  function saveXI() {
    const values = [...document.querySelectorAll('#pitch select')].map(select => select.value);
    const bench = [...document.querySelectorAll('#bench select')].map(select => select.value);
    const chosen = [...values, ...bench].filter(Boolean); const unique = new Set(chosen);
    localStorage.setItem('albionXI', JSON.stringify({formation:$('formation').value, values, bench}));
    const startingComplete = values.filter(Boolean).length === 11; const benchComplete = bench.filter(Boolean).length === 7;
    $('xiMessage').textContent = unique.size !== chosen.length ? 'Choose a different player for every starting and substitute place.'
      : startingComplete && benchComplete ? 'Your complete matchday squad is saved on this device.'
      : `${values.filter(Boolean).length}/11 starters · ${bench.filter(Boolean).length}/7 substitutes selected.`;
  }
  function loadPredictedXI() {
    const used = new Set();
    const values = formations[$('formation').value].map(role => {
      let name = preferred[role];
      if (used.has(name) || !optionsForRole(role).some(player => player.name === name)) {
        name = optionsForRole(role).find(player => !used.has(player.name))?.name || '';
      }
      if (name) used.add(name);
      return name;
    });
    renderPitch(values);
    renderBench(squad.map(player => player.name).filter(name => !used.has(name)).slice(0, 7));
    saveXI();
  }
  function initXI() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('albionXI')) || {}; } catch {}
    if (saved.formation) $('formation').value = saved.formation;
    renderPitch(saved.values); renderBench(saved.bench);
    $('formation').addEventListener('change', () => { const bench = [...document.querySelectorAll('#bench select')].map(select => select.value); renderPitch(); renderBench(bench); saveXI(); });
    $('loadPredicted').addEventListener('click', loadPredictedXI);
    $('clearXI').addEventListener('click', () => {
      localStorage.removeItem('albionXI');
      renderPitch(); renderBench();
      $('xiMessage').textContent = 'Line-up cleared.';
    });
  }

  function renderFixtures() {
    const query = $('fixtureSearch').value.toLowerCase().trim();
    const venue = $('venueFilter').value;
    const month = $('monthFilter').value;
    const fixtures = (C.fixtures || []).filter(fixture => (venue === 'all' || fixture.venue === venue) && (month === 'all' || fixture.date.slice(fixture.date.indexOf(' ') + 1) === month) && fixture.opponent.toLowerCase().includes(query));
    $('fixtureList').innerHTML = fixtures.length ? fixtures.map(fixture => `
      <article class="fixture-item ${fixture.venue === 'H' ? 'fixture-home' : 'fixture-away'}"><div><b>${esc(fixture.date)}</b><small>${fixture.venue === 'H' ? 'HOME' : 'AWAY'} · Premier League</small></div>
      <div><strong>${fixture.venue === 'H' ? `Albion v ${esc(fixture.opponent)}` : `${esc(fixture.opponent)} v Albion`}</strong><small>${fixture.venue === 'H' ? 'Amex Stadium' : 'Away'}</small></div></article>`).join('') : '<p>No fixtures match that search.</p>';
  }

  function initFixtureMonths() {
    const months = [];
    (C.fixtures || []).forEach(fixture => {
      const key = fixture.date.slice(fixture.date.indexOf(' ') + 1);
      if (!months.includes(key)) months.push(key);
    });
    $('monthFilter').innerHTML = '<option value="all">All months</option>' + months.map(month => `<option value="${esc(month)}">${esc(month)}</option>`).join('');
    const savedMonth = localStorage.getItem('albionFixtureMonth'); const initialMonth = months.includes(savedMonth) || savedMonth === 'all' ? savedMonth : months[0] || 'all';
    $('monthFilter').value = initialMonth;
    $('monthButtons').innerHTML = `<button type="button" data-month="all">All</button>` + months.map(month => `<button type="button" data-month="${esc(month)}">${esc(month.split(' ')[0])}</button>`).join('');
    $('monthButtons').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      $('monthFilter').value = button.dataset.month;
      $('monthButtons').querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
      localStorage.setItem('albionFixtureMonth', button.dataset.month);
      renderFixtures();
    }));
    $('monthButtons').querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.month === initialMonth));
  }

  let currentQuiz = []; let quizPage = 0; let quizScore = 0; let quizChecked = false;
  const quizGroups = [[0], [1], [2], [3], [4]];
  function poolKey() { return 'albionQuizSeen:medium-hard'; }
  function selectFreshQuestions(count = 5) {
    const pool = Q.filter(question => question.difficulty === 'Medium' || question.difficulty === 'Hard');
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(poolKey())) || []; } catch {}
    let available = pool.filter(question => !seen.includes(question.question));
    if (available.length < count) { seen = []; available = [...pool]; }
    const chosen = shuffle(available).slice(0, count);
    localStorage.setItem(poolKey(), JSON.stringify([...seen, ...chosen.map(question => question.question)]));
    return chosen;
  }
  function prepareQuestion(question) {
    const choices = question.options.map((text, originalIndex) => ({text, correct: originalIndex === question.answer}));
    const shuffled = shuffle(choices);
    return {...question, choices: shuffled, answer: shuffled.findIndex(choice => choice.correct)};
  }
  function renderQuizPage() {
    const group = quizGroups[quizPage]; const first = group[0] + 1; const last = group[group.length - 1] + 1;
    $('quizContainer').innerHTML = `<div class="quiz-step"><div class="quiz-step-label"><b>Question ${first} of 5</b><span>${last * 20}% complete</span></div><div class="quiz-progress-track"><i style="width:${last * 20}%"></i></div></div>
      <div class="quiz-pair">${group.map(index => { const question = currentQuiz[index]; return `<fieldset class="quiz-question" data-question="${index}"><legend><span>${index + 1}</span>${esc(question.question)}</legend>${question.choices.map((choice, choiceIndex) => `<label><input type="radio" name="quizQuestion${index}" value="${choiceIndex}"><span>${esc(choice.text)}</span></label>`).join('')}<div class="quiz-feedback"></div></fieldset>`; }).join('')}</div>`;
    const completed = quizGroups.slice(0, quizPage).flat().length;
    $('quizResult').textContent = `Score: ${quizScore}/${completed}`;
    $('checkQuiz').textContent = 'Check answer'; $('checkQuiz').disabled = false; quizChecked = false;
  }
  function newQuiz() {
    currentQuiz = selectFreshQuestions().map(prepareQuestion); quizPage = 0; quizScore = 0;
    renderQuizPage();
  }
  function checkQuiz() {
    if (quizChecked) {
      if (quizPage < quizGroups.length - 1) { quizPage += 1; renderQuizPage(); }
      else {
        const previousBest = Number(localStorage.getItem('albionQuizBest') || 0); const best = Math.max(previousBest, quizScore);
        localStorage.setItem('albionQuizBest', String(best)); $('bestScore').textContent = `Best: ${best}/5`;
        const verdict = quizScore === 5 ? 'Perfect Albion knowledge!' : quizScore >= 3 ? 'Strong Seagulls knowledge.' : 'Have another go.';
        $('quizContainer').innerHTML = `<div class="quiz-finish"><img src="albion-safe-graphic.svg" alt=""><b>${quizScore}/5</b><p>${verdict}</p></div><details class="quiz-review"><summary>Review the five answers</summary>${currentQuiz.map((question, index) => `<article><b>${index + 1}. ${esc(question.question)}</b><p>${esc(question.choices[question.answer].text)} — ${esc(question.explanation)}</p></article>`).join('')}</details>`;
        $('quizResult').textContent = 'Round complete.'; $('checkQuiz').disabled = true;
      }
      return;
    }
    const group = quizGroups[quizPage];
    const answers = group.map(index => document.querySelector(`input[name="quizQuestion${index}"]:checked`));
    if (answers.some(answer => !answer)) { $('quizResult').textContent = group.length === 1 ? 'Choose an answer first.' : 'Answer both questions first.'; return; }
    group.forEach((index, groupIndex) => {
      const question = currentQuiz[index]; const selected = Number(answers[groupIndex].value); const correct = selected === question.answer;
      if (correct) quizScore += 1;
      const fieldset = document.querySelector(`.quiz-question[data-question="${index}"]`); const labels = [...fieldset.querySelectorAll('label')];
      fieldset.classList.add(correct ? 'correct' : 'incorrect'); labels[question.answer].classList.add('answer-correct');
      if (!correct) labels[selected].classList.add('answer-wrong');
      fieldset.querySelectorAll('input').forEach(input => { input.disabled = true; });
      fieldset.querySelector('.quiz-feedback').innerHTML = `<b>${correct ? 'Correct!' : `Correct answer: ${esc(question.choices[question.answer].text)}.`}</b><br>${esc(question.explanation)}`;
    });
    const completed = quizGroups.slice(0, quizPage + 1).flat().length;
    $('quizResult').textContent = `Score: ${quizScore}/${completed}`; quizChecked = true;
    $('checkQuiz').textContent = quizPage === quizGroups.length - 1 ? 'See result' : 'Next question';
  }

  function predictor() {
    const scorers = squad.filter(player => player.position !== 'Goalkeeper').map(player => player.name);
    $('firstScorer').innerHTML = '<option>No scorer</option>' + scorers.map(name => `<option>${esc(name)}</option>`).join('');
    $('motm').innerHTML = squad.map(player => `<option>${esc(player.name)}</option>`).join('');
    $('savePrediction').addEventListener('click', () => {
      const text = `Albion ${$('homeScore').value}-${$('awayScore').value} ${MATCH.opponent} · First scorer: ${$('firstScorer').value} · Player of the match: ${$('motm').value}`;
      localStorage.setItem('albionPrediction', text);
      $('predictionSummary').textContent = text;
    });
    $('predictionSummary').textContent = localStorage.getItem('albionPrediction') || 'Make and save your prediction.';
  }

  function randomContent() {
    const showFact = () => { $('momentType').textContent = 'Albion fact'; $('momentText').textContent = C.facts[Math.floor(Math.random() * C.facts.length)]; };
    const showMemory = () => { $('momentType').textContent = 'Albion memory'; $('momentText').textContent = C.memories[Math.floor(Math.random() * C.memories.length)]; };
    showFact(); showMemory();
    $('newFact').addEventListener('click', showFact);
    $('newMemory').addEventListener('click', showMemory);
  }

  function weather() {
    const panel = $('weatherPanel');
    const target = MATCH.dateISO.slice(0, 10);
    const days = (new Date(`${target}T12:00:00`) - new Date()) / 864e5;
    if (days > 14) {
      panel.innerHTML = '<b>Falmer weather</b><p>Forecasts are not reliable this far ahead. This panel will activate closer to matchday.</p>';
      return;
    }
    fetch('https://api.open-meteo.com/v1/forecast?latitude=50.8616&longitude=-0.0837&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon')
      .then(response => response.json()).then(data => {
        const index = data.daily.time.indexOf(target);
        panel.innerHTML = index < 0 ? '<b>Falmer weather</b><p>Matchday forecast is not yet available.</p>' : `<b>Falmer weather</b><p>${Math.round(data.daily.temperature_2m_max[index])}°C high · ${Math.round(data.daily.temperature_2m_min[index])}°C low · ${Math.round(data.daily.precipitation_probability_max[index])}% rain chance</p>`;
      }).catch(() => { panel.innerHTML = '<b>Falmer weather</b><p>Weather is temporarily unavailable.</p>'; });
  }

  function amex() {
    const info = {
      North:['North Stand','Home support behind the goal. A lively area on many matchdays.'],
      South:['South Stand','Includes the visiting-supporter area. Check your ticket for the correct entrance.'],
      East:['East Stand','Includes family seating and broad views across the pitch.'],
      West:['West Stand','The largest stand, with hospitality and central seating areas.']
    };
    document.querySelectorAll('[data-stand]').forEach(button => button.addEventListener('click', () => {
      $('standInfo').innerHTML = `<h3>${info[button.dataset.stand][0]}</h3><p>${info[button.dataset.stand][1]}</p>`;
    }));
  }

  function story() {
    const tabs = [...document.querySelectorAll('.story-tab')];
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(item => { item.classList.toggle('active', item === tab); item.classList.toggle('ghost', item !== tab); item.setAttribute('aria-selected', String(item === tab)); });
      document.querySelectorAll('.story-panel').forEach(panel => { const active = panel.id === tab.dataset.story; panel.hidden = !active; panel.classList.toggle('active', active); });
    }));
  }

  function historyDetails() {
    const details = [
      'The professional club was established in 1901 and entered the Southern League.',
      'As Southern League champions, Albion beat Football League champions Aston Villa 1–0 to claim the Charity Shield.',
      'Albion drew 2–2 with Manchester United at Wembley before the FA Cup final replay.',
      'Robbie Reinelt’s equaliser at Hereford kept Albion in the Football League on goals scored.',
      'The first league match at the Amex ended in a dramatic 2–1 win over Doncaster Rovers.',
      'A 2–1 win over Wigan Athletic confirmed promotion to the Premier League.',
      'A sixth-place Premier League finish secured the club’s first European campaign.'
    ];
    document.querySelectorAll('#journey .timeline article').forEach((article, index) => {
      article.insertAdjacentHTML('beforeend', `<button class="history-more" type="button" aria-expanded="false">More detail</button><p class="history-extra" hidden>${esc(details[index])}</p>`);
      const button = article.querySelector('.history-more'); const extra = article.querySelector('.history-extra');
      button.addEventListener('click', () => { const open = extra.toggleAttribute('hidden'); button.setAttribute('aria-expanded', String(!open)); button.textContent = open ? 'More detail' : 'Less detail'; });
    });
  }

  function recordTabs() {
    const tabs = [...document.querySelectorAll('.record-tab')];
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(item => { item.classList.toggle('active', item === tab); item.classList.toggle('ghost', item !== tab); item.setAttribute('aria-selected', String(item === tab)); });
      document.querySelectorAll('.record-panel').forEach(panel => { panel.hidden = panel.id !== tab.dataset.record; });
    }));
  }

  function travelGuide() {
    const tabs = [...document.querySelectorAll('.travel-tab')];
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(item => { item.classList.toggle('active', item === tab); item.classList.toggle('ghost', item !== tab); item.setAttribute('aria-selected', String(item === tab)); });
      document.querySelectorAll('.travel-panel').forEach(panel => { const active = panel.id === tab.dataset.travel; panel.hidden = !active; panel.classList.toggle('active', active); });
    }));
  }

  function shootout() {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'centre'];
    const takers = [
      {name:'Danny Welbeck',number:18,skin:'#7b4934',hair:'#211712'},
      {name:'Georginio Rutter',number:10,skin:'#70402e',hair:'#17110e'},
      {name:'Yankuba Minteh',number:11,skin:'#5c3427',hair:'#16100d'},
      {name:'Diego Gómez',number:25,skin:'#b87855',hair:'#20150f'},
      {name:'Kaoru Mitoma',number:22,skin:'#d5a077',hair:'#1b1715'}
    ];
    let lineup = []; let albionResults = []; let palaceResults = []; let albionKicks = 0; let palaceKicks = 0;
    let albionGoals = 0; let palaceGoals = 0; let phase = 'shoot'; let locked = false; let recentTargets = [];
    const ball = $('ball'); const shadow = $('ballShadow'); const keeper = $('keeper'); const taker = $('penaltyTaker'); const status = $('shootoutStatus'); const flash = $('goalFlash'); const goalFrame = $('goal');
    const targets = [...document.querySelectorAll('.target')];
    const accuracyMarker = document.querySelector('.accuracy-meter i');
    const announce = (title, detail) => { status.innerHTML = `<b>${esc(title)}</b><span>${esc(detail)}</span>`; };
    let liveAccuracy = 1; const accuracyStarted = Date.now();
    window.setInterval(() => { const phase = ((Date.now() - accuracyStarted) % 1800) / 1800; const position = phase < .5 ? phase * 2 : (1 - phase) * 2; accuracyMarker.style.left = `${1 + position * 97}%`; liveAccuracy = 1 - Math.abs(position - .5) * 2; }, 32);
    function markerHtml(results) {
      const suddenDeath = albionKicks >= 5 && palaceKicks >= 5 && albionGoals === palaceGoals;
      const total = Math.max(5, results.length + (results.length > 5 || suddenDeath ? 1 : 0));
      return Array.from({length: total}, (_, index) => `<i class="${index < results.length ? (results[index].scored ? 'goal-mark' : 'save-mark') : ''}"></i>`).join('');
    }
    function renderScore() {
      $('albionGoalCount').textContent = String(albionGoals); $('palaceGoalCount').textContent = String(palaceGoals);
      $('albionPenaltyMarkers').innerHTML = markerHtml(albionResults); $('palacePenaltyMarkers').innerHTML = markerHtml(palaceResults);
      const round = Math.max(albionKicks, palaceKicks) + (phase === 'shoot' && albionKicks === palaceKicks ? 1 : 0);
      $('shotCount').textContent = round <= 5 ? `${round}/5` : `SD ${round - 5}`;
    }
    function renderLineup() {
      $('penaltyLineup').innerHTML = lineup.map((player, index) => {
        const result = albionResults[index];
        const current = phase === 'shoot' && albionKicks % lineup.length === index;
        return `<span class="${current ? 'current' : result ? (result.scored ? 'converted' : 'missed') : ''}"><b>${player.number}</b>${esc(player.name)}</span>`;
      }).join('');
    }
    function clearMotion() {
      ball.className = 'ball'; shadow.className = 'ball-shadow'; flash.className = 'goal-flash';
      taker.className = 'penalty-taker'; keeper.className = 'keeper';
      goalFrame.classList.remove('slow-motion','net-goal','woodwork','saving-turn');
    }
    function readyKeeper() {
      keeper.className = `keeper ${phase === 'save' ? 'user-keeper ' : ''}feint-${['left','right','centre'][Math.floor(Math.random() * 3)]}`;
    }
    function setScene() {
      clearMotion();
      const saving = phase === 'save'; const player = lineup[albionKicks % lineup.length];
      $('turnBadge').textContent = saving ? 'PALACE PENALTY · YOU ARE IN GOAL' : 'ALBION PENALTY · YOU ARE SHOOTING';
      $('turnBadge').className = `turn-badge ${saving ? 'palace-turn' : 'albion-turn'}`;
      $('shotControls').classList.toggle('controls-disabled', saving);
      $('shotPower').disabled = saving;
      goalFrame.classList.toggle('saving-turn', saving);
      taker.classList.toggle('palace-taker', saving);
      keeper.classList.toggle('user-keeper', saving);
      if (saving) {
        $('penaltyTakerName').textContent = `Palace taker ${palaceKicks + 1}`;
        $('penaltyShirt').textContent = palaceKicks + 1;
        taker.style.setProperty('--player-skin', '#9b6548'); taker.style.setProperty('--player-hair', '#211611');
        announce('Choose your dive', 'Tap a target to send the Albion goalkeeper that way.');
      } else {
        $('penaltyTakerName').textContent = `${player.name} · No. ${player.number}`;
        $('penaltyShirt').textContent = player.number;
        taker.style.setProperty('--player-skin', player.skin); taker.style.setProperty('--player-hair', player.hair);
        announce(albionKicks >= 5 ? 'Sudden death: pick your spot' : 'Pick your spot', 'Red accuracy means an automatic miss.');
      }
      targets.forEach((button, index) => {
        button.disabled = false;
        button.setAttribute('aria-label', saving ? `Dive towards target ${index + 1}` : `Shoot towards target ${index + 1}`);
      });
      renderLineup(); renderScore(); readyKeeper();
    }
    function renderSummary() {
      const rows = Array.from({length: Math.max(albionResults.length, palaceResults.length)}, (_, index) => {
        const albion = albionResults[index]; const palace = palaceResults[index]; const player = lineup[index % lineup.length];
        return `<li><span>${esc(player.name)}: <b class="${albion?.scored ? 'summary-goal' : 'summary-miss'}">${esc(albion?.label || '—')}</b></span><span>Palace: <b class="${palace?.scored ? 'summary-goal' : 'summary-miss'}">${esc(palace?.label || '—')}</b></span></li>`;
      }).join('');
      $('shootoutSummary').innerHTML = `<h3>Brighton v Palace shoot-out card</h3><ol>${rows}</ol>`;
    }
    function reset() {
      albionKicks = 0; palaceKicks = 0; albionGoals = 0; palaceGoals = 0; phase = 'shoot'; locked = false;
      recentTargets = []; albionResults = []; palaceResults = []; lineup = shuffle(takers);
      $('shootoutSummary').hidden = true; $('shootoutSummary').innerHTML = '';
      setScene();
    }
    function celebrationBurst() {
      for (let index = 0; index < 28; index += 1) {
        const piece = document.createElement('i'); piece.className = 'shootout-confetti';
        piece.style.left = `${5 + Math.random() * 90}%`; piece.style.setProperty('--delay', `${Math.random() * .35}s`);
        piece.style.setProperty('--drift', `${-70 + Math.random() * 140}px`); goalFrame.appendChild(piece);
        window.setTimeout(() => piece.remove(), 2300);
      }
    }
    function finish(albionWon) {
      targets.forEach(button => button.disabled = true);
      $('shotPower').disabled = true;
      announce(albionWon ? 'SEAGULLS WIN!' : 'Palace win the shoot-out', `Brighton ${albionGoals}–${palaceGoals} Palace.`);
      $('shootoutSummary').hidden = false; renderSummary();
      if (albionWon) { flash.className = 'goal-flash win'; celebrationBurst(); playSfx('crowd'); }
    }
    function animateShot({target, dive, missed, woodwork, saved, scored, slow}) {
      if (slow) goalFrame.classList.add('slow-motion');
      taker.classList.add('run-up');
      const postSide = target.includes('left') ? 'left' : target.includes('right') ? 'right' : Math.random() > .5 ? 'left' : 'right';
      ball.className = `ball ${missed ? (postSide === 'left' ? 'shoot-wide-left' : 'shoot-wide-right') : woodwork ? `hit-post-${postSide}` : `shoot-${target}`}`;
      shadow.className = `ball-shadow shadow-${missed ? 'wide' : woodwork ? 'post' : target}`;
      keeper.className = `keeper ${phase === 'save' ? 'user-keeper ' : ''}dive-${dive}`;
      playSfx('kick');
      window.setTimeout(() => {
        flash.className = `goal-flash ${scored ? 'scored' : 'saved'}`;
        if (scored) goalFrame.classList.add('net-goal');
        if (woodwork) goalFrame.classList.add('woodwork');
        playSfx(scored ? 'goal' : woodwork ? 'post' : missed ? 'miss' : 'save');
      }, slow ? 1320 : 900);
    }
    function takeAlbionPenalty(button) {
      locked = true;
      targets.forEach(targetButton => { targetButton.disabled = true; });
      const player = lineup[albionKicks % lineup.length]; const target = button.dataset.target;
      const power = Number($('shotPower').value); const accuracy = liveAccuracy;
      const predictable = recentTargets.length >= 2 && recentTargets.slice(-2).every(item => item === target);
      const readsShot = Math.random() < (predictable ? .75 : .36);
      const dive = readsShot ? target : positions[Math.floor(Math.random() * positions.length)];
      const redZone = accuracy < .56;
      const missed = redZone || (power < 68 && Math.random() < .26);
      const woodwork = !missed && accuracy < .58 && power > 82 && Math.random() < .45;
      const sameSide = dive.split('-').pop() === target.split('-').pop();
      const saveChance = dive === target ? Math.max(.5, .82 - (power - 60) / 170) : sameSide && target !== 'centre' ? .16 : 0;
      const saved = !missed && !woodwork && Math.random() < saveChance;
      const scored = !missed && !woodwork && !saved;
      const label = scored ? 'Goal' : woodwork ? 'Woodwork' : missed ? (redZone ? 'Missed: red zone' : 'Wide') : 'Saved';
      recentTargets.push(target); albionResults.push({scored,label,target}); albionKicks += 1; if (scored) albionGoals += 1;
      const slow = albionKicks >= 5;
      announce(`${player.name} steps up…`, slow ? 'The pressure is on.' : 'Come on Albion!');
      animateShot({target,dive,missed,woodwork,saved,scored,slow});
      window.setTimeout(() => {
        const goalLines = [`${player.name} buries it!`,`${player.name} sends the keeper the wrong way.`,`A composed finish from ${player.name}.`,`The net ripples for ${player.name}!`];
        announce(scored ? 'GOAL!' : woodwork ? 'OFF THE POST!' : missed ? (redZone ? 'RED ZONE: MISSED!' : 'WIDE!') : 'SAVED!', scored ? goalLines[Math.floor(Math.random()*goalLines.length)] : woodwork ? `${player.name} hits the frame of the goal.` : missed ? 'The accuracy marker was outside the safe area.' : `The Palace keeper denies ${player.name}.`);
        renderLineup(); renderScore();
        window.setTimeout(() => { phase = 'save'; locked = false; setScene(); }, 850);
      }, slow ? 1550 : 1120);
    }
    function takePalacePenalty(button) {
      locked = true; targets.forEach(targetButton => { targetButton.disabled = true; });
      const dive = button.dataset.target;
      const target = positions[Math.floor(Math.random() * positions.length)];
      const missed = Math.random() < .1; const woodwork = !missed && Math.random() < .07;
      const sameSide = dive.split('-').pop() === target.split('-').pop();
      const saved = !missed && !woodwork && (dive === target ? Math.random() < .82 : sameSide && target !== 'centre' && Math.random() < .12);
      const scored = !missed && !woodwork && !saved;
      const label = scored ? 'Goal' : woodwork ? 'Woodwork' : missed ? 'Wide' : 'Saved by you';
      palaceResults.push({scored,label,target}); palaceKicks += 1; if (scored) palaceGoals += 1;
      const slow = palaceKicks >= 5;
      announce('Palace run up…', 'Hold your nerve.');
      animateShot({target,dive,missed,woodwork,saved,scored,slow});
      window.setTimeout(() => {
        announce(saved ? 'WHAT A SAVE!' : scored ? 'Palace score' : woodwork ? 'OFF THE POST!' : 'PALACE MISS!', saved ? 'You read the penalty perfectly.' : scored ? 'The Eagles level the pressure.' : 'The ball stays out.');
        renderScore();
        const canFinish = palaceKicks >= 5 && palaceKicks === albionKicks && palaceGoals !== albionGoals;
        if (canFinish) finish(albionGoals > palaceGoals);
        else window.setTimeout(() => {
          phase = 'shoot'; locked = false;
          if (palaceKicks >= 5) announce('Sudden death', 'Every kick matters now.');
          setScene();
        }, 850);
      }, slow ? 1550 : 1120);
    }
    function chooseTarget(button) {
      if (locked) return;
      if (phase === 'shoot') takeAlbionPenalty(button); else takePalacePenalty(button);
    }
    targets.forEach(button => button.addEventListener('click', () => chooseTarget(button)));
    $('shotPower').addEventListener('input', () => { $('powerValue').textContent = `${$('shotPower').value}%`; });
    document.addEventListener('keydown', event => {
      if (event.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const key = Number(event.key); if (key >= 1 && key <= 5) { event.preventDefault(); chooseTarget(targets[key - 1]); }
    });
    $('resetShootout').addEventListener('click', reset);
    reset();
  }

  function fixtureCarousel() {
    const fixtures = (C.fixtures || []).slice(0, 3); let index = 0;
    const render = () => {
      const fixture = fixtures[index];
      $('nextFixtureCarousel').innerHTML = `<article class="${fixture.venue === 'H' ? 'fixture-home' : 'fixture-away'}"><span>${fixture.venue === 'H' ? 'HOME' : 'AWAY'}</span><b>${fixture.venue === 'H' ? `Albion v ${esc(fixture.opponent)}` : `${esc(fixture.opponent)} v Albion`}</b><small>${esc(fixture.date)}</small></article>`;
      $('fixtureCarouselPosition').textContent = `${index + 1} of ${fixtures.length}`;
    };
    $('previousFixture').addEventListener('click', () => { index = (index + fixtures.length - 1) % fixtures.length; render(); });
    $('nextFixtureButton').addEventListener('click', () => { index = (index + 1) % fixtures.length; render(); });
    render();
  }

  function calendarDownload() {
    const monthNumbers = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
    const compactDate = date => { const [day, month, year] = date.split(' '); return `${year}${monthNumbers[month]}${String(day).padStart(2,'0')}`; };
    const nextDay = date => { const [day, month, year] = date.split(' '); const d = new Date(Date.UTC(Number(year), Number(monthNumbers[month]) - 1, Number(day) + 1)); return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`; };
    $('downloadCalendar').addEventListener('click', event => {
      event.preventDefault();
      const events = (C.fixtures || []).map((fixture, index) => { const title = fixture.venue === 'H' ? `Brighton & Hove Albion v ${fixture.opponent}` : `${fixture.opponent} v Brighton & Hove Albion`; return ['BEGIN:VEVENT',`UID:albion-${index + 1}-2026@albion-fan-hub`,`DTSTART;VALUE=DATE:${compactDate(fixture.date)}`,`DTEND;VALUE=DATE:${nextDay(fixture.date)}`,`SUMMARY:${title}`,`DESCRIPTION:Premier League fixture. Date and kick-off subject to change. Check the official Albion website.`,`LOCATION:${fixture.venue === 'H' ? 'Amex Stadium, Falmer' : 'Away fixture'}`,'END:VEVENT'].join('\r\n'); }).join('\r\n');
      const calendar = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Albion Fan Hub//Fixtures 2026-27//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${events}\r\nEND:VCALENDAR\r\n`;
      const url = URL.createObjectURL(new Blob([calendar], {type:'text/calendar;charset=utf-8'})); const link = document.createElement('a');
      link.href = url; link.download = 'albion-fixtures-2026-27.ics'; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  function soundAndInstall() {
    const audio = $('anthemAudio'); const toggle = $('soundToggle');
    const updateSound = playing => {
      toggle.textContent = playing ? '🔊 Sound is on' : '🔇 Sound is off';
      toggle.classList.toggle('sound-on', playing); toggle.classList.toggle('sound-off', !playing);
      toggle.setAttribute('aria-pressed', String(playing));
      toggle.title = playing ? 'Turn all site sound off' : 'Turn site sound on';
    };
    let fadeTimer = 0; const fade = (target, done) => { window.clearInterval(fadeTimer); const step = target > audio.volume ? .08 : -.08; fadeTimer = window.setInterval(() => { const next = Math.max(0, Math.min(1, audio.volume + step)); audio.volume = next; if ((step > 0 && next >= target) || (step < 0 && next <= target)) { window.clearInterval(fadeTimer); audio.volume = target; if (done) done(); } }, 35); };
    const play = () => { audio.volume = 0; return audio.play().then(() => { localStorage.setItem('albionSound','on'); updateSound(true); fade(1); }).catch(() => updateSound(false)); };
    const pause = () => { localStorage.setItem('albionSound','off'); updateSound(false); fade(0, () => audio.pause()); };
    toggle.addEventListener('click', () => audio.paused ? play() : pause()); audio.addEventListener('play', () => { localStorage.setItem('albionSound','on'); updateSound(true); }); audio.addEventListener('pause', () => updateSound(false)); audio.addEventListener('ended', () => { localStorage.setItem('albionSound','off'); updateSound(false); });
    localStorage.setItem('albionSound','off'); updateSound(false);
    let audioContext = null;
    playSfx = type => {
      if (localStorage.getItem('albionSound') === 'off') return;
      const AudioEngine = window.AudioContext || window.webkitAudioContext; if (!AudioEngine) return;
      audioContext ||= new AudioEngine(); if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime; const gain = audioContext.createGain(); gain.connect(audioContext.destination); gain.gain.setValueAtTime(type === 'crowd' ? .08 : .18, now); gain.gain.exponentialRampToValueAtTime(.001, now + (type === 'crowd' ? 1.2 : .28));
      if (type === 'crowd') {
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 1.2, audioContext.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioContext.createBufferSource(); const filter = audioContext.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 650; noise.buffer = buffer; noise.connect(filter); filter.connect(gain); noise.start(now); return;
      }
      const frequencies = {kick:95,goal:620,post:1180,save:180,miss:110}; const oscillator = audioContext.createOscillator(); oscillator.type = type === 'post' ? 'square' : 'sine'; oscillator.frequency.setValueAtTime(frequencies[type] || 220, now); oscillator.frequency.exponentialRampToValueAtTime(type === 'goal' ? 920 : Math.max(45, (frequencies[type] || 220) * .55), now + .25); oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + .3);
    };
    let installPrompt = null; const installButton = $('installApp');
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installButton.hidden = false; });
    installButton.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.hidden = true; });
  }

  function pageUtilities() {
    const topButton = $('backToTop');
    const showTop = () => topButton.classList.toggle('show', window.scrollY > 650); window.addEventListener('scroll', showTop, {passive:true}); showTop();
    topButton.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
    const notice = $('cookieNotice'); if (localStorage.getItem('albionCookieNotice') === 'accepted') notice.hidden = true;
    $('acceptCookies').addEventListener('click', () => { localStorage.setItem('albionCookieNotice','accepted'); notice.hidden = true; });
    $('resetSite').addEventListener('click', () => { if (window.confirm && !window.confirm('Reset saved quiz, team, prediction, fixture, sound and cookie choices?')) return; ['albionXI','albionPrediction','albionQuizBest','albionQuizSeen:medium-hard','albionFixtureMonth','albionSound','albionCookieNotice'].forEach(key => localStorage.removeItem(key)); window.location.reload(); });
  }

  function ui() {
    const menu = $('menuToggle'); const nav = $('navLinks');
    menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }));
    $('fixtureSearch').addEventListener('input', renderFixtures);
    $('venueFilter').addEventListener('change', renderFixtures);
    $('monthFilter').addEventListener('change', () => { $('monthButtons').querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.month === $('monthFilter').value)); localStorage.setItem('albionFixtureMonth', $('monthFilter').value); renderFixtures(); });
    $('toggleFixtures').addEventListener('click', () => { const hidden = $('fixtureList').toggleAttribute('hidden'); $('toggleFixtures').textContent = hidden ? 'Show fixtures' : 'Hide fixtures'; $('toggleFixtures').setAttribute('aria-expanded', String(!hidden)); });
    $('newQuiz').addEventListener('click', newQuiz);
    $('checkQuiz').addEventListener('click', checkQuiz);
    $('bestScore').textContent = `Best: ${localStorage.getItem('albionQuizBest') || 0}/5`;
  }

  matchConfiguration(); countdown(); setInterval(countdown, 60000); renderSquad(); initXI(); initFixtureMonths(); renderFixtures(); newQuiz(); predictor(); randomContent(); weather(); amex(); story(); historyDetails(); recordTabs(); travelGuide(); shootout(); fixtureCarousel(); calendarDownload(); soundAndInstall(); pageUtilities(); ui();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});
})();
