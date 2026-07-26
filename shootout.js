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
  const soundButton = $("shootoutSound");
  const summary = $("shootoutSummary");
  const shareButton = $("shareShootout");
  const shootoutCard = $("shootout");
  const miniScore = $("stadiumMiniScore");
  const celebrationPlayers = $("celebrationPlayers");
  const confetti = $("shootoutConfetti");
  const swipeTrail = $("swipeTrail");
  const saveImpact = $("saveImpact");
  const turfKick = $("turfKick");

  const goalBox = { left: 0.26, top: 0.12, width: 0.48, height: 0.365 };
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

  function haptic(pattern) {
    if (reducedMotion() || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch {}
  }

  const GAME = Object.freeze({
    shotSpread: 0.0022,
    keeperNoise: 0.39,
    keeperReach: 0.115,
    palaceMiss: 0.18,
    saveRadius: 0.66,
    preContactWindow: 720,
    postContactWindow: 1220,
    flight: 880,
    runUpScale: 1.04,
    cueStrength: 0.78,
    diveAssist: 0.88,
    sameSideBonus: 0.29,
    scoringDifficultyIncrease: 0.19,
    contactDecisionDelay: 285,
    edgeAccuracyPenalty: 0.008,
  });

  const albionTakers = [
    { name: "Danny Welbeck", number: 18, foot: "right", style: "measured", pose: "relaxed", accuracy: .84, power: .72, disguise: .68 },
    { name: "Georginio Rutter", number: 10, foot: "right", style: "stutter", pose: "sleeve", accuracy: .76, power: .68, disguise: .9 },
    { name: "Yankuba Minteh", number: 11, foot: "left", style: "quick", pose: "hips", accuracy: .69, power: .92, disguise: .56 },
    { name: "Diego Gómez", number: 25, foot: "right", style: "direct", pose: "shoulder", accuracy: .73, power: .9, disguise: .5 },
    { name: "Maxim De Cuyper", number: 29, foot: "left", style: "measured", pose: "behind", accuracy: .81, power: .8, disguise: .72 },
  ];

  const palaceTakers = [
    { name: "Palace taker 1", foot: "right", delay: 870, style: "direct", pose: "hips" },
    { name: "Palace taker 2", foot: "left", delay: 980, style: "measured", pose: "relaxed" },
    { name: "Palace taker 3", foot: "right", delay: 910, style: "quick", pose: "sleeve" },
    { name: "Palace taker 4", foot: "left", delay: 1040, style: "stutter", pose: "behind" },
    { name: "Palace taker 5", foot: "right", delay: 850, style: "direct", pose: "shoulder" },
  ];

  function clearTakerPose() {
    if (!taker) return;
    delete taker.dataset.pose;
  }

  function showTurfKick(foot = "right", strength = 1) {
    if (!turfKick || reducedMotion()) return;
    turfKick.hidden = false;
    turfKick.className = `turf-kick ${foot === "left" ? "turf-left" : "turf-right"} ${strength > 1 ? "turf-strong" : ""}`;
    turfKick.getAnimations().forEach((animation) => animation.cancel());
    turfKick.animate([
      { opacity: 0, transform: "translate(-50%,-50%) scale(.55)" },
      { opacity: .88, transform: `translate(calc(-50% + ${foot === "left" ? -4 : 4}px),-58%) scale(${.9 + strength * .08})`, offset: .26 },
      { opacity: 0, transform: `translate(calc(-50% + ${foot === "left" ? -13 : 13}px),-115%) scale(1.22)` },
    ], { duration: 520, easing: "cubic-bezier(.16,.64,.2,1)" });
    window.setTimeout(() => { turfKick.hidden = true; }, 540);
  }

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
    albionShots: [],
    palaceShots: [],
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
    audioUnlocked: false,
    pointerStart: null,
    pointerLast: null,
    activePointerId: null,
    pendingDive: null,
    aimPointerActive: false,
    takerPose: "relaxed",
    aimDragMoved: false,
    standingSaveTimer: 0,
    saveResolutionLocked: false,
  };

  let audioContext = null;
  let currentAnimations = [];
  let keeperRoutineIndex = 0;
  let crossbarRoutineBag = [];
  let runUpProfileBag = [];
  let lastRunUpProfile = "";
  let chantIndex = -1;
  let chantStopTimer = 0;
  let chantFadeTimer = 0;
  let chantHardStopTimer = 0;
  const chantTracks = [
    "seagulls.mp3",
    "albion-albion-albion.mp3",
    "we-are-brighton.mp3",
    "come-on-brighton.mp3",
    "b-r-i-g-h-t-o-n.mp3",
  ];
  const chantAudio = new Audio();
  chantAudio.preload = "none";
  chantAudio.volume = 0.24;

  function config() { return GAME; }

  function ensureAudio() {
    if (!state.sound || !state.audioUnlocked) return null;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch {
      return null;
    }
  }

  function unlockAudio() {
    if (!state.sound || state.audioUnlocked) return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    state.audioUnlocked = true;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
    } catch {
      state.audioUnlocked = false;
    }
  }

  function stopChant() {
    window.clearTimeout(chantStopTimer);
    window.clearTimeout(chantHardStopTimer);
    window.clearInterval(chantFadeTimer);
    chantStopTimer = 0;
    chantHardStopTimer = 0;
    chantFadeTimer = 0;
    chantAudio.pause();
    try { chantAudio.currentTime = 0; } catch {}
  }

  function stopOtherSiteAudio() {
    try { window.AlbionStopAllAudio?.(); } catch {}
    document.querySelectorAll("audio").forEach((audio) => {
      try { audio.pause(); audio.currentTime = 0; } catch {}
    });
  }

  function playAlbionChant(victory = false) {
    if (!state.sound || !state.audioUnlocked) return;
    stopChant();
    if (victory) {
      stopOtherSiteAudio();
      chantAudio.src = "sussex-by-the-sea.mp3";
    } else {
      let next = Math.floor(Math.random() * chantTracks.length);
      if (chantTracks.length > 1 && next === chantIndex) next = (next + 1) % chantTracks.length;
      chantIndex = next;
      chantAudio.src = chantTracks[next];
    }
    chantAudio.volume = victory ? 0.28 : 0.23;
    try { chantAudio.currentTime = 0; } catch {}
    chantAudio.load();
    chantAudio.play()?.catch(() => {});
    const fadeAt = victory ? 9000 : 2600;
    const stopAt = victory ? 10000 : 3400;
    chantStopTimer = window.setTimeout(() => {
      chantFadeTimer = window.setInterval(() => {
        chantAudio.volume = Math.max(0, chantAudio.volume - (victory ? 0.028 : 0.04));
      }, 90);
    }, fadeAt);
    chantHardStopTimer = window.setTimeout(() => {
      stopChant();
      chantAudio.volume = victory ? 0.28 : 0.23;
    }, stopAt);
  }

  function tone(frequency, duration = 0.08, type = "sine", gain = 0.04, endFrequency = null) {
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, context.currentTime + duration);
    volume.gain.setValueAtTime(Math.max(.0001, gain), context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(volume).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function noiseBurst(duration = .12, gain = .035, lowpass = 1600) {
    const context = ensureAudio();
    if (!context) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const envelope = Math.pow(1 - i / length, 1.7);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    volume.gain.value = gain;
    source.connect(filter).connect(volume).connect(context.destination);
    source.start();
  }

  function crowdLayer(intensity = 1, duration = .55, pitch = 185) {
    noiseBurst(duration, .022 * intensity, 1050);
    [0, 45, 92, 145].forEach((delay, index) => window.setTimeout(() => {
      tone(pitch + index * 28, duration * (.78 + index * .04), "sine", .0085 * intensity, pitch + 55 + index * 18);
    }, delay));
  }

  function sound(kind) {
    if (!state.sound) return;
    const vary = (base, amount = .08) => base * (1 + (Math.random() * 2 - 1) * amount);
    if (kind === "whistle") {
      tone(vary(1580, .035), .105, "sine", .024, vary(1840, .025));
      window.setTimeout(() => tone(vary(1470, .03), .07, "sine", .015, vary(1660, .03)), 74);
    } else if (kind === "finalWhistle") {
      [0, 165, 350].forEach((delay, index) => window.setTimeout(() => tone(vary(index === 1 ? 1775 : 1530, .025), .13, "sine", .028, vary(1840, .02)), delay));
    } else if (kind === "kick") {
      noiseBurst(.048, vary(.068, .13), vary(720, .15));
      tone(vary(88, .16), .09, "triangle", vary(.064, .12), vary(54, .12));
      window.setTimeout(() => noiseBurst(.026, .019, vary(2300, .16)), 12);
    } else if (kind === "net") {
      noiseBurst(.22, vary(.034, .16), vary(2600, .18));
      window.setTimeout(() => noiseBurst(.16, .016, vary(3800, .18)), 52);
      window.setTimeout(() => noiseBurst(.1, .009, vary(1800, .2)), 115);
    } else if (kind === "goal") {
      sound("net");
    } else if (kind === "save") {
      noiseBurst(.085, vary(.048, .16), vary(980, .16));
      tone(vary(122, .11), .13, "triangle", vary(.041, .12), vary(78, .12));
      window.setTimeout(() => noiseBurst(.05, .013, 1900), 35);
    } else if (kind === "catch") {
      noiseBurst(.07, vary(.04, .12), vary(820, .14));
      tone(vary(102, .1), .095, "triangle", .033, vary(68, .1));
      window.setTimeout(() => noiseBurst(.04, .012, 1300), 28);
    } else if (kind === "post") {
      tone(vary(1180, .06), .24, "triangle", .038, vary(735, .06));
      noiseBurst(.04, .014, 4400);
    } else if (kind === "gloves") {
      noiseBurst(.045, .017, vary(1300, .12));
      tone(vary(215, .08), .045, "triangle", .012, vary(155, .08));
    } else if (kind === "footsteps") {
      noiseBurst(.025, .008, vary(550, .15));
    } else if (kind === "albionCheer") {
      crowdLayer(1.32, .78, vary(184, .05));
      window.setTimeout(() => crowdLayer(.92, .56, vary(232, .05)), 180);
      window.setTimeout(() => crowdLayer(.62, .44, vary(270, .05)), 390);
    } else if (kind === "palaceCheer") {
      crowdLayer(.82, .62, vary(154, .05));
      window.setTimeout(() => crowdLayer(.5, .4, vary(188, .05)), 190);
    } else if (kind === "win") {
      crowdLayer(1.72, 1.1, 180);
      window.setTimeout(() => crowdLayer(1.32, .94, 245), 210);
      window.setTimeout(() => crowdLayer(.92, .72, 285), 520);
      window.setTimeout(() => tone(440, .4, "sine", .017, 660), 120);
    } else if (kind === "gasp") {
      noiseBurst(.23, .021, 780);
      tone(128, .21, "sine", .011, 96);
    } else {
      noiseBurst(.08, .018, 1200);
    }
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


  const TAKER_POSES = ["relaxed", "hands-hips", "focus", "shoulder-roll", "hands-low"];
  const PLAYER_POSE_MAP = { relaxed: "relaxed", sleeve: "shoulder-roll", hips: "hands-hips", shoulder: "shoulder-roll", behind: "hands-low" };

  function chooseTakerPose(player, turnIndex = 0) {
    if (player?.pose && PLAYER_POSE_MAP[player.pose]) return PLAYER_POSE_MAP[player.pose];
    const seed = (player?.name || "Albion").split("").reduce((total, char) => total + char.charCodeAt(0), 0) + turnIndex * 7;
    return TAKER_POSES[Math.abs(seed) % TAKER_POSES.length];
  }

  function applyTakerPose(player, turnIndex = 0) {
    const pose = chooseTakerPose(player, turnIndex);
    state.takerPose = pose;
    if (taker) {
      taker.dataset.pose = pose;
      taker.dataset.foot = player?.foot || "right";
      taker.dataset.style = player?.style || "direct";
      [...taker.classList].filter((name) => name.startsWith("taker-variation-")).forEach((name) => taker.classList.remove(name));
      taker.classList.add(`taker-variation-${(turnIndex % 5) + 1}`);
    }
    return pose;
  }

  function nudgeShotDifficulty(target) {
    if (!target) return target;
    const settings = config();
    const nudged = { ...target };
    const edgeBias = nudged.x < .5 ? -1 : 1;
    const nearEdge = Math.max(Math.abs(nudged.x - .5), Math.abs(nudged.y - .5));
    if (nudged.x > .16 && nudged.x < .84 && nudged.y > .1 && nudged.y < .84) {
      const pressure = .013 + settings.edgeAccuracyPenalty * clamp(nearEdge * 1.6, .4, 1);
      nudged.x = clamp(nudged.x + edgeBias * pressure, 0.018, 0.982);
      if (nudged.y < .4) nudged.y = clamp(nudged.y - (.01 + settings.edgeAccuracyPenalty * .55), 0.018, 0.96);
    }
    return nudged;
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
      const nextSide = state.phase.startsWith("palace") ? "palace" : "albion";
      const lead = state.albionGoals - state.palaceGoals;
      const decisiveAlbion = nextSide === "albion" && lead > 0 && state.albionGoals + 1 > state.palaceGoals + leftP;
      const decisiveSave = nextSide === "palace" && lead > 0 && state.palaceGoals + leftP <= state.albionGoals;
      $("shootoutSituation").textContent = decisiveAlbion ? "Score to win" : decisiveSave ? "Save to win" : `${leftA} Albion · ${leftP} Palace left`;
    }
  }

  function setStatus(title, detail) {
    status.innerHTML = `<b>${title}</b><span>${detail}</span>`;
  }

  function showDecision(label, type) {
    decision.textContent = label;
    decision.className = `kick-decision-v10 result-${type}`;
    decision.hidden = false;
    window.setTimeout(() => { decision.hidden = true; }, reducedMotion() ? 520 : 1050);
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

  function eventGoalPoint(event, tolerance = 0) {
    syncGoalBox();
    const rect = stage.getBoundingClientRect();
    const sx = (event.clientX - rect.left) / rect.width;
    const sy = (event.clientY - rect.top) / rect.height;
    const padX = goalBox.width * tolerance;
    const padY = goalBox.height * tolerance;
    const inside =
      sx >= goalBox.left - padX && sx <= goalBox.left + goalBox.width + padX &&
      sy >= goalBox.top - padY && sy <= goalBox.top + goalBox.height + padY;
    return {
      inside,
      strictInside:
        sx >= goalBox.left && sx <= goalBox.left + goalBox.width &&
        sy >= goalBox.top && sy <= goalBox.top + goalBox.height,
      x: clamp((sx - goalBox.left) / goalBox.width, 0.015, 0.985),
      y: clamp((sy - goalBox.top) / goalBox.height, 0.02, 0.98),
    };
  }

  function eventStagePoint(event) {
    syncGoalBox();
    const rect = stage.getBoundingClientRect();
    const sx = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const sy = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    const goalX = clamp((sx - goalBox.left) / goalBox.width, .015, .985);
    const goalY = clamp((sy - goalBox.top) / goalBox.height, .02, .98);
    return { sx, sy, x: goalX, y: goalY };
  }

  function mobileTapGoalPoint(event) {
    const strict = eventGoalPoint(event, .04);
    if (strict.inside) return { x: strict.x, y: strict.y };
    const stagePoint = eventStagePoint(event);
    const x = stagePoint.sx < .39 ? .12 : stagePoint.sx > .61 ? .88 : .5;
    const y = stagePoint.sy < goalBox.top + goalBox.height * .52 ? .3 : .67;
    return { x, y };
  }

  function showSwipeTrail(start, current) {
    if (!swipeTrail || !start || !current || reducedMotion()) return;
    const rect = stage.getBoundingClientRect();
    const x1 = clamp(start.clientX - rect.left, 0, rect.width);
    const y1 = clamp(start.clientY - rect.top, 0, rect.height);
    const x2 = clamp(current.clientX - rect.left, 0, rect.width);
    const y2 = clamp(current.clientY - rect.top, 0, rect.height);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    swipeTrail.hidden = length < 4;
    swipeTrail.style.left = `${x1}px`;
    swipeTrail.style.top = `${y1}px`;
    swipeTrail.style.width = `${Math.max(4, length)}px`;
    swipeTrail.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }

  let swipeTrailHideTimer = 0;
  function hideSwipeTrail(delay = 0) {
    if (!swipeTrail) return;
    window.clearTimeout(swipeTrailHideTimer);
    if (delay > 0) {
      swipeTrailHideTimer = window.setTimeout(() => hideSwipeTrail(), delay);
      return;
    }
    swipeTrail.hidden = true;
    swipeTrail.style.width = "0";
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
    taker.style.top = "49%";
    taker.style.opacity = "1";
    taker.style.visibility = "";
    taker.style.transform = "translate(-50%,0)";
    referee.style.left = "89%";
    referee.style.top = "42.8%";
    referee.style.transform = "translate(-50%,0)";
    keeper.style.opacity = "1";
    window.clearTimeout(state.standingSaveTimer);
    state.standingSaveTimer = 0;
    keeper.querySelectorAll(".keeper-arm,.keeper-lower-arm,.keeper-leg,.keeper-lower-leg,.keeper-body-group,.keeper-head-group").forEach((part) => { part.style.transform = ""; });
    taker.querySelectorAll(".taker-arm,.taker-lower-arm,.taker-leg,.taker-lower-leg,.taker-root").forEach((part) => { part.style.transform = ""; });
    referee.querySelectorAll(".referee-arm,.referee-leg,.referee-root,.referee-head-group").forEach((part) => { part.style.transform = ""; });
    stage.classList.remove("palace-kick", "is-save-window", "is-locked", "is-waiting", "is-aiming", "is-drag-aiming", "placing-ball");
    goalMouth.classList.remove("net-hit", "net-hit-left", "net-hit-right", "net-hit-high", "net-hit-low", "net-hit-centre");
    goalMouth.style.removeProperty("--hit-x");
    goalMouth.style.removeProperty("--hit-y");
    cue.hidden = true;
    decision.hidden = true;
    if (celebrationPlayers) celebrationPlayers.hidden = true;
    if (confetti) confetti.hidden = true;
    resetCrowd();
    hideSwipeTrail();
    if (saveImpact) { saveImpact.hidden = true; saveImpact.className = "save-impact"; }
    stage.removeAttribute("data-runup");
    if (turfKick) { turfKick.hidden = true; turfKick.className = "turf-kick"; }
    state.saveResolutionLocked = false;
    stage.classList.remove("crossbar-contact", "save-contact", "save-replay");
    clearTakerPose();
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

  function shuffled(values) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function chooseRunUpProfile(foot = "right", style = "direct") {
    if (!runUpProfileBag.length) {
      const weighted = style === "stutter"
        ? ["stutter", "angle", "straight", "reverse", "stutter"]
        : style === "quick"
          ? ["angle", "straight", "angle", "reverse", "stutter"]
          : style === "measured"
            ? ["angle", "straight", "reverse", "angle", "stutter"]
            : ["straight", "angle", "reverse", "angle", "stutter"];
      runUpProfileBag = shuffled(weighted);
      if (runUpProfileBag.at(-1) === lastRunUpProfile && runUpProfileBag.length > 1) {
        [runUpProfileBag[0], runUpProfileBag[runUpProfileBag.length - 1]] = [runUpProfileBag[runUpProfileBag.length - 1], runUpProfileBag[0]];
      }
    }
    const profile = runUpProfileBag.pop();
    lastRunUpProfile = profile;
    return profile;
  }

  function runUpLabel(foot, profile) {
    const footLabel = foot === "left" ? "Left foot" : "Right foot";
    const profileLabels = {
      angle: "natural angle",
      straight: "straight run-up",
      reverse: "curved approach",
      stutter: "stuttered approach",
    };
    return `${footLabel} · ${profileLabels[profile] || "natural run-up"}`;
  }

  function setApproachLabel(foot, profile) {
    const label = $("penaltyApproach");
    if (label) label.textContent = runUpLabel(foot, profile);
  }

  function animateRunUp(isPalace, foot = "right", target = null, style = "direct", profile = chooseRunUpProfile(foot, style)) {
    clearTakerPose();
    setApproachLabel(foot, profile);
    const footDirection = foot === "left" ? -1 : 1;
    const settings = config();
    const targetBias = target ? (target.x - .5) * 20 * settings.cueStrength : 0;
    const baseDuration = isPalace ? Math.round(940 * settings.runUpScale) : style === "quick" ? 720 : style === "measured" ? 850 : 790;
    const duration = Math.round(baseDuration * (profile === "stutter" ? 1.14 : profile === "straight" ? .96 : profile === "reverse" ? 1.06 : 1));
    stage.classList.toggle("palace-kick", isPalace);
    stage.dataset.runup = profile;
    const root = taker.querySelector(".taker-root");
    const kickingLeg = taker.querySelector(foot === "left" ? ".taker-leg-left" : ".taker-leg-right");
    const standingLeg = taker.querySelector(foot === "left" ? ".taker-leg-right" : ".taker-leg-left");
    const kickingLowerLeg = kickingLeg?.querySelector(".taker-lower-leg");
    const standingLowerLeg = standingLeg?.querySelector(".taker-lower-leg");
    const standingBoot = standingLeg?.querySelector(".taker-boot");
    const kickingBoot = kickingLeg?.querySelector(".taker-boot");
    const balanceArm = taker.querySelector(foot === "left" ? ".taker-arm-right" : ".taker-arm-left");
    const trailingArm = taker.querySelector(foot === "left" ? ".taker-arm-left" : ".taker-arm-right");
    const profileStart = {
      angle: -footDirection * 34,
      straight: footDirection * 2,
      reverse: footDirection * 28,
      stutter: -footDirection * 25,
    }[profile] ?? -footDirection * 31;
    const styleOffset = style === "quick" ? -footDirection * 4 : style === "measured" ? footDirection * 2 : 0;
    const startX = profileStart + styleOffset;
    const contactOffset = targetBias + footDirection * 5;
    const stutter = profile === "stutter";
    const reverse = profile === "reverse";
    sound("footsteps");
    window.setTimeout(() => sound("footsteps"), reducedMotion() ? 30 : duration * .23);
    window.setTimeout(() => sound("footsteps"), reducedMotion() ? 60 : duration * (stutter ? .58 : .48));
    if (stutter) window.setTimeout(() => sound("footsteps"), reducedMotion() ? 75 : duration * .73);
    const runFrames = stutter ? [
      { transform: `translate(calc(-50% + ${startX}px),20px) scale(.965)` },
      { transform: `translate(calc(-50% + ${startX * .66}px),12px) scale(.98)`, offset: .2 },
      { transform: `translate(calc(-50% + ${startX * .42}px),7px) scale(.988)`, offset: .38 },
      { transform: `translate(calc(-50% + ${startX * .38}px),7px) scale(.988)`, offset: .53 },
      { transform: `translate(calc(-50% + ${footDirection * 5}px),-10px) scale(1.01)`, offset: .72 },
      { transform: `translate(calc(-50% + ${contactOffset}px),-39px) scale(1.018)`, offset: .9 },
      { transform: `translate(calc(-50% + ${contactOffset + footDirection * 11}px),-43px) scale(1.005)` },
    ] : [
      { transform: `translate(calc(-50% + ${startX}px),20px) scale(.965)` },
      { transform: `translate(calc(-50% + ${startX * (reverse ? .78 : .68)}px),13px) scale(.978)`, offset: .18 },
      { transform: `translate(calc(-50% + ${startX * (reverse ? .46 : .32)}px),3px) scale(.994)`, offset: .38 },
      { transform: `translate(calc(-50% + ${footDirection * (reverse ? 10 : 6)}px),-12px) scale(1.012)`, offset: .58 },
      { transform: `translate(calc(-50% + ${contactOffset * .35}px),-29px) scale(1.026)`, offset: .76 },
      { transform: `translate(calc(-50% + ${contactOffset}px),-39px) scale(1.018)`, offset: .88 },
      { transform: `translate(calc(-50% + ${contactOffset + footDirection * 12}px),-43px) scale(1.005)` },
    ];
    const run = animateElement(taker, runFrames, { duration, easing: stutter ? "cubic-bezier(.18,.48,.18,1)" : "cubic-bezier(.16,.58,.18,1)" });
    if (root) animateElement(root, [
      { transform: `rotate(${reverse ? footDirection * -4 : 0}deg) translateY(0)` },
      { transform: `rotate(${footDirection * -1.5}deg) translateY(-1px)`, offset: .28 },
      { transform: `rotate(${footDirection * 2.5}deg) translateY(0)`, offset: stutter ? .62 : .56 },
      { transform: `rotate(${footDirection * 6.5}deg) translateY(1px)`, offset: .8 },
      { transform: `rotate(${footDirection * 8}deg) translateY(0)` },
    ], { duration, easing: "cubic-bezier(.2,.5,.25,1)" });
    if (kickingLeg) animateElement(kickingLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * 9}deg)`, offset: .22 },
      { transform: `rotate(${footDirection * -18}deg)`, offset: stutter ? .61 : .52 },
      { transform: `rotate(${footDirection * -36}deg)`, offset: .72 },
      { transform: `rotate(${footDirection * 52}deg)`, offset: .9 },
      { transform: `rotate(${footDirection * 31}deg)` },
    ], { duration, easing: "cubic-bezier(.16,.64,.18,1)" });
    if (standingLeg) animateElement(standingLeg, [
      { transform: "rotate(0deg) translateY(0)" },
      { transform: `rotate(${footDirection * -5}deg) translateY(0)`, offset: .35 },
      { transform: `rotate(${footDirection * 4}deg) translateY(1px)`, offset: stutter ? .68 : .62 },
      { transform: `rotate(${footDirection * -2}deg) translateY(3px) scaleY(.985)`, offset: .8 },
      { transform: `rotate(${footDirection * 1.5}deg) translateY(2px) scaleY(.99)`, offset: .91 },
      { transform: `rotate(${footDirection * 5}deg) translateY(0) scaleY(1)` },
    ], { duration, easing: "cubic-bezier(.2,.58,.2,1)" });
    if (kickingLowerLeg) animateElement(kickingLowerLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * 14}deg)`, offset: .24 },
      { transform: `rotate(${footDirection * 31}deg)`, offset: stutter ? .63 : .54 },
      { transform: `rotate(${footDirection * -24}deg)`, offset: .73 },
      { transform: `rotate(${footDirection * 18}deg)`, offset: .9 },
      { transform: `rotate(${footDirection * 8}deg)` },
    ], { duration, easing: "cubic-bezier(.16,.62,.18,1)" });
    if (standingLowerLeg) animateElement(standingLowerLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * 7}deg)`, offset: .38 },
      { transform: `rotate(${footDirection * -11}deg)`, offset: stutter ? .72 : .7 },
      { transform: `rotate(${footDirection * -16}deg)`, offset: .82 },
      { transform: `rotate(${footDirection * -8}deg)` },
    ], { duration, easing: "cubic-bezier(.18,.6,.2,1)" });
    if (standingBoot) animateElement(standingBoot, [
      { transform: "rotate(0deg) translate(0,0)" },
      { transform: `rotate(${footDirection * -3}deg) translate(0,0)`, offset: .58 },
      { transform: `rotate(${footDirection * (target && target.x < .34 ? 10 : target && target.x > .66 ? 4 : 7)}deg) translate(${footDirection * 2.5}px,1px)`, offset: .8 },
      { transform: `rotate(${footDirection * 5}deg) translate(${footDirection}px,1px)`, offset: .92 },
      { transform: `rotate(${footDirection * 2}deg) translate(0,0)` },
    ], { duration, easing: "cubic-bezier(.18,.62,.2,1)" });
    if (kickingBoot) animateElement(kickingBoot, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${footDirection * -8}deg)`, offset: .5 },
      { transform: `rotate(${footDirection * 18}deg) scaleY(.98)`, offset: .74 },
      { transform: `rotate(${footDirection * (target && target.y < .38 ? 28 : 20)}deg) scaleY(.96)`, offset: .9 },
      { transform: `rotate(${footDirection * 14}deg)` },
    ], { duration, easing: "cubic-bezier(.16,.64,.18,1)" });
    if (balanceArm) animateElement(balanceArm, [
      { transform: "rotate(0deg) translateY(0)" },
      { transform: `rotate(${footDirection * -14}deg) translateY(-1px)`, offset: .24 },
      { transform: `rotate(${footDirection * -42}deg) translateY(-2px)`, offset: stutter ? .72 : .69 },
      { transform: `rotate(${footDirection * -56}deg) translateY(-1px)`, offset: .87 },
      { transform: `rotate(${footDirection * -28}deg) translateY(0)` },
    ], { duration, easing: "cubic-bezier(.16,.58,.18,1)" });
    if (trailingArm) animateElement(trailingArm, [
      { transform: "rotate(0deg) translateY(0)" },
      { transform: `rotate(${footDirection * 12}deg) translateY(1px)`, offset: .3 },
      { transform: `rotate(${footDirection * 28}deg) translateY(-1px)`, offset: stutter ? .73 : .7 },
      { transform: `rotate(${footDirection * 20}deg) translateY(-1px)`, offset: .9 },
      { transform: `rotate(${footDirection * 8}deg) translateY(0)` },
    ], { duration, easing: "cubic-bezier(.18,.6,.2,1)" });
    window.setTimeout(() => {
      if (style === "direct" || style === "quick") showTurfKick(foot, style === "direct" ? 1.18 : 1);
    }, Math.max(40, duration * .86));
    return { animation: run, duration, profile };
  }

  function ballScaleAt(point, { saved = false, miss = false } = {}) {
    const depth = clamp((point.y - goalBox.top) / Math.max(.001, ballStart.y - goalBox.top), 0, 1);
    let scale = .43 + depth * .57;
    if (point.y < goalBox.top + goalBox.height * .28) scale *= .91;
    if (saved) scale *= 1.08;
    if (miss) scale *= .96;
    return clamp(scale, .38, 1.08);
  }

  function ballTransform(scaleX, scaleY = scaleX) {
    return `translate(-50%,-50%) scale(${scaleX},${scaleY})`;
  }

  function animateBall(target, duration, saved = false, miss = false, shotType = "driven", options = {}) {
    const point = stagePoint(target);
    const panenkaShot = shotType === "panenka";
    const placedShot = shotType === "placed";
    const from = options.from || ballStart;
    const startScale = ballScaleAt(from, { saved: false, miss: false });
    const endScale = ballScaleAt(point, { saved, miss });
    const midX = from.x + (point.x - from.x) * .52;
    const linearMidY = from.y + (point.y - from.y) * .52;
    const lift = panenkaShot ? .105 : placedShot ? .018 : 0;
    const midY = linearMidY - lift;
    const midScale = ballScaleAt({ x: midX, y: midY }, { saved, miss });
    if (!options.silentKick) sound("kick");
    if (ballShadow) {
      const shadowEndY = saved ? point.y + .025 : goalBox.top + goalBox.height + .012;
      const reboundNear = point.y > from.y;
      animateElement(ballShadow, [
        { left: `${from.x * 100}%`, top: `${(from.y + .012) * 100}%`, opacity: .72, transform: ballTransform(startScale) },
        { left: `${midX * 100}%`, top: `${(from.y - .01) * 100}%`, opacity: panenkaShot ? .14 : .28, transform: ballTransform(Math.max(.35, midScale * .7)), offset: .52 },
        { left: `${point.x * 100}%`, top: `${shadowEndY * 100}%`, opacity: saved ? .14 : reboundNear ? .38 : .06, transform: ballTransform(Math.max(.24, endScale * .55)) },
      ], { duration, easing: "cubic-bezier(.18,.58,.24,1)" });
    }
    return animateElement(ball, [
      { left: `${from.x * 100}%`, top: `${from.y * 100}%`, transform: ballTransform(startScale) },
      { left: `${(from.x + (point.x - from.x) * .045) * 100}%`, top: `${(from.y + (point.y - from.y) * .025) * 100}%`, transform: ballTransform(startScale * .92, startScale * 1.06), offset: .055 },
      { left: `${midX * 100}%`, top: `${midY * 100}%`, transform: ballTransform(midScale), offset: .52 },
      { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: ballTransform(endScale) },
    ], { duration, easing: panenkaShot ? "cubic-bezier(.22,.42,.32,1)" : placedShot ? "cubic-bezier(.16,.5,.22,1)" : "linear" });
  }

  function animateBallApproach(target, duration, shotType = "driven") {
    const targetStage = stagePoint(target);
    const point = {
      x: ballStart.x + (targetStage.x - ballStart.x) * .34,
      y: ballStart.y + (targetStage.y - ballStart.y) * .34,
    };
    const startScale = ballScaleAt(ballStart);
    const endScale = ballScaleAt(point);
    sound("kick");
    if (ballShadow) animateElement(ballShadow, [
      { left: `${ballStart.x * 100}%`, top: `${(ballStart.y + .012) * 100}%`, opacity: .72, transform: ballTransform(startScale) },
      { left: `${point.x * 100}%`, top: `${(point.y + .018) * 100}%`, opacity: .34, transform: ballTransform(endScale * .72) },
    ], { duration, easing: "linear" });
    const animation = animateElement(ball, [
      { left: `${ballStart.x * 100}%`, top: `${ballStart.y * 100}%`, transform: ballTransform(startScale) },
      { left: `${(ballStart.x + (point.x - ballStart.x) * .08) * 100}%`, top: `${(ballStart.y + (point.y - ballStart.y) * .04) * 100}%`, transform: ballTransform(startScale * .92, startScale * 1.06), offset: .08 },
      { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: ballTransform(endScale) },
    ], { duration, easing: "linear" });
    return { point, animation };
  }

  function saveContactPoint(target, saveType, divePoint = null) {
    const centre = divePoint || state.userDive || { x: .5, y: .56 };
    if (saveType === "BLOCKED") return { x: clamp(centre.x, .38, .62), y: clamp(target.y, .43, .68) };
    if (saveType === "LEG SAVE") return { x: clamp((target.x + centre.x) / 2, .25, .75), y: clamp(Math.max(target.y, .69), .67, .86) };
    if (saveType === "CATCH") return { x: clamp((target.x + centre.x) / 2, .08, .92), y: clamp((target.y + centre.y) / 2, .16, .78) };
    return { x: clamp(target.x + (centre.x - target.x) * .28, .025, .975), y: clamp(target.y + (centre.y - target.y) * .22, .035, .96) };
  }

  function showSaveImpact(point, saveType) {
    if (!saveImpact) return;
    const position = stagePoint(point);
    saveImpact.hidden = false;
    saveImpact.className = `save-impact ${saveType === "CATCH" ? "catch-impact" : "glove-impact"}`;
    saveImpact.style.left = `${position.x * 100}%`;
    saveImpact.style.top = `${position.y * 100}%`;
    stage.classList.add("save-contact");
    window.setTimeout(() => {
      saveImpact.hidden = true;
      stage.classList.remove("save-contact");
    }, reducedMotion() ? 90 : 230);
  }

  async function animateSavedShot(target, duration, saveType, divePoint = null, shotType = "driven", { silentKick = false, from = null, hapticEnabled = true } = {}) {
    const contact = saveContactPoint(target, saveType, divePoint);
    const flight = animateBall(contact, Math.max(280, duration * .72), true, false, shotType, { silentKick, from: from || ballStart });
    await flight?.finished.catch(() => {});
    showSaveImpact(contact, saveType);
    if (hapticEnabled) haptic([18, 28, 24]);
    await sleep(reducedMotion() ? 55 : 105);
    await animateDeflection(contact, saveType)?.finished.catch(() => {});
    return contact;
  }

  function animateDeflection(target, saveType) {
    const direction = target.x < 0.47 ? -1 : target.x > 0.53 ? 1 : (state.userDive?.rawX || .5) < .5 ? -1 : 1;
    const point = stagePoint(target);
    const contactScale = ballScaleAt(point, { saved: true });
    if (saveType === "CATCH") {
      if (ballShadow) animateElement(ballShadow, [
        { left: `${point.x * 100}%`, top: `${(point.y + .025) * 100}%`, opacity: .18 },
        { left: `${point.x * 100}%`, top: `${(point.y + .02) * 100}%`, opacity: 0 },
      ], { duration: 360 });
      return animateElement(ball, [
        { left: `${point.x * 100}%`, top: `${point.y * 100}%`, opacity: 1, transform: ballTransform(contactScale) },
        { left: `${point.x * 100}%`, top: `${point.y * 100}%`, opacity: 1, transform: ballTransform(contactScale * .94, contactScale * .88), offset: .35 },
        { left: `${point.x * 100}%`, top: `${point.y * 100}%`, opacity: .94, transform: ballTransform(contactScale * .9) },
      ], { duration: 380, easing: "ease-out" });
    }
    const strong = saveType === "PARRIED" || saveType === "BLOCKED";
    const backward = saveType === "BLOCKED" || saveType === "LEG SAVE";
    const endX = clamp(point.x + direction * (saveType === "FINGERTIP SAVE" ? .15 : strong ? .11 : .08), .012, .988);
    const endY = clamp(point.y + (saveType === "FINGERTIP SAVE" && target.y < .45 ? -.11 : backward ? .18 : target.y < .42 ? -.07 : .105), .012, .97);
    const endScale = ballScaleAt({ x: endX, y: endY }, { saved: false });
    if (ballShadow) animateElement(ballShadow, [
      { left: `${point.x * 100}%`, top: `${(point.y + .025) * 100}%`, opacity: .16, transform: ballTransform(contactScale * .5) },
      { left: `${endX * 100}%`, top: `${(endY + .035) * 100}%`, opacity: endY > point.y ? .38 : .22, transform: ballTransform(endScale * .68) },
    ], { duration: 460 });
    return animateElement(ball, [
      { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: ballTransform(contactScale * .96, contactScale * 1.04) },
      { left: `${endX * 100}%`, top: `${endY * 100}%`, transform: ballTransform(endScale) },
    ], { duration: 460, easing: "cubic-bezier(.12,.5,.3,1)" });
  }

  async function exceptionalSaveReplay(target, saveType, divePoint) {
    if (reducedMotion() || !["CATCH", "FINGERTIP SAVE"].includes(saveType)) return;
    stage.classList.add("save-replay");
    showDecision("SLOW REPLAY", "save");
    positionKeeperOnLine();
    const targetPoint = saveContactPoint(target, saveType, divePoint);
    const targetStage = stagePoint(targetPoint);
    const start = { x: ballStart.x + (targetStage.x - ballStart.x) * .42, y: ballStart.y + (targetStage.y - ballStart.y) * .42 };
    ball.style.left = `${start.x * 100}%`;
    ball.style.top = `${start.y * 100}%`;
    ball.style.opacity = "1";
    ball.style.transform = "translate(-50%,-50%) scale(.78)";
    animateKeeperDive(divePoint || target, 820, true);
    await animateSavedShot(target, 820, saveType, divePoint, "driven", { silentKick: true, from: start, hapticEnabled: false });
    await sleep(180);
    stage.classList.remove("save-replay");
    showDecision(saveType, "save");
  }

  function diveZone(point) {
    if (point.x >= 0.38 && point.x <= 0.62) return "centre";
    const side = point.x < 0.5 ? "left" : "right";
    return `${point.y < 0.48 ? "high" : "low"}-${side}`;
  }

  function animateKeeperBlock(point, duration = 760) {
    positionKeeperOnLine();
    const targetHigh = point.y < .43;
    const targetLow = point.y > .66;
    const sideBias = clamp((point.x - .5) * 8, -3, 3);
    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const leftLowerArm = keeper.querySelector(".keeper-lower-arm-left");
    const rightLowerArm = keeper.querySelector(".keeper-lower-arm-right");
    const leftLeg = keeper.querySelector(".keeper-leg-left");
    const rightLeg = keeper.querySelector(".keeper-leg-right");
    const leftLowerLeg = keeper.querySelector(".keeper-lower-leg-left");
    const rightLowerLeg = keeper.querySelector(".keeper-lower-leg-right");
    const body = keeper.querySelector(".keeper-body-group");
    const total = Math.max(620, duration);
    const armAngle = targetHigh ? 74 : targetLow ? 28 : 48;
    [leftArm, rightArm].forEach((arm, index) => arm && animateElement(arm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${index ? armAngle : -armAngle}deg)`, offset: .48 },
      { transform: `rotate(${index ? armAngle * .82 : -armAngle * .82}deg)` },
    ], { duration: total, easing: "cubic-bezier(.18,.64,.2,1)" }));
    [leftLowerArm, rightLowerArm].forEach((arm, index) => arm && animateElement(arm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${index ? 13 : -13}deg)`, offset: .55 },
      { transform: `rotate(${index ? 8 : -8}deg)` },
    ], { duration: total }));
    [leftLeg, rightLeg].forEach((leg, index) => leg && animateElement(leg, [
      { transform: "rotate(0deg) translateY(0)" },
      { transform: `rotate(${index ? -12 : 12}deg) translateY(${targetLow ? 5 : 2}px)`, offset: .48 },
      { transform: `rotate(${index ? -8 : 8}deg) translateY(${targetLow ? 4 : 1}px)` },
    ], { duration: total }));
    [leftLowerLeg, rightLowerLeg].forEach((leg, index) => leg && animateElement(leg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${index ? 18 : -18}deg)`, offset: .5 },
      { transform: `rotate(${index ? 11 : -11}deg)` },
    ], { duration: total }));
    if (body) animateElement(body, [
      { transform: "translate(0,0) rotate(0deg) scale(1)" },
      { transform: `translate(${sideBias}px,${targetLow ? 7 : targetHigh ? -7 : 1}px) rotate(${sideBias * .22}deg) scale(1,.97)`, offset: .5 },
      { transform: `translate(${sideBias * .7}px,${targetLow ? 5 : targetHigh ? -5 : 0}px) rotate(${sideBias * .16}deg) scale(1,.985)` },
    ], { duration: total });
    return animateElement(keeper, [
      { transform: "translateX(-50%) translateY(0) scale(1)" },
      { transform: `translateX(-50%) translate(${sideBias}px,${targetLow ? 5 : targetHigh ? -8 : 0}px) scale(1)`, offset: .5 },
      { transform: `translateX(-50%) translate(${sideBias * .7}px,${targetLow ? 3 : targetHigh ? -5 : 0}px) scale(1)` },
    ], { duration: total, easing: "cubic-bezier(.16,.62,.2,1)" });
  }

  function animateKeeperDive(point, duration = 840, saved = false) {
    const direction = point.x < .41 ? -1 : point.x > .59 ? 1 : 0;
    if (!direction) return animateKeeperBlock(point, duration);
    positionKeeperOnLine();
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const { width: keeperWidth, height: keeperHeight } = keeperDimensions();
    const baseTop = parseFloat(keeper.style.top) || 0;
    const target = stagePoint(point);
    const targetX = target.x * stageWidth;
    const targetY = target.y * stageHeight;
    const wide = Math.abs(point.x - .5) > .24;
    const extreme = Math.abs(point.x - .5) > .36;
    const high = point.y < .45;
    const low = point.y > .63;
    const gloveXRatio = direction < 0 ? 31 / 180 : 149 / 180;
    const gloveYRatio = 124 / 250;
    const baseCentreX = stageWidth * .5;
    const baseGloveX = baseCentreX + (gloveXRatio - .5) * keeperWidth;
    const baseGloveY = baseTop + gloveYRatio * keeperHeight;
    const goalLeft = goalBox.left * stageWidth;
    const goalRight = (goalBox.left + goalBox.width) * stageWidth;
    const bodyMargin = keeperWidth * .43;
    const minDx = goalLeft + bodyMargin - baseCentreX;
    const maxDx = goalRight - bodyMargin - baseCentreX;
    let dx = (targetX - baseGloveX) * 1.05;
    let dy = (targetY - baseGloveY) * .86;
    dx = clamp(dx, minDx, maxDx);
    dy = clamp(dy, -keeperHeight * .54, keeperHeight * .18);
    if (high) dy = Math.max(dy - keeperHeight * .035, -keeperHeight * .56);

    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const leftLowerArm = keeper.querySelector(".keeper-lower-arm-left");
    const rightLowerArm = keeper.querySelector(".keeper-lower-arm-right");
    const leftLeg = keeper.querySelector(".keeper-leg-left");
    const rightLeg = keeper.querySelector(".keeper-leg-right");
    const leftLowerLeg = keeper.querySelector(".keeper-lower-leg-left");
    const rightLowerLeg = keeper.querySelector(".keeper-lower-leg-right");
    const body = keeper.querySelector(".keeper-body-group");
    const head = keeper.querySelector(".keeper-head-group");
    const leadingArm = direction < 0 ? leftArm : rightArm;
    const trailingArm = direction < 0 ? rightArm : leftArm;
    const leadingLowerArm = direction < 0 ? leftLowerArm : rightLowerArm;
    const trailingLowerArm = direction < 0 ? rightLowerArm : leftLowerArm;
    const pushLeg = direction < 0 ? rightLeg : leftLeg;
    const trailLeg = direction < 0 ? leftLeg : rightLeg;
    const pushLowerLeg = direction < 0 ? rightLowerLeg : leftLowerLeg;
    const trailLowerLeg = direction < 0 ? leftLowerLeg : rightLowerLeg;
    const leadAngle = direction < 0 ? -122 : 122;
    const trailAngle = direction < 0 ? -82 : 82;
    const bodyRotation = direction * (low ? 62 : high ? 57 : 60);
    const landingY = clamp(dy + (low ? keeperHeight * .12 : keeperHeight * .07), -keeperHeight * .5, keeperHeight * .23);
    const totalDuration = Math.max(duration, extreme ? 920 : wide ? 860 : 790);

    if (pushLeg) animateElement(pushLeg, [
      { transform: "rotate(0deg) translateY(0)" },
      { transform: `rotate(${direction * -11}deg) translateY(4px)`, offset: .16 },
      { transform: `rotate(${direction * 17}deg) translateY(1px)`, offset: .38 },
      { transform: `rotate(${direction * 27}deg) translateY(-1px)`, offset: .7 },
      { transform: `rotate(${direction * 20}deg)` },
    ], { duration: totalDuration, easing: "cubic-bezier(.14,.68,.18,1)" });
    if (pushLowerLeg) animateElement(pushLowerLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${direction * -22}deg)`, offset: .18 },
      { transform: `rotate(${direction * 12}deg)`, offset: .48 },
      { transform: `rotate(${direction * 18}deg)` },
    ], { duration: totalDuration });
    if (trailLeg) animateElement(trailLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${direction * -7}deg)`, offset: .28 },
      { transform: `rotate(${direction * -30}deg)`, offset: .7 },
      { transform: `rotate(${direction * -25}deg)` },
    ], { duration: totalDuration });
    if (trailLowerLeg) animateElement(trailLowerLeg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${direction * 18}deg)`, offset: .5 },
      { transform: `rotate(${direction * 25}deg)` },
    ], { duration: totalDuration });
    if (leadingArm) animateElement(leadingArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${leadAngle * .2}deg)`, offset: .22 },
      { transform: `rotate(${leadAngle * .66}deg)`, offset: .54 },
      { transform: `rotate(${leadAngle}deg)`, offset: .82 },
      { transform: `rotate(${leadAngle * .96}deg)` },
    ], { duration: totalDuration, easing: "cubic-bezier(.12,.68,.16,1)" });
    if (leadingLowerArm) animateElement(leadingLowerArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${direction * 12}deg)`, offset: .5 },
      { transform: `rotate(${direction * 5}deg)` },
    ], { duration: totalDuration });
    if (trailingArm) animateElement(trailingArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${trailAngle * .45}deg)`, offset: .5 },
      { transform: `rotate(${trailAngle}deg)`, offset: .82 },
      { transform: `rotate(${trailAngle * .9}deg)` },
    ], { duration: totalDuration });
    if (trailingLowerArm) animateElement(trailingLowerArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${direction * -8}deg)`, offset: .62 },
      { transform: `rotate(${direction * -4}deg)` },
    ], { duration: totalDuration });
    if (body) animateElement(body, [
      { transform: "translate(0,0) rotate(0deg) scale(1)" },
      { transform: `translate(${direction * -1}px,4px) rotate(${direction * -1}deg) scale(1,.96)`, offset: .15 },
      { transform: `translate(${direction * 2}px,0) rotate(${direction * 3}deg) scale(1)`, offset: .38 },
      { transform: `translate(${direction * 4}px,-1px) rotate(${direction * 7}deg) scale(1.015)`, offset: .68 },
      { transform: `translate(${direction * 4}px,4px) rotate(${direction * 8}deg) scale(1,.98)` },
    ], { duration: totalDuration });
    if (head) animateElement(head, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${direction * -4}deg)`, offset: .45 },
      { transform: `rotate(${direction * -8}deg)` },
    ], { duration: totalDuration });

    const diveSequence = state.sequence;
    const diveAnimation = animateElement(keeper, [
      { transform: "translateX(-50%) translate(0,0) rotate(0deg) scale(1)" },
      { transform: `translateX(-50%) translate(${dx * .12}px,${dy * .08}px) rotate(${bodyRotation * .06}deg) scale(1)`, offset: .2 },
      { transform: `translateX(-50%) translate(${dx * .44}px,${dy * .34}px) rotate(${bodyRotation * .3}deg) scale(1.01)`, offset: .46 },
      { transform: `translateX(-50%) translate(${dx * .8}px,${dy * .72}px) rotate(${bodyRotation * .72}deg) scale(1.015)`, offset: .72 },
      { transform: `translateX(-50%) translate(${dx}px,${dy}px) rotate(${bodyRotation}deg) scale(1.018)`, offset: .88 },
      { transform: `translateX(-50%) translate(${dx * .98}px,${landingY}px) rotate(${bodyRotation * 1.02}deg) scale(1,.98)` },
    ], { duration: totalDuration, easing: "cubic-bezier(.1,.68,.16,1)" });
    recoverKeeperAfterDive(diveSequence, saved);
    return diveAnimation;
  }

  function recoverKeeperAfterDive(token, saved = false) {
    window.setTimeout(() => {
      if (token !== state.sequence || state.finished || ["albion-prep", "palace-ready", "palace-prep"].includes(state.phase)) return;
      const currentTransform = getComputedStyle(keeper).transform;
      const recovery = animateElement(keeper, [
        { transform: currentTransform && currentTransform !== "none" ? currentTransform : "translateX(-50%) translateY(0) rotate(0deg) scale(1)" },
        { transform: "translateX(-50%) translateY(5px) rotate(0deg) scale(.99)", offset: .62 },
        { transform: "translateX(-50%) translateY(0) rotate(0deg) scale(1)" },
      ], { duration: reducedMotion() ? 120 : saved ? 520 : 680, easing: "cubic-bezier(.2,.58,.24,1)" });
      recovery?.finished.finally(() => { if (token === state.sequence) positionKeeperOnLine(); });
    }, reducedMotion() ? 140 : saved ? 1120 : 1280);
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

  async function animateWoodworkRebound(target) {
    const point = stagePoint(target);
    const crossbar = target.y < 0;
    const leftPost = target.x < 0;
    const insidePost = !crossbar && Math.abs(target.x) < .03 || target.x > 1 && target.x < 1.03;
    const end = crossbar
      ? { x: clamp(point.x + (point.x < .5 ? .08 : -.08), .08, .92), y: clamp(point.y + .22, .16, .86) }
      : { x: clamp(point.x + (leftPost ? (insidePost ? .2 : -.15) : (insidePost ? -.2 : .15)), .02, .98), y: clamp(point.y + .12, .12, .92) };
    const startScale = ballScaleAt(point, { miss: true });
    const endScale = ballScaleAt(end);
    stage.classList.add("frame-impact");
    haptic(28);
    if (ballShadow) animateElement(ballShadow, [
      { left: `${point.x * 100}%`, top: `${(point.y + .025) * 100}%`, opacity: .12, transform: ballTransform(startScale * .45) },
      { left: `${end.x * 100}%`, top: `${(end.y + .035) * 100}%`, opacity: .34, transform: ballTransform(endScale * .7) },
    ], { duration: 460 });
    const animation = animateElement(ball, [
      { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: ballTransform(startScale * .96, startScale * 1.04) },
      { left: `${end.x * 100}%`, top: `${end.y * 100}%`, transform: ballTransform(endScale) },
    ], { duration: 460, easing: "cubic-bezier(.12,.52,.28,1)" });
    await animation?.finished.catch(() => {});
    window.setTimeout(() => stage.classList.remove("frame-impact"), 180);
  }

  async function animateBallPlacement(side, token) {
    const kickIndex = side === "albion" ? state.albionKicks : state.palaceKicks;
    const routineIndex = (kickIndex + (side === "palace" ? 2 : 0)) % 5;
    const dramatic = kickIndex === 0 || (state.albionKicks >= 5 && state.palaceKicks >= 5);
    const duration = reducedMotion() ? 170 : dramatic ? 1580 : 1320 + routineIndex * 55;
    const settlePause = reducedMotion() ? 25 : 320;
    stage.classList.add("placing-ball", `placement-${routineIndex + 1}`);
    const root = taker.querySelector(".taker-root");
    const leftArm = taker.querySelector(".taker-arm-left");
    const rightArm = taker.querySelector(".taker-arm-right");
    const leftLeg = taker.querySelector(".taker-leg-left");
    const rightLeg = taker.querySelector(".taker-leg-right");
    const leftLowerArm = taker.querySelector(".taker-lower-arm-left");
    const rightLowerArm = taker.querySelector(".taker-lower-arm-right");
    const leftLowerLeg = taker.querySelector(".taker-lower-leg-left");
    const rightLowerLeg = taker.querySelector(".taker-lower-leg-right");
    const sideBias = routineIndex === 1 ? -2.5 : routineIndex === 3 ? 2.5 : 0;
    const carryX = 55.5 + sideBias;
    const carryY = routineIndex === 2 ? 55.5 : 57.5;
    taker.style.left = `${56.5 + sideBias}%`;
    taker.style.top = "49%";
    ball.style.left = `${carryX}%`;
    ball.style.top = `${carryY}%`;
    ball.style.transform = "translate(-50%,-50%) scale(.72)";
    if (ballShadow) { ballShadow.style.left = `${carryX}%`; ballShadow.style.top = "70%"; ballShadow.style.opacity = ".16"; }

    const bendDepth = routineIndex === 4 ? 15 : routineIndex === 1 ? 10 : 12;
    animateElement(taker, [
      { transform: "translate(-50%,12px) scale(.95)" },
      { transform: "translate(-50%,4px) scale(.975)", offset: .22 },
      { transform: `translate(-50%,${bendDepth}px) scale(.98)`, offset: .5 },
      { transform: "translate(-50%,4px) scale(.988)", offset: .76 },
      { transform: `translate(calc(-50% + ${routineIndex === 3 ? -4 : 0}px),0) scale(.99)` },
    ], { duration, easing: "cubic-bezier(.18,.58,.2,1)" });
    if (root) animateElement(root, [
      { transform: "rotate(0deg) translateY(0) scaleY(1)" },
      { transform: `rotate(${routineIndex % 2 ? -3 : 3}deg) translateY(3px) scaleY(.93)`, offset: .32 },
      { transform: `rotate(${routineIndex % 2 ? -6 : 6}deg) translateY(${bendDepth}px) scaleY(.9)`, offset: .53 },
      { transform: `rotate(${routineIndex % 2 ? -2 : 2}deg) translateY(3px) scaleY(.96)`, offset: .76 },
      { transform: "rotate(0deg) translateY(0) scaleY(1)" },
    ], { duration, easing: "cubic-bezier(.2,.55,.22,1)" });
    [leftArm, rightArm].forEach((arm, index) => arm && animateElement(arm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${index ? 30 : -30}deg)`, offset: .3 },
      { transform: `rotate(${index ? 58 + routineIndex * 1.5 : -58 - routineIndex * 1.5}deg)`, offset: .56 },
      { transform: `rotate(${index ? 24 : -24}deg)`, offset: .76 },
      { transform: "rotate(0deg)" },
    ], { duration }));
    [leftLowerArm, rightLowerArm].forEach((arm, index) => arm && animateElement(arm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${index ? 24 : -24}deg)`, offset: .42 },
      { transform: `rotate(${index ? 38 : -38}deg)`, offset: .56 },
      { transform: `rotate(${index ? 14 : -14}deg)`, offset: .75 },
      { transform: "rotate(0deg)" },
    ], { duration }));
    if (leftLeg) animateElement(leftLeg, [
      { transform: "rotate(0deg)" }, { transform: `rotate(${routineIndex % 2 ? 7 : 11}deg)`, offset: .52 }, { transform: "rotate(0deg)" },
    ], { duration });
    if (rightLeg) animateElement(rightLeg, [
      { transform: "rotate(0deg)" }, { transform: `rotate(${routineIndex % 2 ? -12 : -7}deg)`, offset: .52 }, { transform: "rotate(0deg)" },
    ], { duration });
    [leftLowerLeg, rightLowerLeg].forEach((leg, index) => leg && animateElement(leg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${index ? -17 : 17}deg)`, offset: .48 },
      { transform: `rotate(${index ? -22 : 22}deg)`, offset: .58 },
      { transform: "rotate(0deg)" },
    ], { duration }));

    const settleRotation = [36, 70, -22, 95, 52][routineIndex];
    const adjustX = [50, 49.7, 50.3, 50, 50.15][routineIndex];
    const adjustY = [77, 76.8, 77.1, 77, 76.9][routineIndex];
    animateElement(ball, [
      { left: `${carryX}%`, top: `${carryY}%`, transform: "translate(-50%,-50%) scale(.72) rotate(0deg)" },
      { left: `${53 + sideBias * .3}%`, top: "66%", transform: `translate(-50%,-50%) scale(.84) rotate(${settleRotation * .35}deg)`, offset: .38 },
      { left: `${adjustX}%`, top: `${adjustY}%`, transform: `translate(-50%,-50%) scale(1) rotate(${settleRotation}deg)`, offset: .62 },
      { left: `${routineIndex === 1 ? 50.35 : routineIndex === 3 ? 49.75 : 50}%`, top: "77%", transform: `translate(-50%,-50%) scale(${routineIndex === 4 ? .985 : 1}) rotate(${settleRotation + (routineIndex === 1 ? 26 : routineIndex === 3 ? -18 : 6)}deg)`, offset: .76 },
      { left: `${ballStart.x * 100}%`, top: `${ballStart.y * 100}%`, transform: `translate(-50%,-50%) scale(1) rotate(${settleRotation + 8}deg)` },
    ], { duration, easing: "cubic-bezier(.18,.58,.22,1)" });
    if (ballShadow) animateElement(ballShadow, [
      { left: `${carryX}%`, top: "70%", opacity: .14, transform: "translate(-50%,-50%) scale(.5)" },
      { left: `${ballStart.x * 100}%`, top: `${(ballStart.y + .012) * 100}%`, opacity: .7, transform: "translate(-50%,-50%) scale(1)" },
    ], { duration });
    await sleep(duration + settlePause);
    if (token !== state.sequence) return false;
    stage.classList.remove("placing-ball", "placement-1", "placement-2", "placement-3", "placement-4", "placement-5");
    taker.style.left = "50%";
    taker.style.top = "49%";
    taker.style.transform = "translate(-50%,0)";
    taker.querySelectorAll(".taker-root,.taker-arm,.taker-lower-arm,.taker-leg,.taker-lower-leg").forEach((part) => { part.style.transform = ""; });
    return true;
  }

  function takerReaction(scored, side = "albion") {
    const leftArm = taker.querySelector(".taker-arm-left");
    const rightArm = taker.querySelector(".taker-arm-right");
    const leftLowerArm = taker.querySelector(".taker-lower-arm-left");
    const rightLowerArm = taker.querySelector(".taker-lower-arm-right");
    const leftLeg = taker.querySelector(".taker-leg-left");
    const rightLeg = taker.querySelector(".taker-leg-right");
    const root = taker.querySelector(".taker-root");
    const direction = side === "albion" ? -1 : 1;
    const duration = reducedMotion() ? 170 : 1080;
    if (scored) {
      stage.classList.add("goal-celebration");
      if (root) animateElement(root, [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${direction * 5}deg)`, offset: .42 },
        { transform: `rotate(${direction * 11}deg)` },
      ], { duration });
      if (leftArm) animateElement(leftArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(-42deg)", offset: .45 }, { transform: "rotate(-56deg)" }], { duration });
      if (rightArm) animateElement(rightArm, [{ transform: "rotate(0deg)" }, { transform: "rotate(42deg)", offset: .45 }, { transform: "rotate(56deg)" }], { duration });
      [leftLowerArm, rightLowerArm].forEach((arm, index) => arm && animateElement(arm, [
        { transform: "rotate(0deg)" }, { transform: `rotate(${index ? 10 : -10}deg)`, offset: .58 }, { transform: `rotate(${index ? 6 : -6}deg)` },
      ], { duration }));
      [leftLeg, rightLeg].forEach((leg, index) => leg && animateElement(leg, [
        { transform: "rotate(0deg)" }, { transform: `rotate(${index ? -8 : 8}deg)`, offset: .58 }, { transform: `rotate(${index ? 5 : -5}deg)` },
      ], { duration }));
      animateElement(taker, [
        { transform: taker.style.transform || "translate(-50%,0)" },
        { transform: `translate(calc(-50% + ${direction * 18}px),-13px) scale(.995)`, offset: .42 },
        { transform: `translate(calc(-50% + ${direction * 48}px),-8px) scale(.975)` },
      ], { duration, easing: "cubic-bezier(.2,.6,.24,1)" });
    } else {
      if (leftArm) animateElement(leftArm,[{transform:"rotate(0deg)"},{transform:"rotate(-48deg)",offset:.7},{transform:"rotate(-40deg)"}],{duration});
      if (rightArm) animateElement(rightArm,[{transform:"rotate(0deg)"},{transform:"rotate(48deg)",offset:.7},{transform:"rotate(40deg)"}],{duration});
      if (root) animateElement(root,[{transform:"rotate(0deg)"},{transform:`rotate(${direction * 4}deg)`,offset:.65},{transform:`rotate(${direction * 2}deg)`}],{duration});
      animateElement(taker,[{transform:taker.style.transform||"translate(-50%,0)"},{transform:"translate(-50%,-18px) scale(.975)",offset:.7},{transform:"translate(-50%,-15px) scale(.97)"}],{duration});
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
      playAlbionChant(true);
      window.setTimeout(() => { if (confetti) confetti.hidden = true; }, 2300);
    } else {
      sound("palaceCheer");
    }
  }

  async function keeperBarTouchRoutine(kind, token) {
    positionKeeperOnLine();
    const useLeft = keeperRoutineIndex++ % 2 === 1;
    const body = keeper.querySelector(".keeper-body-group");
    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const leftLowerArm = keeper.querySelector(".keeper-lower-arm-left");
    const rightLowerArm = keeper.querySelector(".keeper-lower-arm-right");
    const leftLeg = keeper.querySelector(".keeper-leg-left");
    const rightLeg = keeper.querySelector(".keeper-leg-right");
    const leftLowerLeg = keeper.querySelector(".keeper-lower-leg-left");
    const rightLowerLeg = keeper.querySelector(".keeper-lower-leg-right");
    const arm = useLeft ? leftArm : rightArm;
    const lowerArm = useLeft ? leftLowerArm : rightLowerArm;
    const bar = goalMouth.querySelector(".goal-crossbar");
    const glove = arm?.querySelector(".keeper-glove");
    const barRect = bar?.getBoundingClientRect();
    const gloveRect = glove?.getBoundingClientRect();
    const requiredLift = barRect && gloveRect ? Math.max(18, gloveRect.top - barRect.bottom + 5) : stage.clientHeight * .2;
    const lift = Math.min(stage.clientHeight * .285, requiredLift + 7);
    const duration = reducedMotion() ? 170 : 1280;

    animateElement(keeper, [
      { transform: "translateX(-50%) translateY(0) scale(1)" },
      { transform: `translateX(calc(-50% + ${useLeft ? -2 : 2}px)) translateY(3px) scale(1,.965)`, offset: .16 },
      { transform: `translateX(calc(-50% + ${useLeft ? -4 : 4}px)) translateY(${-lift * .58}px) scale(1,1.012)`, offset: .43 },
      { transform: `translateX(calc(-50% + ${useLeft ? -5 : 5}px)) translateY(${-lift}px) scale(1,1.025)`, offset: .61 },
      { transform: "translateX(-50%) translateY(2px) scale(1,.98)", offset: .84 },
      { transform: "translateX(-50%) translateY(0) scale(1)" },
    ], { duration, easing: "cubic-bezier(.18,.7,.22,1)" });
    if (body) animateElement(body, [
      { transform: "translateY(0) rotate(0deg)" },
      { transform: `translateY(2px) rotate(${useLeft ? -2 : 2}deg)`, offset: .18 },
      { transform: `translateY(-2px) rotate(${useLeft ? -4 : 4}deg)`, offset: .58 },
      { transform: "translateY(0) rotate(0deg)" },
    ], { duration });
    if (arm) animateElement(arm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${useLeft ? -76 : 76}deg)`, offset: .34 },
      { transform: `rotate(${useLeft ? -146 : 146}deg)`, offset: .6 },
      { transform: `rotate(${useLeft ? -68 : 68}deg)`, offset: .79 },
      { transform: "rotate(0deg)" },
    ], { duration });
    if (lowerArm) animateElement(lowerArm, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${useLeft ? -18 : 18}deg)`, offset: .42 },
      { transform: `rotate(${useLeft ? -30 : 30}deg)`, offset: .6 },
      { transform: "rotate(0deg)" },
    ], { duration });
    [leftLeg, rightLeg].forEach((leg, index) => leg && animateElement(leg, [
      { transform: "rotate(0deg) translateY(0)" },
      { transform: `rotate(${index ? -8 : 8}deg) translateY(4px)`, offset: .18 },
      { transform: `rotate(${index ? 5 : -5}deg) translateY(-1px)`, offset: .55 },
      { transform: "rotate(0deg) translateY(0)" },
    ], { duration }));
    [leftLowerLeg, rightLowerLeg].forEach((leg, index) => leg && animateElement(leg, [
      { transform: "rotate(0deg)" },
      { transform: `rotate(${index ? 16 : -16}deg)`, offset: .2 },
      { transform: `rotate(${index ? -7 : 7}deg)`, offset: .58 },
      { transform: "rotate(0deg)" },
    ], { duration }));
    if (bar) animateElement(bar, [
      { transform: "translate(0,0)", filter: "brightness(1)" },
      { transform: "translate(0,0)", filter: "brightness(1.7) drop-shadow(0 0 4px rgba(255,255,255,.9))", offset: .58 },
      { transform: "translate(-3px,1px)", offset: .61 },
      { transform: "translate(3px,-1px)", offset: .64 },
      { transform: "translate(-2px,1px)", offset: .67 },
      { transform: "translate(1px,0)", offset: .7 },
      { transform: "translate(0,0)", filter: "brightness(1)" },
    ], { duration });
    window.setTimeout(() => {
      sound("gloves");
      haptic(36);
      stage.classList.add("crossbar-contact");
      window.setTimeout(() => stage.classList.remove("crossbar-contact"), 330);
    }, reducedMotion() ? 65 : duration * .59);
    await sleep(duration);
    if (token !== state.sequence) return false;
    keeper.querySelectorAll(".keeper-arm,.keeper-lower-arm,.keeper-leg,.keeper-lower-leg,.keeper-body-group").forEach((part) => { part.style.transform = ""; });
    positionKeeperOnLine();
    return true;
  }


  async function keeperSettleRoutine(token) {
    positionKeeperOnLine();
    const body = keeper.querySelector(".keeper-body-group");
    const leftArm = keeper.querySelector(".keeper-arm-left");
    const rightArm = keeper.querySelector(".keeper-arm-right");
    const variant = keeperRoutineIndex++ % 4;
    const duration = reducedMotion() ? 140 : variant === 1 ? 820 : 720;
    const keeperFrames = variant === 0 ? [
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
      { transform: "translateX(-50%) translate(-7px,1px) scale(1,.985)", offset: .22 },
      { transform: "translateX(-50%) translate(7px,-4px) scale(1.01)", offset: .48 },
      { transform: "translateX(-50%) translate(0,2px) scale(1,.97)", offset: .72 },
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
    ] : variant === 1 ? [
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
      { transform: "translateX(-50%) translate(0,3px) scale(1,.975)", offset: .2 },
      { transform: "translateX(-50%) translate(0,-5px) scale(1.01)", offset: .42 },
      { transform: "translateX(-50%) translate(0,2px) scale(1,.98)", offset: .66 },
      { transform: "translateX(-50%) translate(0,-3px) scale(1.008)", offset: .82 },
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
    ] : variant === 2 ? [
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
      { transform: "translateX(-50%) translate(-11px,0) scale(1)", offset: .35 },
      { transform: "translateX(-50%) translate(-7px,0) scale(1)", offset: .58 },
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
    ] : [
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
      { transform: "translateX(-50%) translate(5px,1px) scale(1)", offset: .3 },
      { transform: "translateX(-50%) translate(-4px,1px) scale(1)", offset: .58 },
      { transform: "translateX(-50%) translate(0,0) scale(1)" },
    ];
    animateElement(keeper, keeperFrames, { duration, easing: "cubic-bezier(.2,.64,.2,1)" });
    if (body) animateElement(body, [
      { transform: "translateY(0) rotate(0deg)" },
      { transform: `translateY(${variant === 1 ? -2 : 1}px) rotate(${variant === 2 ? -2 : variant === 3 ? 2 : 0}deg)`, offset: .48 },
      { transform: "translateY(2px) scaleY(.985) rotate(0deg)", offset: .72 },
      { transform: "translateY(0) rotate(0deg)" },
    ], { duration });
    if (leftArm) animateElement(leftArm, variant === 3 ? [
      { transform: "rotate(0deg)" }, { transform: "rotate(-38deg)", offset: .4 }, { transform: "rotate(-10deg)" },
    ] : variant === 1 ? [
      { transform: "rotate(0deg)" }, { transform: "rotate(-22deg)", offset: .38 }, { transform: "rotate(-6deg)" },
    ] : [{ transform: "rotate(0deg)" }, { transform: "rotate(-15deg)", offset: .55 }, { transform: "rotate(-5deg)" }], { duration });
    if (rightArm) animateElement(rightArm, variant === 3 ? [
      { transform: "rotate(0deg)" }, { transform: "rotate(72deg)", offset: .4 }, { transform: "rotate(14deg)" },
    ] : variant === 1 ? [
      { transform: "rotate(0deg)" }, { transform: "rotate(22deg)", offset: .38 }, { transform: "rotate(6deg)" },
    ] : [{ transform: "rotate(0deg)" }, { transform: "rotate(15deg)", offset: .55 }, { transform: "rotate(5deg)" }], { duration });
    await sleep(duration);
    if (token !== state.sequence) return false;
    positionKeeperOnLine();
    return true;
  }

  function nextCrossbarRoutine() {
    if (!crossbarRoutineBag.length) {
      crossbarRoutineBag = [true, true, false];
      for (let i = crossbarRoutineBag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [crossbarRoutineBag[i], crossbarRoutineBag[j]] = [crossbarRoutineBag[j], crossbarRoutineBag[i]];
      }
    }
    return crossbarRoutineBag.pop();
  }

  async function keeperRoutine(kind, token) {
    // Verbruggen touches the frame in a shuffled two-out-of-three pattern.
    if (kind === "palace" && nextCrossbarRoutine()) return keeperBarTouchRoutine(kind, token);
    return keeperSettleRoutine(token);
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
    document.body.classList.add("shootout-playing");
    state.locked = true;
    state.reactionOpen = false;
    readyPanel.hidden = true;
    panenka.disabled = true;
    panenka.closest("label")?.removeAttribute("hidden");
    const player = albionTakers[state.albionKicks % albionTakers.length];
    applyTakerPose(player, state.albionKicks);
    $("penaltyTakerName").textContent = `${player.name} · ${player.foot === "left" ? "left-footed" : "right-footed"}`;
    $("penaltyShirt").textContent = String(player.number);
    $("turnBadge").textContent = "ALBION PENALTY";
    $("turnBadge").className = "turn-badge albion-turn";
    $("stageInstruction").textContent = "Wait for the whistle";
    stage.setAttribute("aria-label", "Albion penalty. Wait for the referee, then drag or move inside the goal and release to shoot.");
    renderScore();
    setReticle(state.aim.x, state.aim.y);
    if (!(await preKickCeremony("albion", token))) return;
    state.phase = "albion-aim";
    state.locked = false;
    stage.classList.add("is-aiming");
    stage.classList.remove("is-locked", "crowd-hush");
    panenka.disabled = false;
    $("stageInstruction").textContent = "Drag to aim, release to shoot";
    setStatus("Pick your spot", "Move or drag the target, then release to shoot.");
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
    const player = palaceTakers[state.palaceKicks % palaceTakers.length];
    applyTakerPose(player, state.palaceKicks + 20);
    $("penaltyTakerName").textContent = `${player.name} · ${player.foot === "left" ? "left-footed" : "right-footed"}`;
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
    applyTakerPose(player, state.albionKicks);
    const isPanenka = panenka.checked;
    if (isPanenka) state.panenkaAttempts += 1;
    const runProfile = chooseRunUpProfile(player.foot, player.style);
    setApproachLabel(player.foot, runProfile);
    setStatus(`${player.name} begins the run-up`, `${runUpLabel(player.foot, runProfile)}. ${isPanenka ? "A disguised central chip." : "The goalkeeper stays on the line until contact."}`);
    const run = animateRunUp(false, player.foot, aim, player.style, runProfile);
    await sleep(reducedMotion() ? 100 : Math.max(390, run.duration - 130));
    if (token !== state.sequence) return;

    const edge = Math.max(Math.abs(aim.x - .5), Math.abs(aim.y - .5));
    const playerAccuracy = player.accuracy ?? .75;
    const spread = settings.shotSpread * (1 + edge * 1.75) * (1.18 - playerAccuracy * .24);
    const aimedTarget = nudgeShotDifficulty(aim);
    const resolved = isPanenka
      ? { x: clamp(.5 + gaussian() * .024, .43, .57), y: clamp(.61 + gaussian() * .024, .52, .68) }
      : { x: aimedTarget.x + gaussian() * spread, y: aimedTarget.y + gaussian() * spread };
    const frameResult = classifyFrame(resolved);
    const shotType = isPanenka ? "panenka" : (Math.abs(resolved.x - .5) > .24 || resolved.y < .42 ? "placed" : "driven");
    const disguise = player.disguise ?? .65;
    const keeperNoise = settings.keeperNoise * (1.12 - disguise * .22);
    const keeperHoldsCentre = !isPanenka && Math.random() < .12;
    const keeperGuess = keeperHoldsCentre
      ? { x: .5, y: clamp(.56 + gaussian() * .09, .34, .76) }
      : {
          x: clamp(resolved.x + gaussian() * keeperNoise, .04, .96),
          y: clamp(resolved.y + gaussian() * keeperNoise * .78, .06, .94),
        };
    if (isPanenka && Math.random() < .76) keeperGuess.x = Math.random() < .5 ? .12 : .88;
    const distance = Math.hypot(resolved.x - keeperGuess.x, (resolved.y - keeperGuess.y) * .88);
    const centralPenalty = Math.abs(resolved.x - .5) < .12 && resolved.y > .32;
    let saved = !frameResult && distance < settings.keeperReach + (centralPenalty ? .05 : 0);
    // A cumulative 19% keeper-read rescue produces a second relative 10% difficulty step from the previous release.
    const extraRead = !frameResult && !saved && Math.random() < settings.scoringDifficultyIncrease;
    if (extraRead) {
      saved = true;
      keeperGuess.x = clamp(resolved.x + gaussian() * .025, .035, .965);
      keeperGuess.y = clamp(resolved.y + gaussian() * .025, .05, .95);
    }
    const scored = !frameResult && !saved;
    const saveType = distance < settings.keeperReach * .48 || (centralPenalty && extraRead) ? "CATCH" : extraRead && resolved.y < .42 ? "FINGERTIP SAVE" : "PARRIED";

    const playerPower = player.power ?? .76;
    const flightDuration = Math.round(settings.flight * (1.07 - playerPower * .13));
    animateKeeperDive(keeperGuess, flightDuration * .9, saved);
    if (saved) await animateSavedShot(resolved, flightDuration, saveType, keeperGuess, shotType);
    else {
      const ballAnimation = animateBall(resolved, flightDuration, false, Boolean(frameResult), shotType);
      await ballAnimation?.finished.catch(() => {});
    }
    if (frameResult === "woodwork") {
      frameReaction(resolved);
      await animateWoodworkRebound(resolved);
    }

    state.albionKicks += 1;
    if (scored) state.albionGoals += 1;
    if (saved) state.palaceSaves += 1;
    if (isPanenka && scored) state.panenkaGoals += 1;
    const albionOutcome = frameResult || (saved ? "saved" : "goal");
    state.albionResults.push({ scored, result: albionOutcome });
    state.albionShots.push({ x: resolved.x, y: resolved.y, result: albionOutcome, name: player.name, number: player.number, panenka: isPanenka, shotType, runUp: runProfile, foot: player.foot });
    refereeSignal(scored);

    if (scored) {
      netReaction(resolved, isPanenka ? .82 : 1);
      crowdReaction("crowd-albion-cheer", 1750);
      takerReaction(true, "albion");
      showDecision(isPanenka ? "PANENKA!" : "GOAL!", "goal");
      $("stageInstruction").textContent = "Goal for Brighton";
      setStatus("Goal for Brighton", isPanenka ? "The keeper commits and the chip drops centrally." : resolved.x < .3 || resolved.x > .7 ? "Driven into the side netting." : "Placed beyond the goalkeeper.");
      sound("goal"); window.setTimeout(() => sound("albionCheer"), 170); window.setTimeout(() => playAlbionChant(false), 240);
    } else if (saved) {
      crowdReaction("crowd-palace-cheer");
      takerReaction(false, "albion");
      showDecision("SAVED!", "save");
      $("stageInstruction").textContent = "Saved by the goalkeeper";
      setStatus("Palace save", "The goalkeeper makes contact before the line. The ball stays out and the net does not move.");
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
    const options = [
      { x: .18, y: .30, weight: .65 }, { x: .16, y: .78, weight: 1.75 },
      { x: .82, y: .30, weight: .65 }, { x: .84, y: .78, weight: 1.75 },
      { x: .27, y: .55, weight: 1.55 }, { x: .73, y: .55, weight: 1.55 },
      { x: .50, y: .66, weight: 1.9 }, { x: .50, y: .36, weight: .75 },
    ];
    const pool = options.flatMap((item) => Array(Math.max(1, Math.round(item.weight * 5))).fill(item));
    const base = pool[Math.floor(Math.random() * pool.length)];
    const spread = .026;
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
    state.pendingDive = null;
    stage.classList.remove("is-waiting");
    stage.classList.add("is-locked", "palace-kick");
    const player = palaceTakers[state.palaceKicks % palaceTakers.length];
    applyTakerPose(player, state.palaceKicks + 20);
    const plan = randomPalaceTarget();
    state.palaceTarget = plan.target;
    state.palaceMiss = plan.miss;
    if (!(await preKickCeremony("palace", token))) return;

    const settings = config();
    const runDuration = Math.round(player.delay * settings.runUpScale);
    state.phase = "palace-run";
    const runProfile = chooseRunUpProfile(player.foot, player.style || "direct");
    setApproachLabel(player.foot, runProfile);
    setStatus("Palace begin the run-up", `${runUpLabel(player.foot, runProfile)}. Read the approach and standing foot.`);
    const run = animateRunUp(true, player.foot, state.palaceTarget, player.style || "direct", runProfile);
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
    const anticipatedDive = state.pendingDive && performance.now() - state.pendingDive.time < 1800 ? state.pendingDive : null;
    stage.classList.remove("is-locked");
    stage.classList.add("is-save-window");
    $("stageInstruction").textContent = matchMedia("(max-width:760px)").matches ? "Swipe anywhere or tap left, centre or right" : "Move or swipe towards the shot — early movement counts";
    setStatus("Read the final stride", "You can begin moving before contact and continue reacting after the strike.");
    if (anticipatedDive) {
      window.setTimeout(() => {
        if (state.phase === "save" && state.reactionOpen && !state.userDive) takeUserDive(anticipatedDive.point, anticipatedDive.source || "anticipated");
      }, reducedMotion() ? 10 : 90);
    }

    await sleep(reducedMotion() ? 30 : settings.preContactWindow);
    if (token !== state.sequence) return;
    cue.hidden = false;
    setStatus("REACT!", matchMedia("(max-width:760px)").matches ? "Swipe anywhere on the pitch or tap left, centre or right." : "Move or swipe towards the shot. Choosing the correct side is strongly rewarded.");
    window.setTimeout(() => { cue.hidden = true; }, reducedMotion() ? 150 : 350);
    window.clearTimeout(state.standingSaveTimer);
    const straightAtKeeper = !state.palaceMiss && Math.abs(state.palaceTarget.x - .5) < .13 && state.palaceTarget.y > .34;
    if (straightAtKeeper) {
      state.standingSaveTimer = window.setTimeout(() => {
        if (state.phase === "save" && state.reactionOpen && !state.userDive) takeUserDive({ x: .5, y: state.palaceTarget.y }, "stand-still");
      }, reducedMotion() ? 35 : 190);
    }
    window.clearTimeout(state.reactionTimer);
    state.reactionTimer = window.setTimeout(() => {
      state.reactionOpen = false;
      stage.classList.remove("is-save-window");
    }, settings.postContactWindow);

    // Start the ball immediately, then lock the outcome while it is still in front of the goal.
    const approachDuration = reducedMotion() ? 55 : settings.contactDecisionDelay;
    const approach = animateBallApproach(state.palaceTarget, approachDuration, "driven");
    await approach.animation?.finished.catch(() => {});
    state.saveResolutionLocked = true;
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
      const distance = Math.hypot(state.palaceTarget.x - state.userDive.x, (state.palaceTarget.y - state.userDive.y) * .82);
      const gloveEdge = sameSide && distance <= radius * 1.22 && Math.abs(timing) < settings.postContactWindow * .94;
      const bodyBlock = targetCentre && diveCentre && Math.abs(state.palaceTarget.y - state.userDive.y) < .4;
      const stayedCentral = state.userDive.source === "stand-still" && targetCentre && state.palaceTarget.y > .34;
      saved = distance <= radius || gloveEdge || bodyBlock || stayedCentral;
      if (saved) {
        if (stayedCentral) saveType = state.palaceTarget.y > .67 ? "LEG SAVE" : "BLOCKED";
        else if ((distance < radius * .4 || bodyBlock) && timing < 250) saveType = targetCentre ? "BLOCKED" : "CATCH";
        else if (distance > radius * .86 || gloveEdge) saveType = "FINGERTIP SAVE";
        else if (state.palaceTarget.y > .66) saveType = "LEG SAVE";
        else saveType = "PARRIED";
      }
    }

    const scored = !state.palaceMiss && !saved;
    const remainingFlight = Math.max(380, settings.flight - approachDuration);
    if (saved) await animateSavedShot(state.palaceTarget, remainingFlight, saveType, state.userDive, "driven", { silentKick: true, from: approach.point });
    else {
      const ballAnimation = animateBall(state.palaceTarget, remainingFlight, false, state.palaceMiss, "driven", { silentKick: true, from: approach.point });
      await ballAnimation?.finished.catch(() => {});
    }
    if (state.palaceMiss) frameReaction(state.palaceTarget);
    state.palaceKicks += 1;
    if (scored) state.palaceGoals += 1;
    if (saved) {
      state.userSaves += 1;
      if (saveType === "CATCH") state.catches += 1;
      if (saveType === "FINGERTIP SAVE") state.fingertips += 1;
    }
    const palaceOutcome = state.palaceMiss ? "miss" : saved ? "saved" : "goal";
    state.palaceResults.push({ scored, result: palaceOutcome });
    state.palaceShots.push({ x: state.palaceTarget.x, y: state.palaceTarget.y, result: palaceOutcome, name: player.name, saveType, dive: state.userDive ? { x: state.userDive.x, y: state.userDive.y } : null });
    refereeSignal(scored);

    if (saved) {
      crowdReaction("crowd-albion-cheer", 1850);
      keeperCelebration();
      takerReaction(false, "palace");
      showDecision(saveType, "save");
      const timingText = state.userDive.source === "stand-still" ? "held the centre" : state.userDive.timing < 0 ? "well-timed anticipation" : `${Math.round(state.userDive.timing)} ms reaction`;
      $("stageInstruction").textContent = "Saved by Verbruggen";
      setStatus("Verbruggen saves", `${timingText} · ${saveType.toLowerCase()}. The ball stays outside the net.`);
      sound(saveType === "CATCH" ? "catch" : "save"); window.setTimeout(() => sound("albionCheer"), 90);
      await exceptionalSaveReplay(state.palaceTarget, saveType, state.userDive);
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
      sound("goal"); window.setTimeout(() => sound("palaceCheer"), 170);
    }

    renderScore();
    const outcome = resultDecision();
    await sleep(reducedMotion() ? 370 : 1600);
    if (outcome.finished) finishShootout(outcome.albionWon);
    else prepareAlbionKick();
  }

  function previewKeeper(point) {
    if (state.phase !== "save" || state.userDive) return;
    const lean = clamp((point.x - .5) * 14, -7, 7);
    const crouch = clamp((point.y - .5) * 5, -2, 3);
    keeper.style.setProperty("--keeper-ready-x", `${lean}px`);
    keeper.style.setProperty("--keeper-ready-y", `${crouch}px`);
    const body = keeper.querySelector(".keeper-body-group");
    if (body) body.style.transform = `translate(${lean * .22}px,${crouch}px) rotate(${lean * .12}deg)`;
  }

  function takeUserDive(point, source = "direct") {
    if (state.phase !== "save" || !state.reactionOpen || state.userDive) return;
    const timing = performance.now() - state.contactAt;
    let assisted = assistedDivePoint(point);
    if (state.palaceTarget) {
      const chosenSide = point.x < .4 ? -1 : point.x > .6 ? 1 : 0;
      const targetSide = state.palaceTarget.x < .4 ? -1 : state.palaceTarget.x > .6 ? 1 : 0;
      if (chosenSide === targetSide) {
        assisted = {
          x: clamp(assisted.x + (state.palaceTarget.x - assisted.x) * .48, .015, .985),
          y: clamp(assisted.y + (state.palaceTarget.y - assisted.y) * .40, .02, .98),
        };
      }
    }
    state.userDive = { x: assisted.x, y: assisted.y, rawX: point.x, rawY: point.y, timing, source };
    state.reactionTimes.push(Math.max(0, timing));
    state.reactionOpen = false;
    stage.classList.remove("is-save-window");
    const duration = Math.max(610, config().flight * .94 + Math.max(0, -timing) * .72);
    const launchDelay = Math.max(0, -timing - 45);
    const launch = () => {
      if (state.saveResolutionLocked) return;
      const centralAction = Math.abs(assisted.x - .5) < .19 && state.palaceTarget && Math.abs(state.palaceTarget.x - .5) < .17;
      if (centralAction) animateKeeperBlock(assisted, duration);
      else animateKeeperDive(assisted, duration, true);
    };
    if (launchDelay > 0) window.setTimeout(launch, Math.min(launchDelay, 520));
    else launch();
  }

  function shotMapSvg(shots, label) {
    const dots = shots.map((shot, index) => {
      const x = clamp(shot.x, 0, 1) * 92 + 4;
      const y = clamp(shot.y, 0, 1) * 76 + 10;
      const cls = shot.result === "goal" ? "map-goal" : shot.result === "saved" ? "map-save" : shot.result === "woodwork" ? "map-frame" : "map-miss";
      const arrow = shot.dive ? `<path class="map-dive" d="M50 82 L${clamp(shot.dive.x,0,1)*92+4} ${clamp(shot.dive.y,0,1)*76+10}"/>` : "";
      return `${arrow}<g class="map-shot ${cls}" tabindex="0" role="img" aria-label="Kick ${index + 1}: ${shot.result}"><circle cx="${x}" cy="${y}" r="3.2"/><text x="${x}" y="${y + 1.2}" text-anchor="middle">${index + 1}</text></g>`;
    }).join("");
    return `<svg class="penalty-map-svg" viewBox="0 0 100 92" role="img" aria-label="${label}">
      <path class="map-frame-line" d="M4 86V8H96V86M4 8H96"/>
      <path class="map-net-line" d="M4 22H96M4 38H96M4 54H96M4 70H96M20 8V86M36 8V86M52 8V86M68 8V86M84 8V86"/>
      ${dots}
    </svg>`;
  }

  function shotSequence(shots) {
    return shots.map((shot, index) => `<li class="seq-${shot.result}"><b>${index + 1}</b><span>${shot.name || `Kick ${index + 1}`}</span><em>${shot.result === "goal" ? "Goal" : shot.result === "saved" ? "Saved" : shot.result === "woodwork" ? "Woodwork" : "Miss"}</em></li>`).join("");
  }

  function decisiveMoment(albionWon) {
    const lastPalace = state.palaceShots.at(-1);
    const lastAlbion = state.albionShots.at(-1);
    if (albionWon && lastPalace?.result === "saved") return "Winning save by Verbruggen";
    if (albionWon && lastAlbion?.result === "goal") return `Winning kick by ${lastAlbion.name}`;
    const fingertip = state.palaceShots.find((shot) => shot.saveType === "FINGERTIP SAVE");
    if (fingertip) return "Full-stretch fingertip save";
    return albionWon ? "Albion hold their nerve" : "Palace edge the decisive kick";
  }

  function finishShootout(albionWon) {
    state.finished = true;
    state.locked = true;
    state.phase = "finished";
    document.body.classList.remove("shootout-playing");
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
    if (albionWon && stage.classList.contains("palace-kick")) {
      animateElement(taker, [
        { opacity: 1, transform: taker.style.transform || "translate(-50%,0)" },
        { opacity: 0, transform: "translate(calc(-50% + 54px),8px) scale(.94)" }
      ], { duration: reducedMotion() ? 120 : 520, easing: "ease-out", fill: "forwards" });
      window.setTimeout(() => { taker.style.visibility = "hidden"; }, reducedMotion() ? 130 : 540);
    }
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
      <div class="shootout-moment"><span>Moment of the shoot-out</span><b>${decisiveMoment(albionWon)}</b></div>
      <div class="penalty-story">
        <article><h4>Albion penalties</h4>${shotMapSvg(state.albionShots, "Map of Albion penalties")}<ol>${shotSequence(state.albionShots)}</ol></article>
        <article><h4>Palace penalties</h4>${shotMapSvg(state.palaceShots, "Map of Palace penalties and Verbruggen dives")}<ol>${shotSequence(state.palaceShots)}</ol></article>
      </div>
      <div class="penalty-map-legend" aria-label="Penalty map legend"><span class="map-goal-dot">Goal</span><span class="map-save-dot">Saved</span><span class="map-frame-dot">Woodwork</span><span class="map-miss-dot">Miss</span><span class="map-dive-key">Keeper dive</span></div>
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
    albionShots: [],
    palaceShots: [],
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
      pendingDive: null,
      aimPointerActive: false,
    takerPose: "relaxed",
      aimDragMoved: false,
      standingSaveTimer: 0,
      saveResolutionLocked: false,
    });
    summary.hidden = true;
    summary.innerHTML = "";
    shareButton.hidden = true;
    if (celebrationPlayers) celebrationPlayers.hidden = true;
    if (confetti) confetti.hidden = true;
    resetCrowd();
    panenka.checked = false;
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

  function clearPointerTracking(trailDelay = 0) {
    state.pointerStart = null;
    state.pointerLast = null;
    state.activePointerId = null;
    state.aimPointerActive = false;
    state.aimDragMoved = false;
    stage.classList.remove("is-drag-aiming");
    hideSwipeTrail(trailDelay);
  }

  function swipeGoalPoint(start, current, fallbackPoint) {
    if (!start || !current) return fallbackPoint;
    const dx = (current.clientX - start.clientX) / Math.max(1, stage.clientWidth);
    const dy = (current.clientY - start.clientY) / Math.max(1, stage.clientHeight);
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < .018) return fallbackPoint;
    const directionalX = clamp(dx / Math.max(.025, Math.abs(dx) + Math.abs(dy) * .22), -1, 1);
    const directionalY = clamp(dy / Math.max(.025, Math.abs(dy) + Math.abs(dx) * .34), -1, 1);
    return {
      x: clamp(.5 + directionalX * .46, .025, .975),
      y: clamp(.57 + directionalY * .39, .04, .96),
    };
  }

  function aimPointForPointer(point, touchLike) {
    return touchLike ? { x: point.x, y: clamp(point.y - .085, .025, .975) } : point;
  }

  stage.addEventListener("pointermove", (event) => {
    const keeperPreparing = state.phase === "palace-prep" || state.phase === "palace-run";
    if (state.phase !== "albion-aim" && state.phase !== "save" && !keeperPreparing) return;
    const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
    const point = eventGoalPoint(event, touchLike ? .1 : 0);

    if (state.phase === "albion-aim") {
      if (!point.inside && !state.aimPointerActive) return;
      if (state.aimPointerActive || event.pointerType === "mouse") {
        const aimPoint = aimPointForPointer(point, touchLike);
        setReticle(aimPoint.x, aimPoint.y);
        if (state.pointerStart && pointerDistance(state.pointerStart, event) > 5) state.aimDragMoved = true;
        if (state.aimPointerActive) event.preventDefault();
      }
      return;
    }

    if (!state.pointerStart) return;
    const nowPoint = { clientX: event.clientX, clientY: event.clientY, time: performance.now() };
    const distance = pointerDistance(state.pointerStart, nowPoint);
    const mappedPoint = touchLike ? swipeGoalPoint(state.pointerStart, nowPoint, mobileTapGoalPoint(event)) : mobileTapGoalPoint(event);
    state.pointerLast = nowPoint;
    if (touchLike) showSwipeTrail(state.pointerStart, nowPoint);
    previewKeeper(mappedPoint);

    if (keeperPreparing) {
      event.preventDefault();
      if (distance >= Math.max(12, stage.clientWidth * .018)) {
        state.pendingDive = { point: mappedPoint, time: performance.now(), source: touchLike ? "early-swipe" : "early-mouse" };
      }
      return;
    }

    if (state.phase !== "save" || !state.reactionOpen || state.userDive) return;
    const threshold = touchLike ? Math.max(14, stage.clientWidth * .021) : Math.max(7, stage.clientWidth * .01);
    if (distance >= threshold) {
      event.preventDefault();
      takeUserDive(mappedPoint, touchLike ? "swipe" : "mouse-flick");
      if (touchLike) haptic(12);
      clearPointerTracking(touchLike ? 180 : 0);
    }
  }, { passive: false });

  stage.addEventListener("pointerdown", (event) => {
    unlockAudio();
    const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
    const point = eventGoalPoint(event, touchLike ? .1 : 0);
    const savingPhase = state.phase === "palace-prep" || state.phase === "palace-run" || state.phase === "save";
    if (state.phase === "albion-aim" && !point.inside) return;
    if (!savingPhase && state.phase !== "albion-aim") return;
    event.preventDefault();
    beginPointerTracking(event);

    if (state.phase === "albion-aim") {
      state.aimPointerActive = true;
      state.aimDragMoved = false;
      stage.classList.add("is-drag-aiming");
      const aimPoint = aimPointForPointer(point, touchLike);
      setReticle(aimPoint.x, aimPoint.y);
      $("stageInstruction").textContent = "Release to shoot";
    } else {
      const tapPoint = mobileTapGoalPoint(event);
      previewKeeper(tapPoint);
      if (state.phase !== "save") {
        state.pendingDive = { point: tapPoint, time: performance.now(), source: touchLike ? "early-touch" : "early-click" };
      }
    }
  }, { passive: false });

  stage.addEventListener("pointerup", (event) => {
    const hadTracking = Boolean(state.pointerStart);
    const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
    const point = eventGoalPoint(event, touchLike ? .12 : 0);
    const distance = pointerDistance(state.pointerStart, event);
    const fallbackPoint = mobileTapGoalPoint(event);
    const swipePoint = touchLike
      ? distance <= 4 ? fallbackPoint : distance < Math.max(13, stage.clientWidth * .02) ? { x: .5, y: .58 } : swipeGoalPoint(state.pointerStart, event, fallbackPoint)
      : fallbackPoint;

    if (state.phase === "albion-aim" && state.aimPointerActive) {
      event.preventDefault();
      const aimPoint = aimPointForPointer(point, touchLike);
      setReticle(aimPoint.x, aimPoint.y);
      const shot = { ...state.aim };
      clearPointerTracking();
      takeAlbionPenalty(shot);
      return;
    }
    if (state.phase === "palace-prep" || state.phase === "palace-run") {
      event.preventDefault();
      state.pendingDive = { point: swipePoint, time: performance.now(), source: distance > 9 ? (touchLike ? "early-swipe" : "early-mouse") : (touchLike ? "early-tap" : "early-click") };
      previewKeeper(swipePoint);
    } else if (state.phase === "save" && state.reactionOpen && !state.userDive) {
      event.preventDefault();
      takeUserDive(swipePoint, distance > 9 ? (touchLike ? "swipe" : "mouse-flick") : (touchLike ? "tap" : "click"));
      if (touchLike) haptic(12);
    }
    const cancelledAim = state.phase === "albion-aim" && state.aimPointerActive;
    if (hadTracking) clearPointerTracking(touchLike && !cancelledAim ? 180 : 0);
    if (cancelledAim) $("stageInstruction").textContent = "Drag to aim, release to shoot";
  }, { passive: false });

  stage.addEventListener("pointercancel", () => {
    const cancelledAim = state.phase === "albion-aim" && state.aimPointerActive;
    clearPointerTracking();
    if (cancelledAim) $("stageInstruction").textContent = "Drag to aim, release to shoot";
  });
  stage.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && state.phase !== "save" && !state.aimPointerActive) clearPointerTracking();
  });

  // Fallback for older browsers without Pointer Events.
  let fallbackTouchStart = null;
  stage.addEventListener("touchstart", (event) => {
    if (window.PointerEvent) return;
    const savingPhase = state.phase === "palace-prep" || state.phase === "palace-run" || state.phase === "save";
    if (state.phase !== "albion-aim" && !savingPhase) return;
    const touch = event.touches[0];
    if (!touch) return;
    const point = eventGoalPoint(touch, .12);
    if (state.phase === "albion-aim" && !point.inside) return;
    fallbackTouchStart = { clientX: touch.clientX, clientY: touch.clientY, time: performance.now() };
    if (state.phase === "albion-aim") setReticle(point.x, point.y);
    event.preventDefault();
  }, { passive: false });

  stage.addEventListener("touchmove", (event) => {
    if (window.PointerEvent || !fallbackTouchStart) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    const point = eventGoalPoint(touch, .12);
    if (state.phase === "albion-aim") setReticle(point.x, point.y);
    else if (state.phase === "save" && state.reactionOpen && !state.userDive) {
      const distance = Math.hypot(touch.clientX - fallbackTouchStart.clientX, touch.clientY - fallbackTouchStart.clientY);
      const mapped = distance > 10 ? swipeGoalPoint(fallbackTouchStart, touch, mobileTapGoalPoint(touch)) : mobileTapGoalPoint(touch);
      previewKeeper(mapped);
      if (distance >= 14) takeUserDive(mapped, "swipe");
    }
  }, { passive: false });

  stage.addEventListener("touchend", (event) => {
    if (window.PointerEvent || !fallbackTouchStart) return;
    const touch = event.changedTouches[0];
    if (touch) {
      const point = eventGoalPoint(touch, .12);
      const distance = Math.hypot(touch.clientX - fallbackTouchStart.clientX, touch.clientY - fallbackTouchStart.clientY);
      const mapped = distance > 9 ? swipeGoalPoint(fallbackTouchStart, touch, mobileTapGoalPoint(touch)) : mobileTapGoalPoint(touch);
      if (state.phase === "albion-aim") {
        setReticle(point.x, point.y);
        takeAlbionPenalty({ ...state.aim });
      } else if (state.phase === "save" && state.reactionOpen && !state.userDive) {
        takeUserDive(mapped, distance > 9 ? "swipe" : "tap");
      }
    }
    fallbackTouchStart = null;
    hideSwipeTrail();
  }, { passive: false });

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

  readyButton.addEventListener("click", () => { unlockAudio(); beginPalacePenalty(); });
  $("resetShootout").addEventListener("click", resetGame);


  soundButton.addEventListener("click", () => {
    const turningOn = !state.sound;
    state.sound = turningOn;
    if (turningOn) unlockAudio();
    else stopChant();
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
  let resizeTimer = 0;
  const resyncStage = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      syncGoalBox();
      setReticle(state.aim.x, state.aim.y);
      if (!state.phase.includes("run") && state.phase !== "save") positionKeeperOnLine();
    }, 90);
  };
  window.addEventListener("resize", resyncStage, { passive: true });
  window.addEventListener("orientationchange", resyncStage, { passive: true });

  if (typeof IntersectionObserver === "function") {
    const visibilityObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      document.body.classList.toggle("shootout-in-view", Boolean(entry?.isIntersecting));
    }, { threshold: [0, 0.18, 0.4] });
    visibilityObserver.observe(shootoutCard);
  }

  // Mobile browsers can report an unreliable intersection ratio for a game taller than the viewport.
  // Keep floating controls away whenever any substantial part of the shoot-out is on screen.
  let visibilityFrame = 0;
  const syncShootoutVisibility = () => {
    visibilityFrame = 0;
    const rect = shootoutCard.getBoundingClientRect();
    const visible = rect.top < window.innerHeight * .92 && rect.bottom > window.innerHeight * .08;
    document.body.classList.toggle("shootout-in-view", visible);
  };
  const scheduleVisibilitySync = () => {
    if (!visibilityFrame) visibilityFrame = window.requestAnimationFrame(syncShootoutVisibility);
  };
  window.addEventListener("scroll", scheduleVisibilitySync, { passive: true });
  window.addEventListener("resize", scheduleVisibilitySync, { passive: true });

  window.requestAnimationFrame(() => {
    positionKeeperOnLine();
    syncShootoutVisibility();
    prepareAlbionKick();
  });
})();
