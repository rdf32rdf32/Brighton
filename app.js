(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.ALBION_CONTENT || {};
  const Q = window.ALBION_QUIZ || [];
  const squad = C.squad || [];
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
    const remaining = new Date('2026-08-23T14:00:00+01:00') - new Date();
    if (remaining <= 0) { el.textContent = 'Matchday'; return; }
    const days = Math.floor(remaining / 864e5);
    const hours = Math.floor((remaining % 864e5) / 36e5);
    const minutes = Math.floor((remaining % 36e5) / 6e4);
    el.innerHTML = `<b>${days}</b> days <b>${hours}</b> hrs <b>${minutes}</b> mins`;
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
  function saveXI() {
    const values = [...document.querySelectorAll('#pitch select')].map(select => select.value);
    const unique = new Set(values.filter(Boolean));
    localStorage.setItem('albionXI', JSON.stringify({formation:$('formation').value, values}));
    $('xiMessage').textContent = values.filter(Boolean).length === 11
      ? (unique.size === 11 ? 'Your complete XI is saved on this device.' : 'Choose eleven different players.')
      : `${values.filter(Boolean).length}/11 positions selected.`;
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
    saveXI();
  }
  function initXI() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('albionXI')) || {}; } catch {}
    if (saved.formation) $('formation').value = saved.formation;
    renderPitch(saved.values);
    $('formation').addEventListener('change', () => { renderPitch(); saveXI(); });
    $('loadPredicted').addEventListener('click', loadPredictedXI);
    $('clearXI').addEventListener('click', () => {
      localStorage.removeItem('albionXI');
      renderPitch();
      $('xiMessage').textContent = 'Line-up cleared.';
    });
  }

  function renderFixtures() {
    const query = $('fixtureSearch').value.toLowerCase().trim();
    const venue = $('venueFilter').value;
    const month = $('monthFilter').value;
    const fixtures = (C.fixtures || []).filter(fixture => (venue === 'all' || fixture.venue === venue) && (month === 'all' || fixture.date.slice(fixture.date.indexOf(' ') + 1) === month) && fixture.opponent.toLowerCase().includes(query));
    $('fixtureList').innerHTML = fixtures.length ? fixtures.map(fixture => `
      <article class="fixture-item"><div><b>${esc(fixture.date)}</b><small>Premier League</small></div>
      <div><strong>${fixture.venue === 'H' ? `Albion v ${esc(fixture.opponent)}` : `${esc(fixture.opponent)} v Albion`}</strong><small>${fixture.venue === 'H' ? 'Amex Stadium' : 'Away'}</small></div></article>`).join('') : '<p>No fixtures match that search.</p>';
  }

  function initFixtureMonths() {
    const months = [];
    (C.fixtures || []).forEach(fixture => {
      const key = fixture.date.slice(fixture.date.indexOf(' ') + 1);
      if (!months.includes(key)) months.push(key);
    });
    $('monthFilter').innerHTML = '<option value="all">All months</option>' + months.map(month => `<option value="${esc(month)}">${esc(month)}</option>`).join('');
    $('monthButtons').innerHTML = `<button type="button" class="active" data-month="all">All</button>` + months.map(month => `<button type="button" data-month="${esc(month)}">${esc(month.split(' ')[0])}</button>`).join('');
    $('monthButtons').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      $('monthFilter').value = button.dataset.month;
      $('monthButtons').querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
      renderFixtures();
    }));
  }

  let currentQuiz = []; let quizIndex = 0; let quizScore = 0; let quizChecked = false;
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
  function renderQuizQuestion() {
    const question = currentQuiz[quizIndex];
    $('quizContainer').innerHTML = `<div class="quiz-step"><div class="quiz-step-label"><b>Question ${quizIndex + 1} of 5</b><span>${esc(question.difficulty)}</span></div><div class="quiz-progress-track"><i style="width:${(quizIndex + 1) * 20}%"></i></div></div>
      <fieldset class="quiz-question" data-question="${quizIndex}"><legend>${esc(question.question)}</legend>
      ${question.choices.map((choice, choiceIndex) => `<label><input type="radio" name="currentQuestion" value="${choiceIndex}"><span>${esc(choice.text)}</span></label>`).join('')}
      <div id="quizFeedback"></div></fieldset>`;
    $('quizResult').textContent = `Score: ${quizScore}/${quizIndex}`;
    $('checkQuiz').textContent = 'Check answer'; $('checkQuiz').disabled = false; quizChecked = false;
  }
  function newQuiz() {
    currentQuiz = selectFreshQuestions().map(prepareQuestion); quizIndex = 0; quizScore = 0;
    renderQuizQuestion();
  }
  function checkQuiz() {
    if (quizChecked) {
      if (quizIndex < 4) { quizIndex += 1; renderQuizQuestion(); }
      else {
        const previousBest = Number(localStorage.getItem('albionQuizBest') || 0); const best = Math.max(previousBest, quizScore);
        localStorage.setItem('albionQuizBest', String(best)); $('bestScore').textContent = `Best: ${best}/5`;
        const verdict = quizScore === 5 ? 'Perfect Albion knowledge!' : quizScore >= 3 ? 'Strong Seagulls knowledge.' : 'Have another go.';
        $('quizContainer').innerHTML = `<div class="quiz-finish"><img src="albion-safe-graphic.svg" alt=""><b>${quizScore}/5</b><p>${verdict}</p></div>`;
        $('quizResult').textContent = 'Round complete.'; $('checkQuiz').disabled = true;
      }
      return;
    }
    const selectedInput = document.querySelector('input[name="currentQuestion"]:checked');
    if (!selectedInput) { $('quizResult').textContent = 'Choose an answer first.'; return; }
    const question = currentQuiz[quizIndex]; const selected = Number(selectedInput.value); const correct = selected === question.answer;
    if (correct) quizScore += 1;
    const fieldset = document.querySelector('.quiz-question'); const labels = [...fieldset.querySelectorAll('label')];
    fieldset.classList.add(correct ? 'correct' : 'incorrect'); labels[question.answer].classList.add('answer-correct');
    if (!correct) labels[selected].classList.add('answer-wrong');
    fieldset.querySelectorAll('input').forEach(input => input.disabled = true);
    $('quizFeedback').innerHTML = `<div class="quiz-feedback"><b>${correct ? 'Correct!' : `Correct answer: ${esc(question.choices[question.answer].text)}.`}</b><br>${esc(question.explanation)}</div>`;
    $('quizResult').textContent = `Score: ${quizScore}/${quizIndex + 1}`; quizChecked = true;
    $('checkQuiz').textContent = quizIndex === 4 ? 'See result' : 'Next question';
  }

  function predictor() {
    const scorers = squad.filter(player => player.position !== 'Goalkeeper').map(player => player.name);
    $('firstScorer').innerHTML = '<option>No scorer</option>' + scorers.map(name => `<option>${esc(name)}</option>`).join('');
    $('motm').innerHTML = squad.map(player => `<option>${esc(player.name)}</option>`).join('');
    $('savePrediction').addEventListener('click', () => {
      const text = `Albion ${$('homeScore').value}-${$('awayScore').value} Aston Villa · First scorer: ${$('firstScorer').value} · Player of the match: ${$('motm').value}`;
      localStorage.setItem('albionPrediction', text);
      $('predictionSummary').textContent = text;
    });
    $('predictionSummary').textContent = localStorage.getItem('albionPrediction') || 'Make and save your prediction.';
  }

  function randomContent() {
    const showFact = () => { $('factText').textContent = C.facts[Math.floor(Math.random() * C.facts.length)]; };
    const showMemory = () => { $('memoryText').textContent = C.memories[Math.floor(Math.random() * C.memories.length)]; };
    showFact(); showMemory();
    $('newFact').addEventListener('click', showFact);
    $('newMemory').addEventListener('click', showMemory);
  }

  function weather() {
    const panel = $('weatherPanel');
    const target = '2026-08-23';
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

  function shootout() {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'centre'];
    let shots = 0; let goals = 0; let locked = false;
    const ball = $('ball'); const keeper = $('keeper'); const status = $('shootoutStatus'); const flash = $('goalFlash');
    const targets = [...document.querySelectorAll('.target')];
    const markers = [...document.querySelectorAll('#penaltyMarkers i')];
    const announce = (title, detail) => { status.innerHTML = `<b>${esc(title)}</b><span>${esc(detail)}</span>`; };
    function reset() {
      shots = 0; goals = 0; locked = false;
      $('shotCount').textContent = '1/5'; $('goalCount').textContent = '0'; announce('Pick your spot', 'The keeper is ready.');
      ball.className = 'ball'; keeper.className = 'keeper'; flash.className = 'goal-flash';
      markers.forEach(marker => marker.className = ''); targets.forEach(button => button.disabled = false);
    }
    function finish() {
      targets.forEach(button => button.disabled = true);
      if (goals >= 3) {
        announce('ALBION WIN!', `${goals} goals from five. Up the Albion!`); flash.className = 'goal-flash win';
      } else announce('The keeper wins', `Albion scored ${goals} from five. Try again.`);
    }
    targets.forEach(button => button.addEventListener('click', () => {
      if (locked || shots >= 5) return;
      locked = true;
      const target = button.dataset.target;
      const anticipation = Math.random();
      let dive = anticipation < .16 ? target : positions[Math.floor(Math.random() * positions.length)];
      const scored = dive !== target;
      shots += 1; if (scored) goals += 1;
      announce('Kick taken…', 'Come on Albion!'); flash.className = 'goal-flash';
      ball.className = `ball shoot-${target}`; keeper.className = `keeper dive-${dive}`;
      window.setTimeout(() => {
        markers[shots - 1].className = scored ? 'goal-mark' : 'save-mark';
        $('shotCount').textContent = shots < 5 ? `${shots + 1}/5` : '5/5'; $('goalCount').textContent = String(goals);
        announce(scored ? 'GOAL!' : 'SAVED!', scored ? 'Get in! The net ripples.' : 'The keeper guessed correctly.');
        flash.className = `goal-flash ${scored ? 'scored' : 'saved'}`;
        if (shots === 5) finish();
        else window.setTimeout(() => { ball.className = 'ball'; keeper.className = 'keeper'; flash.className = 'goal-flash'; locked = false; announce('Pick your next spot', `${5 - shots} ${5 - shots === 1 ? 'kick' : 'kicks'} remaining.`); }, 850);
      }, 620);
    }));
    $('resetShootout').addEventListener('click', reset);
    reset();
  }

  function ui() {
    const menu = $('menuToggle'); const nav = $('navLinks');
    menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }));
    $('fixtureSearch').addEventListener('input', renderFixtures);
    $('venueFilter').addEventListener('change', renderFixtures);
    $('monthFilter').addEventListener('change', () => { $('monthButtons').querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.month === $('monthFilter').value)); renderFixtures(); });
    $('newQuiz').addEventListener('click', newQuiz);
    $('checkQuiz').addEventListener('click', checkQuiz);
    $('bestScore').textContent = `Best: ${localStorage.getItem('albionQuizBest') || 0}/5`;
  }

  countdown(); setInterval(countdown, 60000); renderSquad(); initXI(); initFixtureMonths(); renderFixtures(); newQuiz(); predictor(); randomContent(); weather(); amex(); story(); shootout(); ui();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});
})();
