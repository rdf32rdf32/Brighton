// Albion Fan Hub r64 penalty game
(() => {
  "use strict";

  // Storage-safe facade: keeps the site functional when mobile privacy settings block localStorage.
  const localStorage = (() => {
    const memory = Object.create(null);
    let native = null;
    try {
      native = window.localStorage;
      const probe = "__albion_storage_probe__";
      native.setItem(probe, "1");
      native.removeItem(probe);
    } catch { native = null; }
    const keys = () => {
      const set = new Set(Object.keys(memory));
      if (native) {
        try { for (let i = 0; i < native.length; i += 1) { const key = native.key(i); if (key) set.add(key); } } catch {}
      }
      return [...set];
    };
    const api = {
      getItem(key) {
        const name = String(key);
        if (native) { try { const value = native.getItem(name); if (value !== null) return value; } catch {} }
        return Object.prototype.hasOwnProperty.call(memory, name) ? memory[name] : null;
      },
      setItem(key, value) {
        const name = String(key); const text = String(value); memory[name] = text;
        if (native) { try { native.setItem(name, text); } catch {} }
      },
      removeItem(key) {
        const name = String(key); delete memory[name];
        if (native) { try { native.removeItem(name); } catch {} }
      },
      clear() {
        Object.keys(memory).forEach((key) => delete memory[key]);
        if (native) { try { native.clear(); } catch {} }
      },
      key(index) { return keys()[Number(index)] ?? null; },
      get length() { return keys().length; },
    };
    return new Proxy(api, {
      ownKeys() { return keys(); },
      getOwnPropertyDescriptor(_target, prop) {
        if (typeof prop === "string" && keys().includes(prop)) return { enumerable: true, configurable: true, value: api.getItem(prop), writable: false };
        return Object.getOwnPropertyDescriptor(api, prop);
      },
    });
  })();

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
  const tutorial = $("shootoutTutorial");
  const tutorialDismiss = $("dismissShootoutTutorial");
  const shootoutMenu = $("shootoutMenu");
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
  const keeperBottle = $("keeperBottle");
  const aimRiskLabel = $("aimRiskLabel");
  const keeperChoiceMarker = $("keeperChoiceMarker");

  // The save prompt belongs inside the playing scene.
  if (readyPanel && readyPanel.parentElement !== stage) stage.appendChild(readyPanel);

  const goalBox = { left: 0.26, top: 0.12, width: 0.48, height: 0.365 };
  const ballStart = { x: 0.5, y: 0.77 };
  // r64: Brighton can deliberately aim narrowly wide or high. The visible target is
  // limited to five per cent beyond the frame so misses remain intentional and fair.
  const AIM_MARGIN = 0.05;
  const FRAME_CONTACT_MARGIN = 0.014;
  const AIM_DRAG_MOUSE_PX = 4;
  const AIM_DRAG_TOUCH_RATIO = 0.018;
  const MOBILE_PENALTY_QUERY = "(max-width: 760px), (max-height: 520px) and (orientation: landscape) and (pointer: coarse)";
  const mobilePenaltyLayout = () => window.matchMedia(MOBILE_PENALTY_QUERY).matches;
  const takerBootRatio = 0.948;

  function mobileReadyTopPx() {
    const stageHeight = Math.max(1, stage.clientHeight);
    const renderedHeight = taker.getBoundingClientRect().height || stageHeight * .18;
    // Anchor the player by the boots, not by the SVG top. The boots sit just
    // behind the ball, keeping the ball visible at ground level on every phone.
    const ballY = stageHeight * ballStart.y;
    const bootClearance = Math.max(12, stageHeight * .028);
    return clamp(ballY + bootClearance - renderedHeight * takerBootRatio, stageHeight * .56, stageHeight * .70);
  }

  function mobileReadyLeftPercent() {
    return taker.dataset.foot === "left" ? 48 : 52;
  }

  function setTakerReadyPosition() {
    taker.style.left = mobilePenaltyLayout() ? `${mobileReadyLeftPercent()}%` : "50%";
    taker.style.top = mobilePenaltyLayout() ? `${mobileReadyTopPx()}px` : "49%";
    taker.style.transform = "translate(-50%,0)";
    stage.dataset.takerReady = mobilePenaltyLayout() ? "behind-ball" : "desktop";
  }

  function syncGoalBox() {
    const stageRect = stage.getBoundingClientRect();
    const goalRect = goalMouth.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !goalRect.width || !goalRect.height) return goalBox;
    goalBox.left = (goalRect.left - stageRect.left) / stageRect.width;
    goalBox.top = (goalRect.top - stageRect.top) / stageRect.height;
    goalBox.width = goalRect.width / stageRect.width;
    goalBox.height = goalRect.height / stageRect.height;
    stage.style.setProperty("--goal-left", `${goalBox.left * 100}%`);
    stage.style.setProperty("--goal-top", `${goalBox.top * 100}%`);
    stage.style.setProperty("--goal-width", `${goalBox.width * 100}%`);
    stage.style.setProperty("--goal-height", `${goalBox.height * 100}%`);
    stage.style.setProperty("--aim-left", `${(goalBox.left - goalBox.width * AIM_MARGIN) * 100}%`);
    stage.style.setProperty("--aim-top", `${(goalBox.top - goalBox.height * AIM_MARGIN) * 100}%`);
    stage.style.setProperty("--aim-width", `${goalBox.width * (1 + AIM_MARGIN * 2) * 100}%`);
    stage.style.setProperty("--aim-height", `${goalBox.height * (1 + AIM_MARGIN) * 100}%`);
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
    keeperReach: 0.109,
    palaceMiss: 0.18,
    saveRadius: 0.39,
    preContactWindow: 320,
    postContactWindow: 920,
    flight: 880,
    runUpScale: 1.04,
    cueStrength: 0.78,
    diveAssist: 0.54,
    sameSideBonus: 0.14,
    scoringDifficultyIncrease: 0.035,
    contactDecisionDelay: 620,
    edgeAccuracyPenalty: 0.0055,
  });

  const albionTakers = window.ALBION_DATA_R64?.penaltyTakers || [];
  const palaceTakers = window.ALBION_DATA_R64?.palaceTakers || [];
  const shuffledIndexes = (length) => shuffled(Array.from({ length }, (_, index) => index));
  const takerAt = (side, kickIndex) => {
    const pool = side === "albion" ? albionTakers : palaceTakers;
    const order = side === "albion" ? state.albionOrder : state.palaceOrder;
    if (!pool.length) return { name: side === "albion" ? "Albion taker" : "Palace taker", number: "", foot: "right", style: "direct", pose: "relaxed", accuracy: .75, power: .78, disguise: .65 };
    const cycle = Math.floor(kickIndex / pool.length);
    if (cycle > 0 && kickIndex % pool.length === 0) {
      if (side === "albion") state.albionOrder = shuffledIndexes(pool.length);
      else state.palaceOrder = shuffledIndexes(pool.length);
    }
    const activeOrder = side === "albion" ? state.albionOrder : state.palaceOrder;
    return pool[activeOrder[kickIndex % pool.length] ?? (kickIndex % pool.length)];
  };

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
    sound: localStorage.getItem("albionSound") === "on",
    audioUnlocked: false,
    pointerStart: null,
    pointerLast: null,
    activePointerId: null,
    pendingDive: null,
    aimPointerActive: false,
    takerPose: "relaxed",
    aimDragMoved: false,
    standingSaveTimer: 0,
    collisionFrame: 0,
    saveResolutionLocked: false,
    shotStyle: "normal",
    aimGesture: { distance: 0, duration: 0, speed: 0.42 },
    ceremonySkip: false,
    albionOrder: [],
    palaceOrder: [],
  };

  state.albionOrder = shuffledIndexes(albionTakers.length);
  state.palaceOrder = shuffledIndexes(palaceTakers.length);

  let audioContext = null;
  let currentAnimations = [];
  let keeperRoutineIndex = 0;
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

  function isMobilePenalty() { return window.matchMedia?.(MOBILE_PENALTY_QUERY).matches; }
  function config() {
    if (!isMobilePenalty()) return GAME;
    return {
      ...GAME,
      saveRadius: GAME.saveRadius * 1.18,
      diveAssist: Math.min(.96, GAME.diveAssist + .07),
      sameSideBonus: GAME.sameSideBonus + .055,
      postContactWindow: GAME.postContactWindow + 230,
      preContactWindow: GAME.preContactWindow + 70,
    };
  }

  function ensureAudio() {
    if (!state.sound || !state.audioUnlocked) return null;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
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
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain).connect(audioContext.destination);
      osc.start(); osc.stop(audioContext.currentTime + 0.015);
      try { chantAudio.load(); } catch {}
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
      // Referee-style peal: bright harmonics, fast attack and a breathy tail.
      tone(vary(2850, .025), .135, "square", .018, vary(2380, .02));
      tone(vary(3650, .02), .11, "sine", .010, vary(3180, .02));
      noiseBurst(.095, .0085, 5200);
      window.setTimeout(() => tone(vary(2710, .02), .075, "square", .010, vary(2310, .02)), 78);
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


  function setShotStyle(style = "normal") { const selected=style==="panenka"?"panenka":"normal";state.shotStyle=selected;if(panenka){const active=selected==="panenka";panenka.classList.toggle("active",active);panenka.setAttribute("aria-pressed",String(active));const label=panenka.querySelector("small");if(label)label.textContent=active?"Selected for next kick":"Special next kick";} }
  function shotMechanics(target,player){const g=state.aimGesture||{distance:0,duration:0,speed:.42},w=Math.max(320,stage.clientWidth||640),df=clamp(g.distance/(w*.32),0,1),sf=clamp((g.speed-.08)/1.05,0,1),pp=player?.power??.78,edge=Math.max(Math.abs(target.x-.5),Math.abs(target.y-.5)),userPower=clamp(pp*.58+sf*.27+df*.15+edge*.04,.5,1),shotType=userPower>.83||sf>.72?"driven":"placed",spreadMultiplier=userPower>.91?1.18:userPower<.64?1.08:shotType==="placed"?.93:1.05;return{userPower,shotType,spreadMultiplier}}
  function captureAimGesture(start,end){if(!start||!end)return{distance:0,duration:0,speed:.42};const distance=Math.hypot(Number(end.clientX||0)-Number(start.clientX||0),Number(end.clientY||0)-Number(start.clientY||0)),duration=Math.max(16,Number(end.time||performance.now())-Number(start.time||performance.now()));return{distance,duration,speed:distance/duration}}

  function reactionLabel(dive) {
    if (!dive) return "No movement";
    if (dive.source === "stand-still") return "Held the centre";
    if (dive.timing < -420) return "Committed early";
    if (dive.timing < -70) return "Good anticipation";
    if (dive.timing <= 180) return "Perfect reaction";
    if (dive.timing <= 520) return "Late reaction";
    return "Very late";
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
    const suddenActive = !state.finished && state.albionKicks >= 5 && state.palaceKicks >= 5;
    const total = Math.max(5, results.length + (suddenActive && results.length >= 5 ? 1 : 0));
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
      const albionCanClincheWithGoal = nextSide === "albion" && state.albionGoals + 1 > state.palaceGoals + leftP;
      const palaceCanClincheWithGoal = nextSide === "palace" && state.palaceGoals + 1 > state.albionGoals + leftA;
      const albionMustScore = nextSide === "albion" && state.palaceGoals > state.albionGoals + Math.max(0, leftA - 1);
      const palaceMustScore = nextSide === "palace" && state.albionGoals > state.palaceGoals + Math.max(0, leftP - 1);
      const albionSaveWins = nextSide === "palace" && state.albionGoals > state.palaceGoals + Math.max(0, leftP - 1);
      $("shootoutSituation").textContent = albionCanClincheWithGoal ? "Score to win"
        : palaceCanClincheWithGoal ? "Palace score to win"
        : albionSaveWins ? "Save to win"
        : albionMustScore ? "Score to stay alive"
        : palaceMustScore ? "Palace must score"
        : `${leftA} Albion · ${leftP} Palace left`;
    }
    const decisive = /win|stay alive|must score/i.test($("shootoutSituation").textContent);
    stage.classList.toggle("decisive-kick", decisive);
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
    state.aim.x = clamp(nx, -AIM_MARGIN, 1 + AIM_MARGIN);
    // There is no useful aiming area below the goal line, but the crossbar can be missed high.
    state.aim.y = clamp(ny, -AIM_MARGIN, 0.995);
    const sx = goalBox.left + state.aim.x * goalBox.width;
    const sy = goalBox.top + state.aim.y * goalBox.height;
    reticle.style.left = `${sx * 100}%`;
    reticle.style.top = `${sy * 100}%`;
    const preview = classifyFrame(state.aim);
    reticle.classList.toggle("aim-woodwork", preview === "woodwork");
    reticle.classList.toggle("aim-outside", preview === "miss");
    stage.dataset.aimRisk = preview || "inside";
    if (aimRiskLabel) {
      const text = preview === "woodwork" ? "FRAME" : preview === "miss" ? (state.aim.y < 0 ? "OVER" : "WIDE") : "ON TARGET";
      aimRiskLabel.textContent = text;
      aimRiskLabel.dataset.risk = preview || "inside";
    }
  }

  function eventGoalPoint(event, tolerance = AIM_MARGIN) {
    syncGoalBox();
    const rect = stage.getBoundingClientRect();
    const sx = (event.clientX - rect.left) / Math.max(1, rect.width);
    const sy = (event.clientY - rect.top) / Math.max(1, rect.height);
    const allowedTolerance = Math.max(AIM_MARGIN, tolerance);
    const padX = goalBox.width * allowedTolerance;
    const padY = goalBox.height * allowedTolerance;
    const inside =
      sx >= goalBox.left - padX && sx <= goalBox.left + goalBox.width + padX &&
      sy >= goalBox.top - padY && sy <= goalBox.top + goalBox.height;
    const rawX = (sx - goalBox.left) / Math.max(.001, goalBox.width);
    const rawY = (sy - goalBox.top) / Math.max(.001, goalBox.height);
    return {
      inside,
      strictInside:
        sx >= goalBox.left && sx <= goalBox.left + goalBox.width &&
        sy >= goalBox.top && sy <= goalBox.top + goalBox.height,
      x: clamp(rawX, -AIM_MARGIN, 1 + AIM_MARGIN),
      y: clamp(rawY, -AIM_MARGIN, 0.995),
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
    const baselineNudge = mobilePenaltyLayout() ? 4 : 7;
    const top = goalLineY - dimensions.height * keeperBootRatio - baselineNudge;
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
    if (state.collisionFrame) cancelAnimationFrame(state.collisionFrame);
    state.collisionFrame = 0;
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
    setTakerReadyPosition();
    taker.style.opacity = "1";
    taker.style.visibility = "";
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
    if (keeperChoiceMarker) keeperChoiceMarker.hidden = true;
    if (aimRiskLabel) { aimRiskLabel.textContent = "ON TARGET"; aimRiskLabel.dataset.risk = "inside"; }
    stage.removeAttribute("data-runup");
    if (turfKick) { turfKick.hidden = true; turfKick.className = "turf-kick"; }
    state.saveResolutionLocked = false;
    stage.classList.remove("crossbar-contact", "save-contact", "contact-armed", "save-replay", "bottle-reading");
    keeperBottle?.classList.remove("is-read");
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
  function runUpClue(target,foot,profile){if(!target)return"Watch the final stride";const side=target.x<.42?"left":target.x>.58?"right":"centre",height=target.y<.42?"Higher body shape":target.y>.67?"Lower final stride":"Balanced final stride",d=profile==="stutter"?"The stutter makes the clue less reliable":profile==="reverse"?"The curved approach may disguise the corner":"The standing foot offers a subtle clue";return`${height}; the approach slightly favours ${side}. ${d}.`}

  function animateRunUp(isPalace, foot = "right", target = null, style = "direct", profile = chooseRunUpProfile(foot, style)) {
    clearTakerPose();
    setApproachLabel(foot, profile);
    const footDirection = foot === "left" ? -1 : 1;
    const settings = config();
    const targetBias = target ? (target.x - .5) * 20 * settings.cueStrength : 0;
    const mobileRun = mobilePenaltyLayout();
    const desktopBase = isPalace ? Math.round(940 * settings.runUpScale) : style === "quick" ? 720 : style === "measured" ? 850 : 790;
    const mobileBase = isPalace ? Math.round(1060 * settings.runUpScale) : style === "quick" ? 850 : style === "measured" ? 1030 : style === "stutter" ? 1040 : 930;
    const baseDuration = mobileRun ? mobileBase : desktopBase;
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
    const readyLeft = Number.parseFloat(taker.style.left) || 50;
    const readyCentreCorrection = mobileRun ? (50 - readyLeft) * (stage.clientWidth / 100) : 0;
    const contactOffset = targetBias + footDirection * 5 + readyCentreCorrection;
    // Derive contact from the rendered ball and boot positions so the standing
    // foot arrives beside the ball rather than the body passing in front of it.
    let contactLift = -39;
    if (mobileRun) {
      const ballRect = ball.getBoundingClientRect();
      const bootRect = kickingBoot?.getBoundingClientRect() || standingBoot?.getBoundingClientRect();
      if (bootRect?.height && ballRect?.height) {
        const ballContactY = ballRect.top + ballRect.height * .58;
        const bootContactY = bootRect.top + bootRect.height * .72;
        contactLift = Math.round(clamp(ballContactY - bootContactY, -96, 10));
      } else {
        contactLift = -58;
      }
    }
    const runStartY = mobileRun ? 0 : 20;
    const runMidY = mobileRun ? Math.round(contactLift * .34) : 7;
    const runNearY = mobileRun ? Math.round(contactLift * .72) : -10;
    const followLift = contactLift - (mobileRun ? 7 : 4);
    const stutter = profile === "stutter";
    const reverse = profile === "reverse";
    sound("footsteps");
    window.setTimeout(() => sound("footsteps"), reducedMotion() ? 30 : duration * .23);
    window.setTimeout(() => sound("footsteps"), reducedMotion() ? 60 : duration * (stutter ? .58 : .48));
    if (stutter) window.setTimeout(() => sound("footsteps"), reducedMotion() ? 75 : duration * .73);
    const runFrames = stutter ? [
      { transform: `translate(calc(-50% + ${startX}px),${runStartY}px) scale(.965)` },
      { transform: `translate(calc(-50% + ${startX * .66}px),${Math.round(runStartY*.62)}px) scale(.98)`, offset: .2 },
      { transform: `translate(calc(-50% + ${startX * .42}px),${runMidY}px) scale(.988)`, offset: .38 },
      { transform: `translate(calc(-50% + ${startX * .38}px),${runMidY}px) scale(.988)`, offset: .53 },
      { transform: `translate(calc(-50% + ${footDirection * 5}px),${runNearY}px) scale(1.01)`, offset: .72 },
      { transform: `translate(calc(-50% + ${contactOffset}px),${contactLift}px) scale(1.018)`, offset: .9 },
      { transform: `translate(calc(-50% + ${contactOffset + footDirection * 11}px),${followLift}px) scale(1.005)` },
    ] : [
      { transform: `translate(calc(-50% + ${startX}px),${runStartY}px) scale(.965)` },
      { transform: `translate(calc(-50% + ${startX * (reverse ? .78 : .68)}px),13px) scale(.978)`, offset: .18 },
      { transform: `translate(calc(-50% + ${startX * (reverse ? .46 : .32)}px),3px) scale(.994)`, offset: .38 },
      { transform: `translate(calc(-50% + ${footDirection * (reverse ? 10 : 6)}px),-12px) scale(1.012)`, offset: .58 },
      { transform: `translate(calc(-50% + ${contactOffset * .35}px),-29px) scale(1.026)`, offset: .76 },
      { transform: `translate(calc(-50% + ${contactOffset}px),${contactLift}px) scale(1.018)`, offset: .88 },
      { transform: `translate(calc(-50% + ${contactOffset + footDirection * 12}px),${followLift}px) scale(1.005)` },
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
    const mobileFlight = mobilePenaltyLayout();
    if (!options.silentKick) sound("kick");

    if (mobileFlight) {
      // Explicit mobile depth path: vertical travel dominates before the ball
      // develops its left/right direction. This prevents a sideways slide.
      const path = [
        { o: 0,    xf: 0,    yf: 0,    sf: 1.00, spin: 0 },
        { o: .08,  xf: 0,    yf: .17,  sf: .995, spin: 54 },
        { o: .22,  xf: .025, yf: .39,  sf: .965, spin: 142 },
        { o: .44,  xf: .12,  yf: .65,  sf: .875, spin: 292 },
        { o: .70,  xf: .40,  yf: .87,  sf: .72,  spin: 486 },
        { o: 1,    xf: 1,    yf: 1,    sf: endScale, spin: 720 },
      ];
      const liftAt = (factor, offset) => {
        const base = from.y + (point.y - from.y) * factor;
        if (panenkaShot) return base - Math.sin(Math.PI * factor) * .095;
        if (placedShot) return base - Math.sin(Math.PI * factor) * .012;
        return base;
      };
      const ballFrames = path.map((k, i) => {
        const x = from.x + (point.x - from.x) * k.xf;
        const y = liftAt(k.yf, k.o);
        const scale = i === path.length - 1 ? endScale : startScale * k.sf;
        const direction = point.x < from.x ? -1 : 1;
        return {
          left: `${x * 100}%`, top: `${y * 100}%`,
          transform: `translate(-50%,-50%) scale(${scale}) rotate(${direction * k.spin}deg)`, offset: k.o,
        };
      });
      if (ballShadow) {
        const shadowFrames = path.map((k, i) => {
          const x = from.x + (point.x - from.x) * k.xf;
          const groundY = from.y + (point.y - from.y) * Math.min(1, k.yf * .92) + .014;
          const opacity = i === path.length - 1 ? (saved ? .14 : .05) : Math.max(.12, .72 * (1 - k.o * .9));
          return {
            left: `${x * 100}%`, top: `${groundY * 100}%`, opacity,
            transform: ballTransform(Math.max(.25, startScale * (1 - k.o * .55))), offset: k.o,
          };
        });
        animateElement(ballShadow, shadowFrames, { duration, easing: "cubic-bezier(.16,.62,.22,1)" });
      }
      return animateElement(ball, ballFrames, { duration, easing: "cubic-bezier(.16,.62,.22,1)" });
    }

    const midX = from.x + (point.x - from.x) * .52;
    const linearMidY = from.y + (point.y - from.y) * .52;
    const lift = panenkaShot ? .105 : placedShot ? .018 : 0;
    const midY = linearMidY - lift;
    const midScale = ballScaleAt({ x: midX, y: midY }, { saved, miss });
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
      x: ballStart.x + (targetStage.x - ballStart.x) * (mobilePenaltyLayout() ? .08 : .34),
      y: ballStart.y + (targetStage.y - ballStart.y) * (mobilePenaltyLayout() ? .58 : .34),
    };
    const startScale = ballScaleAt(ballStart);
    const endScale = ballScaleAt(point);
    sound("kick");
    if (ballShadow) animateElement(ballShadow, [
      { left: `${ballStart.x * 100}%`, top: `${(ballStart.y + .012) * 100}%`, opacity: .72, transform: ballTransform(startScale) },
      { left: `${point.x * 100}%`, top: `${(point.y + .018) * 100}%`, opacity: .34, transform: ballTransform(endScale * .72) },
    ], { duration, easing: "linear" });
    const mobileApproach = mobilePenaltyLayout();
    const approachDirection = targetStage.x < ballStart.x ? -1 : 1;
    const animation = animateElement(ball, [
      { left: `${ballStart.x * 100}%`, top: `${ballStart.y * 100}%`, transform: ballTransform(startScale) },
      { left: `${(ballStart.x + (point.x - ballStart.x) * (mobileApproach ? .006 : .08)) * 100}%`, top: `${(ballStart.y + (point.y - ballStart.y) * (mobileApproach ? .24 : .04)) * 100}%`, transform: mobileApproach ? `translate(-50%,-50%) scale(${startScale * .98}) rotate(${approachDirection * 45}deg)` : ballTransform(startScale * .92, startScale * 1.06), offset: .08 },
      { left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: mobileApproach ? `translate(-50%,-50%) scale(${endScale}) rotate(${approachDirection * 300}deg)` : ballTransform(endScale) },
    ], { duration, easing: mobileApproach ? "cubic-bezier(.15,.62,.2,1)" : "linear" });
    return { point, animation };
  }

  function elementStagePoint(element, anchorX = .5, anchorY = .5) {
    if (!element) return null;
    const stageRect = stage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !rect.width || !rect.height) return null;
    return {
      x: clamp((rect.left + rect.width * anchorX - stageRect.left) / stageRect.width, .005, .995),
      y: clamp((rect.top + rect.height * anchorY - stageRect.top) / stageRect.height, .005, .995),
    };
  }

  function midpoint(a, b) {
    if (!a) return b;
    if (!b) return a;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function closestPoint(points, target) {
    return points.filter(Boolean).sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y))[0] || null;
  }

  function saveContactDescriptor(saveType, target) {
    const targetStage = stagePoint(target);
    const leftGlove = keeper.querySelector('.keeper-arm-left .keeper-glove');
    const rightGlove = keeper.querySelector('.keeper-arm-right .keeper-glove');
    const leftBoot = keeper.querySelector('.keeper-leg-left .keeper-boot');
    const rightBoot = keeper.querySelector('.keeper-leg-right .keeper-boot');
    const leftShin = keeper.querySelector('.keeper-lower-leg-left');
    const rightShin = keeper.querySelector('.keeper-lower-leg-right');
    const shirt = keeper.querySelector('.keeper-shirt');
    const shorts = keeper.querySelector('.keeper-shorts');
    const palmAnchor = targetStage.x < .5 ? .38 : .62;
    const leftPalm = elementStagePoint(leftGlove, palmAnchor, .5);
    const rightPalm = elementStagePoint(rightGlove, palmAnchor, .5);
    const glovePoints = [leftPalm, rightPalm];
    if (saveType === 'CATCH') {
      const leading = closestPoint(glovePoints, targetStage);
      const support = leading === leftPalm ? rightPalm : leftPalm;
      const leadingElement = leading === leftPalm ? leftGlove : rightGlove;
      const supportElement = leading === leftPalm ? rightGlove : leftGlove;
      return {
        point: leading,
        element: leadingElement,
        supportElement,
        leadingPoint: leading,
        supportPoint: support,
        kind: 'glove',
        targetStage,
      };
    }
    if (saveType === 'FINGERTIP SAVE' || saveType === 'PARRIED') {
      const point = closestPoint(glovePoints, targetStage);
      return { point, element: point === leftPalm ? leftGlove : rightGlove, kind: 'glove', targetStage };
    }
    if (saveType === 'LEG SAVE') {
      const candidates = [
        { point: elementStagePoint(leftBoot, .5, .38), element: leftBoot },
        { point: elementStagePoint(rightBoot, .5, .38), element: rightBoot },
        { point: elementStagePoint(leftShin, .5, .58), element: leftShin },
        { point: elementStagePoint(rightShin, .5, .58), element: rightShin },
      ];
      const selected = candidates.filter(item => item.point).sort((a,b) => Math.hypot(a.point.x-targetStage.x,a.point.y-targetStage.y)-Math.hypot(b.point.x-targetStage.x,b.point.y-targetStage.y))[0];
      return { point: selected?.point, element: selected?.element, kind: selected?.element?.classList.contains('keeper-boot') ? 'boot' : 'leg', targetStage };
    }
    const chest = elementStagePoint(shirt, .5, target.y > .62 ? .78 : .55);
    const hip = elementStagePoint(shorts, .5, .48);
    const point = target.y > .62 ? hip || chest : chest || hip;
    return { point, element: target.y > .62 ? shorts : shirt, kind: target.y > .62 ? 'body' : 'chest', targetStage };
  }

  function fallbackContactPoint(target, saveType, divePoint = null) {
    const centre = divePoint || state.userDive || { x: .5, y: .56 };
    let goalPoint;
    if (saveType === 'BLOCKED') goalPoint = { x: clamp(centre.x, .38, .62), y: clamp(target.y, .43, .68) };
    else if (saveType === 'LEG SAVE') goalPoint = { x: clamp((target.x + centre.x) / 2, .25, .75), y: clamp(Math.max(target.y, .69), .67, .86) };
    else goalPoint = { x: clamp(target.x + (centre.x - target.x) * .28, .025, .975), y: clamp(target.y + (centre.y - target.y) * .22, .035, .96) };
    return stagePoint(goalPoint);
  }

  function liveSavePoint(saveType, target, divePoint = null) {
    return saveContactDescriptor(saveType, target).point || fallbackContactPoint(target, saveType, divePoint);
  }

  function showSaveImpact(point, saveType) {
    if (!saveImpact) return;
    const position = point;
    saveImpact.hidden = false;
    saveImpact.className = `save-impact ${saveType === 'CATCH' ? 'catch-impact' : 'glove-impact'}`;
    saveImpact.style.left = `${position.x * 100}%`;
    saveImpact.style.top = `${position.y * 100}%`;
    stage.classList.add('save-contact');
    window.setTimeout(() => {
      saveImpact.hidden = true;
      stage.classList.remove('save-contact');
    }, reducedMotion() ? 90 : 230);
  }

  function recoilSavePart(descriptor, saveType, target) {
    const element = descriptor?.element;
    if (!element) return;
    const direction = target.x < .5 ? -1 : 1;
    const glove = descriptor.kind === 'glove';
    const boot = descriptor.kind === 'boot';
    animateElement(element, [
      { transform: getComputedStyle(element).transform === 'none' ? 'translate(0,0) rotate(0deg)' : getComputedStyle(element).transform },
      { transform: glove ? `translate(${direction * 2}px,2px) rotate(${direction * -9}deg) scale(.96,1.05)` : boot ? `translate(${direction * 3}px,2px) rotate(${direction * 7}deg)` : `translate(${direction}px,3px) scale(.98,1.03)`, offset: .45 },
      { transform: glove ? `translate(${direction}px,1px) rotate(${direction * -4}deg)` : 'translate(0,1px)' },
    ], { duration: reducedMotion() ? 110 : 260, easing: 'cubic-bezier(.15,.7,.2,1)' });
  }

  function setBallFrame(point, scale, squashX = 1, squashY = 1) {
    ball.style.left = `${point.x * 100}%`;
    ball.style.top = `${point.y * 100}%`;
    ball.style.opacity = '1';
    ball.style.transform = ballTransform(scale * squashX, scale * squashY);
  }

  function projectPointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
    return { t, point: { x: start.x + dx * t, y: start.y + dy * t } };
  }

  function moveSavePartToContact(descriptor, collisionPoint, duration) {
    const stageRect = stage.getBoundingClientRect();
    const moveOne = (element, fromPoint, destination, side = 0) => {
      if (!element || !fromPoint) return null;
      const dx = (destination.x - fromPoint.x) * stageRect.width + side;
      const dy = (destination.y - fromPoint.y) * stageRect.height;
      element.classList.add('active-save-part');
      return animateElement(element, [
        { transform: 'translate(0px,0px) scale(1)' },
        { transform: `translate(${dx * .72}px,${dy * .72}px) scale(1.04)`, offset: .72 },
        { transform: `translate(${dx}px,${dy}px) scale(1.06)` },
      ], { duration, easing: 'cubic-bezier(.16,.72,.18,1)' });
    };
    if (descriptor.kind === 'glove' && descriptor.supportElement) {
      const ballHalf = Math.max(4, ball.getBoundingClientRect().width * .34);
      const leadSide = descriptor.leadingPoint?.x < descriptor.supportPoint?.x ? -ballHalf : ballHalf;
      moveOne(descriptor.element, descriptor.leadingPoint, collisionPoint, leadSide);
      moveOne(descriptor.supportElement, descriptor.supportPoint, collisionPoint, -leadSide);
    } else {
      moveOne(descriptor.element, descriptor.point, collisionPoint);
    }
  }

  function animateBallToLiveContact(target, duration, saveType, divePoint, from) {
    const startPoint = from || ballStart;
    const intended = stagePoint(target);
    const descriptor = saveContactDescriptor(saveType, target);
    const fallback = fallbackContactPoint(target, saveType, divePoint);
    const bodyPoint = descriptor.point || fallback;
    const projected = projectPointToSegment(bodyPoint, startPoint, intended);
    const collisionT = clamp(projected.t, saveType === 'LEG SAVE' ? .5 : .42, .94);
    const collisionPoint = {
      x: startPoint.x + (intended.x - startPoint.x) * collisionT,
      y: startPoint.y + (intended.y - startPoint.y) * collisionT,
    };
    const total = Math.max(reducedMotion() ? 150 : 390, duration);
    moveSavePartToContact(descriptor, collisionPoint, total * .92);
    const startTime = performance.now();
    if (state.collisionFrame) cancelAnimationFrame(state.collisionFrame);
    return new Promise((resolve) => {
      const frame = (now) => {
        const raw = clamp((now - startTime) / total, 0, 1);
        const eased = raw * raw * (3 - 2 * raw);
        const naturalPoint = {
          x: startPoint.x + (collisionPoint.x - startPoint.x) * eased,
          y: startPoint.y + (collisionPoint.y - startPoint.y) * eased,
        };
        const liveDescriptor = raw > .84 ? saveContactDescriptor(saveType, target) : descriptor;
        const livePoint = liveDescriptor.point || collisionPoint;
        const correctionRaw = clamp((raw - .88) / .12, 0, 1);
        const correction = correctionRaw * correctionRaw * (3 - 2 * correctionRaw);
        const point = {
          x: naturalPoint.x + (livePoint.x - naturalPoint.x) * correction,
          y: naturalPoint.y + (livePoint.y - naturalPoint.y) * correction,
        };
        if (raw > .76) stage.classList.add('contact-armed');
        const scale = ballScaleAt(point, { saved: true });
        setBallFrame(point, scale, raw > .88 ? .94 : 1, raw > .88 ? 1.06 : 1);
        if (ballShadow) {
          ballShadow.style.left = `${point.x * 100}%`;
          ballShadow.style.top = `${Math.min(.96, point.y + .028) * 100}%`;
          ballShadow.style.opacity = String(.34 - raw * .18);
          ballShadow.style.transform = ballTransform(Math.max(.25, scale * .56));
        }
        if (raw < 1) {
          state.collisionFrame = requestAnimationFrame(frame);
        } else {
          state.collisionFrame = 0;
          const finalDescriptor = saveContactDescriptor(saveType, target);
          const finalPoint = finalDescriptor.point || collisionPoint;
          setBallFrame(finalPoint, ballScaleAt(finalPoint, { saved: true }), .92, 1.08);
          resolve({ point: finalPoint, descriptor: finalDescriptor });
        }
      };
      state.collisionFrame = requestAnimationFrame(frame);
    });
  }

  async function secureCatch(target, descriptor, duration = 520) {
    const leftGlove = keeper.querySelector('.keeper-glove-left');
    const rightGlove = keeper.querySelector('.keeper-glove-right');
    [leftGlove, rightGlove].forEach((glove, index) => glove && animateElement(glove, [
      { transform: getComputedStyle(glove).transform === 'none' ? 'translate(0,0) scale(1.06)' : getComputedStyle(glove).transform },
      { transform: `translate(${index ? -4 : 4}px,2px) rotate(${index ? -7 : 7}deg) scale(1.08)`, offset: .34 },
      { transform: `translate(${index ? -7 : 7}px,5px) rotate(${index ? -11 : 11}deg) scale(1.03)` },
    ], { duration, easing: 'cubic-bezier(.18,.72,.22,1)' }));
    const started = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const progress = clamp((now - started) / duration, 0, 1);
        const live = saveContactDescriptor('CATCH', target).point || descriptor.point;
        const chest = elementStagePoint(keeper.querySelector('.keeper-shirt'), .5, .66) || live;
        const tuck = progress * progress * (3 - 2 * progress);
        const point = { x: live.x + (chest.x - live.x) * tuck * .68, y: live.y + (chest.y - live.y) * tuck * .68 };
        setBallFrame(point, ballScaleAt(point, { saved: true }) * (1 - .08 * tuck));
        if (progress < 1) state.collisionFrame = requestAnimationFrame(frame);
        else { state.collisionFrame = 0; resolve(); }
      };
      state.collisionFrame = requestAnimationFrame(frame);
    });
  }

  async function animateSavedShot(target, duration, saveType, divePoint = null, shotType = 'driven', { silentKick = false, from = null, hapticEnabled = true } = {}) {
    if (!silentKick) sound('kick');
    const collision = await animateBallToLiveContact(target, Math.max(300, duration * .72), saveType, divePoint, from || ballStart);
    const contact = collision.point;
    showSaveImpact(contact, saveType);
    recoilSavePart(collision.descriptor, saveType, target);
    sound(saveType === 'CATCH' ? 'catch' : saveType === 'LEG SAVE' ? 'save' : 'gloves');
    if (hapticEnabled) haptic(saveType === 'BLOCKED' || saveType === 'LEG SAVE' ? [24, 24, 30] : [16, 26, 22]);
    await sleep(reducedMotion() ? 55 : 110);
    if (saveType === 'CATCH') await secureCatch(target, collision.descriptor);
    else await animateDeflection(contact, saveType)?.finished.catch(() => {});
    stage.classList.remove('contact-armed');
    keeper.querySelectorAll('.active-save-part').forEach((part) => part.classList.remove('active-save-part'));
    return contact;
  }

  function animateDeflection(target, saveType) {
    const direction = target.x < 0.47 ? -1 : target.x > 0.53 ? 1 : (state.userDive?.rawX || .5) < .5 ? -1 : 1;
    const point = target;
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
    if (!["CATCH", "FINGERTIP SAVE"].includes(saveType)) return false;

    // A replay must own the keeper and ball animations. Incrementing the sequence
    // invalidates the recovery timer from the live save so it cannot reset the
    // goalkeeper halfway through the replay.
    const replayToken = ++state.sequence;
    if (state.collisionFrame) cancelAnimationFrame(state.collisionFrame);
    state.collisionFrame = 0;
    window.clearTimeout(state.standingSaveTimer);
    state.standingSaveTimer = 0;

    [ball, ballShadow, keeper].forEach((element) => {
      element?.getAnimations().forEach((animation) => {
        try { animation.cancel(); } catch {}
      });
    });
    keeper.querySelectorAll(".keeper-arm,.keeper-lower-arm,.keeper-leg,.keeper-lower-leg,.keeper-body-group,.keeper-head-group").forEach((part) => {
      part.getAnimations().forEach((animation) => {
        try { animation.cancel(); } catch {}
      });
      part.style.transform = "";
    });

    stage.classList.remove("save-celebration");
    stage.classList.add("save-replay");
    showDecision("SLOW REPLAY", "save");
    positionKeeperOnLine();

    const intended = stagePoint(target);
    const start = {
      x: ballStart.x + (intended.x - ballStart.x) * .30,
      y: ballStart.y + (intended.y - ballStart.y) * .30,
    };
    setBallFrame(start, ballScaleAt(start, { saved: false }));
    if (ballShadow) {
      ballShadow.style.left = `${start.x * 100}%`;
      ballShadow.style.top = `${Math.min(.96, start.y + .03) * 100}%`;
      ballShadow.style.opacity = ".35";
      ballShadow.style.transform = ballTransform(.55);
    }

    await sleep(reducedMotion() ? 70 : 180);
    if (replayToken !== state.sequence) return false;

    const replayDuration = reducedMotion() ? 420 : 1080;
    animateKeeperDive(divePoint || target, replayDuration, true);
    await animateSavedShot(target, replayDuration, saveType, divePoint, "driven", {
      silentKick: true,
      from: start,
      hapticEnabled: false,
    });
    await sleep(reducedMotion() ? 90 : 260);

    // Invalidate the replay dive's scheduled recovery before restoring the result.
    if (replayToken === state.sequence) state.sequence += 1;
    stage.classList.remove("save-replay");
    showDecision(saveType, "save");
    return true;
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
    const pointHeight = point.y < .34 ? -1 : point.y > .66 ? 1 : 0;
    const targetHeight = target.y < .34 ? -1 : target.y > .66 ? 1 : 0;
    const sameHeight = pointHeight === targetHeight;
    const adjacentHeight = Math.abs(pointHeight - targetHeight) === 1;
    const horizontalAssist = settings.diveAssist;
    const verticalAssist = sameHeight ? settings.diveAssist : adjacentHeight ? settings.diveAssist * .18 : 0;
    return {
      x: clamp(point.x + (target.x - point.x) * horizontalAssist, .015, .985),
      y: clamp(point.y + (target.y - point.y) * verticalAssist, .02, .98),
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
    const duration = reducedMotion() ? 190 : dramatic ? 2850 : 2500 + routineIndex * 70;
    const settlePause = reducedMotion() ? 30 : 520;
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
    const pickupX = 57.5 + sideBias;
    const pickupY = 75.5;
    taker.style.left = `${56.5 + sideBias}%`;
    taker.style.top = mobilePenaltyLayout() ? "60%" : "49%";
    ball.style.left = `${pickupX}%`;
    ball.style.top = `${pickupY}%`;
    ball.style.transform = "translate(-50%,-50%) scale(.96)";
    if (ballShadow) { ballShadow.style.left = `${pickupX}%`; ballShadow.style.top = `${pickupY + 1.2}%`; ballShadow.style.opacity = ".52"; }

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
      { left: `${pickupX}%`, top: `${pickupY}%`, transform: "translate(-50%,-50%) scale(.96) rotate(0deg)" },
      { left: `${pickupX}%`, top: `${pickupY - 1.2}%`, transform: "translate(-50%,-50%) scale(.94) rotate(8deg)", offset: .11 },
      { left: `${carryX}%`, top: `${carryY}%`, transform: "translate(-50%,-50%) scale(.72) rotate(18deg)", offset: .27 },
      { left: `${53 + sideBias * .3}%`, top: "66%", transform: `translate(-50%,-50%) scale(.84) rotate(${settleRotation * .35}deg)`, offset: .48 },
      { left: `${adjustX}%`, top: `${adjustY}%`, transform: `translate(-50%,-50%) scale(1) rotate(${settleRotation}deg)`, offset: .68 },
      { left: `${routineIndex === 1 ? 50.35 : routineIndex === 3 ? 49.75 : 50}%`, top: "77%", transform: `translate(-50%,-50%) scale(${routineIndex === 4 ? .985 : 1}) rotate(${settleRotation + (routineIndex === 1 ? 26 : routineIndex === 3 ? -18 : 6)}deg)`, offset: .82 },
      { left: `${ballStart.x * 100}%`, top: `${ballStart.y * 100}%`, transform: `translate(-50%,-50%) scale(1) rotate(${settleRotation + 8}deg)` },
    ], { duration, easing: "cubic-bezier(.18,.58,.22,1)" });
    if (ballShadow) animateElement(ballShadow, [
      { left: `${pickupX}%`, top: `${pickupY + 1.2}%`, opacity: .52, transform: "translate(-50%,-50%) scale(.85)" },
      { left: `${carryX}%`, top: "70%", opacity: .12, transform: "translate(-50%,-50%) scale(.44)", offset: .27 },
      { left: `${ballStart.x * 100}%`, top: `${(ballStart.y + .012) * 100}%`, opacity: .7, transform: "translate(-50%,-50%) scale(1)" },
    ], { duration });
    await sleep(duration);
    if (token !== state.sequence) return false;

    // Commit the ball to the spot before the player retreats. This prevents the
    // completed placement animation from being disturbed by the next sequence.
    ball.style.left = `${ballStart.x * 100}%`;
    ball.style.top = `${ballStart.y * 100}%`;
    ball.style.transform = `translate(-50%,-50%) scale(1) rotate(${settleRotation + 8}deg)`;
    ball.getAnimations().forEach((animation) => animation.cancel());
    if (ballShadow) {
      ballShadow.style.left = `${ballStart.x * 100}%`;
      ballShadow.style.top = `${(ballStart.y + .012) * 100}%`;
      ballShadow.style.opacity = ".7";
      ballShadow.style.transform = "translate(-50%,-50%) scale(1)";
      ballShadow.getAnimations().forEach((animation) => animation.cancel());
    }
    taker.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    taker.querySelectorAll(".taker-root,.taker-arm,.taker-lower-arm,.taker-leg,.taker-lower-leg").forEach((part) => { part.style.transform = ""; });
    stage.classList.remove("placing-ball", "placement-1", "placement-2", "placement-3", "placement-4", "placement-5");

    if (mobilePenaltyLayout()) {
      const retreatDuration = reducedMotion() ? 120 : 900;
      const readyTop = mobileReadyTopPx();
      const currentTop = stage.clientHeight * .60;
      stage.classList.add("taker-retreating");
      const readyLeft = mobileReadyLeftPercent();
      setStatus("The taker steps back", "He settles clearly behind the ball before beginning the run-up.");
      const retreat = animateElement(taker, [
        { left: `${56.5 + sideBias}%`, top: `${currentTop}px`, transform: "translate(-50%,0) scale(.99)" },
        { left: `${53.5 + sideBias * .35}%`, top: `${currentTop + (readyTop-currentTop) * .34}px`, transform: "translate(-50%,2px) scale(.985)", offset: .32 },
        { left: `${readyLeft + .7}%`, top: `${currentTop + (readyTop-currentTop) * .72}px`, transform: "translate(-50%,0) scale(.98)", offset: .68 },
        { left: `${readyLeft}%`, top: `${readyTop}px`, transform: "translate(-50%,0) scale(1)" },
      ], { duration: retreatDuration, easing: "cubic-bezier(.25,.5,.22,1)" });
      if (leftLeg) animateElement(leftLeg, [
        { transform:"rotate(0deg)" }, { transform:"rotate(-10deg)", offset:.28 }, { transform:"rotate(9deg)", offset:.58 }, { transform:"rotate(0deg)" },
      ], { duration: retreatDuration });
      if (rightLeg) animateElement(rightLeg, [
        { transform:"rotate(0deg)" }, { transform:"rotate(10deg)", offset:.28 }, { transform:"rotate(-9deg)", offset:.58 }, { transform:"rotate(0deg)" },
      ], { duration: retreatDuration });
      await retreat?.finished.catch(() => {});
      if (token !== state.sequence) return false;
      taker.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      taker.querySelectorAll(".taker-root,.taker-arm,.taker-lower-arm,.taker-leg,.taker-lower-leg").forEach((part) => { part.style.transform = ""; });
      setTakerReadyPosition();
      stage.classList.remove("taker-retreating");
      await sleep(settlePause);
    } else {
      setTakerReadyPosition();
      await sleep(settlePause);
    }
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
    const duration = reducedMotion() ? 170 : (state.palaceKicks === 0 ? 980 : 820);

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
    const duration = reducedMotion() ? 140 : variant === 1 ? 690 : 620;
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

  function refreshBottleNotes() {
    const directions = shuffled(['L', 'C', 'R']);
    ['bottleNote1', 'bottleNote2', 'bottleNote3'].forEach((id, index) => {
      const note = $(id);
      if (note) note.textContent = `${index + 1} · ${directions[index]}`;
    });
  }


  async function keeperBottleRoutine(token) {
    if (!keeperBottle) return keeperSettleRoutine(token);
    positionKeeperOnLine();
    refreshBottleNotes();
    const stageRect = stage.getBoundingClientRect();
    const keeperRect = keeper.getBoundingClientRect();
    const bottleRect = keeperBottle.getBoundingClientRect();
    const delta = bottleRect.left + bottleRect.width * .5 - (keeperRect.left + keeperRect.width * .5) + Math.max(10, keeperRect.width * .18);
    const duration = reducedMotion() ? 260 : (state.palaceKicks === 0 ? 1650 : 760);
    const body = keeper.querySelector('.keeper-body-group');
    const head = keeper.querySelector('.keeper-head-group');
    const leftArm = keeper.querySelector('.keeper-arm-left');
    const rightArm = keeper.querySelector('.keeper-arm-right');
    stage.classList.add('bottle-reading');
    keeperBottle.classList.add('is-read');
    setStatus('Verbruggen reads his penalty notes', 'He walks to the bottle, studies the notes, then returns to the centre of the goal line.');
    animateElement(keeper, [
      { transform: 'translateX(-50%) translate(0,0) scale(1)' },
      { transform: `translateX(-50%) translate(${delta * .55}px,2px) scale(1)`, offset: .14 },
      { transform: `translateX(-50%) translate(${delta}px,5px) scale(.99)`, offset: .25 },
      { transform: `translateX(-50%) translate(${delta}px,11px) scale(.98,.92)`, offset: .30 },
      { transform: `translateX(-50%) translate(${delta}px,11px) scale(.98,.92)`, offset: .76 },
      { transform: `translateX(-50%) translate(${delta}px,2px) scale(1)`, offset: .81 },
      { transform: `translateX(-50%) translate(${delta * .48}px,0) scale(1)`, offset: .9 },
      { transform: 'translateX(-50%) translate(0,0) scale(1)' },
    ], { duration, easing: 'cubic-bezier(.2,.58,.22,1)' });
    if (body) animateElement(body, [
      { transform: 'rotate(0deg) translateY(0)' },
      { transform: 'rotate(-5deg) translateY(0)', offset: .25 },
      { transform: 'rotate(-14deg) translateY(7px)', offset: .32 },
      { transform: 'rotate(-14deg) translateY(7px)', offset: .75 },
      { transform: 'rotate(0deg) translateY(0)' },
    ], { duration });
    if (head) animateElement(head, [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-10deg)', offset: .3 },
      { transform: 'rotate(-24deg) translateY(2px)', offset: .34 },
      { transform: 'rotate(-24deg) translateY(2px)', offset: .74 },
      { transform: 'rotate(7deg)', offset: .86 },
      { transform: 'rotate(0deg)' },
    ], { duration });
    if (leftArm) animateElement(leftArm, [{ transform:'rotate(0deg)' }, { transform:'rotate(-22deg)', offset:.34 }, { transform:'rotate(-46deg)', offset:.48 }, { transform:'rotate(-46deg)', offset:.69 }, { transform:'rotate(0deg)' }], { duration });
    if (rightArm) animateElement(rightArm, [{ transform:'rotate(0deg)' }, { transform:'rotate(18deg)', offset:.34 }, { transform:'rotate(34deg)', offset:.48 }, { transform:'rotate(34deg)', offset:.69 }, { transform:'rotate(0deg)' }], { duration });
    // The bottle remains fixed beside the post; only the goalkeeper moves.
    await sleep(duration);
    stage.classList.remove('bottle-reading');
    keeperBottle.classList.remove('is-read');
    if (token !== state.sequence) return false;
    positionKeeperOnLine();
    return true;
  }


  async function keeperRoutine(kind, token) {
    if (kind !== "palace") return keeperSettleRoutine(token);
    const kick = state.palaceKicks;
    if (kick === 0) {
      if (!(await keeperBottleRoutine(token))) return false;
      if (token !== state.sequence) return false;
      setStatus("Verbruggen checks the frame", "He touches the crossbar and settles on the line.");
      if (!(await keeperBarTouchRoutine(kind, token))) return false;
      return keeperSettleRoutine(token);
    }
    const variation = kick % 3;
    if (variation === 1) {
      setStatus("Verbruggen stays active", "A short bounce and glove adjustment before the whistle.");
      return keeperSettleRoutine(token);
    }
    if (variation === 2) {
      setStatus("Verbruggen checks the frame", "A quick crossbar touch, then back to the centre.");
      if (!(await keeperBarTouchRoutine(kind, token))) return false;
      return keeperSettleRoutine(token);
    }
    if (!(await keeperBottleRoutine(token))) return false;
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
    setStatus("The ball is set", side === "albion" ? "The referee checks the spot and the Palace goalkeeper." : "Verbruggen reads his notes, checks the crossbar and returns to the goal line.");
    if (!(await animateBallPlacement(side, token))) return false;
    setStatus("Referee checks the penalty", side === "albion" ? "The Palace goalkeeper stays on the line." : "Verbruggen finishes his routine, returns to the line and faces the taker.");
    const ok = await Promise.all([keeperRoutine(side, token), refereeCheck(token)]);
    if (token !== state.sequence || ok.includes(false)) return false;
    if (side === "albion") {
      sound("whistle");
      await sleep(reducedMotion() ? 70 : 180);
    }
    return token === state.sequence;
  }

  function resultDecision() {
    const regulation = state.albionKicks < 5 || state.palaceKicks < 5;
    const albionLeft = Math.max(0, 5 - state.albionKicks);
    const palaceLeft = Math.max(0, 5 - state.palaceKicks);
    if (regulation) {
      if (state.albionGoals > state.palaceGoals + palaceLeft) return { finished: true, albionWon: true };
      if (state.palaceGoals > state.albionGoals + albionLeft) return { finished: true, albionWon: false };
      return { finished: false, albionWon: false };
    }
    // Sudden death can finish only after both sides have taken the same number of kicks.
    if (state.albionKicks === state.palaceKicks && state.albionGoals !== state.palaceGoals) {
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
    $("keyboardHint")?.removeAttribute("hidden");
    if (panenka) panenka.disabled = true;
    panenka.closest(".shot-style-controls")?.setAttribute("hidden", "");
    const player = takerAt("albion", state.albionKicks);
    applyTakerPose(player, state.albionKicks);
    $("penaltyTakerName").textContent = `${player.name} · ${player.foot === "left" ? "left-footed" : "right-footed"}`;
    $("penaltyShirt").textContent = player.number ? String(player.number) : "";
    $("turnBadge").textContent = "ALBION PENALTY";
    $("turnBadge").className = "turn-badge albion-turn";
    $("stageInstruction").textContent = "Wait for the whistle";
    stage.setAttribute("aria-label", "Albion penalty. Wait for the referee, then drag or move inside the goal and release to shoot.");
    renderScore();
    state.aim = { x: 0.5, y: 0.5 };
    setReticle(0.5, 0.5);
    reticle.hidden = true;
    if (!(await preKickCeremony("albion", token))) return;
    state.phase = "albion-aim";
    setReticle(0.5, 0.5);
    reticle.hidden = false;
    state.locked = false;
    stage.classList.add("is-aiming");
    stage.classList.remove("is-locked", "crowd-hush");
    if (panenka) {
      const showBonus = state.albionKicks >= 2;
      panenka.disabled = !showBonus;
      panenka.closest(".shot-style-controls")?.toggleAttribute("hidden", !showBonus);
    }
    $("stageInstruction").textContent = "Drag to aim, release to shoot";
    setStatus("Pick your spot", "Aim up to 5% beyond the posts or crossbar, but outside placement can miss.");
  }

  function preparePalaceKick() {
    ++state.sequence;
  
  resetVisuals();
    keeper.classList.remove("opposition-keeper");
    stage.classList.add("palace-kick", "is-waiting");
    state.phase = "palace-ready";
    state.locked = true;
    state.reactionOpen = false;
    state.aim = { x: 0.5, y: 0.5 };
    reticle.hidden = true;
    readyPanel.hidden = false;
    if (panenka) panenka.disabled = true;
    panenka.closest(".shot-style-controls")?.setAttribute("hidden", "");
    const player = takerAt("palace", state.palaceKicks);
    applyTakerPose(player, state.palaceKicks + 20);
    $("penaltyTakerName").textContent = `${player.name} · ${player.foot === "left" ? "left-footed" : "right-footed"}`;
    $("penaltyShirt").textContent = String(player.number || "PAL");
    $("turnBadge").textContent = "PALACE PENALTY · YOU ARE VERBRUGGEN";
    $("turnBadge").className = "turn-badge palace-turn";
    $("stageInstruction").textContent = "Press READY TO SAVE";
    stage.setAttribute("aria-label", "Palace penalty. Press Ready, read the run-up, then move the mouse, swipe, click or tap towards the shot.");
    setStatus("YOU ARE VERBRUGGEN", "Press READY, then swipe or tap towards the shot. Stay central for the middle.");
    readyButton.textContent = "READY TO SAVE";
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
    if (!target) return null;
    const outsideLeft = target.x < 0;
    const outsideRight = target.x > 1;
    const outsideHigh = target.y < 0;
    if (!outsideLeft && !outsideRight && !outsideHigh) return null;
    const levelWithGoal = target.y >= -FRAME_CONTACT_MARGIN && target.y <= 1;
    const betweenPosts = target.x >= -FRAME_CONTACT_MARGIN && target.x <= 1 + FRAME_CONTACT_MARGIN;
    const clipsPost = levelWithGoal && (
      (outsideLeft && target.x >= -FRAME_CONTACT_MARGIN) ||
      (outsideRight && target.x <= 1 + FRAME_CONTACT_MARGIN)
    );
    const clipsCrossbar = outsideHigh && target.y >= -FRAME_CONTACT_MARGIN && betweenPosts;
    return clipsPost || clipsCrossbar ? "woodwork" : "miss";
  }

  async function takeAlbionPenalty(aim) {
    if (state.phase !== "albion-aim" || state.locked || state.finished) return;
    ensureAudio();
    if (tutorial && !tutorial.hidden) { tutorial.hidden = true; localStorage.setItem("albionShootoutTutorial", "done"); }
    const token = state.sequence;
    state.locked = true;
    state.phase = "albion-run";
    stage.classList.remove("is-aiming");
    stage.classList.add("is-locked", "crowd-hush");
    panenka.disabled = true;
    const settings = config();
    const player = takerAt("albion", state.albionKicks);
    applyTakerPose(player, state.albionKicks);
    const isPanenka=state.shotStyle==="panenka",mechanics=shotMechanics(aim,player),userPower=isPanenka?.56:mechanics.userPower,selectedStyle=isPanenka?"panenka":mechanics.shotType;if(isPanenka)state.panenkaAttempts+=1;
    const runProfile = chooseRunUpProfile(player.foot, player.style);
    setApproachLabel(player.foot, runProfile);
    setStatus(`${player.name} begins the run-up`, `${runUpLabel(player.foot, runProfile)}. ${isPanenka ? "A disguised central chip." : "The goalkeeper stays on the line until contact."}`);
    const run = animateRunUp(false, player.foot, aim, player.style, runProfile);
    await sleep(reducedMotion() ? 100 : Math.max(390, run.duration * (mobilePenaltyLayout() ? .90 : .84)));
    if (token !== state.sequence) return;

    const edge = Math.max(Math.abs(aim.x - .5), Math.abs(aim.y - .5));
    const playerAccuracy = player.accuracy ?? .75;
    const styleSpread=isPanenka?1:mechanics.spreadMultiplier;
    const powerSpread=userPower>.93?1+(userPower-.93)*2.1:userPower<.58?1.08:1;
    const spread=settings.shotSpread*(1+edge*1.75)*(1.18-playerAccuracy*.24)*styleSpread*powerSpread;
    const aimedTarget = nudgeShotDifficulty(aim);
    const resolved = isPanenka
      ? { x: clamp(.5 + gaussian() * .024, .43, .57), y: clamp(.61 + gaussian() * .024, .52, .68) }
      : { x: aimedTarget.x + gaussian() * spread, y: aimedTarget.y + gaussian() * spread };
    const frameResult = classifyFrame(resolved);
    const shotType = isPanenka ? "panenka" : selectedStyle;
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
    // r28: reduced keeper-read rescue and reach make scoring approximately 10% easier than r27 while preserving skill-based placement.
    const extraReadChance=settings.scoringDifficultyIncrease*(1.08-userPower*.38)*(selectedStyle==="placed"?1:.78);
    const extraRead = !frameResult && !saved && Math.random() < extraReadChance;
    if (extraRead) {
      saved = true;
      keeperGuess.x = clamp(resolved.x + gaussian() * .025, .035, .965);
      keeperGuess.y = clamp(resolved.y + gaussian() * .025, .05, .95);
    }
    const scored = !frameResult && !saved;
    const cleanHold = userPower < .72 && (distance < settings.keeperReach * .48 || (centralPenalty && extraRead));
    const saveType = cleanHold ? "CATCH" : extraRead && resolved.y < .42 ? "FINGERTIP SAVE" : userPower > .88 ? "PARRIED" : "BLOCKED";

    const playerPower = player.power ?? .76;
    const effectivePower = clamp(playerPower * .56 + userPower * .44 + (selectedStyle === "driven" ? .06 : selectedStyle === "placed" ? -.03 : -.16), .46, 1);
    const flightDuration = Math.round(settings.flight * (1.13 - effectivePower * .24));
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
      setStatus("Goal for Brighton",isPanenka?"The keeper commits and the chip drops centrally.":resolved.x<.3||resolved.x>.7?"Excellent placement beyond the goalkeeper.":userPower>.84?"The pace beats the goalkeeper.":"The goalkeeper is sent the wrong way.");
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
      const missLabel = resolved.y < 0 ? "OVER!" : "WIDE!";
      showDecision(missLabel, "miss");
      $("stageInstruction").textContent = resolved.y < 0 ? "Over the crossbar" : "Wide of the goal";
      setStatus("Missed", resolved.y < 0 ? "The shot clears the crossbar." : "The shot passes outside the post.");
      sound("gasp");
    }

    setShotStyle("normal");
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
    $("keyboardHint")?.setAttribute("hidden", "");
    $("stageInstruction").textContent = "Watch the run-up";
    setStatus("Watch the run-up", "React only as the Palace player reaches the ball.");
    reticle.hidden = true;
    state.phase = "palace-prep";
    state.locked = true;
    state.userDive = null;
    state.reactionOpen = false;
    state.pointerStart = null;
    state.pointerLast = null;
    state.activePointerId = null;
    state.pendingDive = null;
    if (keeperChoiceMarker) keeperChoiceMarker.hidden = true;
    stage.removeAttribute("data-save-choice");
    stage.classList.remove("is-waiting");
    stage.classList.add("is-locked", "palace-kick");
    const player = takerAt("palace", state.palaceKicks);
    applyTakerPose(player, state.palaceKicks + 20);
    const plan = randomPalaceTarget();
    state.palaceTarget = plan.target;
    state.palaceMiss = plan.miss;
    if (!(await preKickCeremony("palace", token))) return;
    sound("whistle");
    await sleep(reducedMotion() ? 70 : 180);
    if (token !== state.sequence) return;

    const settings = config();
    const runDuration = Math.round(player.delay * settings.runUpScale);
    state.phase = "palace-run";
    const runProfile = chooseRunUpProfile(player.foot, player.style || "direct");
    setApproachLabel(player.foot, runProfile);
    setStatus("Palace begin the run-up",`${runUpLabel(player.foot,runProfile)}. ${runUpClue(state.palaceTarget,player.foot,runProfile)}`);
    const run = animateRunUp(true, player.foot, state.palaceTarget, player.style || "direct", runProfile);
    const actualRun = Math.max(runDuration, run.duration);
    const waitBeforeWindow = Math.max(80, actualRun - settings.preContactWindow);
    await sleep(reducedMotion() ? 80 : waitBeforeWindow);
    if (token !== state.sequence || state.phase !== "palace-run") return;

    $("stageInstruction").textContent = "Get ready";
    setStatus("Final stride", "Read the body shape. Your save input opens at ball contact.");
    await sleep(reducedMotion() ? 45 : settings.preContactWindow);
    if (token !== state.sequence || state.phase !== "palace-run") return;

    state.phase = "save";
    state.reactionOpen = true;
    state.contactAt = performance.now();
    state.pointerStart = null;
    state.pointerLast = null;
    stage.classList.remove("is-locked");
    stage.classList.add("is-save-window");
    cue.hidden = false;
    $("stageInstruction").textContent = matchMedia(MOBILE_PENALTY_QUERY).matches ? "React now — swipe or hold centre" : "React now — move or swipe towards the shot";
    setStatus("React now", "Commit to the side and height. Hold the centre for a central penalty.");
    window.setTimeout(() => { cue.hidden = true; }, reducedMotion() ? 150 : 420);
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
    const approachDuration = reducedMotion() ? 80 : settings.contactDecisionDelay;
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
      const targetHeight = state.palaceTarget.y < .34 ? -1 : state.palaceTarget.y > .66 ? 1 : 0;
      const diveHeight = state.userDive.rawY < .34 ? -1 : state.userDive.rawY > .66 ? 1 : 0;
      const sameHeight = targetHeight === diveHeight;
      if (sameSide) radius += settings.sameSideBonus;
      if (sameSide && sameHeight) radius += .105;
      else if (sameSide && Math.abs(targetHeight - diveHeight) >= 2) radius -= .16;
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
      showDecision(saveType, "save");
      const timingText = reactionLabel(state.userDive);
      $("stageInstruction").textContent = "Saved by Verbruggen";
      setStatus("Verbruggen saves", `${timingText} · ${state.userDive?.zone || "committed save"} · ${saveType.toLowerCase()}.`);
      window.setTimeout(() => sound("albionCheer"), 90);
      await exceptionalSaveReplay(state.palaceTarget, saveType, state.userDive);
      keeperCelebration();
      takerReaction(false, "palace");
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

  function saveZoneName(point) {
    const horizontal = point.x < .34 ? "left" : point.x > .66 ? "right" : "centre";
    const vertical = point.y < .34 ? "high" : point.y > .66 ? "low" : "middle";
    return horizontal === "centre" && vertical === "middle" ? "Stay centre" : `${vertical} ${horizontal}`;
  }

  function showKeeperChoice(point, source = "choice") {
    if (!keeperChoiceMarker || !point) return;
    syncGoalBox();
    keeperChoiceMarker.hidden = false;
    keeperChoiceMarker.textContent = saveZoneName(point);
    keeperChoiceMarker.style.left = `${(goalBox.left + point.x * goalBox.width) * 100}%`;
    keeperChoiceMarker.style.top = `${(goalBox.top + point.y * goalBox.height) * 100}%`;
    keeperChoiceMarker.dataset.source = source;
    stage.dataset.saveChoice = saveZoneName(point).replace(/\s+/g,"-").toLowerCase();
  }

  function previewKeeper(point) {
    if (state.phase !== "save" || state.userDive) return;
    showKeeperChoice(point, state.phase === "save" ? "live" : "anticipated");
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
        const chosenHeight = point.y < .34 ? -1 : point.y > .66 ? 1 : 0;
        const targetHeight = state.palaceTarget.y < .34 ? -1 : state.palaceTarget.y > .66 ? 1 : 0;
        assisted = {
          x: clamp(assisted.x + (state.palaceTarget.x - assisted.x) * .18, .015, .985),
          y: clamp(assisted.y + (state.palaceTarget.y - assisted.y) * (chosenHeight === targetHeight ? .12 : 0), .02, .98),
        };
      }
    }
    state.userDive = { x: assisted.x, y: assisted.y, rawX: point.x, rawY: point.y, timing, source, zone: saveZoneName(point) };
    showKeeperChoice(point, source);
    state.reactionTimes.push(Math.max(0, timing));
    state.userDive.label = reactionLabel(state.userDive);
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
      <p>${state.catches ? `${state.catches} clean ${state.catches === 1 ? "catch" : "catches"}. ` : ""}${state.fingertips ? `${state.fingertips} fingertip ${state.fingertips === 1 ? "save" : "saves"}. ` : ""}${state.panenkaAttempts ? `${state.panenkaGoals}/${state.panenkaAttempts} Panenkas scored.` : ""}</p>
      <button id="retakeShootoutFinal" class="retake-shootout-final" type="button">RETAKE SHOOT-OUT</button>`;

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
    collisionFrame: 0,
      saveResolutionLocked: false,
      shotStyle: "normal",
    aimGesture: { distance: 0, duration: 0, speed: 0.42 },
      ceremonySkip: false,
      albionOrder: shuffledIndexes(albionTakers.length),
      palaceOrder: shuffledIndexes(palaceTakers.length),
    });
    summary.hidden = true;
    summary.innerHTML = "";
    shareButton.hidden = true;
    if (celebrationPlayers) celebrationPlayers.hidden = true;
    if (confetti) confetti.hidden = true;
    resetCrowd();
    setShotStyle("normal");
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
    return touchLike ? { x: point.x, y: clamp(point.y - .075, -AIM_MARGIN, .995) } : point;
  }

  window.addEventListener("pagehide", () => {
    if (state.collisionFrame) cancelAnimationFrame(state.collisionFrame);
    state.collisionFrame = 0;
    clearPointerTracking();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (state.collisionFrame) cancelAnimationFrame(state.collisionFrame);
      state.collisionFrame = 0;
      clearPointerTracking();
    }
  });

  stage.addEventListener("pointermove", (event) => {
    const keeperPreparing = state.phase === "palace-prep" || state.phase === "palace-run";
    if (state.phase !== "albion-aim" && state.phase !== "save" && !keeperPreparing) return;
    const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
    const point = eventGoalPoint(event, touchLike ? AIM_MARGIN : AIM_MARGIN);

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
        $("stageInstruction").textContent = "Wait for React now";
        setStatus("Too early", "Read the run-up, then commit when React now appears.");
      }
      return;
    }

    if (state.phase !== "save" || !state.reactionOpen || state.userDive) return;
    const threshold = touchLike ? Math.max(18, stage.clientWidth * .035) : Math.max(10, stage.clientWidth * .018);
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
    const point = eventGoalPoint(event, touchLike ? AIM_MARGIN : AIM_MARGIN);
    const savingPhase = state.phase === "save";
    if (state.phase === "albion-aim" && !point.inside) return;
    if (!savingPhase && state.phase !== "albion-aim") {
      if (state.phase === "palace-prep" || state.phase === "palace-run") {
        event.preventDefault();
        $("stageInstruction").textContent = "Wait for React now";
        setStatus("Hold your position", "The save window opens at ball contact.");
      }
      return;
    }
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
    }
  }, { passive: false });

  stage.addEventListener("pointerup", (event) => {
    const hadTracking = Boolean(state.pointerStart);
    const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
    const point = eventGoalPoint(event, AIM_MARGIN);
    const distance = pointerDistance(state.pointerStart, event);
    const fallbackPoint = mobileTapGoalPoint(event);
    const swipePoint = touchLike
      ? distance <= 8 ? fallbackPoint : distance < Math.max(18, stage.clientWidth * .035) ? { x: .5, y: .58 } : swipeGoalPoint(state.pointerStart, event, fallbackPoint)
      : fallbackPoint;

    if (state.phase === "albion-aim" && state.aimPointerActive) {
      event.preventDefault();
      const aimPoint = aimPointForPointer(point, touchLike);
      setReticle(aimPoint.x, aimPoint.y);
      const minimumDrag = touchLike ? Math.max(8, stage.clientWidth * AIM_DRAG_TOUCH_RATIO) : AIM_DRAG_MOUSE_PX;
      if (distance < minimumDrag) {
        clearPointerTracking();
        $("stageInstruction").textContent = "Drag slightly, then release to shoot";
        setStatus("Aim selected", "Make a short deliberate drag to take the penalty.");
        return;
      }
      const shot = { ...state.aim };
      state.aimGesture = captureAimGesture(state.pointerStart, { clientX:event.clientX, clientY:event.clientY, time:performance.now() });
      clearPointerTracking();
      takeAlbionPenalty(shot);
      return;
    }
    if (state.phase === "palace-prep" || state.phase === "palace-run") {
      event.preventDefault();
      $("stageInstruction").textContent = "Wait for React now";
      setStatus("Hold your position", "The save window opens at ball contact.");
    } else if (state.phase === "save" && state.reactionOpen && !state.userDive) {
      event.preventDefault();
      takeUserDive(swipePoint, distance > 18 ? (touchLike ? "swipe" : "mouse-flick") : (touchLike ? "tap" : "click"));
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
    const savingPhase = state.phase === "save";
    if (state.phase !== "albion-aim" && !savingPhase) return;
    const touch = event.touches[0];
    if (!touch) return;
    const point = eventGoalPoint(touch, AIM_MARGIN);
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
    const point = eventGoalPoint(touch, AIM_MARGIN);
    if (state.phase === "albion-aim") setReticle(point.x, point.y);
    else if (state.phase === "save" && state.reactionOpen && !state.userDive) {
      const distance = Math.hypot(touch.clientX - fallbackTouchStart.clientX, touch.clientY - fallbackTouchStart.clientY);
      const mapped = distance > 18 ? swipeGoalPoint(fallbackTouchStart, touch, mobileTapGoalPoint(touch)) : mobileTapGoalPoint(touch);
      previewKeeper(mapped);
      if (distance >= 18) takeUserDive(mapped, "swipe");
    }
  }, { passive: false });

  stage.addEventListener("touchend", (event) => {
    if (window.PointerEvent || !fallbackTouchStart) return;
    const touch = event.changedTouches[0];
    if (touch) {
      const point = eventGoalPoint(touch, AIM_MARGIN);
      const distance = Math.hypot(touch.clientX - fallbackTouchStart.clientX, touch.clientY - fallbackTouchStart.clientY);
      const mapped = distance > 18 ? swipeGoalPoint(fallbackTouchStart, touch, mobileTapGoalPoint(touch)) : mobileTapGoalPoint(touch);
      if (state.phase === "albion-aim") {
        setReticle(point.x, point.y);
        const minimumDrag = Math.max(8, stage.clientWidth * AIM_DRAG_TOUCH_RATIO);
        if (distance >= minimumDrag) {
          state.aimGesture = captureAimGesture(fallbackTouchStart, { clientX:touch.clientX, clientY:touch.clientY, time:performance.now() });
          takeAlbionPenalty({ ...state.aim });
        } else {
          $("stageInstruction").textContent = "Drag slightly, then release to shoot";
          setStatus("Aim selected", "Make a short deliberate drag to take the penalty.");
        }
      } else if (state.phase === "save" && state.reactionOpen && !state.userDive) {
        takeUserDive(mapped, distance > 18 ? "swipe" : "tap");
      }
    }
    fallbackTouchStart = null;
    hideSwipeTrail();
  }, { passive: false });

  stage.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 0.06 : 0.025;
    let handled = true;
    if (event.key === "ArrowLeft") setReticle(state.aim.x - step, state.aim.y);
    else if (event.key === "ArrowRight") setReticle(state.aim.x + step, state.aim.y);
    else if (event.key === "ArrowUp") setReticle(state.aim.x, state.aim.y - step);
    else if (event.key === "ArrowDown") setReticle(state.aim.x, state.aim.y + step);
    else if (state.phase === "save" && ["1","2","3","4","5","6","7","8","9"].includes(event.key)) {
      const n=Number(event.key)-1, col=n%3, row=2-Math.floor(n/3);
      takeUserDive({x:[.17,.5,.83][col],y:[.18,.5,.82][row]},"keyboard-zone");
    } else if (event.key === "Enter" || event.key === " ") {
      if(state.phase==="albion-aim"){state.aimGesture={distance:0,duration:0,speed:.42};takeAlbionPenalty({...state.aim});}
      else if (state.phase === "save") takeUserDive({ ...state.aim }, "keyboard");
      else if (state.phase === "palace-ready") beginPalacePenalty();
    } else if (event.key.toLowerCase() === "p" && state.phase === "albion-aim" && !panenka?.closest(".shot-style-controls")?.hasAttribute("hidden")) setShotStyle(state.shotStyle === "panenka" ? "normal" : "panenka");
    else handled = false;
    if (handled) event.preventDefault();
  });


  // r27: unlock mobile Web Audio on the first genuine user gesture, before any whistle is requested.
  const primePenaltyAudio = () => {
    if (state.sound) unlockAudio();
  };
  document.addEventListener("pointerdown", primePenaltyAudio, { capture: true, once: true, passive: true });
  document.addEventListener("touchstart", primePenaltyAudio, { capture: true, once: true, passive: true });

  panenka?.addEventListener("click",()=>{if(state.phase!=="albion-aim")return;setShotStyle(state.shotStyle==="panenka"?"normal":"panenka")});
  if (tutorial && localStorage.getItem("albionShootoutTutorial") !== "done") tutorial.hidden = false;
  tutorialDismiss?.addEventListener("click", () => { if (tutorial) tutorial.hidden = true; localStorage.setItem("albionShootoutTutorial", "done"); });
  shootoutMenu?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-shootout-menu-action]")?.dataset.shootoutMenuAction;
    if (!action) return;
    if (action === "sound") soundButton.click();
    if (action === "restart") resetGame();
    if (action === "fullscreen") $("fullscreenShootout")?.click();
    shootoutMenu.removeAttribute("open");
  });

  readyButton.addEventListener("click", () => { unlockAudio(); beginPalacePenalty(); });
  $("resetShootout").addEventListener("click", resetGame);
  summary.addEventListener("click", (event) => {
    if (event.target?.id === "retakeShootoutFinal") resetGame();
  });



  window.addEventListener("albion:soundchange", (event) => {
    const detail = event.detail || {};
    state.sound = Boolean(detail.enabled);
    if (!state.sound) stopChant();
    chantAudio.volume = clamp(Number(detail.volume ?? .75), 0, 1) * .32;
    soundButton.textContent = state.sound ? "Sound on" : "Sound off";
    soundButton.setAttribute("aria-pressed", String(state.sound));
  });

  soundButton.addEventListener("click", () => {
    const turningOn = !state.sound;
    state.sound = turningOn;
    if (turningOn) unlockAudio();
    else stopChant();
    localStorage.setItem("albionSound", state.sound ? "on" : "off");
    window.dispatchEvent(new CustomEvent("albion:soundchange", { detail: { enabled: state.sound, volume: Number(localStorage.getItem("albionSoundVolume") || 75) / 100 } }));
    soundButton.textContent = state.sound ? "Sound on" : "Sound off";
    soundButton.setAttribute("aria-pressed", String(state.sound));
    if (state.sound) sound("kick");
  });

  const syncFullscreenButton = () => {
    const fallback = shootoutCard.classList.contains("fullscreen-fallback");
    const active = document.fullscreenElement === shootoutCard || fallback;
    $("fullscreenShootout").textContent = active ? "Exit full screen" : "Full-screen game";
    document.body.classList.toggle("shootout-fullscreen-open", active);
    window.setTimeout(positionKeeperOnLine, 80);
  };
  $("fullscreenShootout").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === shootoutCard) await document.exitFullscreen();
      else if (shootoutCard.classList.contains("fullscreen-fallback")) shootoutCard.classList.remove("fullscreen-fallback");
      else if (shootoutCard.requestFullscreen) await shootoutCard.requestFullscreen();
      else shootoutCard.classList.add("fullscreen-fallback");
    } catch { shootoutCard.classList.toggle("fullscreen-fallback"); }
    syncFullscreenButton();
  });
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shootoutCard.classList.contains("fullscreen-fallback")) {
      shootoutCard.classList.remove("fullscreen-fallback");
      syncFullscreenButton();
      $("fullscreenShootout")?.focus({ preventScroll: true });
    }
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
    } catch {
      shareButton.textContent = "Could not share · copy your score";
      window.setTimeout(() => { shareButton.textContent = "Share result"; }, 1800);
    }
  });


  soundButton.textContent = state.sound ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-pressed", String(state.sound));
  setShotStyle("normal");
  panenka?.closest(".shot-style-controls")?.setAttribute("hidden", "");
  setReticle(0.5, 0.5);
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
