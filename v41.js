(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // Hide technical/diagnostic UI.
  document.querySelectorAll('[data-diagnostic], .diagnostic-panel, .site-health-output, #diagnosticStatus').forEach((el) => {
    const section = el.closest('section');
    (section || el).hidden = true;
  });

  // Reliable Guess the Player controller.
  const players = [
    ['Lewis Dunk',['I came through Albion’s academy.','I am a central defender and long-serving captain.','I have made more than 400 senior appearances for Brighton.'],'Albion academy graduate, centre-back and club captain.'],
    ['Kaoru Mitoma',['I am an international winger.','I represent Japan.','Close control and acceleration are central to my game.'],'Japan international winger known for direct running.'],
    ['Danny Welbeck',['I am an experienced England international forward.','I previously played for Manchester United and Arsenal.','Albion supporters know me as Dat Guy.'],'Experienced striker and senior squad figure.'],
    ['Solly March',['I joined Albion as a teenager.','I can play as a winger or wing-back.','I am one of the club’s longest-serving modern players.'],'Long-serving academy-developed wide player.'],
    ['Bart Verbruggen',['I am a goalkeeper from the Netherlands.','I joined Albion from Anderlecht.','I became a Netherlands international while at Brighton.'],'Dutch international goalkeeper.'],
    ['Pascal Groß',['I am a German midfielder.','I scored Albion’s first Premier League goal.','My turns and delivery made me a modern club favourite.'],'Scorer of Brighton’s first Premier League goal.'],
    ['Glenn Murray',['I had two spells with Albion.','I led the scoring in the promotion season.','I am one of the club’s most prolific modern strikers.'],'Prolific striker across two Albion spells.'],
    ['Bobby Zamora',['I was a striker in two Albion spells.','I helped the club win consecutive promotions.','My name featured in one of Albion’s best-known songs.'],'Iconic striker of the early-2000s promotion teams.'],
    ['Bruno',['I am Spanish.','Supporters called me El Capitán.','My beard and composure made me an Amex-era favourite.'],'Cult captain and elegant right-back.'],
    ['Gordon Smith',['I was a Scotland international forward.','I played in Albion’s most famous cup final.','A commentator once said I “must score”.'],'Remembered forever for the 1983 FA Cup final.'],
    ['Peter Ward',['I became an Albion hero in the 1970s.','I was a quick, instinctive striker.','My goals helped carry Brighton towards the top flight.'],'One of the club’s most loved goalscorers.'],
    ['Vicente',['I was a gifted Spanish midfielder.','I previously won La Liga and the UEFA Cup.','My quality at the Amex was unmistakable.'],'Memorable Amex-era Spanish playmaker.']
  ].map(([name, clues, note]) => ({name, clues, note}));

  const start = $('guessStart'), next = $('guessNextClue'), clue = $('guessClue'), choices = $('guessChoices'), result = $('guessResult');
  const silhouette = document.querySelector('.guess-silhouette');
  let current = null, clueIndex = 0, locked = false, last = '';
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const renderClue = () => {
    clue.innerHTML = `<span class="clue-count">Clue ${clueIndex + 1} of 3</span>${current.clues.slice(0, clueIndex + 1).join(' ')}`;
  };
  const begin = () => {
    const pool = players.filter((p) => p.name !== last);
    current = pool[Math.floor(Math.random() * pool.length)];
    last = current.name; clueIndex = 0; locked = false;
    renderClue(); result.textContent = ''; result.className = 'result'; next.disabled = false; start.textContent = 'New player';
    if (silhouette) { silhouette.classList.remove('revealed'); silhouette.querySelector('span').textContent = '?'; }
    const opts = shuffle([current, ...shuffle(players.filter((p) => p !== current)).slice(0, 3)]);
    choices.replaceChildren(...opts.map((p) => {
      const b = document.createElement('button'); b.type='button'; b.className='ghost guess-choice'; b.textContent=p.name;
      b.addEventListener('click', () => {
        if (locked) return; locked = true;
        const correct = p === current;
        choices.querySelectorAll('button').forEach((x) => { x.disabled = true; if (x.textContent === current.name) x.classList.add('correct-choice'); });
        if (!correct) b.classList.add('wrong-choice');
        result.innerHTML = correct ? `<b>Correct.</b> ${current.note}` : `<b>Not this time.</b> It was ${current.name}. ${current.note}`;
        result.className = `result ${correct ? 'guess-correct' : 'guess-wrong'}`; next.disabled = true; start.textContent='Next player';
        if (silhouette) { silhouette.classList.add('revealed'); silhouette.querySelector('span').textContent = current.name.split(' ').map(w=>w[0]).join(''); }
      });
      return b;
    }));
  };
  start?.addEventListener('click', begin);
  next?.addEventListener('click', () => { if (!current || locked) return; clueIndex = Math.min(2, clueIndex + 1); renderClue(); if (clueIndex === 2) next.disabled = true; });

  // Kit synchronisation and click-lock protection.
  const taker = $('penaltyTaker'), keeper = $('keeper'), shirt = $('penaltyShirt');
  const syncKits = () => {
    if (!taker || !keeper) return;
    const palace = taker.classList.contains('palace-taker') || shirt?.dataset.player === 'PALACE';
    taker.dataset.team = palace ? 'palace' : 'brighton'; keeper.dataset.team = palace ? 'brighton' : 'palace';
  };
  if (taker) new MutationObserver(syncKits).observe(taker,{attributes:true,attributeFilter:['class']});
  if (shirt) new MutationObserver(syncKits).observe(shirt,{attributes:true,attributeFilter:['data-player'],childList:true});
  syncKits();

  document.querySelectorAll('#penalty-game button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.clickLock === '1') return;
      button.dataset.clickLock = '1';
      window.setTimeout(() => delete button.dataset.clickLock, 350);
    }, {capture:true});
  });

  document.documentElement.classList.add('v41-ready');
})();
