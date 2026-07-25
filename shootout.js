(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const stage = $("penaltyStage");
  if (!stage) return;

  const goalMouth = $("goalMouth");
  const ball = $("penaltyBall");
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

  const goalBox = { left: 0.17, top: 0.125, width: 0.66, height: 0.35 };
  const ballStart = { x: 0.5, y: 0.77 };
  const keeperBootRatio = 0.91;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const reducedMotion = () =>
    document.body.classList.contains("user-reduce-motion") ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const configurations = {
    normal: {
      shotSpread: 0.022,
      keeperNoise: 0.165,
      keeperReach: 0.165,
      palaceMiss: 0.14,
      saveRadius: 0.285,
      preContactWindow: 250,
      postContactWindow: 520,
      flight: 830,
      runUpScale: 1,
      cueStrength: 1,
    },
    hard: {
      shotSpread: 0.041,
      keeperNoise: 0.115,
      keeperReach: 0.19,
      palaceMiss: 0.085,
      saveRadius: 0.225,
      preContactWindow: 150,
      postContactWindow: 370,
      flight: 690,
      runUpScale: 0.9,
      cueStrength: 0.48,
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
    } else if (kind === "kick") tone(115, 0.09, "triangle", 0.09);
    else if (kind === "goal") {
      tone(520, 0.12, "square", 0.045);
      window.setTimeout(() => tone(660, 0.16, "square", 0.04), 100);
    } else if (kind === "save") tone(175, 0.18, "sawtooth", 0.055);
    else if (kind === "post") tone(910, 0.22, "triangle", 0.045);
    else if (kind === "gloves") tone(260, 0.05, "triangle", 0.026);
    else if (kind === "crowd") {
      tone(175, 0.18, "sine", 0.022);
      window.setTimeout(() => tone(210, 0.22, "sine", 0.018), 80);
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

  function cancelAnimations() {
    currentAnimations.forEach((animation) => {
      try { animation.cancel(); } catch {}
    });
    currentAnimations = [];
    [ball, keeper, taker, referee].forEach((element) => {
      element?.getAnimations().forEach((animation) => animation.cancel());
    });
  }

  function keeperDimensions() {
    const rect = keeper.getBoundingClientRect();
    return {
      width: rect.width || stage.clientWidth * 0.175,
      height: rect.height || stage.clientWidth * 0.175 * (250 / 180),
    };
  }

  function positionKeeperOnLine() {
    if (!stage.clientHeight) return;
    const dimensions = keeperDimensions();
    const goalLineY = (goalBox.top + goalBox.height) * stage.clientHeight;
    const top = goalLineY - dimensions.height * keeperBootRatio;
    keeper.style.left = "50%";
    keeper.style.top = `${top}px`;
    keeper.style.transform = "translateX(-50%)";
  }

  function resetCrowd() {
    stage.classList.remove("crowd-hush", "crowd-albion-cheer", "crowd-palace-cheer", "crowd-gasp");
  }

  function crowdReaction(kind) {
    resetCrowd();
    if (kind) stage.classList.add(kind);
    if (kind && kind !== "crowd-hush") {
      window.setTimeout(() => stage.classList.remove(kind), reducedMotion() ? 300 : 1450);
    }
  }

  function resetVisuals() {
    cancelAnimations();
    ball.style.left = `${ballStart.x * 100}%`;
    ball.style.top = `${ballStart.y * 100}%`;
    ball.style.transform = "translate(-50%,-50%) scale(1) rotate(0deg)";
    taker.style.left = "50%";
    taker.style.top = "69%";
    taker.style.transform = "translate(-50%,0)";
    referee.style.left = "78%";
    referee.style.top = "43%";
    referee.style.transform = "translate(-50%,0)";
    keeper.querySelectorAll(".keeper-arm,.keeper-leg,.keeper-body-group").forEach((part) => { part.style.transform = ""; });
    referee.querySelectorAll(".referee-arm,.referee-leg,.referee-root").forEach((part) => { part.style.transform = ""; });
    stage.classList.remove("palace-kick", "is-save-window", "is-locked", "is-waiting", "is-aiming");
    goalMouth.classList.remove("net-hit");
    cue.hidden = true;
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
    return {
      x: goalBox.left + goalPoint.x * goalBox.width,
      y: goalBox.top + goalPoint.y * goalBox.height,
    };
  }

  function animateRunUp(isPalace, foot = "right", target = null, style = "direct") {
    const footDirection = foot === "left" ? -1 : 1;
    const settings = config();
    const targetBias = target ? (target.x - 0.5) * 52 * settings.cueStrength : 0;
    const styleOffset = style === "stutter" ? 8 : style === "quick" ? -5 : 0;
    const duration = isPalace ? Math.round(820 * settings.runUpScale) : style === "quick" ? 570 : 660;
    stage.classList.toggle("palace-kick", isPalace);
    const run = animateElement(
      taker,
      [
        { transform: `translate(calc(-50% + ${-footDirection * 16 + styleOffset}px), 10px) scale(.96)` },
        { transform: `translate(calc(-50% + ${footDirection * 7 + targetBias * 0.28}px), -8px) scale(1.01)`, offset: style === "stutter" ? 0.48 : 0.58 },
        { transform: `translate(calc(-50% + ${targetBias}px), -38px) scale(.94)` },
      ],
      { duration, easing: style === "stutter" ? "cubic-bezier(.2,.55,.18,1)" : "cubic-bezier(.25,.72,.3,1)" },
    );
    const kickingLeg = taker.querySelector(foot === "left" ? ".taker-leg-left" : ".taker-leg-right");
    const arm = taker.querySelector(foot === "left" ? ".taker-arm-right" : ".taker-arm-left");
    if (kickingLeg) animateElement(kickingLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${footDirection * -24}deg)` }, { transform: `rotate(${footDirection * 34}deg)` }], { duration });
    if (arm) animateElement(arm, [{ transform: "rotate(0deg)" }, { transform: `rotate(${footDirection * 18}deg)` }, { transform: `rotate(${footDirection * -12}deg)` }], { duration });
    return { animation: run, duration };
  }

  function animateBall(target, duration, saved = false, miss = false) {
    const point = stagePoint(target);
    const endScale = saved ? 0.72 : miss ? 0.58 : 0.5;
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

  function animateDeflection(target, saveType) {
    if (saveType === "CATCH") {
      return animateElement(ball, [
        { opacity: 1, transform: "translate(-50%,-50%) scale(.72)" },
        { opacity: .25, transform: "translate(-50%,-50%) scale(.3)" },
      ], { duration: 220 });
    }
    const direction = target.x < 0.5 ? -1 : 1;
    const point = stagePoint(target);
    const endX = clamp(point.x + direction * (saveType === "FINGERTIP SAVE" ? 0.08 : 0.055), 0.02, 0.98);
    const endY = clamp(point.y + (target.y < 0.4 ? -0.035 : 0.045), 0.02, 0.94);
    return animateElement(ball, [
      { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: "translate(-50%,-50%) scale(.72) rotate(520deg)" },
      { left: `${endX * 100}%`, top: `${endY * 100}%`, transform: "translate(-50%,-50%) scale(.58) rotate(710deg)" },
    ], { duration: 300, easing: "cubic-bezier(.2,.5,.4,1)" });
  }

  function diveZone(point) {
    if (point.x >= 0.38 && point.x <= 0.62) return "centre";
    const side = point.x < 0.5 ? "left" : "right";
    return `${point.y < 0.48 ? "high" : "low"}-${side}`;
  }

  function animateKeeperDive(point, duration = 620, saved = false) {
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
    const direction = point.x < 0.5 ? -1 : point.x > 0.5 ? 1 : 0;
    const handXRatio = direction < 0 ? 11 / 180 : direction > 0 ? 169 / 180 : 0.5;
    const handYRatio = direction === 0 ? 0.47 : 94 / 250;
    const baseHandX = stageWidth * 0.5 + (handXRatio - 0.5) * keeperWidth;
    const baseHandY = baseTop + handYRatio * keeperHeight;
    let dx = targetX - baseHandX;
    let dy = targetY - baseHandY;
    if (direction === 0) {
      dx = (point.x - 0.5) * stageWidth * 0.1;
      dy = clamp(dy, -keeperHeight * 0.16, keeperHeight * 0.1);
    }
    const goalLeft = goalBox.left * stageWidth;
    const goalRight = (goalBox.left + goalBox.width) * stageWidth;
    const bodyCentre = stageWidth * 0.5 + dx;
    if (bodyCentre < goalLeft + keeperWidth * 0.15) dx += goalLeft + keeperWidth * 0.15 - bodyCentre;
    if (bodyCentre > goalRight - keeperWidth * 0.15) dx -= bodyCentre - (goalRight - keeperWidth * 0.15);
    dy = clamp(dy, -keeperHeight * 0.56, keeperHeight * 0.22);

    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const leftLeg = keeper.querySelector(".keeper-leg-left");
    const rightLeg = keeper.querySelector(".keeper-leg-right");
    const body = keeper.querySelector(".keeper-body-group");
    let leftArmEnd = 0, rightArmEnd = 0, leftLegEnd = 0, rightLegEnd = 0;
    if (zone === "high-left") { leftArmEnd = 34; rightArmEnd = -10; leftLegEnd = 16; rightLegEnd = -10; }
    else if (zone === "low-left") { leftArmEnd = -28; rightArmEnd = 12; leftLegEnd = 24; rightLegEnd = -13; }
    else if (zone === "high-right") { rightArmEnd = -34; leftArmEnd = 10; rightLegEnd = -16; leftLegEnd = 10; }
    else if (zone === "low-right") { rightArmEnd = 28; leftArmEnd = -12; rightLegEnd = -24; leftLegEnd = 13; }
    else { leftArmEnd = -20; rightArmEnd = 20; leftLegEnd = 14; rightLegEnd = -14; }

    if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: `rotate(${leftArmEnd * .4}deg)`, offset: .32 }, { transform: `rotate(${leftArmEnd}deg)` }], { duration: duration * .88 });
    if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: `rotate(${rightArmEnd * .4}deg)`, offset: .32 }, { transform: `rotate(${rightArmEnd}deg)` }], { duration: duration * .88 });
    if (leftLeg) animateElement(leftLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${leftLegEnd}deg)` }], { duration });
    if (rightLeg) animateElement(rightLeg, [{ transform: "rotate(0deg)" }, { transform: `rotate(${rightLegEnd}deg)` }], { duration });
    if (body) animateElement(body, [{ transform: "scaleX(1)" }, { transform: "scaleX(1.035)", offset: .28 }, { transform: "scaleX(1)" }], { duration });

    const rotation = direction * (zone.startsWith("low") ? 15 : zone.startsWith("high") ? 11 : 0);
    const scale = saved ? 1.035 : 1;
    return animateElement(keeper, [
      { transform: "translateX(-50%) translate(0,0) rotate(0deg) scale(1)" },
      { transform: `translateX(-50%) translate(${dx * .28}px,${Math.min(-5, dy * .18)}px) rotate(${rotation * .2}deg) scale(1.025)`, offset: .28 },
      { transform: `translateX(-50%) translate(${dx}px,${dy}px) rotate(${rotation}deg) scale(${scale})` },
    ], { duration, easing: "cubic-bezier(.18,.72,.22,1)" });
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
    const duration = reducedMotion() ? 120 : 760;

    if (routine === "bar") {
      const rise = Math.max(10, keeperDimensions().height * 0.16);
      animateElement(keeper, [
        { transform: "translateX(-50%) translateY(0)" },
        { transform: `translateX(-50%) translateY(${-rise}px)`, offset: .58 },
        { transform: "translateX(-50%) translateY(0)" },
      ], { duration, easing: "cubic-bezier(.2,.72,.3,1)" });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-70deg)", offset: .55 }, { transform: "rotate(0deg)" }], { duration });
      const bar = goalMouth.querySelector(".goal-crossbar");
      if (bar) animateElement(bar, [{ transform: "translateY(0)" }, { transform: "translateY(-1px)", offset: .58 }, { transform: "translateY(0)" }], { duration });
    } else if (routine === "point") {
      const pointLeft = (state.albionKicks + state.palaceKicks) % 2 === 0;
      const arm = pointLeft ? leftArm : rightArm;
      if (arm) animateElement(arm, [{ transform: "rotate(0deg)" }, { transform: `rotate(${pointLeft ? -10 : 10}deg) scaleX(1.08)`, offset: .42 }, { transform: "rotate(0deg)" }], { duration });
      animateElement(keeper, [{ transform: "translateX(-50%)" }, { transform: `translateX(calc(-50% + ${pointLeft ? -9 : 9}px))`, offset: .42 }, { transform: "translateX(-50%)" }], { duration });
    } else if (routine === "gloves") {
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-112deg)", offset: .45 }, { transform: "rotate(0deg)" }], { duration });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(112deg)", offset: .45 }, { transform: "rotate(0deg)" }], { duration });
      window.setTimeout(() => sound("gloves"), reducedMotion() ? 40 : 330);
    } else {
      if (body) animateElement(body, [{ transform: "translateY(0)" }, { transform: "translateY(-4px)", offset: .28 }, { transform: "translateY(0)", offset: .55 }, { transform: "translateY(-3px)", offset: .75 }, { transform: "translateY(0)" }], { duration });
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
    const duration = reducedMotion() ? 120 : 720;
    animateElement(referee, [
      { transform: "translate(-50%,0)" },
      { transform: "translate(-58%,-4px)", offset: .45 },
      { transform: "translate(-50%,0)" },
    ], { duration });
    if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-48deg)", offset: .42 }, { transform: "rotate(0deg)" }], { duration });
    if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-68deg)", offset: .68 }, { transform: "rotate(0deg)" }], { duration });
    await sleep(duration);
    return token === state.sequence;
  }

  function refereeSignal(scored) {
    const rightArm = referee.querySelector(".referee-arm-right");
    const leftArm = referee.querySelector(".referee-arm-left");
    const duration = reducedMotion() ? 120 : 620;
    if (scored) {
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-78deg)" }, { transform: "rotate(-58deg)" }], { duration });
      animateElement(referee, [{ transform: "translate(-50%,0)" }, { transform: "translate(-62%,-2px)" }], { duration });
    } else {
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-52deg)" }, { transform: "rotate(0deg)" }], { duration });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(52deg)" }, { transform: "rotate(0deg)" }], { duration });
    }
  }

  async function preKickCeremony(side, token) {
    crowdReaction("crowd-hush");
    setStatus("Referee checks the penalty", side === "albion" ? "The Palace goalkeeper sets himself on the line." : "Verbruggen checks the bar and settles on the goal line.");
    const ok = await Promise.all([keeperRoutine(side, token), refereeCheck(token)]);
    if (token !== state.sequence || ok.includes(false)) return false;
    sound("whistle");
    await sleep(reducedMotion() ? 70 : 170);
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
    const player = palaceTakers[state.palaceKicks % palaceTakers.length];
    $("penaltyTakerName").textContent = player.name;
    $("penaltyShirt").textContent = String((state.palaceKicks % 5) + 7);
    $("turnBadge").textContent = "PALACE PENALTY · YOU ARE VERBRUGGEN";
    $("turnBadge").className = "turn-badge palace-turn";
    $("stageInstruction").textContent = "Press Ready, then read the run-up";
    stage.setAttribute("aria-label", "Palace penalty. Press Ready, read the run-up, then click or tap inside the goal as the taker plants his foot.");
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
    await sleep(reducedMotion() ? 100 : Math.max(370, run.duration - 130));
    if (token !== state.sequence) return;

    const edge = Math.max(Math.abs(aim.x - 0.5), Math.abs(aim.y - 0.5));
    const spread = settings.shotSpread * (1 + edge * 1.3);
    const resolved = isPanenka
      ? { x: clamp(0.5 + gaussian() * 0.025, 0.43, 0.57), y: clamp(0.61 + gaussian() * 0.025, 0.52, 0.68) }
      : { x: aim.x + gaussian() * spread, y: aim.y + gaussian() * spread };
    const frameResult = classifyFrame(resolved);
    const keeperGuess = {
      x: clamp(resolved.x + gaussian() * settings.keeperNoise, 0.04, 0.96),
      y: clamp(resolved.y + gaussian() * settings.keeperNoise * 0.78, 0.06, 0.94),
    };
    if (isPanenka && Math.random() < 0.76) keeperGuess.x = Math.random() < 0.5 ? 0.12 : 0.88;
    const distance = Math.hypot(resolved.x - keeperGuess.x, (resolved.y - keeperGuess.y) * 0.88);
    const centralPenalty = Math.abs(resolved.x - 0.5) < 0.12 && resolved.y > 0.32;
    const saved = !frameResult && distance < settings.keeperReach + (centralPenalty ? 0.055 : 0);
    const scored = !frameResult && !saved;

    animateKeeperDive(keeperGuess, settings.flight * 0.82, saved);
    const ballAnimation = animateBall(resolved, settings.flight, saved, Boolean(frameResult));
    await ballAnimation?.finished.catch(() => {});
    if (saved) await animateDeflection(resolved, distance < settings.keeperReach * .48 ? "CATCH" : "PARRIED")?.finished.catch(() => {});

    state.albionKicks += 1;
    if (scored) state.albionGoals += 1;
    if (saved) state.palaceSaves += 1;
    if (isPanenka && scored) state.panenkaGoals += 1;
    state.albionResults.push({ scored, result: frameResult || (saved ? "saved" : "goal") });
    refereeSignal(scored);

    if (scored) {
      goalMouth.classList.add("net-hit");
      crowdReaction("crowd-albion-cheer");
      showDecision(isPanenka ? "PANENKA!" : "GOAL!", "goal");
      setStatus("Goal for Brighton", isPanenka ? "The keeper commits and the chip drops centrally." : "Cleanly placed beyond the goalkeeper.");
      sound("goal"); sound("crowd");
    } else if (saved) {
      crowdReaction("crowd-palace-cheer");
      showDecision("SAVED!", "save");
      setStatus("Palace save", "The goalkeeper reaches the shot and keeps it out.");
      sound("save");
    } else if (frameResult === "woodwork") {
      crowdReaction("crowd-gasp");
      showDecision("OFF THE FRAME!", "miss");
      setStatus("So close", "The ambitious placement catches the post or crossbar.");
      sound("post");
    } else {
      crowdReaction("crowd-gasp");
      showDecision("WIDE!", "miss");
      setStatus("Missed", "The shot drifts beyond the goal under pressure.");
      sound("miss");
    }

    panenka.checked = false;
    renderScore();
    const outcome = resultDecision();
    await sleep(reducedMotion() ? 350 : 1350);
    if (outcome.finished) finishShootout(outcome.albionWon);
    else preparePalaceKick();
  }

  function randomPalaceTarget() {
    const settings = config();
    const miss = Math.random() < settings.palaceMiss;
    const options = [
      { x: 0.12, y: 0.17, weight: 1.1 }, { x: 0.12, y: 0.82, weight: 1.35 },
      { x: 0.88, y: 0.17, weight: 1.1 }, { x: 0.88, y: 0.82, weight: 1.35 },
      { x: 0.21, y: 0.51, weight: 1.1 }, { x: 0.79, y: 0.51, weight: 1.1 },
      { x: 0.5, y: 0.58, weight: 1.25 }, { x: 0.5, y: 0.22, weight: .55 },
    ];
    const pool = options.flatMap((item) => Array(Math.round(item.weight * 4)).fill(item));
    const base = pool[Math.floor(Math.random() * pool.length)];
    if (!miss) return { target: { x: clamp(base.x + gaussian() * 0.032, 0.025, 0.975), y: clamp(base.y + gaussian() * 0.032, 0.035, 0.965) }, miss: false };
    if (Math.random() < 0.58) return { target: { x: Math.random() < 0.5 ? -0.062 : 1.062, y: clamp(base.y, 0.08, 0.92) }, miss: true };
    return { target: { x: clamp(base.x, 0.08, 0.92), y: -0.065 }, miss: true };
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
    setStatus("Palace begin the run-up", "Read the approach and standing foot. The save window opens just before contact.");
    const run = animateRunUp(true, player.foot, state.palaceTarget, "direct");
    const actualRun = Math.max(runDuration, run.duration);
    const waitBeforeWindow = Math.max(80, actualRun - settings.preContactWindow);
    await sleep(reducedMotion() ? 80 : waitBeforeWindow);
    if (token !== state.sequence || state.phase !== "palace-run") return;

    state.phase = "save";
    state.reactionOpen = true;
    state.contactAt = performance.now() + (reducedMotion() ? 30 : settings.preContactWindow);
    stage.classList.remove("is-locked");
    stage.classList.add("is-save-window");
    $("stageInstruction").textContent = "Click or tap where Verbruggen should reach";
    setStatus("Read the final stride", "You can commit as the standing foot plants, or react immediately after contact.");

    await sleep(reducedMotion() ? 30 : settings.preContactWindow);
    if (token !== state.sequence) return;
    cue.hidden = false;
    setStatus("REACT!", "Click anywhere in the goal to choose Verbruggen’s reach.");
    window.setTimeout(() => { cue.hidden = true; }, reducedMotion() ? 150 : 360);
    const ballAnimation = animateBall(state.palaceTarget, settings.flight, false, state.palaceMiss);
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
      const veryEarly = Math.max(0, -timing - 120) / Math.max(1, settings.preContactWindow - 120);
      const timingFactor = clamp(1 - latePenalty * .5 - veryEarly * .22, .54, 1.04);
      let radius = settings.saveRadius * timingFactor;
      const targetCentre = Math.abs(state.palaceTarget.x - .5) < .16;
      const diveCentre = Math.abs(state.userDive.x - .5) < .18;
      if (targetCentre && diveCentre) radius += .065;
      const distance = Math.hypot(
        state.palaceTarget.x - state.userDive.x,
        (state.palaceTarget.y - state.userDive.y) * 0.86,
      );
      const gloveEdge = distance <= radius * 1.12 && Math.abs(timing) < settings.postContactWindow * .85;
      saved = distance <= radius || gloveEdge;
      if (saved) {
        if (distance < radius * .43 && timing < 230) saveType = "CATCH";
        else if (distance > radius * .84 || gloveEdge) saveType = "FINGERTIP SAVE";
        else if (targetCentre && diveCentre) saveType = "BLOCKED";
        else saveType = "PARRIED";
      }
    }

    const scored = !state.palaceMiss && !saved;
    if (saved) await animateDeflection(state.palaceTarget, saveType)?.finished.catch(() => {});
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
      crowdReaction("crowd-albion-cheer");
      showDecision(saveType, "save");
      const timingText = state.userDive.timing < 0 ? "well-timed anticipation" : `${Math.round(state.userDive.timing)} ms reaction`;
      setStatus("Verbruggen saves", `${timingText} · ${saveType.toLowerCase()}.`);
      sound("save"); sound("crowd");
    } else if (state.palaceMiss) {
      crowdReaction("crowd-albion-cheer");
      showDecision("PALACE MISS!", "miss");
      setStatus("It stays out", "The Palace taker fails to find the target.");
      sound("post");
    } else {
      goalMouth.classList.add("net-hit");
      crowdReaction("crowd-palace-cheer");
      showDecision("PALACE SCORE", "goal");
      setStatus("Palace score", state.userDive ? "Verbruggen cannot quite reach it." : "No dive was made in the available window.");
      sound("goal");
    }

    renderScore();
    const outcome = resultDecision();
    await sleep(reducedMotion() ? 350 : 1400);
    if (outcome.finished) finishShootout(outcome.albionWon);
    else prepareAlbionKick();
  }

  function takeUserDive(point) {
    if (state.phase !== "save" || !state.reactionOpen || state.userDive) return;
    const timing = performance.now() - state.contactAt;
    state.userDive = { x: point.x, y: point.y, timing };
    state.reactionTimes.push(Math.max(0, timing));
    state.reactionOpen = false;
    stage.classList.remove("is-save-window");
    animateKeeperDive(point, Math.max(360, config().flight * 0.78), true);
    // The physical launch is the confirmation; no extra registration message is shown.
  }

  function finishShootout(albionWon) {
    state.finished = true;
    state.locked = true;
    state.phase = "finished";
    ++state.sequence;
    resetVisuals();
    stage.classList.add("is-locked");
    readyPanel.hidden = true;
    panenka.disabled = true;
    $("turnBadge").textContent = albionWon ? "SEAGULLS WIN" : "PALACE WIN";
    $("turnBadge").className = `turn-badge ${albionWon ? "albion-turn" : "palace-turn"}`;
    $("penaltyTakerName").textContent = `Brighton ${state.albionGoals}–${state.palaceGoals} Palace`;
    $("stageInstruction").textContent = "Full time";
    showDecision(albionWon ? "SEAGULLS WIN!" : "PALACE WIN", albionWon ? "goal" : "miss");
    refereeSignal(albionWon);
    crowdReaction(albionWon ? "crowd-albion-cheer" : "crowd-palace-cheer");
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
    });
    summary.hidden = true;
    summary.innerHTML = "";
    shareButton.hidden = true;
    panenka.checked = false;
    prepareAlbionKick();
  }

  stage.addEventListener("pointermove", (event) => {
    if (state.phase !== "albion-aim" && state.phase !== "save") return;
    const point = eventGoalPoint(event);
    if (point.inside && state.phase === "albion-aim") setReticle(point.x, point.y);
  });

  stage.addEventListener("pointerdown", (event) => {
    const point = eventGoalPoint(event);
    if (!point.inside) return;
    event.preventDefault();
    if (state.phase === "albion-aim") {
      setReticle(point.x, point.y);
      takeAlbionPenalty(point);
    } else if (state.phase === "save") {
      takeUserDive(point);
    }
  });

  stage.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 0.08 : 0.035;
    let handled = true;
    if (event.key === "ArrowLeft") setReticle(state.aim.x - step, state.aim.y);
    else if (event.key === "ArrowRight") setReticle(state.aim.x + step, state.aim.y);
    else if (event.key === "ArrowUp") setReticle(state.aim.x, state.aim.y - step);
    else if (event.key === "ArrowDown") setReticle(state.aim.x, state.aim.y + step);
    else if (event.key === "Enter" || event.key === " ") {
      if (state.phase === "albion-aim") takeAlbionPenalty({ ...state.aim });
      else if (state.phase === "save") takeUserDive({ ...state.aim });
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
