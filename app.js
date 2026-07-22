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
    const showFact = () => { $('momentType').textContent = 'Albion fact'; $('momentText').textContent = C.facts[Math.floor(Math.random() * C.facts.length)]; };
    const showMemory = () => { $('momentType').textContent = 'Albion memory'; $('momentText').textContent = C.memories[Math.floor(Math.random() * C.memories.length)]; };
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
    let shots = 0; let goals = 0; let locked = false; let recentTargets = [];
    const ball = $('ball'); const shadow = $('ballShadow'); const keeper = $('keeper'); const status = $('shootoutStatus'); const flash = $('goalFlash'); const goalFrame = $('goal');
    const targets = [...document.querySelectorAll('.target')];
    const markers = [...document.querySelectorAll('#penaltyMarkers i')]; const accuracyMarker = document.querySelector('.accuracy-meter i');
    const announce = (title, detail) => { status.innerHTML = `<b>${esc(title)}</b><span>${esc(detail)}</span>`; };
    let liveAccuracy = 1; const accuracyStarted = Date.now();
    window.setInterval(() => { const phase = ((Date.now() - accuracyStarted) % 1800) / 1800; const position = phase < .5 ? phase * 2 : (1 - phase) * 2; accuracyMarker.style.left = `${1 + position * 97}%`; liveAccuracy = 1 - Math.abs(position - .5) * 2; }, 32);
    function reset() {
      shots = 0; goals = 0; locked = false; recentTargets = [];
      $('shotCount').textContent = '1/5'; $('goalCount').textContent = '0'; announce('Pick your spot', 'The keeper is ready.');
      ball.className = 'ball'; shadow.className = 'ball-shadow'; keeper.className = 'keeper'; flash.className = 'goal-flash'; goalFrame.classList.remove('slow-motion','net-goal');
      markers.forEach(marker => marker.className = ''); targets.forEach(button => button.disabled = false);
    }
    function finish() {
      targets.forEach(button => button.disabled = true);
      if (goals >= 3) {
        announce('ALBION WIN!', `${goals} goals from five. Up the Albion!`); flash.className = 'goal-flash win';
      } else announce('The keeper wins', `Albion scored ${goals} from five. Try again.`);
    }
    function takePenalty(button) {
      if (locked || shots >= 5) return;
      locked = true;
      const target = button.dataset.target;
      const power = Number($('shotPower').value); const accuracy = liveAccuracy;
      const predictable = recentTargets.length >= 2 && recentTargets.slice(-2).every(item => item === target);
      const readsShot = Math.random() < (predictable ? .62 : .22);
      const dive = readsShot ? target : positions[Math.floor(Math.random() * positions.length)];
      const missed = (accuracy < .16 && power > 88) || (power < 66 && Math.random() < .18);
      const saved = !missed && dive === target && Math.random() > Math.max(.12, (power - 60) / 100);
      const scored = !missed && !saved;
      recentTargets.push(target); shots += 1; if (scored) goals += 1;
      const fifth = shots === 5; const flightTime = fifth ? 1250 : 620;
      if (fifth) goalFrame.classList.add('slow-motion');
      announce(fifth ? 'Final kick…' : 'Kick taken…', fifth ? 'Slow-motion decider!' : 'Come on Albion!'); flash.className = 'goal-flash';
      ball.className = `ball ${missed ? (target.includes('left') ? 'shoot-wide-left' : 'shoot-wide-right') : `shoot-${target}`}`;
      shadow.className = `ball-shadow shadow-${missed ? 'wide' : target}`; keeper.className = `keeper dive-${dive}`;
      window.setTimeout(() => {
        markers[shots - 1].className = scored ? 'goal-mark' : 'save-mark';
        $('shotCount').textContent = shots < 5 ? `${shots + 1}/5` : '5/5'; $('goalCount').textContent = String(goals);
        const saveLine = Math.random() > .5 ? 'The keeper gets a strong hand to it.' : 'A fingertip save pushes it away.';
        announce(scored ? 'GOAL!' : missed ? 'WIDE!' : 'SAVED!', scored ? 'Get in! The net ripples.' : missed ? 'The timing was just off.' : saveLine);
        flash.className = `goal-flash ${scored ? 'scored' : 'saved'}`; if (scored) goalFrame.classList.add('net-goal');
        if (shots === 5) finish();
        else window.setTimeout(() => { ball.className = 'ball'; shadow.className = 'ball-shadow'; keeper.className = 'keeper'; flash.className = 'goal-flash'; goalFrame.classList.remove('slow-motion','net-goal'); locked = false; announce('Pick your next spot', `${5 - shots} ${5 - shots === 1 ? 'kick' : 'kicks'} remaining.`); }, 900);
      }, flightTime);
    }
    targets.forEach(button => button.addEventListener('click', () => takePenalty(button)));
    $('shotPower').addEventListener('input', () => { $('powerValue').textContent = `${$('shotPower').value}%`; });
    document.addEventListener('keydown', event => {
      if (event.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const key = Number(event.key); if (key >= 1 && key <= 5) { event.preventDefault(); takePenalty(targets[key - 1]); }
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
    const updateSound = playing => { toggle.textContent = playing ? '🔊 Sound off' : '♪ Sound on'; toggle.setAttribute('aria-pressed', String(playing)); toggle.title = playing ? 'Mute Sussex by the Sea' : 'Play Sussex by the Sea'; };
    const play = () => audio.play().then(() => { localStorage.setItem('albionSound','on'); updateSound(true); }).catch(() => updateSound(false));
    const pause = () => { audio.pause(); localStorage.setItem('albionSound','off'); updateSound(false); };
    toggle.addEventListener('click', () => audio.paused ? play() : pause()); audio.addEventListener('play', () => updateSound(true)); audio.addEventListener('pause', () => updateSound(false)); audio.addEventListener('ended', () => updateSound(false));
    if (localStorage.getItem('albionSound') !== 'off') { play(); document.addEventListener('pointerdown', () => { if (audio.paused && localStorage.getItem('albionSound') !== 'off') play(); }, {once:true}); }
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

  countdown(); setInterval(countdown, 60000); renderSquad(); initXI(); initFixtureMonths(); renderFixtures(); newQuiz(); predictor(); randomContent(); weather(); amex(); story(); shootout(); fixtureCarousel(); calendarDownload(); soundAndInstall(); pageUtilities(); ui();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});
})();
