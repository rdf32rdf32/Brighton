#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = __dirname;
const failures = [];
const pass = (message) => console.log(`✓ ${message}`);
const fail = (message) => failures.push(message);

const requiredFiles = [
  "index.html",
  "style.css",
  "app.js",
  "v16.js",
  "v17.js",
  "v18.js",
  "content-data.js",
  "quiz-data.js",
  "editor.html",
  "editor.js",
  "service-worker.js",
  "manifest.json",
  "offline.html",
  "sussex-by-the-sea.mp3",
  "albion-albion-albion.mp3",
  "seagulls.mp3",
  "we-are-brighton.mp3",
  "come-on-brighton.mp3",
  "we-all-follow-albion.mp3",
  "brighton-aces.mp3",
  "b-r-i-g-h-t-o-n.mp3",
  "great-escape.mp3",
  "glory-glory.mp3",
];
requiredFiles.forEach((file) => {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
});
if (!failures.length) pass("required release files exist");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [
  ...new Set(ids.filter((id, index) => ids.indexOf(id) !== index)),
];
if (duplicateIds.length) fail(`duplicate HTML ids: ${duplicateIds.join(", ")}`);
else pass(`${ids.length} unique page controls`);

const localAssets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map((match) => match[1])
  .filter((value) => !/^(https?:|mailto:|tel:)/.test(value));
