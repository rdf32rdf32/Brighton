(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // Hide technical diagnostics from supporters while retaining the internal checks.
  const diagnostic = $('diagnosticStatus');
  if (diagnostic) diagnostic.closest('section')?.setAttribute('hidden', '');
  document.querySelectorAll('[data-diagnostic], .diagnostic-panel, .site-health-output').forEach((el) => el.setAttribute('hidden', ''));

  // Reliable Guess the Player game. This replaces the inactive legacy v31 implementation.
  const guessStart = $('guessStart');
  const guessNext = $('guessNextClue');
  const guessClue = $('guessClue');
  const guessChoices = $('guessChoices');
  const guessResult = $('guessResult');
  const silhouette = document.querySelector('.guess-silhouette');

  const guessPlayers = [
    { name: 'Lewis Dunk', era: 'Current', clues: ['I came through Albion’s academy.', 'I am a central defender and long-serving captain.', 'I have made more than 400 senior appearances for Brighton.'], note: 'Albion academy graduate, centre-back and club captain.' },
    { name: 'Kaoru Mitoma', era: 'Current', clues: ['I am an international winger.', 'I represent Japan.', 'My close control and acceleration made me an immediate Premier League favourite.'], note: 'Japan international winger known for dribbling and direct running.' },
    { name: 'Danny Welbeck', era: 'Current', clues: ['I am an experienced England international forward.', 'I previously played for Manchester United and Arsenal.', 'Albion supporters know me as Dat Guy.'], note: 'Experienced striker and important senior figure in the squad.' },
    { name: 'Solly March', era: 'Current', clues: ['I joined Albion as a teenager.', 'I can play as a winger or wing-back.', 'I scored twice in the 3–3 draw at Anfield in 2022.'], note: 'Long-serving academy-developed wide player.' },
    { name: 'Bart Verbruggen', era: 'Current', clues: ['I am a goalkeeper from the Netherlands.', 'I joined Albion from Anderlecht.', 'I became the Netherlands’ first-choice goalkeeper while at Brighton.'], note: 'Dutch international goalkeeper.' },
    { name: 'Pascal Groß', era: 'Modern', clues: ['I am a German midfielder.', 'I scored Albion’s first Premier League goal.', 'My turns, delivery and intelligence made me a modern club favourite.'], note: 'Scorer of Brighton’s first Premier League goal and a modern Albion great.' },
    { name: 'Glenn Murray', era: 'Modern', clues: ['I had two spells with Albion.', 'I was the leading scorer in the promotion season to the Premier League.', 'I also played for Crystal Palace, but my greatest years came in blue and white.'], note: 'Prolific striker across two Albion spells.' },
    { name: 'Bobby Zamora', era: 'Withdean', clues: ['I was a striker in two Albion spells.', 'I helped the club win consecutive promotions.', 'Supporters sang that when the ball hits the goal, it is not Shearer or Cole.'], note: 'Iconic striker of the early-2000s promotion teams.' },
    { name: 'Bruno', era: 'Modern', clues: ['I am Spanish and arrived late in my playing career.', 'Supporters called me El Capitán.', 'My beard and composure made me one of the most recognisable Amex-era players.'], note: 'Cult captain and elegant right-back.' },
    { name: 'Gordon Smith', era: 'Classic', clues: ['I was a Scotland international forward.', 'I played in Albion’s most famous cup final.', 'A commentator once said I “must score”.'], note: 'Remembered forever for the 1983 FA Cup final.' },
    { name: 'Peter Ward', era: 'Classic', clues: ['I became an Albion hero in the 1970s.', 'I was a quick, instinctive striker.', 'My goals helped carry Brighton towards the top flight.'], note: 'One of the club’s most loved goalscorers.' },
    { name: 'Vicente', era: 'Amex', clues: ['I was a gifted Spanish midfielder.', 'I previously won La Liga and the UEFA Cup.', 'Injuries limited me, but my quality at the Amex was unmistakable.'], note: 'Brief but memorable Amex-era Spanish playmaker.' }
  ];

  let guessCurrent = null;
  let clueIndex = 0;
  let lastPlayer = '';
  let guessLocked = false;

  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renderGuessChoices() {
    const alternatives = shuffled(guessPlayers.filter((p) => p.name !== guessCurrent.name)).slice(0, 3);
    const options = shuffled([guessCurrent, ...alternatives]);
    guessChoices.replaceChildren();
    options.forEach((player) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ghost guess-choice';
      button.textContent = player.name;
      button.addEventListener('click', () => answerGuess(player, button));
      guessChoices.appendChild(button);
    });
  }

  function answerGuess(player, selectedButton) {
    if (guessLocked || !guessCurrent) return;
    guessLocked = true;
    const correct = player.name === guessCurrent.name;
    guessChoices.querySelectorAll('button').forEach((button) => {
      button.disabled = true;
      if (button.textContent === guessCurrent.name) button.classList.add('correct-choice');
    });
    if (!correct) selectedButton.classList.add('wrong-choice');
    guessResult.innerHTML = correct
      ? `<b>Correct.</b> ${guessCurrent.note}`
      : `<b>Not this time.</b> It was ${guessCurrent.name}. ${guessCurrent.note}`;
    guessResult.className = `result ${correct ? 'guess-correct' : 'guess-wrong'}`;
    guessNext.disabled = true;
    guessStart.textContent = 'Next player';
    silhouette?.classList.add('revealed');
    if (silhouette) silhouette.querySelector('span').textContent = guessCurrent.name.split(' ').map((word) => word[0]).join('');
  }

  function startGuess() {
    const pool = guessPlayers.filter((player) => player.name !== lastPlayer);
    guessCurrent = pool[Math.floor(Math.random() * pool.length)];
    lastPlayer = guessCurrent.name;
    clueIndex = 0;
    guessLocked = false;
    guessClue.innerHTML = `<span class="clue-count">Clue 1 of 3</span>${guessCurrent.clues[0]}`;
    guessResult.textContent = '';
    guessResult.className = 'result';
    guessNext.disabled = false;
    guessStart.textContent = 'New player';
    silhouette?.classList.remove('revealed');
    if (silhouette) silhouette.querySelector('span').textContent = '?';
    renderGuessChoices();
  }

  guessStart?.addEventListener('click', startGuess);
  guessNext?.addEventListener('click', () => {
    if (!guessCurrent || guessLocked) return;
    clueIndex = Math.min(2, clueIndex + 1);
    guessClue.innerHTML = `<span class="clue-count">Clue ${clueIndex + 1} of 3</span>${guessCurrent.clues.slice(0, clueIndex + 1).join(' ')}`;
    if (clueIndex === 2) guessNext.disabled = true;
  });

  // Keep kit state and the unified rig in sync with the current game turn.
  const taker = $('penaltyTaker');
  const keeper = $('keeper');
  const shirt = $('penaltyShirt');
  if (taker && keeper) {
    const syncKits = () => {
      taker.classList.add('taker-v38');
      keeper.classList.add('keeper-v38');
      const palace = taker.classList.contains('palace-taker') || shirt?.dataset.player === 'PALACE';
      taker.dataset.team = palace ? 'palace' : 'brighton';
      keeper.dataset.team = palace ? 'brighton' : 'palace';
    };
    new MutationObserver(syncKits).observe(taker, { attributes: true, attributeFilter: ['class'] });
    if (shirt) new MutationObserver(syncKits).observe(shirt, { attributes: true, attributeFilter: ['data-player'], childList: true });
    syncKits();
  }

  document.documentElement.classList.add('v38-ready');
})();
