(() => {
  const goal = document.getElementById('goal');
  const keeper = document.getElementById('keeper');
  const taker = document.getElementById('penaltyTaker');
  const ball = document.getElementById('ball');
  const shadow = document.getElementById('ballShadow');
  const stadium = document.querySelector('.stadium-scene');
  if (!goal || !keeper || !taker || !ball || !stadium) return;

  const addPart = (parent, cls) => {
    let node = parent.querySelector('.' + cls.split(' ').join('.'));
    if (!node) { node = document.createElement('span'); node.className = cls; parent.appendChild(node); }
    return node;
  };

  ['player-forearm left','player-forearm right','player-hand left','player-hand right'].forEach(c => addPart(taker,c));
  ['keeper-upper-arm left','keeper-upper-arm right','keeper-forearm left','keeper-forearm right'].forEach(c => addPart(keeper,c));

  // Replace the exaggerated glove overlays from v31 with compact, readable glove panels.
  keeper.querySelectorAll('.keeper-glove-panel,.keeper-elbow').forEach(el => el.remove());

  let placement = [];
  let placementToken = 0;
  const cancelPlacement = () => {
    placementToken++;
    placement.forEach(a => { try { a.cancel(); } catch {} });
    placement = [];
    [taker, ball, shadow, ...taker.querySelectorAll('.player-arm,.player-forearm,.player-hand')]
      .forEach(el => { el.style.removeProperty('transform'); el.style.removeProperty('left'); el.style.removeProperty('bottom'); });
  };

  function playPlacement() {
    cancelPlacement();
    const token = placementToken;
    const duration = 2100;
    const opts = {duration, fill:'both', easing:'linear'};
    stadium.classList.add('v32-placement-live');

    placement.push(taker.animate([
      {offset:0, transform:'translate(90px,-1px) rotate(0deg)'},
      {offset:.18, transform:'translate(55px,-1px) rotate(0deg)'},
      {offset:.34, transform:'translate(38px,2px) rotate(5deg)'},
      {offset:.48, transform:'translate(28px,9px) rotate(15deg)'},
      {offset:.60, transform:'translate(24px,8px) rotate(13deg)'},
      {offset:.72, transform:'translate(17px,3px) rotate(6deg)'},
      {offset:.82, transform:'translate(12px,0) rotate(0deg)'},
      {offset:1, transform:'translate(70px,-1px) rotate(0deg)'}
    ], opts));

    const leftUpper = taker.querySelector('.player-arm-left');
    const rightUpper = taker.querySelector('.player-arm-right');
    const leftFore = taker.querySelector('.player-forearm.left');
    const rightFore = taker.querySelector('.player-forearm.right');
    const leftHand = taker.querySelector('.player-hand.left');
    const rightHand = taker.querySelector('.player-hand.right');
    const limbOpts = {...opts, easing:'cubic-bezier(.35,.05,.2,1)'};
    placement.push(leftUpper.animate([
      {offset:0,transform:'rotate(14deg)'},{offset:.35,transform:'rotate(25deg)'},{offset:.48,transform:'rotate(76deg)'},{offset:.67,transform:'rotate(68deg)'},{offset:.82,transform:'rotate(18deg)'},{offset:1,transform:'rotate(10deg)'}
    ],limbOpts));
    placement.push(rightUpper.animate([
      {offset:0,transform:'rotate(-14deg)'},{offset:.35,transform:'rotate(-25deg)'},{offset:.48,transform:'rotate(-76deg)'},{offset:.67,transform:'rotate(-68deg)'},{offset:.82,transform:'rotate(-18deg)'},{offset:1,transform:'rotate(-10deg)'}
    ],limbOpts));
    [leftFore,rightFore].forEach((el,i)=>placement.push(el.animate([
      {offset:0,transform:`rotate(${i?8:-8}deg)`},{offset:.38,transform:`rotate(${i?18:-18}deg)`},{offset:.50,transform:`rotate(${i?56:-56}deg)`},{offset:.70,transform:`rotate(${i?45:-45}deg)`},{offset:.84,transform:'rotate(0deg)'},{offset:1,transform:'rotate(0deg)'}
    ],limbOpts)));
    [leftHand,rightHand].forEach((el,i)=>placement.push(el.animate([
      {offset:0,transform:'scale(.95)'},{offset:.42,transform:'scale(.95)'},{offset:.52,transform:`translateX(${i?-3:3}px) scale(1.02)`},{offset:.70,transform:`translateX(${i?-3:3}px) scale(1.02)`},{offset:.82,transform:'scale(.95)'},{offset:1,transform:'scale(.95)'}
    ],limbOpts)));

    // Ball path follows the hands: loose ball -> lifted between hands -> carried -> lowered -> released on spot.
    placement.push(ball.animate([
      {offset:0,left:'36%',bottom:'14%',transform:'translate(-50%,0) scale(.72)'},
      {offset:.38,left:'36%',bottom:'14%',transform:'translate(-50%,0) scale(.72)'},
      {offset:.50,left:'40%',bottom:'27%',transform:'translate(-50%,0) scale(.70)'},
      {offset:.60,left:'46%',bottom:'30%',transform:'translate(-50%,0) scale(.69)'},
      {offset:.70,left:'50%',bottom:'27%',transform:'translate(-50%,0) scale(.70)'},
      {offset:.79,left:'52%',bottom:'17%',transform:'translate(-50%,0) scale(.71)'},
      {offset:.84,left:'52%',bottom:'15.5%',transform:'translate(-50%,0) scale(.72)'},
      {offset:1,left:'52%',bottom:'15.5%',transform:'translate(-50%,0) scale(.72)'}
    ], {...opts,easing:'cubic-bezier(.25,.1,.2,1)'}));
    if (shadow) placement.push(shadow.animate([
      {offset:0,left:'36%',bottom:'12%',opacity:.55,transform:'translateX(-50%) scale(.72)'},
      {offset:.42,left:'36%',bottom:'12%',opacity:.5,transform:'translateX(-50%) scale(.65)'},
      {offset:.55,left:'43%',bottom:'12%',opacity:.22,transform:'translateX(-50%) scale(.42)'},
      {offset:.72,left:'50%',bottom:'12%',opacity:.28,transform:'translateX(-50%) scale(.48)'},
      {offset:.84,left:'52%',bottom:'13%',opacity:.55,transform:'translateX(-50%) scale(.70)'},
      {offset:1,left:'52%',bottom:'13%',opacity:.55,transform:'translateX(-50%) scale(.70)'}
    ],opts));

    window.setTimeout(() => { if (token === placementToken) stadium.classList.remove('v32-placement-live'); }, duration + 40);
  }

  let wasPlacing = false;
  new MutationObserver(() => {
    const placing = goal.classList.contains('placing-ball');
    if (placing && !wasPlacing) playPlacement();
    if (!placing && wasPlacing) cancelPlacement();
    wasPlacing = placing;
  }).observe(goal,{attributes:true,attributeFilter:['class']});

  // Smooth keeper input with a single rAF loop, damping tremor but keeping deliberate movement responsive.
  let targetX=0,targetY=0,currentX=0,currentY=0,velX=0,velY=0,last=performance.now();
  const readTargets=()=>{
    targetX=Number.parseFloat(getComputedStyle(keeper).getPropertyValue('--track-x'))||0;
    targetY=Number.parseFloat(getComputedStyle(keeper).getPropertyValue('--track-y'))||0;
  };
  function frame(now){
    const dt=Math.min(32,now-last)/16.667; last=now;
    if(keeper.classList.contains('keeper-live-track')){
      readTargets();
      const stiffness=.17, damping=.72;
      velX=(velX+(targetX-currentX)*stiffness*dt)*Math.pow(damping,dt);
      velY=(velY+(targetY-currentY)*stiffness*dt)*Math.pow(damping,dt);
      currentX+=velX*dt; currentY+=velY*dt;
      currentX=Math.max(-1,Math.min(1,currentX)); currentY=Math.max(-1,Math.min(1,currentY));
      keeper.style.setProperty('--smooth-track-x',currentX.toFixed(4));
      keeper.style.setProperty('--smooth-track-y',currentY.toFixed(4));
    } else {
      currentX*=.88; currentY*=.88; velX*=.6; velY*=.6;
      keeper.style.setProperty('--smooth-track-x',currentX.toFixed(4));
      keeper.style.setProperty('--smooth-track-y',currentY.toFixed(4));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
