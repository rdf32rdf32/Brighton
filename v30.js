(() => {
  const keeper = document.getElementById('keeper');
  const taker = document.getElementById('penaltyTaker');
  const goal = document.getElementById('goal');
  if (!keeper || !taker || !goal) return;

  // Add articulated limbs once.
  if (!keeper.querySelector('.keeper-upper-arm')) {
    ['left','right'].forEach(side => {
      const upper = document.createElement('span');
      upper.className = `keeper-upper-arm ${side}`;
      const fore = document.createElement('span');
      fore.className = `keeper-forearm ${side}`;
      keeper.append(upper, fore);
    });
  }
  if (!taker.querySelector('.player-forearm')) {
    ['left','right'].forEach(side => {
      const fore = document.createElement('span');
      fore.className = `player-forearm ${side}`;
      const hand = document.createElement('span');
      hand.className = `player-hand ${side}`;
      taker.append(fore, hand);
    });
  }

  // Smooth pointer input with acceleration limiting and continuous correction.
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0, velocityX = 0, velocityY = 0;
  const readTarget = () => {
    targetX = Number.parseFloat(keeper.style.getPropertyValue('--track-x')) || 0;
    targetY = Number.parseFloat(keeper.style.getPropertyValue('--track-y')) || 0;
  };
  const animate = () => {
    readTarget();
    const desiredVX = (targetX - currentX) * 0.16;
    const desiredVY = (targetY - currentY) * 0.16;
    velocityX += Math.max(-0.028, Math.min(0.028, desiredVX - velocityX));
    velocityY += Math.max(-0.022, Math.min(0.022, desiredVY - velocityY));
    velocityX *= 0.86; velocityY *= 0.86;
    currentX += velocityX; currentY += velocityY;
    if (keeper.classList.contains('keeper-live-track')) {
      keeper.style.setProperty('--track-x', currentX.toFixed(4));
      keeper.style.setProperty('--track-y', currentY.toFixed(4));
    } else {
      currentX *= .82; currentY *= .82; velocityX *= .7; velocityY *= .7;
    }
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  // Ready posture and occasional pointing, always before a kick.
  keeper.classList.add('keeper-ready-deep');
  const pointSometimes = () => {
    if (keeper.classList.contains('keeper-live-track') || keeper.className.includes('dive-')) return;
    keeper.classList.remove('keeper-point-left','keeper-point-right');
    if (Math.random() < .48) {
      keeper.classList.add(Math.random() < .5 ? 'keeper-point-left' : 'keeper-point-right');
      setTimeout(() => keeper.classList.remove('keeper-point-left','keeper-point-right'), 720);
    }
  };
  document.getElementById('continueShootout')?.addEventListener('click', () => setTimeout(pointSometimes, 300));

  // Force placement to restart visibly whenever the scene class is applied.
  const observer = new MutationObserver(() => {
    if (!goal.classList.contains('placing-ball')) return;
    const ball = document.getElementById('ball');
    taker.classList.remove('place-ball');
    ball?.classList.remove('ball-to-spot');
    void taker.offsetWidth;
    taker.classList.add('place-ball');
    ball?.classList.add('ball-to-spot');
  });
  observer.observe(goal, {attributes:true, attributeFilter:['class']});
})();
