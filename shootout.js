(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const stage = $("penaltyStage");
  if (!stage) return;

  const goalMouth = $("goalMouth");
  const ball = $("penaltyBall");
  const keeper = $("keeperFigure");
  const taker = $("takerFigure");
  const reticle = $("aimReticle");
  const cue = $("reactionCue");
  const decision = $("kickDecision");
  const status = $("shootoutStatus");
  const readyPanel = $("palaceReadyPanel");
  const readyButton = $("palaceReadyButton");
  const panenka = $("panenkaChoice");
  const difficulty = $("shootoutDifficulty");
  const soundButton = $("shootoutSound");
  const summary = $("shootoutSummary");
  const shareButton = $("shareShootout");
  const shootoutCard = $("shootout");

  const goalBox = { left: 0.17, top: 0.125, width: 0.66, height: 0.35 };
  const ballStart = { x: 0.5, y: 0.77 };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const reducedMotion = () =>
    document.body.classList.contains("user-reduce-motion") ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const configurations = {
    supporter: {
      shotSpread: 0.018,
      keeperNoise: 0.19,
      keeperReach: 0.145,
      palaceMiss: 0.16,
      saveRadius: 0.28,
      reactionWindow: 1120,
      flight: 900,
    },
    premier: {
      shotSpread: 0.032,
      keeperNoise: 0.14,
      keeperReach: 0.17,
      palaceMiss: 0.11,
      saveRadius: 0.235,
      reactionWindow: 930,
      flight: 790,
    },
    european: {
      shotSpread: 0.046,
      keeperNoise: 0.105,
      keeperReach: 0.19,
      palaceMiss: 0.075,
      saveRadius: 0.2,
      reactionWindow: 790,
      flight: 700,
    },
  };

  const albionTakers = [
    { name: "Danny Welbeck", number: 18, foot: "right" },
    { name: "Georginio Rutter", number: 10, foot: "right" },
    { name: "Yankuba Minteh", number: 11, foot: "left" },
    { name: "Diego Gómez", number: 25, foot: "right" },
    { name: "Maxim De Cuyper", number: 29, foot: "left" },
  ];

  const palaceTakers = [
    { name: "Palace taker 1", foot: "right", delay: 760 },
    { name: "Palace taker 2", foot: "left", delay: 920 },
    { name: "Palace taker 3", foot: "right", delay: 840 },
    { name: "Palace taker 4", foot: "left", delay: 1020 },
    { name: "Palace taker 5", foot: "right", delay: 790 },
  ];

  const state = {
    phase: "shoot",
    locked: false,
    finished: false,
    aim: { x: 0.5, y: 0.5 },
    albionResults: [],
    palaceResults: [],
    albionGoals: 0,
    palaceGoals: 0,
    albionKicks: 0,
    palaceKicks: 0,
    palaceSaves: 0,
    userSaves: 0,
    reactionTimes: [],
    catches: 0,
    fingertips: 0,
    panenkaAttempts: 0,
    panenkaGoals: 0,
    reactionOpenedAt: 0,
    reactionOpen: false,
    palaceTarget: null,
    palaceMiss: false,
    userDive: null,
    reactionTimer: 0,
    sound: localStorage.getItem("albionShootoutSound") !== "off",
  };

  let audioContext = null;
  let currentAnimations = [];

  function config() {
    return configurations[difficulty.value] || configurations.premier;
  }

  function ensureAudio() {
    if (!state.sound) return null;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch {
      return null;
    }
  }

  function tone(frequency, duration = 0.08, type = "sine", gain = 0.055) {
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(gain, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(volume).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function sound(kind) {
    if (!state.sound) return;
    if (kind === "whistle") {
      tone(1240, 0.08, "sine", 0.035);
      window.setTimeout(() => tone(1510, 0.09, "sine", 0.03), 70);
    } else if (kind === "kick") tone(115, 0.09, "triangle", 0.09);
    else if (kind === "goal") {
      tone(520, 0.12, "square", 0.045);
      window.setTimeout(() => tone(660, 0.16, "square", 0.04), 100);
    } else if (kind === "save") tone(175, 0.18, "sawtooth", 0.055);
    else if (kind === "post") tone(910, 0.22, "triangle", 0.045);
    else tone(210, 0.14, "sine", 0.04);
  }

  function readRecord() {
    try {
      return {
        played: 0,
        wins: 0,
        saves: 0,
        bestSaveRate: 0,
        ...JSON.parse(localStorage.getItem("albionShootoutRecord") || "{}"),
      };
    } catch {
      return { played: 0, wins: 0, saves: 0, bestSaveRate: 0 };
    }
  }

  function renderRecord() {
    const record = readRecord();
    $("shootoutRecords").textContent =
      `Your derby record: ${record.wins} wins from ${record.played} · ${record.saves} Palace penalties saved · best save rate ${record.bestSaveRate}%`;
  }

  function markerHtml(results) {
    const total = Math.max(5, results.length + (results.length >= 5 ? 1 : 0));
    return Array.from({ length: total }, (_, index) => {
      if (!results[index]) return "<i></i>";
      return `<i class="${results[index].scored ? "goal-mark" : "miss-mark"}"></i>`;
    }).join("");
  }

  function currentRound() {
    const round = Math.max(state.albionKicks, state.palaceKicks) +
      (state.phase === "shoot" && state.albionKicks === state.palaceKicks ? 1 : 0);
    return round <= 5 ? `${Math.max(1, round)}/5` : `SD ${round - 5}`;
  }

  function renderScore() {
    $("albionGoalCount").textContent = String(state.albionGoals);
    $("palaceGoalCount").textContent = String(state.palaceGoals);
    $("albionPenaltyMarkers").innerHTML = markerHtml(state.albionResults);
    $("palacePenaltyMarkers").innerHTML = markerHtml(state.palaceResults);
    $("shotCount").textContent = currentRound();

    const sudden = state.albionKicks >= 5 && state.palaceKicks >= 5;
    if (sudden) {
      $("shootoutSituation").textContent =
        state.albionKicks === state.palaceKicks ? "Sudden death" : "Palace must respond";
    } else {
      const leftA = Math.max(0, 5 - state.albionKicks);
      const leftP = Math.max(0, 5 - state.palaceKicks);
      $("shootoutSituation").textContent = `${leftA} Albion · ${leftP} Palace left`;
    }
  }

  function setStatus(title, detail) {
    status.innerHTML = `<b>${title}</b><span>${detail}</span>`;
  }

  function showDecision(label, type) {
    decision.textContent = label;
    decision.className = `kick-decision-v10 ${type}`;
    decision.hidden = false;
    window.setTimeout(() => {
      decision.hidden = true;
    }, reducedMotion() ? 650 : 1100);
  }

  function setReticle(nx, ny) {
    state.aim.x = clamp(nx, 0.025, 0.975);
    state.aim.y = clamp(ny, 0.035, 0.965);
    const sx = goalBox.left + state.aim.x * goalBox.width;
    const sy = goalBox.top + state.aim.y * goalBox.height;
    reticle.style.left = `${sx * 100}%`;
    reticle.style.top = `${sy * 100}%`;
  }

  function eventGoalPoint(event) {
    const rect = stage.getBoundingClientRect();
    const sx = (event.clientX - rect.left) / rect.width;
    const sy = (event.clientY - rect.top) / rect.height;
    const inside =
      sx >= goalBox.left && sx <= goalBox.left + goalBox.width &&
      sy >= goalBox.top && sy <= goalBox.top + goalBox.height;
    return {
      inside,
      x: clamp((sx - goalBox.left) / goalBox.width, 0, 1),
      y: clamp((sy - goalBox.top) / goalBox.height, 0, 1),
    };
  }

  function resetVisuals() {
    currentAnimations.forEach((animation) => {
      try { animation.cancel(); } catch {}
    });
    currentAnimations = [];
    ball.getAnimations().forEach((animation) => animation.cancel());
    keeper.getAnimations().forEach((animation) => animation.cancel());
    taker.getAnimations().forEach((animation) => animation.cancel());
    ball.style.left = `${ballStart.x * 100}%`;
    ball.style.top = `${ballStart.y * 100}%`;
    ball.style.transform = "translate(-50%,-50%) scale(1) rotate(0deg)";
    keeper.style.left = "50%";
    keeper.style.top = "24%";
    keeper.style.transform = "translate(-50%,-18%)";
    taker.style.left = "50%";
    taker.style.top = "69%";
    taker.style.transform = "translate(-50%,0)";
    stage.classList.remove("palace-kick", "is-reacting", "is-locked", "is-waiting");
    goalMouth.classList.remove("net-hit");
    cue.hidden = true;
  }

  function animateElement(element, keyframes, options) {
    if (reducedMotion()) options = { ...options, duration: Math.min(120, options.duration || 120) };
    const animation = element.animate(keyframes, { fill: "forwards", easing: "ease-out", ...options });
    currentAnimations.push(animation);
    return animation;
  }

  function animateRunUp(isPalace, foot = "right") {
    const direction = foot === "left" ? -1 : 1;
    stage.classList.toggle("palace-kick", isPalace);
    const run = animateElement(
      taker,
      [
        { transform: `translate(calc(-50% + ${-direction * 16}px), 10px) scale(.96)` },
        { transform: `translate(calc(-50% + ${direction * 8}px), -10px) scale(1.01)`, offset: 0.55 },
        { transform: "translate(-50%, -38px) scale(.94)" },
      ],
      { duration: isPalace ? 780 : 650, easing: "cubic-bezier(.25,.72,.3,1)" },
    );
    const kickingLeg = taker.querySelector(foot === "left" ? ".taker-leg-left" : ".taker-leg-right");
    const arm = taker.querySelector(foot === "left" ? ".taker-arm-right" : ".taker-arm-left");
    if (kickingLeg) animateElement(kickingLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${direction * -24}deg)` }, { transform: `rotate(${direction * 34}deg)` }], { duration: isPalace ? 780 : 650 });
    if (arm) animateElement(arm, [{ transform: "rotate(0deg)" }, { transform: `rotate(${direction * 18}deg)` }, { transform: `rotate(${direction * -12}deg)` }], { duration: isPalace ? 780 : 650 });
    return run;
  }

  function stagePoint(goalPoint) {
    return {
      x: goalBox.left + goalPoint.x * goalBox.width,
      y: goalBox.top + goalPoint.y * goalBox.height,
    };
  }

  function animateBall(target, duration, saved = false, miss = false) {
    const point = stagePoint(target);
    const endScale = saved ? 0.74 : miss ? 0.58 : 0.5;
    sound("kick");
    return animateElement(
      ball,
      [
        { left: `${ballStart.x * 100}%`, top: `${ballStart.y * 100}%`, transform: "translate(-50%,-50%) scale(1) rotate(0deg)" },
        { left: `${(ballStart.x + point.x) * 50}%`, top: `${(ballStart.y + point.y) * 50 - 4}%`, transform: "translate(-50%,-50%) scale(.75) rotate(210deg)", offset: 0.48 },
        { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: `translate(-50%,-50%) scale(${endScale}) rotate(520deg)` },
      ],
      { duration, easing: "cubic-bezier(.15,.58,.24,1)" },
    );
  }

  function animateKeeper(target, duration, saved = false) {
    const point = stagePoint(target);
    const stageRect = stage.getBoundingClientRect();
    const dx = (point.x - 0.5) * stageRect.width;
    const dy = (point.y - 0.3) * stageRect.height * 0.5;
    const rotation = clamp(dx / Math.max(1, stageRect.width) * 42, -25, 25);
    const xLimit = stageRect.width * 0.27;
    const limitedX = clamp(dx, -xLimit, xLimit);
    const limitedY = clamp(dy, -stageRect.height * 0.1, stageRect.height * 0.08);
    const scale = saved ? 1.05 : 1;
    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const leftLeg = keeper.querySelector(".keeper-leg-left");
    const rightLeg = keeper.querySelector(".keeper-leg-right");
    const direction = point.x < 0.5 ? -1 : 1;
    if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: `rotate(${direction < 0 ? -24 : 12}deg)` }], { duration: duration * 0.82 });
    if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: `rotate(${direction > 0 ? 24 : -12}deg)` }], { duration: duration * 0.82 });
    if (leftLeg) animateElement(leftLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${direction < 0 ? 13 : -8}deg)` }], { duration });
    if (rightLeg) animateElement(rightLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${direction > 0 ? -13 : 8}deg)` }], { duration });
    return animateElement(
      keeper,
      [
        { transform: "translate(-50%,-18%) translate(0,0) rotate(0deg) scale(1)" },
        { transform: `translate(-50%,-18%) translate(${limitedX * 0.45}px,${limitedY * 0.25 - 12}px) rotate(${rotation * 0.35}deg) scale(1.04)`, offset: 0.35 },
        { transform: `translate(-50%,-18%) translate(${limitedX}px,${limitedY}px) rotate(${rotation}deg) scale(${scale})` },
      ],
      { duration, easing: "cubic-bezier(.2,.72,.25,1)" },
    );
  }

  function resultDecision() {
    const albionLeft = Math.max(0, 5 - state.albionKicks);
    const palaceLeft = Math.max(0, 5 - state.palaceKicks);
    if (state.albionKicks < 5 || state.palaceKicks < 5) {
      if (state.albionGoals > state.palaceGoals + palaceLeft) return { finished: true, albionWon: true };
      if (state.palaceGoals > state.albionGoals + albionLeft) return { finished: true, albionWon: false };
    }
    if (
      state.albionKicks >= 5 &&
      state.palaceKicks >= 5 &&
      state.albionKicks === state.palaceKicks &&
      state.albionGoals !== state.palaceGoals
    ) return { finished: true, albionWon: state.albionGoals > state.palaceGoals };
    return { finished: false, albionWon: false };
  }

  function prepareAlbionKick() {
    resetVisuals();
    state.phase = "shoot";
    state.locked = false;
    state.reactionOpen = false;
    stage.classList.add("is-aiming");
    readyPanel.hidden = true;
    panenka.disabled = false;
    const player = albionTakers[state.albionKicks % albionTakers.length];
    $("penaltyTakerName").textContent = player.name;
    $("penaltyShirt").textContent = String(player.number);
    $("turnBadge").textContent = "ALBION PENALTY";
    $("turnBadge").className = "turn-badge albion-turn";
    $("stageInstruction").textContent = "Aim and click to shoot";
    stage.setAttribute("aria-label", "Albion penalty. Move the pointer inside the goal and click to shoot.");
    setStatus("Pick your spot", "Move inside the goal and click once.");
    setReticle(state.aim.x, state.aim.y);
    renderScore();
  }

  function preparePalaceKick() {
    resetVisuals();
    state.phase = "palace-ready";
    state.locked = true;
    stage.classList.add("is-waiting");
    stage.classList.remove("is-aiming");
    readyPanel.hidden = false;
    panenka.disabled = true;
    const player = palaceTakers[state.palaceKicks % palaceTakers.length];
    $("penaltyTakerName").textContent = player.name;
    $("penaltyShirt").textContent = String((state.palaceKicks % 5) + 7);
    $("turnBadge").textContent = "PALACE PENALTY · YOU ARE VERBRUGGEN";
    $("turnBadge").className = "turn-badge palace-turn";
    $("stageInstruction").textContent = "Press Ready, then react after the strike";
    stage.setAttribute("aria-label", "Palace penalty. Press Ready, wait for the strike, then click where Verbruggen should dive.");
    setStatus("Your turn in goal", "Press Ready when you are set. Early dives are ignored.");
    readyButton.focus({ preventScroll: true });
    renderScore();
  }

  function gaussian() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function classifyFrame(target) {
    const outsideX = target.x < 0 || target.x > 1;
    const outsideY = target.y < 0 || target.y > 1;
    if (!outsideX && !outsideY) return null;
    const nearX = target.x >= -0.045 && target.x <= 1.045;
    const nearY = target.y >= -0.055 && target.y <= 1.055;
    if ((outsideX && nearX && target.y >= 0 && target.y <= 1) || (outsideY && nearY && target.x >= 0 && target.x <= 1)) return "woodwork";
    return "miss";
  }

  async function takeAlbionPenalty(aim) {
    if (state.phase !== "shoot" || state.locked || state.finished) return;
    ensureAudio();
    state.locked = true;
    stage.classList.remove("is-aiming");
    stage.classList.add("is-locked");
    panenka.disabled = true;
    const settings = config();
    const player = albionTakers[state.albionKicks % albionTakers.length];
    const isPanenka = panenka.checked;
    if (isPanenka) state.panenkaAttempts += 1;
    setStatus(`${player.name} steps up`, isPanenka ? "A disguised central chip." : "The Palace keeper waits on the line.");
    sound("whistle");
    animateRunUp(false, player.foot);
    await sleep(reducedMotion() ? 130 : 510);

    const edge = Math.max(Math.abs(aim.x - 0.5), Math.abs(aim.y - 0.5));
    const spread = settings.shotSpread * (1 + edge * 1.3);
    const resolved = isPanenka
      ? { x: clamp(0.5 + gaussian() * 0.025, 0.43, 0.57), y: clamp(0.61 + gaussian() * 0.025, 0.52, 0.68) }
      : { x: aim.x + gaussian() * spread, y: aim.y + gaussian() * spread };
    const frameResult = classifyFrame(resolved);

    const keeperGuess = {
      x: clamp(resolved.x + gaussian() * settings.keeperNoise, 0.05, 0.95),
      y: clamp(resolved.y + gaussian() * settings.keeperNoise * 0.8, 0.08, 0.92),
    };
    if (isPanenka && Math.random() < 0.76) keeperGuess.x = Math.random() < 0.5 ? 0.13 : 0.87;
    const distance = Math.hypot(resolved.x - keeperGuess.x, (resolved.y - keeperGuess.y) * 0.88);
    const centralPenalty = Math.abs(resolved.x - 0.5) < 0.12 && resolved.y > 0.32;
    const saved = !frameResult && distance < settings.keeperReach + (centralPenalty ? 0.055 : 0);
    const scored = !frameResult && !saved;

    animateKeeper(keeperGuess, settings.flight * 0.86, saved);
    const ballAnimation = animateBall(resolved, settings.flight, saved, Boolean(frameResult));
    await ballAnimation.finished.catch(() => {});

    state.albionKicks += 1;
    if (scored) state.albionGoals += 1;
    if (saved) state.palaceSaves += 1;
    if (isPanenka && scored) state.panenkaGoals += 1;
    state.albionResults.push({ scored, result: frameResult || (saved ? "saved" : "goal") });

    if (scored) {
      goalMouth.classList.add("net-hit");
      showDecision(isPanenka ? "PANENKA!" : "GOAL!", "goal");
      setStatus("Goal for Brighton", isPanenka ? "The keeper commits and the chip drops centrally." : "Cleanly placed beyond the goalkeeper.");
      sound("goal");
    } else if (saved) {
      showDecision("SAVED!", "save");
      setStatus("Palace save", "The goalkeeper gets close enough to keep it out.");
      sound("save");
    } else if (frameResult === "woodwork") {
      showDecision("OFF THE FRAME!", "miss");
      setStatus("So close", "The ambitious placement catches the post or crossbar.");
      sound("post");
    } else {
      showDecision("WIDE!", "miss");
      setStatus("Missed", "The shot drifts beyond the goal under pressure.");
      sound("miss");
    }

    panenka.checked = false;
    renderScore();
    const outcome = resultDecision();
    await sleep(reducedMotion() ? 350 : 1250);
    if (outcome.finished) finishShootout(outcome.albionWon);
    else preparePalaceKick();
  }

  function randomPalaceTarget() {
    const settings = config();
    const miss = Math.random() < settings.palaceMiss;
    const corners = [
      { x: 0.11, y: 0.14 }, { x: 0.11, y: 0.82 },
      { x: 0.89, y: 0.14 }, { x: 0.89, y: 0.82 },
      { x: 0.18, y: 0.5 }, { x: 0.82, y: 0.5 },
      { x: 0.5, y: 0.58 },
    ];
    const base = corners[Math.floor(Math.random() * corners.length)];
    if (!miss) return { target: { x: clamp(base.x + gaussian() * 0.035, 0.025, 0.975), y: clamp(base.y + gaussian() * 0.035, 0.035, 0.965) }, miss: false };
    const side = Math.random();
    if (side < 0.42) return { target: { x: Math.random() < 0.5 ? -0.065 : 1.065, y: clamp(base.y, 0.08, 0.92) }, miss: true };
    return { target: { x: clamp(base.x, 0.08, 0.92), y: -0.07 }, miss: true };
  }

  async function beginPalacePenalty() {
    if (state.phase !== "palace-ready" || state.finished) return;
    ensureAudio();
    readyPanel.hidden = true;
    state.phase = "palace-run";
    state.locked = true;
    state.userDive = null;
    state.reactionOpen = false;
    stage.classList.remove("is-waiting");
    stage.classList.add("is-locked", "palace-kick");
    const player = palaceTakers[state.palaceKicks % palaceTakers.length];
    const plan = randomPalaceTarget();
    state.palaceTarget = plan.target;
    state.palaceMiss = plan.miss;
    setStatus("Palace begin the run-up", "Wait for the strike. Do not commit early.");
    sound("whistle");
    animateRunUp(true, player.foot);
    await sleep(reducedMotion() ? 150 : player.delay);
    if (state.phase !== "palace-run") return;

    state.phase = "save";
    state.reactionOpen = true;
    state.reactionOpenedAt = performance.now();
    stage.classList.remove("is-locked");
    stage.classList.add("is-reacting");
    cue.hidden = false;
    $("stageInstruction").textContent = "Click where Verbruggen should dive";
    setStatus("REACT!", "Follow the ball and click inside the goal.");
    window.setTimeout(() => { cue.hidden = true; }, reducedMotion() ? 180 : 420);

    const settings = config();
    const ballAnimation = animateBall(state.palaceTarget, settings.flight, false, state.palaceMiss);
    window.clearTimeout(state.reactionTimer);
    state.reactionTimer = window.setTimeout(() => {
      state.reactionOpen = false;
      stage.classList.remove("is-reacting");
    }, settings.reactionWindow);

    await ballAnimation.finished.catch(() => {});
    state.reactionOpen = false;
    stage.classList.remove("is-reacting");
    window.clearTimeout(state.reactionTimer);

    let saved = false;
    let saveType = "";
    if (!state.palaceMiss && state.userDive) {
      const reactionFactor = clamp(1 - state.userDive.reaction / settings.reactionWindow, 0, 1);
      const radius = settings.saveRadius * (0.58 + reactionFactor * 0.62);
      const distance = Math.hypot(
        state.palaceTarget.x - state.userDive.x,
        (state.palaceTarget.y - state.userDive.y) * 0.9,
      );
      saved = distance <= radius;
      if (saved) {
        if (distance < radius * 0.44 && reactionFactor > 0.48) saveType = "CATCH";
        else if (distance > radius * 0.78) saveType = "FINGERTIP SAVE";
        else saveType = "PARRIED";
      }
    }

    const scored = !state.palaceMiss && !saved;
    state.palaceKicks += 1;
    if (scored) state.palaceGoals += 1;
    if (saved) {
      state.userSaves += 1;
      if (saveType === "CATCH") state.catches += 1;
      if (saveType === "FINGERTIP SAVE") state.fingertips += 1;
    }
    state.palaceResults.push({ scored, result: state.palaceMiss ? "miss" : saved ? "saved" : "goal" });

    if (saved) {
      showDecision(saveType, "save");
      setStatus("Verbruggen saves", `${Math.round(state.userDive.reaction)} ms reaction · ${saveType.toLowerCase()}.`);
      sound("save");
    } else if (state.palaceMiss) {
      showDecision("PALACE MISS!", "miss");
      setStatus("It stays out", "The Palace taker fails to find the target.");
      sound("post");
    } else {
      goalMouth.classList.add("net-hit");
      showDecision("PALACE SCORE", "goal");
      setStatus("Palace score", state.userDive ? "The dive was not close enough." : "No dive was made in time.");
      sound("goal");
    }

    renderScore();
    const outcome = resultDecision();
    await sleep(reducedMotion() ? 350 : 1250);
    if (outcome.finished) finishShootout(outcome.albionWon);
    else prepareAlbionKick();
  }

  function takeUserDive(point) {
    if (state.phase !== "save" || !state.reactionOpen || state.userDive) return;
    const reaction = performance.now() - state.reactionOpenedAt;
    state.userDive = { x: point.x, y: point.y, reaction };
    state.reactionTimes.push(reaction);
    state.reactionOpen = false;
    stage.classList.remove("is-reacting");
    animateKeeper(point, Math.max(280, config().flight * 0.66), true);
    setStatus("Verbruggen commits", `${Math.round(reaction)} ms reaction. Watch the outcome.`);
  }

  function finishShootout(albionWon) {
    state.finished = true;
    state.locked = true;
    state.phase = "finished";
    resetVisuals();
    stage.classList.add("is-locked");
    readyPanel.hidden = true;
    panenka.disabled = true;
    $("turnBadge").textContent = albionWon ? "SEAGULLS WIN" : "PALACE WIN";
    $("turnBadge").className = `turn-badge ${albionWon ? "albion-turn" : "palace-turn"}`;
    $("penaltyTakerName").textContent = `Brighton ${state.albionGoals}–${state.palaceGoals} Palace`;
    $("stageInstruction").textContent = "Full time";
    showDecision(albionWon ? "SEAGULLS WIN!" : "PALACE WIN", albionWon ? "goal" : "miss");
    setStatus(albionWon ? "Brighton win the shoot-out" : "Palace take the shoot-out", albionWon ? "Derby nerve held from the spot." : "Restart and try to turn it around.");

    const saveRate = state.palaceKicks ? Math.round((state.userSaves / state.palaceKicks) * 100) : 0;
    const conversion = state.albionKicks ? Math.round((state.albionGoals / state.albionKicks) * 100) : 0;
    const averageReaction = state.reactionTimes.length
      ? Math.round(state.reactionTimes.reduce((sum, value) => sum + value, 0) / state.reactionTimes.length)
      : 0;
    summary.hidden = false;
    summary.innerHTML = `
      <p class="eyebrow">Full-time report</p>
      <h3>${albionWon ? "Brighton win under derby pressure" : "Palace edge the shoot-out"}</h3>
      <div class="shootout-summary-grid">
        <article><b>${conversion}%</b><span>Albion conversion</span></article>
        <article><b>${state.userSaves}</b><span>Verbruggen saves</span></article>
        <article><b>${saveRate}%</b><span>Save rate</span></article>
        <article><b>${averageReaction ? `${averageReaction} ms` : "—"}</b><span>Average reaction</span></article>
      </div>
      <p>${state.catches ? `${state.catches} clean ${state.catches === 1 ? "catch" : "catches"}. ` : ""}${state.fingertips ? `${state.fingertips} fingertip ${state.fingertips === 1 ? "save" : "saves"}. ` : ""}${state.panenkaAttempts ? `${state.panenkaGoals}/${state.panenkaAttempts} Panenkas scored.` : ""}</p>`;

    const record = readRecord();
    record.played += 1;
    if (albionWon) record.wins += 1;
    record.saves += state.userSaves;
    record.bestSaveRate = Math.max(record.bestSaveRate, saveRate);
    localStorage.setItem("albionShootoutRecord", JSON.stringify(record));
    localStorage.setItem("albionShootoutSavedAt", new Date().toISOString());
    renderRecord();
    shareButton.hidden = false;
    shareButton.dataset.shareText = `Brighton ${state.albionGoals}–${state.palaceGoals} Palace. I made ${state.userSaves} ${state.userSaves === 1 ? "save" : "saves"} as Bart Verbruggen in the Albion Fan Hub shoot-out.`;
    if (albionWon) sound("goal");
  }

  function resetGame() {
    window.clearTimeout(state.reactionTimer);
    Object.assign(state, {
      phase: "shoot",
      locked: false,
      finished: false,
      albionResults: [],
      palaceResults: [],
      albionGoals: 0,
      palaceGoals: 0,
      albionKicks: 0,
      palaceKicks: 0,
      palaceSaves: 0,
      userSaves: 0,
      reactionTimes: [],
      catches: 0,
      fingertips: 0,
      panenkaAttempts: 0,
      panenkaGoals: 0,
      reactionOpenedAt: 0,
      reactionOpen: false,
      palaceTarget: null,
      palaceMiss: false,
      userDive: null,
    });
    summary.hidden = true;
    summary.innerHTML = "";
    shareButton.hidden = true;
    panenka.checked = false;
    prepareAlbionKick();
  }

  stage.addEventListener("pointermove", (event) => {
    if (state.phase !== "shoot" && state.phase !== "save") return;
    const point = eventGoalPoint(event);
    if (point.inside) setReticle(point.x, point.y);
  });

  stage.addEventListener("pointerdown", (event) => {
    const point = eventGoalPoint(event);
    if (!point.inside) {
      if (state.phase === "save" && !state.reactionOpen) setStatus("Wait for the strike", "Verbruggen cannot move early.");
      return;
    }
    event.preventDefault();
    setReticle(point.x, point.y);
    if (state.phase === "shoot") takeAlbionPenalty(point);
    else if (state.phase === "save") takeUserDive(point);
  });

  stage.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 0.08 : 0.035;
    let handled = true;
    if (event.key === "ArrowLeft") setReticle(state.aim.x - step, state.aim.y);
    else if (event.key === "ArrowRight") setReticle(state.aim.x + step, state.aim.y);
    else if (event.key === "ArrowUp") setReticle(state.aim.x, state.aim.y - step);
    else if (event.key === "ArrowDown") setReticle(state.aim.x, state.aim.y + step);
    else if (event.key === "Enter" || event.key === " ") {
      if (state.phase === "shoot") takeAlbionPenalty({ ...state.aim });
      else if (state.phase === "save") takeUserDive({ ...state.aim });
      else if (state.phase === "palace-ready") beginPalacePenalty();
    } else if (event.key.toLowerCase() === "p" && state.phase === "shoot") panenka.checked = !panenka.checked;
    else handled = false;
    if (handled) event.preventDefault();
  });

  readyButton.addEventListener("click", beginPalacePenalty);
  $("resetShootout").addEventListener("click", resetGame);

  difficulty.addEventListener("change", () => {
    localStorage.setItem("albionShootoutDifficulty", difficulty.value);
    if (!state.finished) setStatus("Difficulty updated", `${difficulty.options[difficulty.selectedIndex].text} settings now apply.`);
  });

  soundButton.addEventListener("click", () => {
    state.sound = !state.sound;
    localStorage.setItem("albionShootoutSound", state.sound ? "on" : "off");
    soundButton.textContent = state.sound ? "Sound on" : "Sound off";
    soundButton.setAttribute("aria-pressed", String(state.sound));
    if (state.sound) sound("kick");
  });

  $("fullscreenShootout").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === shootoutCard) await document.exitFullscreen();
      else if (shootoutCard.requestFullscreen) await shootoutCard.requestFullscreen();
      else shootoutCard.classList.toggle("fullscreen-fallback");
    } catch {
      shootoutCard.classList.toggle("fullscreen-fallback");
    }
  });

  document.addEventListener("fullscreenchange", () => {
    $("fullscreenShootout").textContent = document.fullscreenElement ? "Exit full screen" : "Full-screen game";
  });

  shareButton.addEventListener("click", async () => {
    const text = shareButton.dataset.shareText || "I played Brighton v Palace in the Albion Fan Hub penalty shoot-out.";
    try {
      if (navigator.share) await navigator.share({ title: "Albion Fan Hub shoot-out", text });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        shareButton.textContent = "Result copied";
        window.setTimeout(() => { shareButton.textContent = "Share result"; }, 1300);
      }
    } catch {}
  });

  const storedDifficulty = localStorage.getItem("albionShootoutDifficulty");
  if (storedDifficulty && configurations[storedDifficulty]) difficulty.value = storedDifficulty;
  soundButton.textContent = state.sound ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-pressed", String(state.sound));
  setReticle(0.5, 0.48);
  renderRecord();
  resetGame();
})();
