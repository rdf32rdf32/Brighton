// Albion Fan Hub source-level smoke checks (Node.js, no extra dependencies).
// These tests do not replace a manual browser/mobile gameplay test.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = process.cwd();
const file = name => fs.readFileSync(root + '/' + name, 'utf8');
const html = file('index.html');
const app = file('app-r77.js');
const game = file('shootout-r82.js');
const data = file('albion-data-r78.js');
const styles = file('site-r83.css');
for (const [name, source] of [['app-r77.js', app], ['shootout-r82.js', game], ['albion-data-r78.js', data]]) {
  new vm.Script(source, { filename: name });
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
const brokenLinks = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]).filter(id => !ids.includes(id));
assert.deepEqual(brokenLinks, [], 'Broken internal HTML links');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m => m[1].split('?')[0])
  .filter(url => !url.startsWith('#') && !/^(?:https?:|mailto:|data:)/.test(url));
for (const asset of new Set(assets)) assert(fs.existsSync(root + '/' + asset), 'Missing linked asset: ' + asset);
const context = vm.createContext({ window: {} });
vm.runInContext(data, context, { timeout: 3000 });
const quizSource = app.split('/* ===== site-controls.js ===== */')[0];
vm.runInContext(quizSource, context, { timeout: 3000 });
const questions = context.window.ALBION_QUIZ;
assert(questions.length >= 200, 'Quiz bank too small');
for (const q of questions) {
  assert(Array.isArray(q.options) && q.options.length >= 2, 'Quiz options missing');
  assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, 'Quiz correct answer invalid');
  assert.equal(new Set(q.options.map(x => String(x).trim().toLowerCase())).size, q.options.length, 'Duplicate quiz options: ' + q.question);
}
const fixtures = context.window.ALBION_DATA_R66.fixtures;
assert(fixtures.length >= 20, 'Fixture list too short');
for (const f of fixtures) {
  assert(/^\d{1,2} [A-Z][a-z]{2} 20\d{2}$/.test(f.date), 'Invalid fixture date: ' + f.date);
  assert(f.venue === 'H' || f.venue === 'A', 'Invalid venue: ' + f.opponent);
  assert(Number.isFinite(f.albionGoals) === Number.isFinite(f.opponentGoals), 'Partial result: ' + f.opponent);
}
const elements = new Map();
const get = id => {
  if (id === 'playerProfileGrid') return null;
  if (!elements.has(id)) elements.set(id, {
    textContent: '', innerHTML: '', handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    querySelectorAll() { return []; },
  });
  return elements.get(id);
};
const document = { getElementById: get, querySelectorAll() { return []; } };
const begin = app.indexOf('/* ===== consolidated from r70-enhancements.js ===== */');
const end = app.indexOf('/* ===== consolidated from r75-enhancements.js ===== */', begin);
assert(begin >= 0 && end > begin, 'Result module boundaries missing');
new Function('window','document','MutationObserver',app.slice(begin,end))(context.window, document, function() {});
const resultHTML = get('resultsList').innerHTML;
const monthlyGroups = (resultHTML.match(/<details class="result-month"/g) || []).length;
const openGroups = (resultHTML.match(/<details class="result-month" open/g) || []).length;
const cards = (resultHTML.match(/class="result-card /g) || []).length;
const completed = fixtures.filter(f => Number.isFinite(f.albionGoals) && Number.isFinite(f.opponentGoals));
const monthCount = new Set(completed.map(f => f.date.split(' ').slice(1).join(' '))).size;
assert.equal(monthlyGroups, monthCount, 'Monthly result groups missing');
assert.equal(openGroups, monthlyGroups ? 1 : 0, 'Latest month not exclusively open');
assert.equal(cards, completed.length, 'Not all completed results render');
assert.equal(typeof get('expandResultsMonths').handlers.click, 'function', 'Expand months not wired');
assert.equal(typeof get('collapseResultsMonths').handlers.click, 'function', 'Collapse months not wired');
assert(styles.includes('.result-month-games'), 'Missing monthly results styles');
assert(game.includes('keeper.offsetWidth'), 'Keeper geometry regression');
assert(game.includes('gameRun: state.gameRun + 1'), 'Restart state guard regression');
assert(game.includes('await sleep(1900)'), 'Pre-whistle decision window regression');
assert(game.includes('xf: .70, yf: .78'), 'Mobile shot movement regression');
console.log('PASS: JS syntax, local assets, anchors, ' + questions.length + ' quiz questions, ' + fixtures.length + ' fixtures, ' + monthlyGroups + ' result months / ' + cards + ' results, penalty guards');
