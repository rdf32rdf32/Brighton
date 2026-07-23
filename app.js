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
  async function shareText(title, text, button) {
    try {
      if (navigator.share) await navigator.share({title,text});
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
      else { window.prompt('Copy this result:', text); }
    } catch {}
    if (button) window.setTimeout(() => { button.textContent = button.dataset.defaultLabel || 'Share result'; }, 1400);
  }
  const vibrate = pattern => { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {} };

  function countdown() {
    const el = $('countdown');
    if (!el) return;
    const remaining = new Date(MATCH.dateISO) - new Date();
    if (remaining <= 0) { el.textContent = 'Matchday'; if ($('quickCountdown')) $('quickCountdown').textContent = 'Matchday'; return; }
    const days = Math.floor(remaining / 864e5);
    const hours = Math.floor((remaining % 864e5) / 36e5);
    const minutes = Math.floor((remaining % 36e5) / 6e4);
    el.innerHTML = `<b>${days}</b> days <b>${hours}</b> hrs <b>${minutes}</b> mins`;
    if ($('quickCountdown')) $('quickCountdown').textContent = `${days}d ${hours}h ${minutes}m to kick-off`;
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
    if ($('quickNextFixture')) $('quickNextFixture').textContent = title;
    $('awayScoreLabel').textContent = `${shortOpponent} goals`;
    $('fixtureCheckedDate').textContent = `Fixture list checked: ${C.lastUpdated}. Dates and kick-off times may change.`;
    $('globalUpdated').textContent = `Information checked ${C.lastUpdated}.`;
    try {
      const local = new Intl.DateTimeFormat(undefined, {weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(MATCH.dateISO));
      $('localKickoff').textContent = `Your local kick-off: ${local}`;
    } catch { $('localKickoff').textContent = ''; }
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
    if ($('quickXIStatus')) $('quickXIStatus').textContent = startingComplete ? `${$('formation').value} selected` : `${values.filter(Boolean).length}/11 selected`;
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
    const savedStarterCount = Array.isArray(saved.values) ? saved.values.filter(Boolean).length : 0;
    if ($('quickXIStatus')) $('quickXIStatus').textContent = savedStarterCount === 11 ? `${$('formation').value} selected` : savedStarterCount ? `${savedStarterCount}/11 selected` : 'Not selected yet';
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
      <div><strong>${fixture.venue === 'H' ? `Albion v ${esc(fixture.opponent)}` : `${esc(fixture.opponent)} v Albion`}</strong><small>${fixture.venue === 'H' ? 'Amex Stadium' : 'Away'} · Date provisional until confirmed by the club</small></div><button class="fixture-calendar ghost" type="button" data-calendar-index="${C.fixtures.indexOf(fixture)}" aria-label="Add ${esc(fixture.opponent)} fixture to calendar">+ Calendar</button></article>`).join('') : '<p>No fixtures match that search.</p>';
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

  let currentQuiz = []; let quizPage = 0; let quizScore = 0; let quizChecked = false; let quizAdvanceTimer = 0;
  const quizGroups = [[0], [1], [2], [3], [4]];
  const quizProgressKey = 'albionQuizProgress';
  function selectedQuizCategory() { return $('quizCategory')?.value || 'mixed'; }
  function poolKey() { return `albionQuizSeen:medium-hard:${selectedQuizCategory()}`; }
  function questionCategory(question) {
    const text = question.question.toLowerCase();
    if (/amex|goldstone|withdean|priestfield|ground|stadium|falmer|home venue/.test(text)) return 'grounds';
    if (/\bwho\b|which player|which goalkeeper|which forward|which midfielder|which defender|captain|goalscorer/.test(text)) return 'people';
    if (/record|most |how many|appearance|highest|lowest|largest|biggest|fewest|total/.test(text)) return 'records';
    if (/manager|managed|season|promotion|relegation|founded|league|fa cup|charity shield|europe|year|when|division|round|final/.test(text)) return 'history';
    return 'modern';
  }
  function selectFreshQuestions(count = 5) {
    const basePool = Q.filter(question => question.difficulty === 'Medium' || question.difficulty === 'Hard');
    const category = selectedQuizCategory();
    const categoryPool = category === 'mixed' ? basePool : basePool.filter(question => questionCategory(question) === category);
    const pool = categoryPool.length >= count ? categoryPool : basePool;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(poolKey())) || []; } catch {}
    let available = pool.filter(question => !seen.includes(question.question));
    if (available.length < count) { seen = []; available = [...pool]; }
    const mixed = shuffle(available); const chosen = [];
    ['history','people','grounds','records','modern'].forEach(category => {
      const match = mixed.find(question => questionCategory(question) === category && !chosen.includes(question)); if (match) chosen.push(match);
    });
    mixed.forEach(question => { if (chosen.length < count && !chosen.includes(question)) chosen.push(question); });
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
    localStorage.setItem(quizProgressKey, JSON.stringify({category:selectedQuizCategory(), currentQuiz, quizPage, quizScore}));
  }
  function newQuiz() {
    window.clearTimeout(quizAdvanceTimer);
    currentQuiz = selectFreshQuestions().map(prepareQuestion); quizPage = 0; quizScore = 0;
    $('shareQuiz').hidden = true;
    renderQuizPage();
  }
  function initialiseQuiz() {
    const savedCategory = localStorage.getItem('albionQuizCategory') || 'mixed';
    if ([...$('quizCategory').options].some(option => option.value === savedCategory)) $('quizCategory').value = savedCategory;
    try {
      const saved = JSON.parse(localStorage.getItem(quizProgressKey));
      if (saved?.category === selectedQuizCategory() && saved?.currentQuiz?.length === 5 && Number.isInteger(saved.quizPage) && saved.quizPage >= 0 && saved.quizPage < 5) {
        currentQuiz = saved.currentQuiz; quizPage = saved.quizPage; quizScore = Number(saved.quizScore) || 0;
        renderQuizPage(); return;
      }
    } catch {}
    newQuiz();
  }
  function showQuizResult() {
    const previousBest = Number(localStorage.getItem('albionQuizBest') || 0); const best = Math.max(previousBest, quizScore);
    localStorage.setItem('albionQuizBest', String(best)); $('bestScore').textContent = `Best: ${best}/5`;
    const verdict = quizScore === 5 ? 'Perfect Albion knowledge!' : quizScore >= 3 ? 'Strong Seagulls knowledge.' : 'Have another go.';
    const review = currentQuiz.map((question,index) => ({question,index})).sort((a,b) => Number(a.question.userCorrect) - Number(b.question.userCorrect));
    $('quizContainer').innerHTML = `<div class="quiz-finish"><img src="albion-safe-graphic.svg" alt=""><b>${quizScore}/5</b><p>${verdict}</p></div><details class="quiz-review"><summary>Review answers · mistakes shown first</summary>${review.map(({question,index}) => `<article class="${question.userCorrect ? 'review-correct' : 'review-mistake'}"><b>${index + 1}. ${esc(question.question)}</b><p>${esc(question.choices[question.answer].text)} — ${esc(question.explanation)}</p></article>`).join('')}</details>`;
    $('quizResult').textContent = 'Round complete.'; $('checkQuiz').disabled = true; $('checkQuiz').textContent = 'Round complete';
    $('shareQuiz').hidden = false; $('shareQuiz').dataset.shareText = `I scored ${quizScore}/5 in the Albion Fan Hub quiz.`;
    localStorage.removeItem(quizProgressKey);
  }
  function checkQuiz() {
    if (quizChecked) return;
    const group = quizGroups[quizPage];
    const answers = group.map(index => document.querySelector(`input[name="quizQuestion${index}"]:checked`));
    if (answers.some(answer => !answer)) { $('quizResult').textContent = group.length === 1 ? 'Choose an answer first.' : 'Answer both questions first.'; return; }
    group.forEach((index, groupIndex) => {
      const question = currentQuiz[index]; const selected = Number(answers[groupIndex].value); const correct = selected === question.answer;
      question.userCorrect = correct;
      if (correct) quizScore += 1;
      const fieldset = document.querySelector(`.quiz-question[data-question="${index}"]`); const labels = [...fieldset.querySelectorAll('label')];
      fieldset.classList.add(correct ? 'correct' : 'incorrect'); labels[question.answer].classList.add('answer-correct');
      if (!correct) labels[selected].classList.add('answer-wrong');
      fieldset.querySelectorAll('input').forEach(input => { input.disabled = true; });
      fieldset.querySelector('.quiz-feedback').innerHTML = `<b>${correct ? 'Correct!' : `Correct answer: ${esc(question.choices[question.answer].text)}.`}</b><br>${esc(question.explanation)}`;
    });
    const completed = quizGroups.slice(0, quizPage + 1).flat().length;
    $('quizResult').textContent = `Score: ${quizScore}/${completed}`; quizChecked = true; $('checkQuiz').disabled = true;
    const finalQuestion = quizPage === quizGroups.length - 1;
    $('checkQuiz').textContent = finalQuestion ? 'Results loading…' : 'Next question loading…';
    quizAdvanceTimer = window.setTimeout(() => {
      if (finalQuestion) showQuizResult();
      else { quizPage += 1; renderQuizPage(); }
    }, 3700);
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

  function leaguePredictor() {
    const slider = $('leaguePosition'); const output = $('leaguePositionOutput'); const band = $('leagueBand'); const summary = $('leaguePredictionSummary');
    const ordinal = value => {
      const number = Number(value); const mod100 = number % 100;
      if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
      return `${number}${number % 10 === 1 ? 'st' : number % 10 === 2 ? 'nd' : number % 10 === 3 ? 'rd' : 'th'}`;
    };
    const bandFor = position => position <= 4 ? 'Champions League places' : position <= 7 ? 'European places' : position <= 10 ? 'Top half' : position <= 16 ? 'Mid-table' : position <= 17 ? 'Lower table' : 'Relegation places';
    const update = () => {
      const label = ordinal(slider.value); output.value = label; output.textContent = label; band.textContent = bandFor(Number(slider.value));
      if ($('quickLeaguePosition')) $('quickLeaguePosition').textContent = `${label} · ${band.textContent}`;
    };
    const saved = Number(localStorage.getItem('albionLeaguePosition'));
    if (saved >= 1 && saved <= 20) slider.value = String(saved);
    update();
    if (!(saved >= 1 && saved <= 20) && $('quickLeaguePosition')) $('quickLeaguePosition').textContent = 'Not predicted yet';
    if (saved >= 1 && saved <= 20) summary.textContent = `Your prediction: Albion to finish ${ordinal(saved)} (${bandFor(saved)}).`;
    slider.addEventListener('input', update);
    $('saveLeaguePrediction').addEventListener('click', () => {
      localStorage.setItem('albionLeaguePosition', slider.value); update();
      summary.textContent = `Saved: Albion to finish ${ordinal(slider.value)} (${band.textContent}).`;
    });
    $('shareLeaguePrediction').dataset.defaultLabel = 'Share prediction';
    $('shareLeaguePrediction').addEventListener('click', () => shareText('My Albion league prediction', `I predict Brighton & Hove Albion will finish ${ordinal(slider.value)} in the 2026/27 Premier League.`, $('shareLeaguePrediction')));
  }

  function todayInAlbionHistory() {
    const memories = [...(C.facts || []), ...(C.memories || [])];
    const now = new Date(); let offset = 0;
    const show = () => {
      const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
      $('todayHistoryDate').textContent = new Intl.DateTimeFormat(undefined, {day:'numeric',month:'long'}).format(now);
      $('todayHistoryText').textContent = memories[(dayNumber + offset) % memories.length] || 'Albion history is made by the club and its supporters.';
    };
    $('anotherTodayHistory').addEventListener('click', () => { offset += 1; show(); });
    show();
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
      North:['North Stand','Behind the goal and traditionally one of the livelier home areas. The lower rows feel close to the action; check the club’s current accessibility information before booking.'],
      South:['South Stand','Includes the visiting-supporter allocation and adjoining home areas. Use the entrance printed on your ticket and expect additional stewarding for high-profile fixtures.'],
      East:['East Stand','Broad side-on views and family seating areas. A useful choice for supporters who prefer a clear tactical view of the whole pitch.'],
      West:['West Stand','The largest stand, with central seating, hospitality and elevated views. Upper areas provide a wide view but involve more steps and height.']
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

  function peopleDetails() {
    const eras = ['1970s','2000s','2010s','Modern era','Amex era','Premier League era'];
    const extras = [
      'Ward’s goals helped drive Albion’s rise towards the top flight and made him one of the club’s most celebrated forwards.',
      'Zamora became a defining figure in successive promotions and later returned for another Albion spell.',
      'Murray scored prolifically across two spells and played a major role in promotion to the Premier League.',
      'Dunk progressed through the academy to become a long-serving first-team leader.',
      'Bruno’s leadership and connection with supporters made him an enduring symbol of the Amex years.',
      'Groß combined creativity, intelligence and set-piece quality throughout Albion’s early Premier League seasons.'
    ];
    document.querySelectorAll('#people .legend-grid article').forEach((article,index) => {
      article.insertAdjacentHTML('beforeend', `<span class="era-tag">${eras[index]}</span><button class="people-more ghost" type="button" aria-expanded="false">More</button><p class="people-extra" hidden>${esc(extras[index])}</p>`);
      const button = article.querySelector('.people-more'); const extra = article.querySelector('.people-extra');
      button.addEventListener('click', () => { const hidden = extra.toggleAttribute('hidden'); button.textContent = hidden ? 'More' : 'Less'; button.setAttribute('aria-expanded', String(!hidden)); });
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
    const positions = ['top-left', 'middle-left', 'bottom-left', 'centre', 'top-right', 'middle-right', 'bottom-right'];
    const takers = [
      {name:'Danny Welbeck',number:18,skin:'#7b4934',hair:'#211712'},
      {name:'Georginio Rutter',number:10,skin:'#70402e',hair:'#17110e'},
      {name:'Yankuba Minteh',number:11,skin:'#5c3427',hair:'#16100d'},
      {name:'Diego Gómez',number:25,skin:'#b87855',hair:'#20150f'},
      {name:'Kaoru Mitoma',number:22,skin:'#d5a077',hair:'#1b1715'}
    ];
    const palacePreferences = ['middle-right','bottom-left','top-right','centre','middle-left'];
    let lineup = []; let albionResults = []; let palaceResults = []; let albionKicks = 0; let palaceKicks = 0;
    let albionGoals = 0; let palaceGoals = 0; let phase = 'shoot'; let locked = false; let recentTargets = [];
    let palaceSaves = 0; let palaceShotsOnTarget = 0; let albionRedMisses = 0; let panenkaAttempts = 0; let panenkaGoals = 0;
    let palacePlannedTarget = 'centre'; let lastKick = null;
    const ball = $('ball'); const shadow = $('ballShadow'); const keeper = $('keeper'); const taker = $('penaltyTaker'); const status = $('shootoutStatus'); const flash = $('goalFlash'); const goalFrame = $('goal'); const stadiumScene = goalFrame.closest('.stadium-scene');
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
      $('shootout').classList.add('game-active');
      const saving = phase === 'save'; const player = lineup[albionKicks % lineup.length];
      $('turnBadge').textContent = saving ? 'PALACE SHOOTS · YOU CONTROL VERBRUGGEN' : 'ALBION PENALTY · YOU ARE SHOOTING';
      $('turnBadge').className = `turn-badge ${saving ? 'palace-turn' : 'albion-turn'}`;
      $('shotControls').classList.toggle('controls-disabled', saving);
      $('panenkaButton').disabled = saving;
      goalFrame.classList.toggle('saving-turn', saving);
      taker.classList.toggle('palace-taker', saving);
      keeper.classList.toggle('user-keeper', saving);
      $('keeperNameTag').hidden = !saving;
      stadiumScene.classList.toggle('pressure-high', Math.max(albionKicks,palaceKicks) >= 4);
      if (saving) {
        const preferred = palacePreferences[palaceKicks % palacePreferences.length];
        palacePlannedTarget = Math.random() < .52 ? preferred : positions[Math.floor(Math.random() * positions.length)];
        const trueSide = palacePlannedTarget.includes('left') ? 'left' : palacePlannedTarget.includes('right') ? 'right' : 'centre';
        const cue = Math.random() < .63 ? trueSide : ['left','right','centre'][Math.floor(Math.random() * 3)];
        taker.classList.add(`cue-${cue}`);
        $('penaltyTakerName').textContent = `Palace taker ${palaceKicks + 1} · Bart Verbruggen in goal`;
        $('penaltyShirt').textContent = palaceKicks + 1;
        taker.style.setProperty('--player-skin', '#9b6548'); taker.style.setProperty('--player-hair', '#211611');
        announce('Choose Verbruggen’s dive', 'The website takes Palace’s penalty when you tap a direction.');
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
      const shotMap = (title, results) => `<section class="shot-map-card"><h4>${esc(title)}</h4><div class="shot-map">${positions.map((position,index) => {
        const shots = results.filter(result => result.target === position);
        return `<div class="shot-map-zone ${position}"><b>${index + 1}</b><span>${shots.map(result => `<i class="${result.scored ? 'map-goal' : 'map-out'}" title="${esc(result.label)}"></i>`).join('')}</span></div>`;
      }).join('')}</div></section>`;
      $('shootoutSummary').innerHTML = `<h3>Brighton v Palace shoot-out card</h3><ol>${rows}</ol><div class="shot-map-legend"><span><i class="map-goal"></i> Goal</span><span><i class="map-out"></i> Saved or missed</span></div><div class="shot-maps">${shotMap('Albion shots', albionResults)}${shotMap('Palace shots', palaceResults)}</div>`;
    }
    function reset() {
      albionKicks = 0; palaceKicks = 0; albionGoals = 0; palaceGoals = 0; phase = 'shoot'; locked = false;
      palaceSaves = 0; palaceShotsOnTarget = 0; albionRedMisses = 0; panenkaAttempts = 0; panenkaGoals = 0; lastKick = null;
      recentTargets = []; albionResults = []; palaceResults = []; lineup = shuffle(takers);
      $('shootoutSummary').hidden = true; $('shootoutSummary').innerHTML = '';
      $('shareShootout').hidden = true; $('replayKick').hidden = true;
      status.classList.remove('win-status','loss-status');
      goalFrame.classList.remove('albion-win','palace-win');
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
      $('panenkaButton').disabled = true;
      $('shootout').classList.remove('game-active');
      announce(albionWon ? 'SEAGULLS WIN!' : 'Palace win the shoot-out', `Brighton ${albionGoals}–${palaceGoals} Palace.`);
      status.classList.add(albionWon ? 'win-status' : 'loss-status');
      goalFrame.classList.add(albionWon ? 'albion-win' : 'palace-win');
      $('shootoutSummary').hidden = false; renderSummary();
      const conversion = albionKicks ? Math.round(albionGoals / albionKicks * 100) : 0;
      const saveRate = palaceShotsOnTarget ? Math.round(palaceSaves / palaceShotsOnTarget * 100) : 0;
      $('shootoutSummary').insertAdjacentHTML('beforeend', `<div class="shootout-stats"><article><b>${conversion}%</b><span>Albion conversion</span></article><article><b>${saveRate}%</b><span>Verbruggen save rate</span></article><article><b>${palaceSaves}</b><span>Palace penalties saved</span></article><article><b>${albionRedMisses}</b><span>Red-zone misses</span></article><article><b>${panenkaGoals}/${panenkaAttempts}</b><span>Panenkas scored</span></article><article><b>${palaceKicks > 5 ? palaceKicks - 5 : 0}</b><span>Sudden-death rounds</span></article></div>`);
      $('shareShootout').hidden = false; $('replayKick').hidden = !lastKick;
      $('shareShootout').dataset.shareText = `Seagulls ${albionGoals}–${palaceGoals} Eagles. I saved ${palaceSaves} Palace ${palaceSaves === 1 ? 'penalty' : 'penalties'} as Bart Verbruggen in the Albion Fan Hub shoot-out.`;
      if (albionWon) { flash.className = 'goal-flash win'; celebrationBurst(); playSfx('crowd'); }
      else playSfx('miss');
    }
    function animateShot({target, dive, missed, woodwork, saved, scored, slow, panenka = false}, replay = false) {
      if (!replay) lastKick = {target,dive,missed,woodwork,saved,scored,slow,panenka};
      if (slow) goalFrame.classList.add('slow-motion');
      taker.classList.add('run-up');
      const postSide = target.includes('left') ? 'left' : target.includes('right') ? 'right' : Math.random() > .5 ? 'left' : 'right';
      ball.className = `ball ${panenka ? (scored ? 'panenka-goal' : 'panenka-saved') : missed ? (postSide === 'left' ? 'shoot-wide-left' : 'shoot-wide-right') : woodwork ? `hit-post-${postSide}` : `shoot-${target}`}`;
      shadow.className = `ball-shadow shadow-${missed ? 'wide' : woodwork ? 'post' : target}`;
      keeper.className = `keeper ${phase === 'save' ? 'user-keeper ' : ''}dive-${dive}`;
      playSfx('kick'); vibrate(18);
      window.setTimeout(() => {
        flash.className = `goal-flash ${scored ? 'scored' : 'saved'}`;
        if (scored) goalFrame.classList.add('net-goal');
        if (woodwork) goalFrame.classList.add('woodwork');
        playSfx(scored ? 'goal' : woodwork ? 'post' : missed ? 'miss' : 'save');
        vibrate(saved ? [35,30,55] : woodwork ? [65,35,65] : scored ? 35 : 50);
      }, slow ? 1320 : 900);
    }
    function takeAlbionPenalty(button) {
      locked = true;
      targets.forEach(targetButton => { targetButton.disabled = true; });
      const player = lineup[albionKicks % lineup.length]; const target = button.dataset.target;
      const accuracy = liveAccuracy;
      const predictable = recentTargets.length >= 2 && recentTargets.slice(-2).every(item => item === target);
      const readsShot = Math.random() < (predictable ? .75 : .36);
      const dive = readsShot ? target : positions[Math.floor(Math.random() * positions.length)];
      const redZone = accuracy < .56;
      const missed = redZone;
      const woodwork = !missed && accuracy < .64 && Math.random() < .32;
      const sameSide = dive.split('-').pop() === target.split('-').pop();
      const saveChance = dive === target ? .62 : sameSide && target !== 'centre' ? .1 : 0;
      const saved = !missed && !woodwork && Math.random() < saveChance;
      const scored = !missed && !woodwork && !saved;
      const label = scored ? 'Goal' : woodwork ? 'Woodwork' : missed ? (redZone ? 'Missed: red zone' : 'Wide') : 'Saved';
      if (redZone) albionRedMisses += 1;
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
    function takePanenka() {
      if (locked || phase !== 'shoot') return;
      locked = true; targets.forEach(targetButton => { targetButton.disabled = true; }); $('panenkaButton').disabled = true;
      const player = lineup[albionKicks % lineup.length]; const scored = Math.random() < (1 / 3);
      const saved = !scored; const target = 'centre'; const dive = scored ? (Math.random() < .5 ? 'bottom-left' : 'bottom-right') : 'centre';
      panenkaAttempts += 1; if (scored) { panenkaGoals += 1; albionGoals += 1; }
      albionResults.push({scored,label:scored ? 'Panenka goal' : 'Panenka saved',target}); albionKicks += 1;
      const slow = true;
      announce(`${player.name} tries a Panenka…`, 'A brave, delicate gamble.');
      animateShot({target,dive,missed:false,woodwork:false,saved,scored,slow,panenka:true});
      window.setTimeout(() => {
        announce(scored ? 'PANENKA GOAL!' : 'PANENKA SAVED!', scored ? `${player.name} delicately chips the keeper.` : 'The Palace goalkeeper stays central and catches it.');
        renderLineup(); renderScore();
        window.setTimeout(() => { phase = 'save'; locked = false; setScene(); }, 900);
      }, 1650);
    }
    function takePalacePenalty(button) {
      locked = true; targets.forEach(targetButton => { targetButton.disabled = true; });
      const dive = button.dataset.target;
      const target = palacePlannedTarget;
      const missed = Math.random() < .1; const woodwork = !missed && Math.random() < .07;
      const sameSide = dive.split('-').pop() === target.split('-').pop();
      const saved = !missed && !woodwork && (dive === target ? Math.random() < .82 : sameSide && target !== 'centre' && Math.random() < .12);
      const scored = !missed && !woodwork && !saved;
      if (scored || saved) palaceShotsOnTarget += 1;
      if (saved) palaceSaves += 1;
      const saveType = target.includes('top') ? 'fingertip save' : target.includes('middle') ? 'one-handed parry' : target === 'centre' ? 'held safely' : 'strong low save';
      const label = scored ? 'Goal' : woodwork ? 'Woodwork' : missed ? 'Wide' : `Verbruggen: ${saveType}`;
      palaceResults.push({scored,label,target}); palaceKicks += 1; if (scored) palaceGoals += 1;
      const slow = palaceKicks >= 5;
      announce('Palace run up…', 'Hold your nerve.');
      animateShot({target,dive,missed,woodwork,saved,scored,slow});
      window.setTimeout(() => {
        announce(saved ? 'VERBRUGGEN SAVES!' : scored ? 'Palace score' : woodwork ? 'OFF THE POST!' : 'PALACE MISS!', saved ? `You guessed correctly: ${saveType}.` : scored ? 'The Eagles level the pressure.' : 'The ball stays out.');
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
    $('panenkaButton').addEventListener('click', takePanenka);
    document.addEventListener('keydown', event => {
      if (event.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const key = Number(event.key); if (key >= 1 && key <= 7) { event.preventDefault(); chooseTarget(targets[key - 1]); }
      if (event.key.toLowerCase() === 'p') { event.preventDefault(); takePanenka(); }
    });
    const shootoutCard = $('shootout');
    const updateFullscreenButton = () => {
      const active = document.fullscreenElement === shootoutCard || document.body.classList.contains('shootout-focus');
      $('fullscreenShootout').textContent = active ? 'Exit full screen' : 'Full-screen game';
    };
    $('fullscreenShootout').addEventListener('click', async () => {
      if (document.fullscreenElement === shootoutCard) { await document.exitFullscreen(); }
      else if (document.body.classList.contains('shootout-focus')) { document.body.classList.remove('shootout-focus'); }
      else if (shootoutCard.requestFullscreen) {
        try { await shootoutCard.requestFullscreen(); } catch { document.body.classList.add('shootout-focus'); }
      } else document.body.classList.add('shootout-focus');
      updateFullscreenButton();
    });
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('shootout-focus')) {
        document.body.classList.remove('shootout-focus'); updateFullscreenButton();
      }
    });
    $('replayKick').addEventListener('click', () => {
      if (!lastKick || locked) return;
      clearMotion(); if (phase === 'save') taker.classList.add('palace-taker'); locked = true; animateShot(lastKick, true);
      window.setTimeout(() => { locked = false; $('replayKick').hidden = false; }, lastKick.slow ? 1700 : 1250);
    });
    $('shareShootout').dataset.defaultLabel = 'Share result';
    $('shareShootout').addEventListener('click', () => shareText('Albion Fan Hub shoot-out', $('shareShootout').dataset.shareText, $('shareShootout')));
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
    let touchStart = 0;
    $('nextFixtureCarousel').addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, {passive:true});
    $('nextFixtureCarousel').addEventListener('touchend', event => {
      const distance = event.changedTouches[0].clientX - touchStart; if (Math.abs(distance) < 40) return;
      index = distance < 0 ? (index + 1) % fixtures.length : (index + fixtures.length - 1) % fixtures.length; render();
    }, {passive:true});
    render();
  }

  function calendarDownload() {
    const monthNumbers = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
    const compactDate = date => { const [day, month, year] = date.split(' '); return `${year}${monthNumbers[month]}${String(day).padStart(2,'0')}`; };
    const nextDay = date => { const [day, month, year] = date.split(' '); const d = new Date(Date.UTC(Number(year), Number(monthNumbers[month]) - 1, Number(day) + 1)); return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`; };
    const eventText = (fixture, index) => {
      const title = fixture.venue === 'H' ? `Brighton & Hove Albion v ${fixture.opponent}` : `${fixture.opponent} v Brighton & Hove Albion`;
      return ['BEGIN:VEVENT',`UID:albion-${index + 1}-2026@albion-fan-hub`,`DTSTART;VALUE=DATE:${compactDate(fixture.date)}`,`DTEND;VALUE=DATE:${nextDay(fixture.date)}`,`SUMMARY:${title}`,`DESCRIPTION:Premier League fixture. Date and kick-off subject to change. Check the official Albion website.`,`LOCATION:${fixture.venue === 'H' ? 'Amex Stadium, Falmer' : 'Away fixture'}`,'END:VEVENT'].join('\r\n');
    };
    const download = (events, filename) => {
      const calendar = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Albion Fan Hub//Fixtures 2026-27//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${events}\r\nEND:VCALENDAR\r\n`;
      const url = URL.createObjectURL(new Blob([calendar], {type:'text/calendar;charset=utf-8'})); const link = document.createElement('a');
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    $('downloadCalendar').addEventListener('click', event => {
      event.preventDefault();
      download((C.fixtures || []).map(eventText).join('\r\n'), 'albion-fixtures-2026-27.ics');
    });
    $('fixtureList').addEventListener('click', event => {
      const button = event.target.closest('[data-calendar-index]'); if (!button) return;
      const index = Number(button.dataset.calendarIndex); const fixture = C.fixtures[index]; if (!fixture) return;
      download(eventText(fixture,index), `albion-${fixture.opponent.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.ics`);
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
    $('resetSite').addEventListener('click', () => { if (window.confirm && !window.confirm('Reset saved quiz, team, predictions, fixture, sound, theme and cookie choices?')) return; Object.keys(localStorage).filter(key => key.startsWith('albionQuizSeen:')).forEach(key => localStorage.removeItem(key)); ['albionXI','albionPrediction','albionLeaguePosition','albionQuizBest','albionQuizProgress','albionQuizCategory','albionLastSection','albionFixtureMonth','albionSound','albionCookieNotice','albionTheme'].forEach(key => localStorage.removeItem(key)); window.location.reload(); });
  }

  function siteExperience() {
    const search = $('siteSearch'); const results = $('siteSearchResults');
    const searchable = [
      ['quiz','Quiz'],['shootout','Penalty shoot-out'],['match-centre','Matchday'],['fixtures','Fixtures'],
      ['xi','Pick your XI'],['predictor','Match predictor'],['league-predictor','League position predictor'],['today-history','Today in Albion history'],['story','Albion Story'],['records','Records & Honours'],
      ['travel','Getting to the Amex'],['anthem','Sussex by the Sea']
    ];
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      if (query.length < 2) { results.innerHTML = ''; return; }
      const matches = searchable.filter(([id,label]) => `${label} ${$(id)?.textContent || ''}`.toLowerCase().includes(query)).slice(0,6);
      results.innerHTML = matches.length ? matches.map(([id,label]) => `<a href="#${id}">${esc(label)}</a>`).join('') : '<span>No matching section found.</span>';
    });
    results.addEventListener('click', () => { search.value = ''; results.innerHTML = ''; });
    const theme = $('themeToggle');
    const setTheme = night => {
      document.body.classList.toggle('night-theme', night); theme.setAttribute('aria-pressed', String(night));
      theme.textContent = night ? 'Day-match theme' : 'Night-match theme'; localStorage.setItem('albionTheme', night ? 'night' : 'day');
    };
    setTheme(localStorage.getItem('albionTheme') === 'night');
    theme.addEventListener('click', () => setTheme(!document.body.classList.contains('night-theme')));
    const continueButton = $('continueButton'); const previousSection = localStorage.getItem('albionLastSection');
    const previousMatch = searchable.find(([id]) => id === previousSection);
    if (previousMatch) {
      continueButton.hidden = false; continueButton.textContent = `Continue: ${previousMatch[1]}`;
      continueButton.addEventListener('click', () => $(previousSection)?.scrollIntoView({behavior:'smooth',block:'start'}));
    }
    if ('IntersectionObserver' in window) {
      window.setTimeout(() => {
        const observer = new IntersectionObserver(entries => {
          const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible?.target?.id) localStorage.setItem('albionLastSection', visible.target.id);
        }, {threshold:[.35,.65]});
        searchable.forEach(([id]) => { if ($(id)) observer.observe($(id)); });
      }, 1200);
    }
    $('shareXI').dataset.defaultLabel = 'Share XI';
    $('shareXI').addEventListener('click', () => {
      const players = [...document.querySelectorAll('#pitch select')].map(select => select.value).filter(Boolean);
      const text = players.length === 11 ? `My Albion ${$('formation').value}: ${players.join(', ')}.` : `I am building my Albion ${$('formation').value} in the Albion Fan Hub.`;
      shareText('My Albion XI', text, $('shareXI'));
    });
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
    $('quizCategory').addEventListener('change', () => { localStorage.setItem('albionQuizCategory', $('quizCategory').value); localStorage.removeItem(quizProgressKey); newQuiz(); });
    $('checkQuiz').addEventListener('click', checkQuiz);
    $('shareQuiz').dataset.defaultLabel = 'Share quiz result';
    $('shareQuiz').addEventListener('click', () => shareText('Albion Fan Hub quiz', $('shareQuiz').dataset.shareText, $('shareQuiz')));
    $('bestScore').textContent = `Best: ${localStorage.getItem('albionQuizBest') || 0}/5`;
  }

  matchConfiguration(); countdown(); setInterval(countdown, 60000); renderSquad(); initXI(); initFixtureMonths(); renderFixtures(); predictor(); leaguePredictor(); todayInAlbionHistory(); randomContent(); weather(); amex(); story(); historyDetails(); peopleDetails(); recordTabs(); travelGuide(); shootout(); fixtureCarousel(); calendarDownload(); soundAndInstall(); pageUtilities(); siteExperience(); ui(); initialiseQuiz();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./service-worker.js').then(registration => {
      const showUpdate = () => { if (navigator.serviceWorker.controller) $('updateNotice').hidden = false; };
      if (registration.waiting) showUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') showUpdate(); });
      });
      $('reloadUpdate').addEventListener('click', () => window.location.reload());
    }).catch(() => {});
  }
})();
