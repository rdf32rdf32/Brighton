(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  document.querySelectorAll('[data-diagnostic],.diagnostic-panel,.site-health-output,#diagnosticStatus').forEach(el => (el.closest('section') || el).hidden = true);

  // Difficult mode: clues avoid nationality/position until late and use a broader Albion pool.
  const players = [
    {name:'Lewis Dunk',clues:['My first Albion league appearance came away from the Amex era.','I scored a memorable free-kick at Anfield.','I have captained the club in the Premier League.'],note:'Academy graduate and long-serving captain.'},
    {name:'Kaoru Mitoma',clues:['My university studies examined dribbling.','I scored a late FA Cup winner at Stoke in 2023.','I am a Japan international winger.'],note:'Japan international known for elite one-against-one play.'},
    {name:'Danny Welbeck',clues:['I scored Premier League goals for three clubs before joining Albion.','I won major honours in Manchester and London.','Supporters often call me Dat Guy.'],note:'Experienced England international forward.'},
    {name:'Solly March',clues:['I made my senior Albion debut before the club reached the Premier League.','I have played on both flanks and at wing-back.','I joined the club from Lewes.'],note:'Long-serving Sussex-born wide player.'},
    {name:'Bart Verbruggen',clues:['I played European football in Belgium before moving to Sussex.','I became my country’s first-choice goalkeeper while at Albion.','I joined from Anderlecht.'],note:'Dutch international goalkeeper.'},
    {name:'Pascal Groß',clues:['One of my signature moves became known simply by my surname.','I scored the club’s first goal in the Premier League.','I joined Albion from Ingolstadt.'],note:'Modern Albion great and creator.'},
    {name:'Glenn Murray',clues:['I scored for Albion in three different divisions.','I returned to the club after playing for our biggest rivals.','I led the scoring in the 2016–17 promotion season.'],note:'Prolific striker over two spells.'},
    {name:'Bobby Zamora',clues:['I scored the final goal at one Albion home ground and later returned at another.','I helped win consecutive promotions under Micky Adams and Peter Taylor.','My surname fits one of the club’s best-known chants.'],note:'Iconic striker of the early-2000s rise.'},
    {name:'Bruno',clues:['I arrived in Sussex after playing in Spain’s top flight.','I wore number 2 and became known for calm possession.','Supporters called me El Capitán.'],note:'Cult captain and elegant right-back.'},
    {name:'Gordon Smith',clues:['I won a European trophy before joining Albion.','My defining Albion moment came at Wembley in 1983.','The commentary said I “must score”.'],note:'Scottish forward forever linked with the 1983 final.'},
    {name:'Peter Ward',clues:['My first full Albion season produced more than 30 league goals.','I formed a celebrated partnership with Ian Mellor.','I became the club’s great 1970s goalscoring idol.'],note:'One of Albion’s most loved strikers.'},
    {name:'Vicente',clues:['I had already won league and European honours before arriving at the Amex.','Injuries limited my appearances but not my reputation.','I was nicknamed the Dagger of Benicalap.'],note:'Gifted Spanish playmaker.'},
    {name:'Steve Foster',clues:['A headband became part of my football identity.','I captained Albion in the 1983 FA Cup final.','I was an England international centre-back.'],note:'1983 captain and defensive leader.'},
    {name:'Brian Horton',clues:['I captained Albion through two promotions.','I later managed the club in the 1990s.','I was known as Nobby.'],note:'Influential captain and later manager.'},
    {name:'Gary Hart',clues:['I was signed after being spotted in non-league football.','I played in several positions across more than a decade.','Supporters knew me as OGH.'],note:'Versatile Withdean-era favourite.'},
    {name:'Michel Kuipers',clues:['I joined from Bristol Rovers in 2000.','I was a key figure through the Withdean promotion years.','Supporters called me FDM.'],note:'Popular Dutch goalkeeper.'},
    {name:'Liam Bridcutt',clues:['I won Albion Player of the Season twice in succession.','My role was central to Gus Poyet’s midfield.','I later followed that manager to Sunderland.'],note:'Outstanding holding midfielder of the early Amex era.'},
    {name:'Anthony Knockaert',clues:['I won the Championship Player of the Year award while at Albion.','A family tragedy shaped an emotional promotion season.','I was a French winger signed from Standard Liège.'],note:'Promotion-winning creative winger.'},
    {name:'David Stockdale',clues:['Two saves against the same opponent helped Albion secure promotion.','I joined from Fulham.','I was the goalkeeper in the 2016–17 promotion campaign.'],note:'Promotion-season goalkeeper.'},
    {name:'Inigo Calderon',clues:['I arrived from Alavés.','I was a right-back who frequently contributed goals.','Supporters admired my professionalism during the Withdean-to-Amex transition.'],note:'Popular Spanish full-back.'}
  ];
  const start=$('guessStart'),next=$('guessNextClue'),clue=$('guessClue'),choices=$('guessChoices'),result=$('guessResult'),silhouette=document.querySelector('.guess-silhouette');
  let current=null,index=0,locked=false,last='';
  const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  function showClue(){clue.innerHTML=`<span class="clue-count">Clue ${index+1} of 3 · Hard mode</span>${current.clues.slice(0,index+1).join(' ')}`}
  function begin(){const pool=players.filter(p=>p.name!==last);current=pool[Math.floor(Math.random()*pool.length)];last=current.name;index=0;locked=false;showClue();result.textContent='';next.disabled=false;start.textContent='New player';if(silhouette){silhouette.classList.remove('revealed');silhouette.querySelector('span').textContent='?'}const options=shuffle([current,...shuffle(players.filter(p=>p!==current)).slice(0,3)]);choices.replaceChildren(...options.map(p=>{const b=document.createElement('button');b.type='button';b.className='ghost guess-choice';b.textContent=p.name;b.addEventListener('click',()=>{if(locked)return;locked=true;const ok=p===current;choices.querySelectorAll('button').forEach(x=>{x.disabled=true;if(x.textContent===current.name)x.classList.add('correct-choice')});if(!ok)b.classList.add('wrong-choice');result.innerHTML=ok?`<b>Correct.</b> ${current.note}`:`<b>Not this time.</b> It was ${current.name}. ${current.note}`;next.disabled=true;start.textContent='Next player';if(silhouette){silhouette.classList.add('revealed');silhouette.querySelector('span').textContent=current.name.split(' ').map(w=>w[0]).join('')}});return b}))}
  start?.addEventListener('click',begin);next?.addEventListener('click',()=>{if(!current||locked)return;index=Math.min(2,index+1);showClue();if(index===2)next.disabled=true});

  // Keep team visuals and rear shirt name synchronised with the existing game controller.
  const taker=$('penaltyTaker'),keeper=$('keeper'),shirt=$('penaltyShirt'),name=$('penaltyPlayerName');
  function sync(){if(!taker||!keeper)return;const palace=taker.classList.contains('palace-taker')||shirt?.dataset.player==='PALACE';taker.dataset.team=palace?'palace':'brighton';keeper.dataset.team=palace?'brighton':'palace';if(name){const raw=shirt?.dataset.player||'';name.textContent=palace?'PALACE':(raw && raw!=='PALACE'?raw.slice(0,10):'ALBION')}}
  if(taker)new MutationObserver(sync).observe(taker,{attributes:true,attributeFilter:['class']});if(shirt)new MutationObserver(sync).observe(shirt,{attributes:true,attributeFilter:['data-player'],childList:true});sync();
  document.documentElement.classList.add('v42-ready');
})();