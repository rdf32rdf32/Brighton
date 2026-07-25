(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const stage = $("penaltyStage");
  if (!stage) return;

  const goalMouth = $("goalMouth");
  const ball = $("penaltyBall");
  const ballShadow = $("penaltyBallShadow");
  const keeper = $("keeperFigure");
  const taker = $("takerFigure");
  const referee = $("refereeFigure");
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
  const miniScore = $("stadiumMiniScore");
  const celebrationPlayers = $("celebrationPlayers");
  const confetti = $("shootoutConfetti");

  const goalBox = { left: 0.16, top: 0.12, width: 0.68, height: 0.365 };
  const ballStart = { x: 0.5, y: 0.77 };

  function syncGoalBox() {
    const stageRect = stage.getBoundingClientRect();
    const goalRect = goalMouth.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !goalRect.width || !goalRect.height) return goalBox;
    goalBox.left = (goalRect.left - stageRect.left) / stageRect.width;
    goalBox.top = (goalRect.top - stageRect.top) / stageRect.height;
    goalBox.width = goalRect.width / stageRect.width;
    goalBox.height = goalRect.height / stageRect.height;
    return goalBox;
  }
  const keeperBootRatio = 0.924;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const reducedMotion = () =>
    document.body.classList.contains("user-reduce-motion") ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const configurations = {
    normal: {
      shotSpread: 0.018,
      keeperNoise: 0.18,
      keeperReach: 0.165,
      palaceMiss: 0.16,
      saveRadius: 0.415,
      preContactWindow: 365,
      postContactWindow: 720,
      flight: 890,
      runUpScale: 1.03,
      cueStrength: 1,
      diveAssist: 0.48,
      sameSideBonus: 0.105,
    },
    hard: {
      shotSpread: 0.034,
      keeperNoise: 0.12,
      keeperReach: 0.19,
      palaceMiss: 0.1,
      saveRadius: 0.305,
      preContactWindow: 225,
      postContactWindow: 500,
      flight: 735,
      runUpScale: 0.94,
      cueStrength: 0.52,
      diveAssist: 0.18,
      sameSideBonus: 0.045,
    },
  };

  const albionTakers = [
    { name: "Danny Welbeck", number: 18, foot: "right", style: "measured" },
    { name: "Georginio Rutter", number: 10, foot: "right", style: "stutter" },
    { name: "Yankuba Minteh", number: 11, foot: "left", style: "quick" },
    { name: "Diego Gómez", number: 25, foot: "right", style: "direct" },
    { name: "Maxim De Cuyper", number: 29, foot: "left", style: "measured" },
  ];

  const palaceTakers = [
    { name: "Palace taker 1", foot: "right", delay: 870 },
    { name: "Palace taker 2", foot: "left", delay: 980 },
    { name: "Palace taker 3", foot: "right", delay: 910 },
    { name: "Palace taker 4", foot: "left", delay: 1040 },
    { name: "Palace taker 5", foot: "right", delay: 850 },
  ];

  const state = {
    phase: "loading",
    locked: true,
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
    contactAt: 0,
    reactionOpen: false,
    palaceTarget: null,
    palaceMiss: false,
    userDive: null,
    reactionTimer: 0,
    sequence: 0,
    sound: localStorage.getItem("albionShootoutSound") !== "off",
    pointerStart: null,
    pointerLast: null,
    activePointerId: null,
  };

  let audioContext = null;
  let currentAnimations = [];
  let keeperRoutineIndex = 0;

  function config() {
    return configurations[difficulty.value] || configurations.normal;
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
    } else if (kind === "finalWhistle") {
      tone(1320, 0.09, "sine", 0.04);
      window.setTimeout(() => tone(1510, 0.1, "sine", 0.035), 110);
      window.setTimeout(() => tone(1320, 0.12, "sine", 0.04), 235);
    } else if (kind === "kick") tone(112, 0.095, "triangle", 0.09);
    else if (kind === "goal") {
      tone(510, 0.12, "square", 0.042);
      window.setTimeout(() => tone(650, 0.18, "square", 0.038), 95);
    } else if (kind === "save") {
      tone(168, 0.14, "sawtooth", 0.055);
      window.setTimeout(() => tone(240, 0.12, "triangle", 0.034), 80);
    } else if (kind === "post") tone(940, 0.23, "triangle", 0.05);
    else if (kind === "gloves") tone(260, 0.05, "triangle", 0.026);
    else if (kind === "albionCheer") {
      [175, 210, 255, 310].forEach((frequency, index) => window.setTimeout(() => tone(frequency, .28, "sine", .021), index * 55));
    } else if (kind === "palaceCheer") {
      [150, 188, 225].forEach((frequency, index) => window.setTimeout(() => tone(frequency, .24, "sine", .017), index * 65));
    } else if (kind === "win") {
      [180, 225, 280, 350, 440].forEach((frequency, index) => window.setTimeout(() => tone(frequency, .42, "sine", .026), index * 75));
    } else if (kind === "gasp") {
      tone(135, .18, "sine", .018);
      window.setTimeout(() => tone(110, .22, "sine", .014), 85);
    } else tone(210, 0.14, "sine", 0.04);
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
      (state.phase.startsWith("albion") && state.albionKicks === state.palaceKicks ? 1 : 0);
    return round <= 5 ? `${Math.max(1, round)}/5` : `SD ${round - 5}`;
  }

  function renderScore() {
    $("albionGoalCount").textContent = String(state.albionGoals);
    $("palaceGoalCount").textContent = String(state.palaceGoals);
    $("albionPenaltyMarkers").innerHTML = markerHtml(state.albionResults);
    $("palacePenaltyMarkers").innerHTML = markerHtml(state.palaceResults);
    $("shotCount").textContent = currentRound();
    if (miniScore) miniScore.textContent = `${state.albionGoals}–${state.palaceGoals}`;

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
    window.setTimeout(() => { decision.hidden = true; }, reducedMotion() ? 650 : 1100);
  }

  function setReticle(nx, ny) {
    syncGoalBox();
    state.aim.x = clamp(nx, 0.025, 0.975);
    state.aim.y = clamp(ny, 0.035, 0.965);
    const sx = goalBox.left + state.aim.x * goalBox.width;
    const sy = goalBox.top + state.aim.y * goalBox.height;
    reticle.style.left = `${sx * 100}%`;
    reticle.style.top = `${sy * 100}%`;
  }

  function eventGoalPoint(event) {
    syncGoalBox();
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

  function cancelAnimations() {
    currentAnimations.forEach((animation) => {
      try { animation.cancel(); } catch {}
    });
    currentAnimations = [];
    [ball, ballShadow, keeper, taker, referee, celebrationPlayers].forEach((element) => {
      element?.getAnimations().forEach((animation) => animation.cancel());
    });
  }

  function keeperDimensions() {
    const rect = keeper.getBoundingClientRect();
    return {
      width: rect.width || stage.clientWidth * 0.108,
      height: rect.height || stage.clientWidth * 0.108 * (250 / 180),
    };
  }

  function positionKeeperOnLine() {
    if (!stage.clientHeight) return;
    syncGoalBox();
    const dimensions = keeperDimensions();
    const goalLineY = (goalBox.top + goalBox.height) * stage.clientHeight;
    const top = goalLineY - dimensions.height * keeperBootRatio;
    keeper.style.left = "50%";
    keeper.style.top = `${top}px`;
    keeper.style.transform = "translateX(-50%)";
    stage.style.setProperty("--keeper-line-y", `${goalLineY}px`);
  }

  function resetCrowd() {
    stage.classList.remove(
      "crowd-hush", "crowd-albion-cheer", "crowd-palace-cheer", "crowd-gasp",
      "shootout-win-albion", "shootout-win-palace", "save-celebration", "goal-celebration",
    );
  }

  function crowdReaction(kind, duration = 1550) {
    stage.classList.remove("crowd-hush", "crowd-albion-cheer", "crowd-palace-cheer", "crowd-gasp");
    if (kind) stage.classList.add(kind);
    if (kind && kind !== "crowd-hush") {
      window.setTimeout(() => stage.classList.remove(kind), reducedMotion() ? 300 : duration);
    }
  }

  function resetVisuals() {
    cancelAnimations();
    ball.style.left = `${ballStart.x * 100}%`;
    ball.style.top = `${ballStart.y * 100}%`;
    ball.style.opacity = "1";
    ball.style.transform = "translate(-50%,-50%) scale(1) rotate(0deg)";
    if (ballShadow) {
      ballShadow.style.left = `${ballStart.x * 100}%`;
      ballShadow.style.top = `${(ballStart.y + .012) * 100}%`;
      ballShadow.style.opacity = "1";
      ballShadow.style.transform = "translate(-50%,-50%) scale(1)";
    }
    taker.style.left = "50%";
    taker.style.top = "50.5%";
    taker.style.opacity = "1";
    taker.style.transform = "translate(-50%,0)";
    referee.style.left = "81%";
    referee.style.top = "42%";
    referee.style.transform = "translate(-50%,0)";
    keeper.style.opacity = "1";
    keeper.querySelectorAll(".keeper-arm,.keeper-leg,.keeper-body-group").forEach((part) => { part.style.transform = ""; });
    taker.querySelectorAll(".taker-arm,.taker-leg,.taker-root").forEach((part) => { part.style.transform = ""; });
    referee.querySelectorAll(".referee-arm,.referee-leg,.referee-root,.referee-head-group").forEach((part) => { part.style.transform = ""; });
    stage.classList.remove("palace-kick", "is-save-window", "is-locked", "is-waiting", "is-aiming", "placing-ball");
    goalMouth.classList.remove("net-hit", "net-hit-left", "net-hit-right", "net-hit-high", "net-hit-low", "net-hit-centre");
    goalMouth.style.removeProperty("--hit-x");
    goalMouth.style.removeProperty("--hit-y");
    cue.hidden = true;
    decision.hidden = true;
    if (celebrationPlayers) celebrationPlayers.hidden = true;
    if (confetti) confetti.hidden = true;
    resetCrowd();
    positionKeeperOnLine();
  }

  function animateElement(element, keyframes, options = {}) {
    if (!element) return null;
    const safeOptions = reducedMotion()
      ? { ...options, duration: Math.min(130, Number(options.duration) || 130) }
      : options;
    const animation = element.animate(keyframes, { fill: "forwards", easing: "ease-out", ...safeOptions });
    currentAnimations.push(animation);
    return animation;
  }

  function stagePoint(goalPoint) {
    syncGoalBox();
    return {
      x: goalBox.left + goalPoint.x * goalBox.width,
      y: goalBox.top + goalPoint.y * goalBox.height,
    };
  }

  function animateRunUp(isPalace, foot = "right", target = null, style = "direct") {
    const footDirection = foot === "left" ? -1 : 1;
    const settings = config();
    const targetBias = target ? (target.x - 0.5) * 48 * settings.cueStrength : 0;
    const styleOffset = style === "stutter" ? 7 : style === "quick" ? -5 : 0;
    const duration = isPalace ? Math.round(830 * settings.runUpScale) : style === "quick" ? 585 : 680;
    stage.classList.toggle("palace-kick", isPalace);
    const run = animateElement(
      taker,
      [
        { transform: `translate(calc(-50% + ${-footDirection * 22 + styleOffset}px), 18px) scale(.965)` },
        { transform: `translate(calc(-50% + ${footDirection * 10 + targetBias * .18}px), -4px) scale(1.015)`, offset: style === "stutter" ? .43 : .56 },
        { transform: `translate(calc(-50% + ${targetBias}px), -34px) scale(.985)` },
        { transform: `translate(calc(-50% + ${targetBias + footDirection * 7}px), -39px) scale(.975)` },
      ],
      { duration, easing: style === "stutter" ? "cubic-bezier(.2,.55,.18,1)" : "cubic-bezier(.24,.72,.28,1)" },
    );
    const kickingLeg = taker.querySelector(foot === "left" ? ".taker-leg-left" : ".taker-leg-right");
    const standingLeg = taker.querySelector(foot === "left" ? ".taker-leg-right" : ".taker-leg-left");
    const balanceArm = taker.querySelector(foot === "left" ? ".taker-arm-right" : ".taker-arm-left");
    const trailingArm = taker.querySelector(foot === "left" ? ".taker-arm-left" : ".taker-arm-right");
    if (kickingLeg) animateElement(kickingLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * -31}deg)`, offset: .58 },
      { transform: `rotate(${footDirection * 42}deg)`, offset: .82 },
      { transform: `rotate(${footDirection * 22}deg)` },
    ], { duration });
    if (standingLeg) animateElement(standingLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * -5}deg)`, offset: .7 },
      { transform: `rotate(${footDirection * 4}deg)` },
    ], { duration });
    if (balanceArm) animateElement(balanceArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * 24}deg)`, offset: .66 },
      { transform: `rotate(${footDirection * -13}deg)` },
    ], { duration });
    if (trailingArm) animateElement(trailingArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * -12}deg)`, offset: .62 },
      { transform: `rotate(${footDirection * 10}deg)` },
    ], { duration });
    return { animation: run, duration };
  }

  function animateBall(target, duration, saved = false, miss = false, shotType = "driven") {
    const point = stagePoint(target);
    const endScale = saved ? 0.66 : miss ? 0.54 : 0.48;
    const panenkaShot = shotType === "panenka";
    const spin = panenkaShot ? -300 : target.x < .5 ? 560 : -560;
    const midX = ballStart.x + (point.x - ballStart.x) * .52;
    const linearMidY = ballStart.y + (point.y - ballStart.y) * .52;
    const midY = panenkaShot ? linearMidY - .105 : linearMidY;
    sound("kick");
    if (ballShadow) {
      animateElement(ballShadow, [
        { left: `${ballStart.x * 100}%`, top: `${(ballStart.y + .012) * 100}%`, opacity: .72, transform: "translate(-50%,-50%) scale(1)" },
        { left: `${midX * 100}%`, top: `${(ballStart.y - .01) * 100}%`, opacity: panenkaShot ? .16 : .28, transform: "translate(-50%,-50%) scale(.62)" },
        { left: `${point.x * 100}%`, top: `${(goalBox.top + goalBox.height + .012) * 100}%`, opacity: .06, transform: "translate(-50%,-50%) scale(.3)" },
      ], { duration, easing: "cubic-bezier(.18,.58,.24,1)" });
    }
    return animateElement(
      ball,
      [
        { left: `${ballStart.x * 100}%`, top: `${ballStart.y * 100}%`, transform: "translate(-50%,-50%) scale(1) rotate(0deg)" },
        { left: `${midX * 100}%`, top: `${midY * 100}%`, transform: `translate(-50%,-50%) scale(${panenkaShot ? .78 : .7}) rotate(${spin * .42}deg)`, offset: .5 },
        { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: `translate(-50%,-50%) scale(${endScale}) rotate(${spin}deg)` },
      ],
      { duration, easing: panenkaShot ? "cubic-bezier(.22,.42,.32,1)" : "linear" },
    );
  }

  function animateDeflection(target, saveType) {
    if (saveType === "CATCH") {
      if (ballShadow) animateElement(ballShadow, [{ opacity: .08 }, { opacity: 0 }], { duration: 220 });
      return animateElement(ball, [
        { opacity: 1, transform: "translate(-50%,-50%) scale(.66)" },
        { opacity: .18, transform: "translate(-50%,-50%) scale(.26)" },
      ], { duration: 230 });
    }
    const direction = target.x < 0.5 ? -1 : 1;
    const point = stagePoint(target);
    const strong = saveType === "PARRIED" || saveType === "BLOCKED";
    const endX = clamp(point.x + direction * (saveType === "FINGERTIP SAVE" ? .095 : strong ? .075 : .055), .015, .985);
    const endY = clamp(point.y + (target.y < .42 ? -.055 : .065), .015, .95);
    if (ballShadow) animateElement(ballShadow, [
      { left: `${point.x * 100}%`, opacity: .12 },
      { left: `${endX * 100}%`, opacity: .26, transform: "translate(-50%,-50%) scale(.55)" },
    ], { duration: 360 });
    return animateElement(ball, [
      { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: "translate(-50%,-50%) scale(.66) rotate(560deg)" },
      { left: `${endX * 100}%`, top: `${endY * 100}%`, transform: "translate(-50%,-50%) scale(.54) rotate(790deg)" },
    ], { duration: 360, easing: "cubic-bezier(.16,.52,.35,1)" });
  }

  function diveZone(point) {
    if (point.x >= 0.38 && point.x <= 0.62) return "centre";
    const side = point.x < 0.5 ? "left" : "right";
    return `${point.y < 0.48 ? "high" : "low"}-${side}`;
  }

  function animateKeeperDive(point, duration = 700, saved = false) {
    positionKeeperOnLine();
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const dimensions = keeperDimensions();
    const keeperWidth = dimensions.width;
    const keeperHeight = dimensions.height;
    const baseTop = parseFloat(keeper.style.top) || 0;
    const target = stagePoint(point);
    const targetX = target.x * stageWidth;
    const targetY = target.y * stageHeight;
    const zone = diveZone(point);
    const direction = point.x < .42 ? -1 : point.x > .58 ? 1 : 0;
    const gloveXRatio = direction < 0 ? 38 / 180 : direction > 0 ? 142 / 180 : .5;
    const gloveYRatio = direction === 0 ? .5 : 128 / 250;
    const baseGloveX = stageWidth * .5 + (gloveXRatio - .5) * keeperWidth;
    const baseGloveY = baseTop + gloveYRatio * keeperHeight;
    let dx = (targetX - baseGloveX) * (direction ? .84 : .38);
    let dy = (targetY - baseGloveY) * (direction ? .76 : .55);
    const goalWidth = goalBox.width * stageWidth;
    const maxDx = goalWidth * .445;
    dx = clamp(dx, -maxDx, maxDx);
    dy = clamp(dy, -keeperHeight * .63, keeperHeight * .27);

    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const leftLeg = keeper.querySelector(".keeper-leg-left");
    const rightLeg = keeper.querySelector(".keeper-leg-right");
    const body = keeper.querySelector(".keeper-body-group");
    let leftArmEnd = 0, rightArmEnd = 0, leftLegEnd = 0, rightLegEnd = 0;
    if (zone === "high-left") { leftArmEnd = -102; rightArmEnd = -63; leftLegEnd = 24; rightLegEnd = -18; }
    else if (zone === "low-left") { leftArmEnd = -34; rightArmEnd = -10; leftLegEnd = 39; rightLegEnd = -24; }
    else if (zone === "high-right") { rightArmEnd = 102; leftArmEnd = 63; rightLegEnd = -24; leftLegEnd = 18; }
    else if (zone === "low-right") { rightArmEnd = 34; leftArmEnd = 10; rightLegEnd = -39; leftLegEnd = 24; }
    else { leftArmEnd = -74; rightArmEnd = 74; leftLegEnd = 23; rightLegEnd = -23; }

    if (leftArm) animateElement(leftArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${leftArmEnd * .18}deg)`, offset: .22 },
      { transform: `rotate(${leftArmEnd}deg)`, offset: .72 },
      { transform: `rotate(${leftArmEnd * .9}deg)` },
    ], { duration: duration * .94 });
    if (rightArm) animateElement(rightArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${rightArmEnd * .18}deg)`, offset: .22 },
      { transform: `rotate(${rightArmEnd}deg)`, offset: .72 },
      { transform: `rotate(${rightArmEnd * .9}deg)` },
    ], { duration: duration * .94 });
    if (leftLeg) animateElement(leftLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${leftLegEnd * -.22}deg)`, offset: .2 }, { transform: `rotate(${leftLegEnd}deg)`, offset: .72 }, { transform: `rotate(${leftLegEnd * .82}deg)` }], { duration });
    if (rightLeg) animateElement(rightLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${rightLegEnd * -.22}deg)`, offset: .2 }, { transform: `rotate(${rightLegEnd}deg)`, offset: .72 }, { transform: `rotate(${rightLegEnd * .82}deg)` }], { duration });
    if (body) animateElement(body, [
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(3px) scale(.99,.97)", offset: .18 },
      { transform: "translateY(-2px) scale(1.045,1)", offset: .7 },
      { transform: "translateY(3px) scale(1.01,.985)" },
    ], { duration });

    const fullLength = direction !== 0 && (Math.abs(point.x - .5) > .21 || point.y < .4);
    const rotation = direction * (zone.startsWith("low") ? 22 : zone.startsWith("high") ? 17 : 0);
    const landingY = dy + (zone.startsWith("low") ? keeperHeight * .09 : keeperHeight * .045);
    const extensionScale = fullLength ? 1.12 : saved ? 1.065 : 1.035;
    return animateElement(keeper, [
      { transform: "translateX(-50%) translate(0,0) rotate(0deg) scale(1)" },
      { transform: `translateX(-50%) translate(${-direction * 5}px,3px) rotate(${-rotation * .07}deg) scale(.99,.97)`, offset: .18 },
      { transform: `translateX(-50%) translate(${dx * .54}px,${dy * .48}px) rotate(${rotation * .55}deg) scale(1.03)`, offset: .48 },
      { transform: `translateX(-50%) translate(${dx}px,${dy}px) rotate(${rotation}deg) scale(${extensionScale},1)`, offset: .76 },
      { transform: `translateX(-50%) translate(${dx * .94}px,${landingY}px) rotate(${rotation * 1.08}deg) scale(1.02,.98)` },
    ], { duration, easing: "cubic-bezier(.16,.69,.22,1)" });
  }

  function assistedDivePoint(point) {
    const target = state.palaceTarget;
    if (!target) return { ...point };
    const settings = config();
    const pointSide = point.x < .4 ? -1 : point.x > .6 ? 1 : 0;
    const targetSide = target.x < .4 ? -1 : target.x > .6 ? 1 : 0;
    const compatible = pointSide === targetSide || (pointSide === 0 && targetSide === 0);
    if (!compatible) return { ...point };
    const heightCompatible = Math.abs(point.y - target.y) < .48;
    const amount = settings.diveAssist * (heightCompatible ? 1 : .55);
    return {
      x: clamp(point.x + (target.x - point.x) * amount, .015, .985),
      y: clamp(point.y + (target.y - point.y) * amount, .02, .98),
    };
  }

  function netReaction(target, strength = 1) {
    goalMouth.classList.remove("net-hit", "net-hit-left", "net-hit-right", "net-hit-high", "net-hit-low", "net-hit-centre");
    goalMouth.style.setProperty("--hit-x", `${clamp(target.x, 0, 1) * 100}%`);
    goalMouth.style.setProperty("--hit-y", `${clamp(target.y, 0, 1) * 100}%`);
    void goalMouth.offsetWidth;
    goalMouth.classList.add("net-hit");
    if (target.x < .32) goalMouth.classList.add("net-hit-left");
    else if (target.x > .68) goalMouth.classList.add("net-hit-right");
    else goalMouth.classList.add("net-hit-centre");
    if (target.y < .34) goalMouth.classList.add("net-hit-high");
    if (target.y > .7) goalMouth.classList.add("net-hit-low");
    window.setTimeout(() => goalMouth.classList.remove("net-hit", "net-hit-left", "net-hit-right", "net-hit-high", "net-hit-low", "net-hit-centre"), reducedMotion() ? 220 : 620 * strength);
  }

  function frameReaction(target) {
    const part = target.y < 0 ? goalMouth.querySelector(".goal-crossbar") : target.x < 0 ? goalMouth.querySelector(".left-post") : goalMouth.querySelector(".right-post");
    if (!part) return;
    animateElement(part, [
      { transform: "translate(0,0)" },
      { transform: target.y < 0 ? "translateY(-2px)" : `translateX(${target.x < 0 ? -2 : 2}px)`, offset: .4 },
      { transform: "translate(0,0)" },
    ], { duration: 270, easing: "ease-in-out" });
  }

  async function animateBallPlacement(side, token) {
    const suddenDeath = state.albionKicks >= 5 && state.palaceKicks >= 5;
    const fullPlacement = side === "albion" && (state.albionKicks === 0 || suddenDeath);
    if (!fullPlacement) {
      animateElement(ball, [{ transform: "translate(-50%,-50%) scale(.94)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: reducedMotion() ? 80 : 230 });
      await sleep(reducedMotion() ? 70 : 180);
      return token === state.sequence;
    }
    stage.classList.add("placing-ball");
    ball.style.left = "58%";
    ball.style.top = "70%";
    if (ballShadow) { ballShadow.style.left = "58%"; ballShadow.style.top = "71.2%"; }
    taker.style.left = "59%";
    taker.style.top = "51.5%";
    const root = taker.querySelector(".taker-root");
    animateElement(taker, [
      { transform: "translate(-50%,8px) scale(.95)" },
      { transform: "translate(-50%,-2px) scale(.98)", offset: .45 },
      { transform: "translate(-50%,6px) scale(.96)" },
    ], { duration: reducedMotion() ? 130 : 820 });
    if (root) animateElement(root, [
      { transform: "rotate(0deg) scaleY(1)" },
      { transform: "rotate(8deg) scaleY(.78)", offset: .5 },
      { transform: "rotate(0deg) scaleY(1)" },
    ], { duration: reducedMotion() ? 130 : 820 });
    animateElement(ball, [
      { left: "58%", top: "70%", transform: "translate(-50%,-50%) scale(.8)" },
      { left: "53%", top: "73%", transform: "translate(-50%,-50%) scale(.92)", offset: .48 },
      { left: `${ballStart.x * 100}%`, top: `${ballStart.y * 100}%`, transform: "translate(-50%,-50%) scale(1)" },
    ], { duration: reducedMotion() ? 130 : 760, easing: "cubic-bezier(.25,.65,.3,1)" });
    if (ballShadow) animateElement(ballShadow, [
      { left: "58%", top: "71.2%" },
      { left: `${ballStart.x * 100}%`, top: `${(ballStart.y + .012) * 100}%` },
    ], { duration: reducedMotion() ? 130 : 760 });
    await sleep(reducedMotion() ? 140 : 850);
    if (token !== state.sequence) return false;
    stage.classList.remove("placing-ball");
    taker.style.left = "50%";
    taker.style.top = "50.5%";
    taker.style.transform = "translate(-50%,0)";
    if (root) root.style.transform = "";
    return true;
  }

  function takerReaction(scored, side = "albion") {
    const leftArm = taker.querySelector(".taker-arm-left");
    const rightArm = taker.querySelector(".taker-arm-right");
    const duration = reducedMotion() ? 140 : 760;
    if (scored) {
      stage.classList.add("goal-celebration");
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-112deg)" }], { duration: duration * .65 });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(112deg)" }], { duration: duration * .65 });
      animateElement(taker, [
        { transform: taker.style.transform || "translate(-50%,0)" },
        { transform: `translate(calc(-50% + ${side === "albion" ? -35 : 35}px),-58px) scale(.92)`, offset: .62 },
        { transform: `translate(calc(-50% + ${side === "albion" ? -52 : 52}px),-55px) scale(.91)` },
      ], { duration });
    } else {
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-96deg)" }], { duration: duration * .7 });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(96deg)" }], { duration: duration * .7 });
      animateElement(taker, [{ transform: taker.style.transform || "translate(-50%,0)" }, { transform: "translate(-50%,-35px) rotate(3deg) scale(.93)" }], { duration });
    }
  }

  function keeperCelebration() {
    stage.classList.add("save-celebration");
    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    window.setTimeout(() => {
      positionKeeperOnLine();
      animateElement(keeper, [
        { transform: "translateX(-50%) translateY(8px) scale(.98)" },
        { transform: "translateX(-50%) translateY(-10px) scale(1.02)" },
        { transform: "translateX(-50%) translateY(0) scale(1)" },
      ], { duration: reducedMotion() ? 150 : 620 });
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(-50deg)" }, { transform: "rotate(-115deg)" }, { transform: "rotate(-82deg)" }], { duration: reducedMotion() ? 150 : 620 });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(50deg)" }, { transform: "rotate(115deg)" }, { transform: "rotate(82deg)" }], { duration: reducedMotion() ? 150 : 620 });
    }, reducedMotion() ? 80 : 260);
  }

  function victoryCelebration(albionWon) {
    stage.classList.add(albionWon ? "shootout-win-albion" : "shootout-win-palace");
    sound("finalWhistle");
    if (albionWon) {
      if (celebrationPlayers) celebrationPlayers.hidden = false;
      if (confetti && !reducedMotion()) confetti.hidden = false;
      sound("win");
      window.setTimeout(() => { if (confetti) confetti.hidden = true; }, 2300);
    } else {
      sound("palaceCheer");
    }
  }

  async function keeperRoutine(kind, token) {
    positionKeeperOnLine();
    const routines = ["bar", "point", "gloves", "bounce"];
    const routine = routines[keeperRoutineIndex++ % routines.length];
    const body = keeper.querySelector(".keeper-body-group");
    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const leftLeg = keeper.querySelector(".keeper-leg-left");
    const rightLeg = keeper.querySelector(".keeper-leg-right");
    const duration = reducedMotion() ? 120 : 820;

    if (routine === "bar") {
      const lift = Math.max(8, keeperDimensions().height * .08);
      animateElement(keeper, [
        { transform: "translateX(-50%) translateY(0) scaleY(1)" },
        { transform: `translateX(-50%) translateY(${-lift}px) scaleY(1.035)`, offset: .56 },
        { transform: "translateX(-50%) translateY(0) scaleY(1)" },
      ], { duration, easing: "cubic-bezier(.2,.72,.3,1)" });
      if (rightArm) animateElement(rightArm, [
        { transform: "rotate(0deg)" },
        { transform: "rotate(148deg)", offset: .55 },
        { transform: "rotate(0deg)" },
      ], { duration });
      const bar = goalMouth.querySelector(".goal-crossbar");
      if (bar) animateElement(bar, [{ filter: "brightness(1)" }, { filter: "brightness(1.35)", offset: .56 }, { filter: "brightness(1)" }], { duration });
    } else if (routine === "point") {
      const pointLeft = (state.albionKicks + state.palaceKicks) % 2 === 0;
      const arm = pointLeft ? leftArm : rightArm;
      if (arm) animateElement(arm, [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${pointLeft ? -54 : 54}deg)`, offset: .42 },
        { transform: "rotate(0deg)" },
      ], { duration });
      animateElement(keeper, [{ transform: "translateX(-50%)" }, { transform: `translateX(calc(-50% + ${pointLeft ? -8 : 8}px))`, offset: .42 }, { transform: "translateX(-50%)" }], { duration });
    } else if (routine === "gloves") {
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-82deg)", offset: .45 }, { transform: "rotate(0deg)" }], { duration });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(82deg)", offset: .45 }, { transform: "rotate(0deg)" }], { duration });
      window.setTimeout(() => sound("gloves"), reducedMotion() ? 40 : 360);
    } else {
      if (body) animateElement(body, [{ transform: "translateY(0) scaleY(1)" }, { transform: "translateY(-3px) scaleY(1.02)", offset: .28 }, { transform: "translateY(0) scaleY(.99)", offset: .55 }, { transform: "translateY(-2px) scaleY(1.01)", offset: .75 }, { transform: "translateY(0) scaleY(1)" }], { duration });
      if (leftLeg) animateElement(leftLeg, [{ transform: "rotate(0deg)" }, { transform: "rotate(5deg)" }, { transform: "rotate(0deg)" }], { duration });
      if (rightLeg) animateElement(rightLeg, [{ transform: "rotate(0deg)" }, { transform: "rotate(-5deg)" }, { transform: "rotate(0deg)" }], { duration });
    }
    await sleep(duration);
    if (token !== state.sequence) return false;
    keeper.querySelectorAll(".keeper-arm,.keeper-leg,.keeper-body-group").forEach((part) => { part.style.transform = ""; });
    positionKeeperOnLine();
    return true;
  }

  async function refereeCheck(token) {
    const rightArm = referee.querySelector(".referee-arm-right");
    const leftArm = referee.querySelector(".referee-arm-left");
    const head = referee.querySelector(".referee-head-group");
    const duration = reducedMotion() ? 120 : 760;
    animateElement(referee, [
      { transform: "translate(-50%,0) rotate(0deg)" },
      { transform: "translate(-62%,-3px) rotate(-2deg)", offset: .38 },
      { transform: "translate(-48%,0) rotate(1deg)" },
    ], { duration });
    if (head) animateElement(head, [{ transform: "rotate(0deg)" }, { transform: "rotate(-8deg)", offset: .35 }, { transform: "rotate(7deg)", offset: .7 }, { transform: "rotate(0deg)" }], { duration });
    if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-42deg)", offset: .38 }, { transform: "rotate(0deg)" }], { duration });
    if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-72deg)", offset: .72 }, { transform: "rotate(-48deg)" }], { duration });
    await sleep(duration);
    return token === state.sequence;
  }

  function refereeSignal(scored) {
    const rightArm = referee.querySelector(".referee-arm-right");
    const leftArm = referee.querySelector(".referee-arm-left");
    const head = referee.querySelector(".referee-head-group");
    const duration = reducedMotion() ? 120 : 650;
    if (head) animateElement(head, [{ transform: "rotate(0deg)" }, { transform: "rotate(-7deg)" }, { transform: "rotate(0deg)" }], { duration });
    if (scored) {
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(-48deg)" }, { transform: "rotate(34deg)" }, { transform: "rotate(18deg)" }], { duration });
      animateElement(referee, [{ transform: "translate(-48%,0)" }, { transform: "translate(-64%,-1px)" }], { duration });
    } else {
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-58deg)" }, { transform: "rotate(-24deg)" }], { duration });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(-48deg)" }, { transform: "rotate(46deg)" }, { transform: "rotate(16deg)" }], { duration });
    }
  }

  async function preKickCeremony(side, token) {
    crowdReaction("crowd-hush");
    setStatus("The ball is set", side === "albion" ? "The referee checks the spot and the Palace goalkeeper." : "Verbruggen checks the frame and settles on the goal line.");
    if (!(await animateBallPlacement(side, token))) return false;
    setStatus("Referee checks the penalty", side === "albion" ? "The Palace goalkeeper stays on the line." : "Verbruggen completes his routine and faces the taker.");
    const ok = await Promise.all([keeperRoutine(side, token), refereeCheck(token)]);
    if (token !== state.sequence || ok.includes(false)) return false;
    sound("whistle");
    await sleep(reducedMotion() ? 70 : 180);
    return token === state.sequence;
  }

  function resultDecision() {
    const albionLeft = Math.max(0, 5 - state.albionKicks);
    const palaceLeft = Math.max(0, 5 - state.palaceKicks);
    if (state.albionKicks < 5 || state.palaceKicks < 5) {
      if (state.albionGoals > state.palaceGoals + palaceLeft) return { finished: true, albionWon: true };
      if (state.palaceGoals > state.albionGoals + albionLeft) return { finished: true, albionWon: false };
    }
    if (state.albionKicks >= 5 && state.palaceKicks >= 5 && state.albionKicks === state.palaceKicks && state.albionGoals !== state.palaceGoals) {
      return { finished: true, albionWon: state.albionGoals > state.palaceGoals };
    }
    return { finished: false, albionWon: false };
  }

  async function prepareAlbionKick() {
    const token = ++state.sequence;
    resetVisuals();
    keeper.classList.add("opposition-keeper");
    stage.classList.remove("palace-kick");
    state.phase = "albion-prep";
    state.locked = true;
    state.reactionOpen = false;
    readyPanel.hidden = true;
    panenka.disabled = true;
    panenka.closest("label")?.removeAttribute("hidden");
    difficulty.disabled = state.albionKicks + state.palaceKicks > 0;
    const player = albionTakers[state.albionKicks % albionTakers.length];
    $("penaltyTakerName").textContent = player.name;
    $("penaltyShirt").textContent = String(player.number);
    $("turnBadge").textContent = "ALBION PENALTY";
    $("turnBadge").className = "turn-badge albion-turn";
    $("stageInstruction").textContent = "Wait for the whistle";
    stage.setAttribute("aria-label", "Albion penalty. Wait for the referee, then move the pointer inside the goal and click to shoot.");
    renderScore();
    setReticle(state.aim.x, state.aim.y);
    if (!(await preKickCeremony("albion", token))) return;
    state.phase = "albion-aim";
    state.locked = false;
    stage.classList.add("is-aiming");
    stage.classList.remove("is-locked", "crowd-hush");
    panenka.disabled = false;
    $("stageInstruction").textContent = "Aim and click to shoot";
    setStatus("Pick your spot", "The whistle has gone. Click once inside the goal.");
  }

  function preparePalaceKick() {
    ++state.sequence;
    resetVisuals();
    keeper.classList.remove("opposition-keeper");
    stage.classList.add("palace-kick", "is-waiting");
    state.phase = "palace-ready";
    state.locked = true;
    state.reactionOpen = false;
    readyPanel.hidden = false;
    panenka.disabled = true;
    panenka.closest("label")?.setAttribute("hidden", "");
    difficulty.disabled = true;
    const player = palaceTakers[state.palaceKicks % palaceTakers.length];
    $("penaltyTakerName").textContent = player.name;
    $("penaltyShirt").textContent = String((state.palaceKicks % 5) + 7);
    $("turnBadge").textContent = "PALACE PENALTY · YOU ARE VERBRUGGEN";
    $("turnBadge").className = "turn-badge palace-turn";
    $("stageInstruction").textContent = "Press Ready, then read the run-up";
    stage.setAttribute("aria-label", "Palace penalty. Press Ready, read the run-up, then move the mouse, swipe, click or tap towards the shot.");
    setStatus("Your turn in goal", "Press Ready when set. You may move as the taker plants his standing foot.");
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
    if (state.phase !== "albion-aim" || state.locked || state.finished) return;
    ensureAudio();
    const token = state.sequence;
    state.locked = true;
    state.phase = "albion-run";
    stage.classList.remove("is-aiming");
    stage.classList.add("is-locked", "crowd-hush");
    panenka.disabled = true;
    const settings = config();
    const player = albionTakers[state.albionKicks % albionTakers.length];
    const isPanenka = panenka.checked;
    if (isPanenka) state.panenkaAttempts += 1;
    setStatus(`${player.name} begins the run-up`, isPanenka ? "A disguised central chip." : "The goalkeeper stays on the line until contact.");
    const run = animateRunUp(false, player.foot, aim, player.style);
    await sleep(reducedMotion() ? 100 : Math.max(390, run.duration - 130));
    if (token !== state.sequence) return;

    const edge = Math.max(Math.abs(aim.x - .5), Math.abs(aim.y - .5));
    const spread = settings.shotSpread * (1 + edge * 1.25);
    const resolved = isPanenka
      ? { x: clamp(.5 + gaussian() * .024, .43, .57), y: clamp(.61 + gaussian() * .024, .52, .68) }
      : { x: aim.x + gaussian() * spread, y: aim.y + gaussian() * spread };
    const frameResult = classifyFrame(resolved);
    const keeperGuess = {
      x: clamp(resolved.x + gaussian() * settings.keeperNoise, .04, .96),
      y: clamp(resolved.y + gaussian() * settings.keeperNoise * .78, .06, .94),
    };
    if (isPanenka && Math.random() < .76) keeperGuess.x = Math.random() < .5 ? .12 : .88;
    const distance = Math.hypot(resolved.x - keeperGuess.x, (resolved.y - keeperGuess.y) * .88);
    const centralPenalty = Math.abs(resolved.x - .5) < .12 && resolved.y > .32;
    const saved = !frameResult && distance < settings.keeperReach + (centralPenalty ? .05 : 0);
    const scored = !frameResult && !saved;

    animateKeeperDive(keeperGuess, settings.flight * .9, saved);
    const ballAnimation = animateBall(resolved, settings.flight, saved, Boolean(frameResult), isPanenka ? "panenka" : "driven");
    await ballAnimation?.finished.catch(() => {});
    if (saved) await animateDeflection(resolved, distance < settings.keeperReach * .48 ? "CATCH" : "PARRIED")?.finished.catch(() => {});
    if (frameResult === "woodwork") frameReaction(resolved);

    state.albionKicks += 1;
    if (scored) state.albionGoals += 1;
    if (saved) state.palaceSaves += 1;
    if (isPanenka && scored) state.panenkaGoals += 1;
    state.albionResults.push({ scored, result: frameResult || (saved ? "saved" : "goal") });
    refereeSignal(scored);

    if (scored) {
      netReaction(resolved, isPanenka ? .82 : 1);
      crowdReaction("crowd-albion-cheer", 1750);
      takerReaction(true, "albion");
      showDecision(isPanenka ? "PANENKA!" : "GOAL!", "goal");
      $("stageInstruction").textContent = "Goal for Brighton";
      setStatus("Goal for Brighton", isPanenka ? "The keeper commits and the chip drops centrally." : resolved.x < .3 || resolved.x > .7 ? "Driven into the side netting." : "Placed beyond the goalkeeper.");
      sound("goal"); sound("albionCheer");
    } else if (saved) {
      crowdReaction("crowd-palace-cheer");
      takerReaction(false, "albion");
      showDecision("SAVED!", "save");
      $("stageInstruction").textContent = "Saved by the goalkeeper";
      setStatus("Palace save", "The goalkeeper reaches the shot and keeps it out.");
      sound("save"); sound("palaceCheer");
    } else if (frameResult === "woodwork") {
      crowdReaction("crowd-gasp");
      takerReaction(false, "albion");
      showDecision("OFF THE FRAME!", "miss");
      $("stageInstruction").textContent = "Off the frame";
      setStatus("So close", "The ambitious placement catches the post or crossbar.");
      sound("post"); sound("gasp");
    } else {
      crowdReaction("crowd-gasp");
      takerReaction(false, "albion");
      showDecision("WIDE!", "miss");
      $("stageInstruction").textContent = "Missed";
      setStatus("Missed", "The shot drifts beyond the goal under pressure.");
      sound("gasp");
    }

    panenka.checked = false;
    renderScore();
    const outcome = resultDecision();
    await sleep(reducedMotion() ? 360 : 1550);
    if (outcome.finished) finishShootout(outcome.albionWon);
    else preparePalaceKick();
  }

  function randomPalaceTarget() {
    const settings = config();
    const miss = Math.random() < settings.palaceMiss;
    const normal = difficulty.value !== "hard";
    const options = normal ? [
      { x: .17, y: .28, weight: .55 }, { x: .16, y: .78, weight: 1.75 },
      { x: .83, y: .28, weight: .55 }, { x: .84, y: .78, weight: 1.75 },
      { x: .25, y: .54, weight: 1.6 }, { x: .75, y: .54, weight: 1.6 },
      { x: .5, y: .64, weight: 1.85 }, { x: .5, y: .34, weight: .7 },
    ] : [
      { x: .1, y: .16, weight: 1.15 }, { x: .11, y: .84, weight: 1.3 },
      { x: .9, y: .16, weight: 1.15 }, { x: .89, y: .84, weight: 1.3 },
      { x: .2, y: .49, weight: 1.1 }, { x: .8, y: .49, weight: 1.1 },
      { x: .5, y: .58, weight: .95 }, { x: .5, y: .21, weight: .55 },
    ];
    const pool = options.flatMap((item) => Array(Math.max(1, Math.round(item.weight * 5))).fill(item));
    const base = pool[Math.floor(Math.random() * pool.length)];
    const spread = normal ? .027 : .032;
    if (!miss) return { target: { x: clamp(base.x + gaussian() * spread, .025, .975), y: clamp(base.y + gaussian() * spread, .035, .965) }, miss: false };
    if (Math.random() < .58) return { target: { x: Math.random() < .5 ? -.062 : 1.062, y: clamp(base.y, .08, .92) }, miss: true };
    return { target: { x: clamp(base.x, .08, .92), y: -.065 }, miss: true };
  }

  async function beginPalacePenalty() {
    if (state.phase !== "palace-ready" || state.finished) return;
    ensureAudio();
    const token = ++state.sequence;
    readyPanel.hidden = true;
    state.phase = "palace-prep";
    state.locked = true;
    state.userDive = null;
    state.reactionOpen = false;
    state.pointerStart = null;
    state.pointerLast = null;
    state.activePointerId = null;
    stage.classList.remove("is-waiting");
    stage.classList.add("is-locked", "palace-kick");
    const player = palaceTakers[state.palaceKicks % palaceTakers.length];
    const plan = randomPalaceTarget();
    state.palaceTarget = plan.target;
    state.palaceMiss = plan.miss;
    if (!(await preKickCeremony("palace", token))) return;

    const settings = config();
    const runDuration = Math.round(player.delay * settings.runUpScale);
    state.phase = "palace-run";
    setStatus("Palace begin the run-up", "Read the approach and standing foot. The save window opens before contact.");
    const run = animateRunUp(true, player.foot, state.palaceTarget, "direct");
    const actualRun = Math.max(runDuration, run.duration);
    const waitBeforeWindow = Math.max(80, actualRun - settings.preContactWindow);
    await sleep(reducedMotion() ? 80 : waitBeforeWindow);
    if (token !== state.sequence || state.phase !== "palace-run") return;

    state.phase = "save";
    state.reactionOpen = true;
    const activeGoalRect = goalMouth.getBoundingClientRect();
    state.pointerStart = {
      clientX: activeGoalRect.left + activeGoalRect.width * .5,
      clientY: activeGoalRect.top + activeGoalRect.height * .58,
      time: performance.now(),
    };
    state.pointerLast = { ...state.pointerStart };
    state.contactAt = performance.now() + (reducedMotion() ? 30 : settings.preContactWindow);
    stage.classList.remove("is-locked");
    stage.classList.add("is-save-window");
    $("stageInstruction").textContent = "Move, swipe, click or tap towards the shot";
    setStatus("Read the final stride", "Commit as the standing foot plants, or react immediately after contact.");

    await sleep(reducedMotion() ? 30 : settings.preContactWindow);
    if (token !== state.sequence) return;
    cue.hidden = false;
    setStatus("REACT!", "Move or swipe towards the shot. Normal mode strongly assists the correct side.");
    window.setTimeout(() => { cue.hidden = true; }, reducedMotion() ? 150 : 350);
    const ballAnimation = animateBall(state.palaceTarget, settings.flight, false, state.palaceMiss, "driven");
    window.clearTimeout(state.reactionTimer);
    state.reactionTimer = window.setTimeout(() => {
      state.reactionOpen = false;
      stage.classList.remove("is-save-window");
    }, settings.postContactWindow);

    await ballAnimation?.finished.catch(() => {});
    state.reactionOpen = false;
    stage.classList.remove("is-save-window");
    window.clearTimeout(state.reactionTimer);

    let saved = false;
    let saveType = "";
    if (!state.palaceMiss && state.userDive) {
      const timing = state.userDive.timing;
      const latePenalty = Math.max(0, timing) / settings.postContactWindow;
      const earlyAmount = Math.max(0, -timing) / settings.preContactWindow;
      const timingFactor = clamp(1.08 - latePenalty * .42 - Math.max(0, earlyAmount - .78) * .28, .64, 1.1);
      let radius = settings.saveRadius * timingFactor;
      const targetCentre = Math.abs(state.palaceTarget.x - .5) < .17;
      const diveCentre = Math.abs(state.userDive.x - .5) < .2;
      const targetSide = state.palaceTarget.x < .4 ? -1 : state.palaceTarget.x > .6 ? 1 : 0;
      const diveSide = state.userDive.x < .4 ? -1 : state.userDive.x > .6 ? 1 : 0;
      const sameSide = targetSide === diveSide;
      if (sameSide) radius += settings.sameSideBonus;
      if (targetCentre && diveCentre) radius += .075;
      const distance = Math.hypot(
        state.palaceTarget.x - state.userDive.x,
        (state.palaceTarget.y - state.userDive.y) * .82,
      );
      const gloveEdge = sameSide && distance <= radius * 1.22 && Math.abs(timing) < settings.postContactWindow * .94;
      const bodyBlock = targetCentre && diveCentre && Math.abs(state.palaceTarget.y - state.userDive.y) < .4;
      saved = distance <= radius || gloveEdge || bodyBlock;
      if (saved) {
        if ((distance < radius * .4 || bodyBlock) && timing < 250) saveType = targetCentre ? "BLOCKED" : "CATCH";
        else if (distance > radius * .86 || gloveEdge) saveType = "FINGERTIP SAVE";
        else if (state.palaceTarget.y > .66) saveType = "LEG SAVE";
        else saveType = "PARRIED";
      }
    }

    const scored = !state.palaceMiss && !saved;
    if (saved) await animateDeflection(state.palaceTarget, saveType)?.finished.catch(() => {});
    if (state.palaceMiss) frameReaction(state.palaceTarget);
    state.palaceKicks += 1;
    if (scored) state.palaceGoals += 1;
    if (saved) {
      state.userSaves += 1;
      if (saveType === "CATCH") state.catches += 1;
      if (saveType === "FINGERTIP SAVE") state.fingertips += 1;
    }
    state.palaceResults.push({ scored, result: state.palaceMiss ? "miss" : saved ? "saved" : "goal" });
    refereeSignal(scored);

    if (saved) {
      crowdReaction("crowd-albion-cheer", 1850);
      keeperCelebration();
      takerReaction(false, "palace");
      showDecision(saveType, "save");
      const timingText = state.userDive.timing < 0 ? "well-timed anticipation" : `${Math.round(state.userDive.timing)} ms reaction`;
      $("stageInstruction").textContent = "Saved by Verbruggen";
      setStatus("Verbruggen saves", `${timingText} · ${saveType.toLowerCase()}.`);
      sound("save"); sound("albionCheer");
    } else if (state.palaceMiss) {
      crowdReaction("crowd-albion-cheer");
      takerReaction(false, "palace");
      showDecision("PALACE MISS!", "miss");
      $("stageInstruction").textContent = "Palace miss";
      setStatus("It stays out", "The Palace taker fails to find the target.");
      sound("post"); sound("albionCheer");
    } else {
      netReaction(state.palaceTarget);
      crowdReaction("crowd-palace-cheer");
      takerReaction(true, "palace");
      showDecision("PALACE SCORE", "goal");
      $("stageInstruction").textContent = "Palace score";
      setStatus("Palace score", state.userDive ? "Verbruggen stretches but cannot quite reach it." : "No dive was made in the available window.");
      sound("goal"); sound("palaceCheer");
    }

    renderScore();
    const outcome = resultDecision();
    await sleep(reducedMotion() ? 370 : 1600);
    if (outcome.finished) finishShootout(outcome.albionWon);
    else prepareAlbionKick();
  }

  function takeUserDive(point, source = "direct") {
    if (state.phase !== "save" || !state.reactionOpen || state.userDive) return;
    const timing = performance.now() - state.contactAt;
    let assisted = assistedDivePoint(point);
    if (difficulty.value !== "hard" && state.palaceTarget) {
      const chosenSide = point.x < .4 ? -1 : point.x > .6 ? 1 : 0;
      const targetSide = state.palaceTarget.x < .4 ? -1 : state.palaceTarget.x > .6 ? 1 : 0;
      if (chosenSide === targetSide) {
        assisted = {
          x: clamp(assisted.x + (state.palaceTarget.x - assisted.x) * .34, .015, .985),
          y: clamp(assisted.y + (state.palaceTarget.y - assisted.y) * .28, .02, .98),
        };
      }
    }
    state.userDive = { x: assisted.x, y: assisted.y, rawX: point.x, rawY: point.y, timing, source };
    state.reactionTimes.push(Math.max(0, timing));
    state.reactionOpen = false;
    stage.classList.remove("is-save-window");
    const duration = Math.max(610, config().flight * .94 + Math.max(0, -timing) * .72);
    animateKeeperDive(assisted, duration, true);
  }

  function finishShootout(albionWon) {
    state.finished = true;
    state.locked = true;
    state.phase = "finished";
    ++state.sequence;
    cancelAnimations();
    stage.classList.remove("is-aiming", "is-save-window", "is-waiting");
    stage.classList.add("is-locked");
    readyPanel.hidden = true;
    panenka.disabled = true;
    $("turnBadge").textContent = albionWon ? "SEAGULLS WIN" : "PALACE WIN";
    $("turnBadge").className = `turn-badge ${albionWon ? "albion-turn" : "palace-turn"}`;
    $("penaltyTakerName").textContent = `Brighton ${state.albionGoals}–${state.palaceGoals} Palace`;
    $("stageInstruction").textContent = "Full time";
    showDecision(albionWon ? "SEAGULLS WIN!" : "PALACE WIN", albionWon ? "goal" : "miss");
    refereeSignal(albionWon);
    crowdReaction(albionWon ? "crowd-albion-cheer" : "crowd-palace-cheer", 2600);
    victoryCelebration(albionWon);
    if (albionWon && state.userSaves && state.palaceResults.at(-1)?.result === "saved") keeperCelebration();
    else if (albionWon) takerReaction(true, "albion");
    setStatus(albionWon ? "Brighton win the shoot-out" : "Palace take the shoot-out", albionWon ? "The players and home end celebrate the derby win." : "Restart and try to turn it around.");

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
  }

  function resetGame() {
    window.clearTimeout(state.reactionTimer);
    ++state.sequence;
    Object.assign(state, {
      phase: "loading",
      locked: true,
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
      contactAt: 0,
      reactionOpen: false,
      palaceTarget: null,
      palaceMiss: false,
      userDive: null,
      pointerStart: null,
      pointerLast: null,
      activePointerId: null,
    });
    summary.hidden = true;
    summary.innerHTML = "";
    shareButton.hidden = true;
    if (celebrationPlayers) celebrationPlayers.hidden = true;
    if (confetti) confetti.hidden = true;
    resetCrowd();
    panenka.checked = false;
    difficulty.disabled = false;
    panenka.closest("label")?.removeAttribute("hidden");
    prepareAlbionKick();
  }

  function pointerDistance(a, b) {
    if (!a || !b) return 0;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function beginPointerTracking(event) {
    state.pointerStart = { clientX: event.clientX, clientY: event.clientY, time: performance.now() };
    state.pointerLast = { clientX: event.clientX, clientY: event.clientY, time: performance.now() };
    state.activePointerId = event.pointerId;
    try { stage.setPointerCapture(event.pointerId); } catch {}
  }

  function clearPointerTracking() {
    state.pointerStart = null;
    state.pointerLast = null;
    state.activePointerId = null;
  }

  stage.addEventListener("pointermove", (event) => {
    if (state.phase !== "albion-aim" && state.phase !== "save") return;
    const point = eventGoalPoint(event);
    if (point.inside && state.phase === "albion-aim") {
      setReticle(point.x, point.y);
      return;
    }
    if (state.phase !== "save" || !state.reactionOpen || state.userDive || !point.inside) return;

    const nowPoint = { clientX: event.clientX, clientY: event.clientY, time: performance.now() };
    if (!state.pointerStart) {
      state.pointerStart = nowPoint;
      state.pointerLast = nowPoint;
      return;
    }
    const fromStart = pointerDistance(state.pointerStart, nowPoint);
    const fromLast = pointerDistance(state.pointerLast, nowPoint);
    state.pointerLast = nowPoint;
    const threshold = event.pointerType === "touch" ? Math.max(16, stage.clientWidth * .022) : Math.max(12, stage.clientWidth * .016);
    if (fromStart >= threshold || fromLast >= threshold * .72) {
      event.preventDefault();
      takeUserDive(point, event.pointerType === "touch" ? "swipe" : "mouse-flick");
      clearPointerTracking();
    }
  }, { passive: false });

  stage.addEventListener("pointerdown", (event) => {
    const point = eventGoalPoint(event);
    if (!point.inside) return;
    event.preventDefault();
    if (state.phase === "albion-aim") {
      setReticle(point.x, point.y);
      takeAlbionPenalty(point);
    } else if (state.phase === "save") {
      if (event.pointerType === "touch" || event.pointerType === "pen") beginPointerTracking(event);
      else takeUserDive(point, "click");
    }
  }, { passive: false });

  stage.addEventListener("pointerup", (event) => {
    if (state.phase === "save" && state.reactionOpen && !state.userDive) {
      const point = eventGoalPoint(event);
      if (point.inside) takeUserDive(point, pointerDistance(state.pointerStart, event) > 10 ? "swipe" : "tap");
    }
    clearPointerTracking();
  }, { passive: false });

  stage.addEventListener("pointercancel", clearPointerTracking);
  stage.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && state.phase !== "save") clearPointerTracking();
  });

  let fallbackTouchStart = null;
  stage.addEventListener("touchstart", (event) => {
    if (state.phase !== "save" || !state.reactionOpen || state.userDive) return;
    const touch = event.touches[0];
    if (!touch) return;
    const point = eventGoalPoint(touch);
    if (!point.inside) return;
    fallbackTouchStart = { clientX: touch.clientX, clientY: touch.clientY, time: performance.now() };
    event.preventDefault();
  }, { passive: false });

  stage.addEventListener("touchmove", (event) => {
    if (state.phase !== "save" || !state.reactionOpen || state.userDive || !fallbackTouchStart) return;
    const touch = event.touches[0];
    if (!touch) return;
    const point = eventGoalPoint(touch);
    const distance = Math.hypot(touch.clientX - fallbackTouchStart.clientX, touch.clientY - fallbackTouchStart.clientY);
    if (point.inside && distance >= Math.max(14, stage.clientWidth * .02)) {
      event.preventDefault();
      takeUserDive(point, "swipe");
      fallbackTouchStart = null;
      clearPointerTracking();
    }
  }, { passive: false });

  stage.addEventListener("touchend", (event) => {
    if (state.phase === "save" && state.reactionOpen && !state.userDive) {
      const touch = event.changedTouches[0];
      if (touch) {
        const point = eventGoalPoint(touch);
        if (point.inside) takeUserDive(point, "tap");
      }
    }
    fallbackTouchStart = null;
    clearPointerTracking();
  }, { passive: false });

  stage.addEventListener("touchcancel", () => { fallbackTouchStart = null; clearPointerTracking(); });

  stage.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 0.08 : 0.035;
    let handled = true;
    if (event.key === "ArrowLeft") setReticle(state.aim.x - step, state.aim.y);
    else if (event.key === "ArrowRight") setReticle(state.aim.x + step, state.aim.y);
    else if (event.key === "ArrowUp") setReticle(state.aim.x, state.aim.y - step);
    else if (event.key === "ArrowDown") setReticle(state.aim.x, state.aim.y + step);
    else if (event.key === "Enter" || event.key === " ") {
      if (state.phase === "albion-aim") takeAlbionPenalty({ ...state.aim });
      else if (state.phase === "save") takeUserDive({ ...state.aim }, "keyboard");
      else if (state.phase === "palace-ready") beginPalacePenalty();
    } else if (event.key.toLowerCase() === "p" && state.phase === "albion-aim") panenka.checked = !panenka.checked;
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
    window.setTimeout(positionKeeperOnLine, 80);
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

  const oldDifficulty = localStorage.getItem("albionShootoutDifficulty");
  if (oldDifficulty === "hard" || oldDifficulty === "european") difficulty.value = "hard";
  else difficulty.value = "normal";
  localStorage.setItem("albionShootoutDifficulty", difficulty.value);
  soundButton.textContent = state.sound ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-pressed", String(state.sound));
  setReticle(0.5, 0.48);
  renderRecord();

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
        if (!state.phase.includes("run") && state.phase !== "save") positionKeeperOnLine();
      })
    : null;
  resizeObserver?.observe(stage);
  window.addEventListener("resize", () => {
    if (!state.phase.includes("run") && state.phase !== "save") positionKeeperOnLine();
  }, { passive: true });

  if (typeof IntersectionObserver === "function") {
    const visibilityObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      document.body.classList.toggle("shootout-in-view", Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.18));
    }, { threshold: [0, 0.18, 0.4] });
    visibilityObserver.observe(shootoutCard);
  }

  window.requestAnimationFrame(() => {
    positionKeeperOnLine();
    prepareAlbionKick();
  });
})();
