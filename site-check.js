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

if (!/sussex-by-the-sea\.mp3/.test(html) || /sussex-by-the-sea-v17/.test(html))
  fail("anthem must use the restored original audio asset");
else pass("anthem uses the restored original audio asset");

const serviceWorker = fs.readFileSync(
  path.join(root, "service-worker.js"),
  "utf8",
);
if (
  !/albion-fan-hub-v19/.test(serviceWorker) ||
  !/FILES[\s\S]*sussex-by-the-sea\.mp3[\s\S]*self\.addEventListener\('install'/.test(
    serviceWorker,
  )
)
  fail("v19 release cache or anthem asset is incorrect");
else pass("v19 cache includes the proven version-14 anthem asset");

const application = fs.readFileSync(path.join(root, "app.js"), "utf8");
if (
  !/Master volume/.test(html) ||
  /id="anthemVolume"|id="playAnthem"|id="soundReliability"/.test(html) ||
  /anthemVolumeControl|playAnthemButton|soundReliability/.test(application)
)
  fail("sound controls have not been restored to the version-14 model");
else pass("sound controls use the version-14 master-volume model");
[
  ["palaceRunStartedAt", "Palace reaction timing"],
  ["adjacentDives", "adjacent-zone saves"],
].forEach(([needle, label]) => {
  if (!application.includes(needle)) fail(`${label} missing`);
  else pass(`${label} present`);
});
const stylesheet = fs.readFileSync(path.join(root, "style.css"), "utf8");
[
  ["dive-level-top", "high-dive animation classes"],
  ["dive-level-bottom", "low-dive animation classes"],
].forEach(([needle, label]) => {
  if (!stylesheet.includes(needle)) fail(`${label} missing`);
  else pass(`${label} present`);
});
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

const anthemPath = path.join(root, "sussex-by-the-sea.mp3");
if (fs.existsSync(anthemPath) && fs.statSync(anthemPath).size < 100000)
  fail("anthem audio file is unexpectedly small");
else if (fs.existsSync(anthemPath)) pass("anthem audio file is present");

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
