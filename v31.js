(() => {
  const goal = document.getElementById('goal');
  const keeper = document.getElementById('keeper');
  const taker = document.getElementById('penaltyTaker');
  const ball = document.getElementById('ball');
  const stadium = document.querySelector('.stadium-scene');
  if (!goal || !keeper || !taker || !ball || !stadium) return;

  // Richer articulated figures and referee details.
  const ensure = (parent, cls, tag='span') => {
    let el = parent.querySelector('.'+cls.split(' ').join('.'));
    if (!el) { el = document.createElement(tag); el.className = cls; parent.appendChild(el); }
    return el;
  };
  ['keeper-elbow left','keeper-elbow right','keeper-glove-panel left','keeper-glove-panel right'].forEach(c=>ensure(keeper,c));
  ['player-shorts','player-boot left','player-boot right','player-sock left','player-sock right'].forEach(c=>ensure(taker,c));
  const referee = goal.querySelector('.referee');
  if (referee) ['ref-head','ref-arm left','ref-arm right','ref-leg left','ref-leg right','ref-whistle'].forEach(c=>ensure(referee,c));

  // One reliable placement timeline, shorter than the 2.2s launch delay.
  let placementAnimations=[];
  function cancelPlacement(){ placementAnimations.forEach(a=>a.cancel()); placementAnimations=[]; }
  function playPlacement(){
    cancelPlacement();
    const common={duration:2050, easing:'cubic-bezier(.22,.72,.2,1)', fill:'both'};
    placementAnimations.push(taker.animate([
      {offset:0, transform:'translate(92px,-2px) rotate(0deg)'},
      {offset:.20, transform:'translate(58px,-1px) rotate(0deg)'},
      {offset:.38, transform:'translate(42px,4px) rotate(10deg)'},
      {offset:.56, transform:'translate(32px,7px) rotate(15deg)'},
      {offset:.70, transform:'translate(25px,2px) rotate(8deg)'},
      {offset:.84, transform:'translate(17px,-1px) rotate(1deg)'},
      {offset:1, transform:'translate(72px,-2px) rotate(0deg)'}
    ],common));
    const handFrames=[
      {offset:0, transform:'rotate(12deg)'},
      {offset:.34, transform:'rotate(12deg)'},
      {offset:.48, transform:'rotate(76deg)'},
      {offset:.70, transform:'rotate(88deg)'},
      {offset:.84, transform:'rotate(18deg)'},
      {offset:1, transform:'rotate(8deg)'}
    ];
    taker.querySelectorAll('.player-arm,.player-forearm').forEach((el,i)=>placementAnimations.push(el.animate(handFrames.map(f=>({...f,transform:f.transform+(i%2?' scaleX(-1)':'')})),common)));
    placementAnimations.push(ball.animate([
      {offset:0,left:'36%',bottom:'14%',transform:'translate(-50%,0) scale(.74)'},
      {offset:.32,left:'36%',bottom:'14%',transform:'translate(-50%,0) scale(.74)'},
      {offset:.48,left:'42%',bottom:'28%',transform:'translate(-50%,0) scale(.70)'},
      {offset:.62,left:'49%',bottom:'31%',transform:'translate(-50%,0) scale(.68)'},
      {offset:.76,left:'52%',bottom:'22%',transform:'translate(-50%,0) scale(.70)'},
      {offset:.86,left:'52%',bottom:'15.5%',transform:'translate(-50%,0) scale(.72)'},
      {offset:1,left:'52%',bottom:'15.5%',transform:'translate(-50%,0) scale(.72)'}
    ],common));
    stadium.classList.add('placement-live');
    setTimeout(()=>stadium.classList.remove('placement-live'),2080);
  }

  let wasPlacing=false;
  const observer=new MutationObserver(()=>{
    const placing=goal.classList.contains('placing-ball');
    if (placing && !wasPlacing) playPlacement();
    wasPlacing=placing;
    const live=keeper.classList.contains('keeper-live-track');
    stadium.classList.toggle('broadcast-react',live);
    stadium.classList.toggle('floodlights-live',goal.classList.contains('shooting')||live);
  });
  observer.observe(goal,{attributes:true,attributeFilter:['class']});
  observer.observe(keeper,{attributes:true,attributeFilter:['class']});

  // Apply visual penalty styles based on each run-up.
  const styles=['power','sidefoot','curl','driven','hesitation'];
  let styleIndex=0;
  const runObserver=new MutationObserver(()=>{
    const running=[...goal.classList].some(c=>c.includes('run')||c.includes('shoot'));
    if(running){
      styles.forEach(c=>taker.classList.remove('style-'+c));
      taker.classList.add('style-'+styles[styleIndex++%styles.length]);
    }
  });
  runObserver.observe(goal,{attributes:true,attributeFilter:['class']});

  // Crowd flags, floodlight banks and broadcast vignette.
  const bowl=stadium.querySelector('.crowd-bowl');
  if(bowl){
    for(let i=0;i<5;i++){const f=document.createElement('span');f.className='crowd-mini-flag flag-'+(i%3===2?'palace':'albion');f.textContent=i%3===2?'CP':'BHA';bowl.appendChild(f);}
  }
  ['left','right'].forEach(side=>{const bank=document.createElement('div');bank.className='floodlight-bank '+side;bank.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i>';stadium.appendChild(bank)});
  const broadcast=document.createElement('div');broadcast.className='broadcast-frame';broadcast.innerHTML='<span>LIVE</span><b>AMEX SHOOT-OUT</b>';stadium.appendChild(broadcast);

  // Guess the player mini-game.
  const players=[
    {name:'Lewis Dunk', clues:['A long-serving Albion leader.','A central defender and academy graduate.','He has captained Brighton in the Premier League.']},
    {name:'Kaoru Mitoma', clues:['An international winger known for close control.','He represents Japan.','He scored a famous late FA Cup winner against Liverpool.']},
    {name:'Danny Welbeck', clues:['An experienced England international forward.','He previously played for Manchester United and Arsenal.','Albion supporters call him Dat Guy.']},
    {name:'Pascal Groß', clues:['A German midfielder and set-piece specialist.','He scored Brighton’s first Premier League goal.','His Cruyff turns became an Albion trademark.']},
    {name:'Bobby Zamora', clues:['A striker associated with two successful Albion spells.','He helped Brighton win consecutive promotions.','Supporters sang that when the ball hits the goal, it is not Shearer or Cole.']}
  ];
  const clue=document.getElementById('guessClue'), choices=document.getElementById('guessChoices'), result=document.getElementById('guessResult');
  const start=document.getElementById('guessStart'), next=document.getElementById('guessNextClue');
  let current=null, clueNo=0;
  function renderChoices(){
    choices.innerHTML='';
    const opts=[current,...players.filter(p=>p!==current).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
    opts.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='ghost';b.textContent=p.name;b.addEventListener('click',()=>{const ok=p===current;result.innerHTML=ok?'<b>Correct!</b> You know your Albion.':`<b>Not this time.</b> It was ${current.name}.`;choices.querySelectorAll('button').forEach(x=>x.disabled=true);next.disabled=true;});choices.appendChild(b)});
  }
  start?.addEventListener('click',()=>{current=players[Math.floor(Math.random()*players.length)];clueNo=0;clue.textContent=current.clues[0];result.textContent='';next.disabled=false;renderChoices();start.textContent='New player';});
  next?.addEventListener('click',()=>{if(!current)return;clueNo=Math.min(2,clueNo+1);clue.textContent=current.clues.slice(0,clueNo+1).join(' ');if(clueNo===2)next.disabled=true;});
})();