const missingAssets = [
  ...new Set(
    localAssets.filter(
      (asset) => !fs.existsSync(path.join(root, asset.replace(/^\.\//, ""))),
    ),
  ),
];
if (missingAssets.length)
  fail(`missing linked assets: ${missingAssets.join(", ")}`);
else pass("all local page assets resolve");

if (!/<button id="checkQuiz"[^>]*hidden/.test(html))
  fail("quiz Check answer control must remain hidden");
else pass("quiz uses instant answer selection");

if (/Personal matchday itinerary|id="itinerary/i.test(html))
  fail("personal matchday itinerary must remain removed");
else pass("personal matchday itinerary is removed");

if (/12 YARDS|twelve yards/i.test(html))
  fail("penalty distance wording must remain hidden");
else pass("penalty depth is visual rather than labelled");

if (!/sussex-by-the-sea\.mp3/.test(html) || /sussex-by-the-sea-v17/.test(html))
  fail("anthem must use the canonical local audio asset");
else pass("anthem uses the canonical local audio asset");

if (
  !/sfhg\.uk\/resources\/all-other-reference\/sussex-by-the-sea/.test(html) ||
  !/Sussex Family History Group/.test(html)
)
  fail("anthem source credit is missing");
else pass("anthem recording credits the licensed SFHG source");

const serviceWorker = fs.readFileSync(
  path.join(root, "service-worker.js"),
  "utf8",
);
if (
  !/albion-fan-hub-v24/.test(serviceWorker) ||
  !/FILES[\s\S]*sussex-by-the-sea\.mp3[\s\S]*self\.addEventListener\('install'/.test(
    serviceWorker,
  )
)
  fail("v24 release cache or anthem asset is incorrect");
else pass("v24 cache includes the anthem and chant assets");

const application = fs.readFileSync(path.join(root, "app.js"), "utf8");
if (
  !/Master volume/.test(html) ||
  /id="anthemVolume"|id="playAnthem"|id="soundReliability"/.test(html) ||
  /anthemVolumeControl|playAnthemButton|soundReliability/.test(application)
)
  fail("sound controls have not been restored to the version-14 model");
else pass("sound controls use the version-14 master-volume model");
[
  ["palaceReactionStartedAt", "post-contact Palace reaction timing"],
  ["openPalaceReactionWindow", "post-contact save window"],
  ["adjacentDives", "adjacent-zone saves"],
  ["shootoutDecision", "best-of-five early finish rules"],
  ["commitPalaceDive", "reactive keeper dives"],
  ["Maxim De Cuyper", "left-footed Albion taker"],
  ["pointerdown", "instant penalty input"],
  ["chooseAimPoint", "free pointer aiming"],
  ["playChant", "match chant playback"],
  ["showTurnReady", "manual turn-ready stage"],
  ["startSaveCountdown", "Palace save countdown"],
  ["goalOpening", "goal coordinate mapping"],
  ["toStagePoint", "perspective shot destination mapping"],
].forEach(([needle, label]) => {
  if (!application.includes(needle)) fail(`${label} missing`);
  else pass(`${label} present`);
});
const stylesheet = fs.readFileSync(path.join(root, "style.css"), "utf8");
[
  ["dive-level-top", "high-dive animation classes"],
  ["dive-level-bottom", "low-dive animation classes"],
  ["crowd-bowl", "behind-goal crowd"],
  ["kick-decision", "clear goal and save decisions"],
  ["placing-ball", "ball-placement sequence"],
  ["aim-pointer", "pointer aiming visuals"],
  ["chant-grid", "Albion chants player"],
  ["v24-keeper-ready-centre", "proportional goalkeeper sizing"],
  ["meter-best{left:38%;width:24%}", "expanded green timing zone"],
  ["pitch-perspective", "penalty pitch perspective"],
  ["aspect-ratio:16/10!important", "perspective penalty stage ratio"],
  ["v24-run-straight", "rear-view multi-stage run-up"],
  ["v24-side-net-left", "three-dimensional side-net animation"],
  ["tour-launch", "top-left first-visit tour"],
  ["height:calc(100dvh - 16px)", "single-screen desktop game layout"],
  ["max-height:100dvh", "single-screen mobile game layout"],
  ["first-kick-coach", "first-kick guidance"],
  ["v23-ref-goal", "referee outcome animation"],
  ["penalty-area-marking", "penalty-area marking"],
  ["goal-area-marking", "goal-area marking"],
  ["v24-ball-place", "one-second ball placement"],
  ["reaction-cue", "reaction-save cue"],
  [".goal .player-eyes,.goal .player-mouth{display:none!important}", "rear-view taker presentation"],
].forEach(([needle, label]) => {
  if (!stylesheet.includes(needle)) fail(`${label} missing`);
  else pass(`${label} present`);
});
if (
  !/\.amex-map \.north\{grid-column:3;grid-row:2\}/.test(stylesheet) ||
  !/\.amex-map \.south\{grid-column:1;grid-row:2\}/.test(stylesheet)
)
  fail("North and South stand map positions have not been swapped");
else pass("North and South stand map positions are corrected");
[
  ["position:static!important", "non-overlapping mobile score bar"],
  ["grid-template-columns:minmax(0,1fr) 98px!important", "compact mobile timing controls"],
  ["aspect-ratio:16/9!important", "mobile goal fit"],
].forEach(([needle, label]) => {
  if (!stylesheet.includes(needle)) fail(`${label} missing`);
  else pass(`${label} present`);
});

if (!/Are You a Secret Palace Fan\?/.test(application))
  fail("quiz supporter rating scale is missing");
else pass("quiz supporter rating scale present");

[
  ["shootoutSituation", "remaining-kicks display"],
  ["kickDecision", "large kick decision"],
  ["crowd-bowl", "crowd bowl"],
  ["referee", "shoot-out referee"],
  ["aimPointer", "free-aim pointer"],
  ["chantAudio", "chant audio player"],
  ["skipReplay", "slow-motion replay skip control"],
  ["continueShootout", "manual next-turn control"],
  ["liveKeeperStats", "live goalkeeper performance panel"],
  ["pitch-perspective", "perspective pitch structure"],
  ["reactionCue", "post-contact reaction prompt"],
  ["keeper-mouth", "improved goalkeeper facial graphics"],
  ["firstKickCoach", "first-kick guidance panel"],
].forEach(([needle, label]) => {
  if (!html.includes(needle)) fail(`${label} missing`);
  else pass(`${label} present`);
});

const anthemPath = path.join(root, "sussex-by-the-sea.mp3");
if (fs.existsSync(anthemPath) && fs.statSync(anthemPath).size < 100000)
  fail("anthem audio file is unexpectedly small");
else if (fs.existsSync(anthemPath)) pass("anthem audio file is present");

const chantFiles = requiredFiles.filter(
  (file) => file.endsWith(".mp3") && file !== "sussex-by-the-sea.mp3",
);
const smallChants = chantFiles.filter(
  (file) => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).size < 100000,
);
if (smallChants.length)
  fail(`chant recordings are unexpectedly small: ${smallChants.join(", ")}`);
else pass(`${chantFiles.length} Brighton chant recordings are present`);

if (/chants\//.test(application) || /chants\//.test(serviceWorker))
  fail("chant recordings still rely on a nested upload folder");
else pass("chant recordings use GitHub-friendly root paths");

if (!/exactChance = \{ perfect: 0\.5, late: 0\.32, none: 0 \}/.test(application))
  fail("Palace save probability is not capped at 50%");
else pass("Palace save probability is capped at 50%");

["app.js", "v16.js", "v17.js", "v18.js", "editor.js", "service-worker.js"].forEach((file) => {
  try {
    new Function(fs.readFileSync(path.join(root, file), "utf8"));
    pass(`${file} parses`);
  } catch (error) {
    fail(`${file} syntax: ${error.message}`);
  }
});

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(root, "content-data.js"), "utf8"),
  sandbox,
);
vm.runInContext(
  fs.readFileSync(path.join(root, "quiz-data.js"), "utf8"),
  sandbox,
);
const content = sandbox.window.ALBION_CONTENT;
const quiz = sandbox.window.ALBION_QUIZ;

if (
  !content?.nextMatch?.dateISO ||
  Number.isNaN(new Date(content.nextMatch.dateISO).valueOf())
)
  fail("next match dateISO is invalid");
if (!Array.isArray(content?.fixtures) || content.fixtures.length !== 38)
  fail(`expected 38 league fixtures, found ${content?.fixtures?.length || 0}`);
else pass("38-fixture season schedule present");
const fixtureKeys = new Set();
let previousDate = 0;
const months = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};
(content.fixtures || []).forEach((fixture, index) => {
  if (!["H", "A"].includes(fixture.venue))
    fail(`fixture ${index + 1} has invalid venue`);
  const key = `${fixture.date}|${fixture.opponent}|${fixture.venue}`;
  if (fixtureKeys.has(key)) fail(`duplicate fixture ${key}`);
  fixtureKeys.add(key);
  const [day, month, year] = fixture.date.split(" ");
  const date = new Date(Number(year), months[month], Number(day)).valueOf();
  if (Number.isNaN(date)) fail(`fixture ${index + 1} has invalid date`);
  if (date < previousDate) fail(`fixture ${index + 1} is out of date order`);
  previousDate = date;
});
if (!failures.some((message) => message.includes("fixture")))
  pass("fixture order and venues validate");

if (!Array.isArray(quiz) || quiz.length < 200)
  fail(`quiz bank has only ${quiz?.length || 0} questions`);
else pass(`${quiz.length}-question quiz bank present`);
(quiz || []).forEach((question, index) => {
  if (
    !question.question ||
    !Array.isArray(question.options) ||
    question.options.length < 3
  )
    fail(`quiz question ${index + 1} is incomplete`);
  if (!Number.isInteger(question.answer) || !question.options[question.answer])
    fail(`quiz question ${index + 1} has an invalid answer`);
  if (!question.explanation)
    fail(`quiz question ${index + 1} lacks an explanation`);
});

if (failures.length) {
  console.error("\nRelease checks failed:");
  failures.forEach((message) => console.error(`✗ ${message}`));
  process.exit(1);
}
console.log("\nAll Albion Fan Hub release checks passed.");
