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
    const fixtures = (C.fixtures || []).filter(fixture => (venue === 'all' || fixture.venue === venue) && fixture.opponent.toLowerCase().includes(query));
    $('fixtureList').innerHTML = fixtures.length ? fixtures.map(fixture => `
      <article class="fixture-item"><div><b>${esc(fixture.date)}</b><small>Premier League</small></div>
      <div><strong>${fixture.venue === 'H' ? `Albion v ${esc(fixture.opponent)}` : `${esc(fixture.opponent)} v Albion`}</strong><small>${fixture.venue === 'H' ? 'Amex Stadium' : 'Away'}</small></div></article>`).join('') : '<p>No fixtures match that search.</p>';
  }

  let currentQuiz = [];
  function poolKey(difficulty) { return `albionQuizSeen:${difficulty}`; }
  function getQuizPool(difficulty) { return difficulty === 'All' ? Q : Q.filter(question => question.difficulty === difficulty); }
  function selectFreshQuestions(difficulty, count = 5) {
    const pool = getQuizPool(difficulty);
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(poolKey(difficulty))) || []; } catch {}
    let available = pool.filter(question => !seen.includes(question.question));
    if (available.length < count) { seen = []; available = [...pool]; }
    const chosen = shuffle(available).slice(0, count);
    localStorage.setItem(poolKey(difficulty), JSON.stringify([...seen, ...chosen.map(question => question.question)]));
    return chosen;
  }
  function prepareQuestion(question) {
    const choices = question.options.map((text, originalIndex) => ({text, correct: originalIndex === question.answer}));
    const shuffled = shuffle(choices);
    return {...question, choices: shuffled, answer: shuffled.findIndex(choice => choice.correct)};
  }
  function newQuiz() {
    const difficulty = $('quizDifficulty').value;
    currentQuiz = selectFreshQuestions(difficulty).map(prepareQuestion);
    const poolSize = getQuizPool(difficulty).length;
    let seenCount = 0;
    try { seenCount = (JSON.parse(localStorage.getItem(poolKey(difficulty))) || []).length; } catch {}
    $('quizProgress').textContent = `${Math.min(seenCount, poolSize)}/${poolSize} seen`;
    $('quizContainer').innerHTML = currentQuiz.map((question, index) => `
      <fieldset class="quiz-question" data-question="${index}">
        <legend>${index + 1}. ${esc(question.question)} <small>· ${esc(question.difficulty)}</small></legend>
        ${question.choices.map((choice, choiceIndex) => `<label><input type="radio" name="q${index}" value="${choiceIndex}"> ${esc(choice.text)}</label>`).join('')}
        <div id="feedback${index}"></div>
      </fieldset>`).join('');
    $('quizResult').textContent = 'Choose one answer for each question.';
    $('checkQuiz').disabled = false;
  }
  function checkQuiz() {
    const unanswered = currentQuiz.some((_, index) => !document.querySelector(`input[name=q${index}]:checked`));
    if (unanswered) { $('quizResult').textContent = 'Please answer all five questions before checking.'; return; }
    let score = 0;
    currentQuiz.forEach((question, index) => {
      const selected = Number(document.querySelector(`input[name=q${index}]:checked`).value);
      const fieldset = document.querySelector(`[data-question="${index}"]`);
      const labels = [...fieldset.querySelectorAll('label')];
      const correct = selected === question.answer;
      if (correct) score++;
      fieldset.classList.add(correct ? 'correct' : 'incorrect');
      labels[question.answer].classList.add('answer-correct');
      if (!correct) labels[selected].classList.add('answer-wrong');
      fieldset.querySelectorAll('input').forEach(input => input.disabled = true);
      $(`feedback${index}`).innerHTML = `<div class="quiz-feedback"><b>${correct ? 'Correct.' : `Correct answer: ${esc(question.choices[question.answer].text)}.`}</b><br>${esc(question.explanation)}</div>`;
    });
    const previousBest = Number(localStorage.getItem('albionQuizBest') || 0);
    const best = Math.max(previousBest, score);
    localStorage.setItem('albionQuizBest', String(best));
    $('bestScore').textContent = `Best: ${best}/5`;
    const verdict = score === 5 ? 'Perfect Albion knowledge.' : score >= 3 ? 'Strong Seagulls knowledge.' : 'Another round will help.';
    $('quizResult').textContent = `You scored ${score}/5. ${verdict}`;
    $('checkQuiz').disabled = true;
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

  function celebrate() {
    const modal = $('celebration');
    $('winConfetti').addEventListener('click', () => {
      modal.classList.add('show'); $('closeCelebration').focus();
      for (let i = 0; i < 44; i++) {
        const piece = document.createElement('i');
        piece.className = 'confetti'; piece.style.left = `${Math.random() * 100}%`; piece.style.animationDelay = `${Math.random() * .8}s`;
        piece.textContent = Math.random() > .55 ? '⌁' : '◆'; modal.appendChild(piece);
      }
    });
    $('closeCelebration').addEventListener('click', () => {
      modal.classList.remove('show'); modal.querySelectorAll('.confetti').forEach(piece => piece.remove());
    });
  }

  function ui() {
    const menu = $('menuToggle'); const nav = $('navLinks');
    menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
    $('fixtureSearch').addEventListener('input', renderFixtures);
    $('venueFilter').addEventListener('change', renderFixtures);
    $('quizDifficulty').addEventListener('change', newQuiz);
    $('newQuiz').addEventListener('click', newQuiz);
    $('checkQuiz').addEventListener('click', checkQuiz);
    $('bestScore').textContent = `Best: ${localStorage.getItem('albionQuizBest') || 0}/5`;
  }

  countdown(); setInterval(countdown, 60000); renderSquad(); initXI(); renderFixtures(); newQuiz(); predictor(); randomContent(); weather(); amex(); celebrate(); ui();
})();
