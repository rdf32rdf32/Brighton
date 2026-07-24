(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const shuffle = input => {
    const a=[...input];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };

  /* Expert Guess the Player: indirect clues first, reveal facts only late. */
  const players = [
    {name:'Lewis Dunk',era:'modern',role:'defender',clues:['A loan spell away from Sussex preceded my emergence as an Albion regular.','One of my unusual Premier League goals came directly from a quickly taken set piece.','I appeared for the club in three different divisions.','My senior international debut came after I had already passed 300 Albion appearances.','I became the long-serving captain of my boyhood club.'],note:'Academy graduate, promotion winner and long-serving captain.'},
    {name:'Solly March',era:'modern',role:'wide',clues:['My route into professional football included time at a Sussex non-league club.','My senior debut came in a cup competition before Albion reached the Premier League.','A serious knee injury interrupted one of my strongest top-flight seasons.','I have operated as a winger, wing-back and full-back.','I joined Albion from Lewes.'],note:'Versatile long-serving Sussex wide player.'},
    {name:'Pascal Groß',era:'modern',role:'midfielder',clues:['A turn associated with me became part of Albion supporters’ football vocabulary.','Before England, I played for clubs in both northern and southern Germany.','I supplied an assist in Albion’s first Premier League victory.','I scored Albion’s first Premier League goal.','I joined from Ingolstadt.'],note:'Creative midfielder and modern Albion great.'},
    {name:'Glenn Murray',era:'modern',role:'forward',clues:['My Albion career was interrupted by spells at three other English clubs.','I scored at both Withdean and the Amex for Albion.','My second spell produced more top-flight goals than my first.','I once represented Palace between two spells with Brighton.','I was the leading scorer in the 2016–17 promotion season.'],note:'Prolific striker over two Albion spells.'},
    {name:'Bruno',era:'modern',role:'defender',clues:['I arrived after spending most of my career on Spain’s east coast.','My first Albion league season ended in play-off disappointment.','My calm use of the ball made me unusual for my position in the Championship.','I later joined the club’s coaching staff.','Supporters called me El Capitán.'],note:'Elegant right-back, captain and cult hero.'},
    {name:'Anthony Knockaert',era:'modern',role:'wide',clues:['I had already experienced Championship promotion before moving to Sussex.','My first full Albion season ended without promotion despite an individual award.','I scored a dramatic late winner against Sheffield Wednesday at the Amex.','I joined Albion from Standard Liège.','I was Championship Player of the Year in the promotion campaign.'],note:'Creative winger central to Albion’s promotion.'},
    {name:'Liam Bridcutt',era:'amex',role:'midfielder',clues:['My early senior career included several loans without a league appearance for my parent club.','I became essential in a possession-heavy Albion side.','I was voted Albion’s best player in consecutive seasons.','I later reunited with my former manager in the north-east.','I was the holding midfielder in Gus Poyet’s side.'],note:'Outstanding defensive midfielder of the early Amex era.'},
    {name:'Inigo Calderon',era:'amex',role:'defender',clues:['My first permanent move outside my home country brought me to Sussex.','I scored unusually often for a player in my position.','I played for Albion at two home grounds.','I later worked in coaching and academy football in England.','I arrived from Alavés.'],note:'Popular Spanish full-back from the Withdean-to-Amex transition.'},
    {name:'Vicente',era:'amex',role:'midfielder',clues:['Before Sussex, I played in two Champions League finals with the same club.','My Albion appearances were limited, but several came from the bench.','I scored twice in one home match against Portsmouth.','I had won La Liga and the UEFA Cup.','I was known as the Dagger of Benicalap.'],note:'Gifted Spanish international whose brief Albion spell became cult history.'},
    {name:'Michel Kuipers',era:'withdean',role:'goalkeeper',clues:['Before arriving in Sussex, I had played league football in both England and the Netherlands.','My Albion years included three promotions and a serious car accident.','I played more than 200 league matches for the club.','I competed with several goalkeepers during the Withdean era.','Supporters called me FDM.'],note:'Popular Dutch goalkeeper of the Withdean years.'},
    {name:'Gary Hart',era:'withdean',role:'forward',clues:['A small transfer fee followed an impressive performance against Albion reserves.','I was used in defence, midfield and attack.','I scored in the club’s final match at the Goldstone’s temporary successor before Withdean.','My Albion career lasted well over a decade.','Supporters abbreviated my nickname to OGH.'],note:'Versatile and enduring Withdean-era favourite.'},
    {name:'Bobby Zamora',era:'withdean',role:'forward',clues:['My first Albion spell began with a loan from a club in the west of England.','I scored in promotion-winning seasons under two different managers.','I later returned after playing Premier League football and representing England.','I scored the final competitive goal at Withdean.','A famous chant rhymes my surname with “the ball’s in the net”.'],note:'Iconic striker of Albion’s early-2000s rise.'},
    {name:'Peter Ward',era:'historic',role:'forward',clues:['My senior career began outside the Football League.','I scored a hat-trick on my Albion debut.','A move across the Atlantic interrupted my English career.','I formed a celebrated partnership with Ian Mellor.','I became Albion’s great goalscoring idol of the late 1970s.'],note:'One of Albion’s most celebrated strikers.'},
    {name:'Brian Horton',era:'historic',role:'midfielder',clues:['I joined Albion after captaining another club to promotion.','I took penalties and supplied leadership from midfield.','I later returned in a different senior role.','I captained Albion through two promotions.','I was widely known as Nobby.'],note:'Influential captain and later Albion manager.'},
    {name:'Steve Foster',era:'historic',role:'defender',clues:['A distinctive item of protective equipment became part of my image.','My Albion career had two separate spells.','I represented England during my first spell with the club.','Suspension affected my participation in a famous Wembley occasion.','I captained Albion in the 1983 FA Cup final replay.'],note:'England centre-back and Albion’s 1983 captain.'},
    {name:'Gordon Smith',era:'historic',role:'forward',clues:['I arrived in England after winning major European silverware.','My Albion league career lasted only a few seasons.','I scored in a Wembley final but became associated with another chance later in the match.','I had previously played for Rangers.','The words “Smith must score” made my Albion moment immortal.'],note:'Scottish forward forever associated with the 1983 FA Cup final.'},
    {name:'Danny Cullip',era:'withdean',role:'defender',clues:['I joined after playing for a west London club.','I captained Albion during successive title-winning seasons.','My game was associated more with authority than elegance.','I scored an important goal in a promotion run-in at Chesterfield.','I was a central figure under Micky Adams and Peter Taylor.'],note:'Commanding captain of the early Withdean promotion years.'},
    {name:'Charlie Oatway',era:'withdean',role:'midfielder',clues:['My full registered name famously contained the names of an entire football team.','I joined Albion from Brentford.','A serious ankle injury curtailed my playing career.','I later worked on Albion’s coaching staff.','I captained the club during part of the Withdean era.'],note:'Combative midfielder, captain and later coach.'},
    {name:'David Stockdale',era:'modern',role:'goalkeeper',clues:['I played for several clubs on temporary deals before establishing myself in the Championship.','My final Albion season contained two unusual own goals in the same match.','Two saves against the same opponent became part of promotion folklore.','I joined Albion from Fulham.','I was the goalkeeper in the 2016–17 promotion campaign.'],note:'Promotion-winning goalkeeper.'},
    {name:'Adam El-Abd',era:'withdean',role:'defender',clues:['I came through Albion’s youth system after growing up locally.','I played under numerous managers across more than a decade.','My versatility covered central defence, full-back and midfield.','I represented Egypt internationally.','I made more than 300 Albion appearances.'],note:'Home-grown, versatile and long-serving defender.'}
  ];

  const start=$('guessStart'), next=$('guessNextClue'), clue=$('guessClue'), choices=$('guessChoices'), result=$('guessResult');
  const silhouette=document.querySelector('.guess-silhouette');
  let current=null, clueIndex=0, locked=false, recent=[];
  function distractorsFor(player){
    const ranked=players.filter(p=>p!==player).map(p=>({p,score:(p.era===player.era?3:0)+(p.role===player.role?3:0)+Math.random()*2})).sort((a,b)=>b.score-a.score);
    return ranked.slice(0,3).map(x=>x.p);
  }
  function renderClue(){
    clue.innerHTML=`<span class="clue-count">Clue ${clueIndex+1} of 5 <span class="difficulty-chip">EXPERT</span></span>${current.clues[clueIndex]}`;
    next.disabled=clueIndex>=4||locked;
    next.textContent=clueIndex>=3?'Final clue':'Reveal another clue';
  }
  function begin(){
    const pool=players.filter(p=>!recent.includes(p.name));
    current=(pool.length?pool:players)[Math.floor(Math.random()*(pool.length||players.length))];
    recent=[current.name,...recent].slice(0,5); clueIndex=0; locked=false; result.textContent='';
    start.textContent='Change player';
    if(silhouette){silhouette.classList.remove('revealed');silhouette.querySelector('span').textContent='?';}
    const options=shuffle([current,...distractorsFor(current)]);
    choices.replaceChildren(...options.map(p=>{
      const b=document.createElement('button'); b.type='button'; b.className='ghost guess-choice'; b.textContent=p.name;
      b.addEventListener('click',()=>{
        if(locked)return; locked=true; const correct=p===current;
        choices.querySelectorAll('button').forEach(x=>{x.disabled=true;if(x.textContent===current.name)x.classList.add('correct-choice');});
        if(!correct)b.classList.add('wrong-choice');
        const points=Math.max(1,5-clueIndex);
        result.innerHTML=correct?`<b>Correct — ${points} point${points===1?'':'s'}.</b> ${current.note}`:`<b>Incorrect.</b> It was ${current.name}. ${current.note}`;
        next.disabled=true; start.textContent='Next player';
        if(silhouette){silhouette.classList.add('revealed');silhouette.querySelector('span').textContent=current.name.split(' ').map(w=>w[0]).join('');}
      }); return b;
    }));
    renderClue();
  }
  start?.replaceWith(start.cloneNode(true));
  next?.replaceWith(next.cloneNode(true));
  const newStart=$('guessStart'), newNext=$('guessNextClue');
  newStart?.addEventListener('click',begin);
  newNext?.addEventListener('click',()=>{if(!current||locked||clueIndex>=4)return;clueIndex++;renderClue();});

  /* Preserve the strong existing keeper behaviours and add restrained idle variation. */
  const keeper=$('keeper'), goal=$('goal'), taker=$('penaltyTaker'), shirt=$('penaltyShirt'), rearName=$('penaltyPlayerName');
  function syncTeams(){
    if(!taker||!keeper)return;
    const palace=taker.classList.contains('palace-taker')||shirt?.dataset.player==='PALACE';
    taker.dataset.team=palace?'palace':'brighton'; keeper.dataset.team=palace?'brighton':'palace';
    if(rearName){const raw=shirt?.dataset.player||'';rearName.textContent=palace?'PALACE':(raw&&raw!=='PALACE'?raw.slice(0,10):'ALBION');}
  }
  if(taker)new MutationObserver(syncTeams).observe(taker,{attributes:true,attributeFilter:['class']});
  if(shirt)new MutationObserver(syncTeams).observe(shirt,{attributes:true,attributeFilter:['data-player'],childList:true});
  syncTeams();

  let idleTimer=0;
  function scheduleIdle(){
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{
      if(!keeper||!goal||goal.classList.contains('kick-in-flight')||keeper.className.includes('dive-')){scheduleIdle();return;}
      const gesture=shuffle(['keeper-glove-check','keeper-point-left','keeper-point-right',''])[0];
      if(gesture){keeper.classList.add(gesture);setTimeout(()=>keeper.classList.remove(gesture),900);}
      scheduleIdle();
    },2600+Math.random()*2600);
  }
  scheduleIdle();
  document.documentElement.classList.add('v43-ready');
})();
