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

["app.js", "v16.js", "editor.js", "service-worker.js"].forEach((file) => {
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
