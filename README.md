### 18 October 2026 — r95 top scorers by competition
- Added a sortable 2026/27 **Top scorers** section with Premier League, Carabao Cup, UEFA Conference League, FA Cup and all-competition columns, plus responsive horizontal scrolling and direct navigation links.
- Through 18 October: Charalampos Kostoulas leads with five. Reconciled **31 player goals + 3 own goals = 34 Brighton goals** across all recorded completed fixtures; excludes own goals from player rankings.
- Source baseline: season goalscorers through 15 October ([season table](https://en.wikipedia.org/wiki/2026%E2%80%9327_Brighton_%26_Hove_Albion_F.C._season#Goalscorers)); added goals from [18 October's Palace report](https://www.theguardian.com/football/2026/oct/18/brighton-crystal-palace-premier-league-match-report).
- Scorers live in `albion-data-r78.js` under `scoring`. Counts remain **manually maintained**, not live. The new section displays a discrepancy warning when it does not reconcile to the recorded fixture totals; `tests/scorers.cjs` enforces competition-by-competition reconciliation in CI.

### 18 October 2026 — r94 matchday update
- Recorded Brighton's **5–0 home win over Crystal Palace** (18 October), with the Canvot own goal followed by Gómez, Ayari, Kostoulas and Hinshelwood. Source: [The Guardian match report](https://www.theguardian.com/football/2026/oct/18/brighton-crystal-palace-premier-league-match-report).
- Next fixture is **FK Jablonec v Albion**, 22 October at **17:45 UK**, confirmed from the club's [European away-ticket notice](https://www.brightonandhovealbion.com/media-article/away-ticket-news-uefa-conference-league-information-september-2026). Broadcast is not confirmed.
- Updated manual fixture verification date, static no-script fallbacks, all-competition and Premier League summaries, and regression tests. Squad review remains 15 October.
- **Football scores remain manually curated, not live**; daily freshness checks should flag any unrecorded result.

### 17 October 2026 — r93 fixture/results maintenance
- Confirmed Brighton's 4–0 UEFA Conference League win against FK Kauno Žalgiris on 15 October using the [official match report](https://www.brightonandhovealbion.com/media-article/mft-match-report-albion-v-kauno-zalgiris-conference-league).
- Next match is Crystal Palace, Sunday 18 October, 14:00 UK at the Amex; refreshed non-JavaScript fallback text and all-competition totals.
- Fixture/results reviewed on 17 October; squad review remains 15 October. Updated automated regression coverage.
- Score updates are curated, not a live feed; the daily Actions freshness check is intentionally retained to flag future missing final scores.

# Albion Fan Hub — r92 (15 October 2026)

Independent Brighton & Hove Albion supporter website. Not affiliated with or endorsed by the club.

## Website

- Next match and match centre
- Fixtures and results (the results are grouped by month; latest month expanded, older months collapsed)
- Squad profiles, Albion history and club records
- Medium/hard Albion quiz, XI builder and predictions
- Amex stand information, travel and supporter guides
- Brighton v Crystal Palace penalty shoot-out with alternate shooting/saving and sudden death

## Current release

r91 records Sunderland 0–2 Brighton (10 October), advances the next match to FK Kauno Žalgiris and separates fixture-data freshness from the older squad check. r90 preserves deep-link fragments on reload, updates opponent briefing headings and verification notes with the active fixture, and clarifies that goalkeepers can shuffle but not dive before the whistle. New browser regression tests cover those changes. The preceding r89 release merged the active CSS overrides, preserves calibrated penalty/goal geometry, makes pre-whistle keeper shuffling responsive to rotation, and enables directional keyboard saves after the whistle only. It prevents stale weather responses replacing an away-match display. Manual football data now displays explicit age warnings and official verification links.

Automated smoke checks and Chromium browser tests cover the tour, squad tabs, results by month and goalkeeper line geometry. Real iPhone Safari, complete game/audio and device-specific physics still require manual verification.

**Football information in `albion-data-r78.js` is manually maintained and is not live.** Sunderland result verified against published match reports; the rest of the fixture/squad list has NOT all been independently re-verified. Check official fixtures and squad lists before relying on results.

## Files

- `index.html` — single-page UI and accessibility markup
- `albion-data-r78.js` — squad, fixtures, penalty takers
- `app-r77.js` — fixtures, squad, quiz, search, guides and other site logic
- `shootout-r82.js` — penalty game physics, keyboard/touch handling, scoring and animations
- `site-r76.css` and `site-current.css` — current baseline and consolidated responsive overrides; historical releases retained
- `site-reliability.js` — manual-data freshness warning and official verification links

File basenames retain historical release names. The current delivered bundle is identified as r92 by the HTML release metadata and updated asset cache-query strings.

## Tests and publishing

Run `npm test` for syntax, game safeguards, monthly results and football-record checks. Run `npm run test:browser` with Playwright/Chromium installed for desktop and simulated phone-size browser tests. Both run in GitHub Actions; CI retains browser traces when checks fail.

The live URL is https://rdf32rdf32.github.io/Brighton/.


## Maintenance and daily checks (r91)
- `editor.html` now edits the **active** `albion-data-r78.js` for match results and player status, preserving other metadata. It downloads a replacement, but never uploads automatically.
- The daily GitHub Actions freshness job fails when a past result is missing, fixture/result data have not been reviewed within eight days, or the squad has not been checked for over 30 days. GitHub notifications depend on your account settings.
- Browser regression tests now include Sunderland 0–2, the new opponent, the maintenance editor's exported file, and settings. Real iPhone Safari, full gameplay, visual proportions and audio still require device testing.

- Nine football penalty-rule unit scenarios cover early clinches, tied regulation, paired sudden-death kicks and both winning outcomes.
- Active script and CSS assets have a regression performance budget of 1.15 MB, with a custom 125-year supporter mark replacing the generic graphic in the anniversary banner. This is an original supporter graphic, not an official club crest.

## r92 corrections (15 October 2026)
- Updated static match/result fallbacks and checked published squad numbers, verified September departures and October team news. No unverified result has been entered for the 15 October fixture.
- Fixed hidden keyboard instructions; clarified no pre-whistle dives on both pointer and legacy touch controls.
- Corrected the goalkeeper's reaction window so resolution cannot lock before the stated time, with modest reach improvements for correctly anticipated direction and height.
- Completed shoot-out shot maps can now be selected with keyboard or pointer for kick-by-kick details.
- Added manual results disclosure, pending-result warning, and mobile page simplification.
- Expanded tests; real iPhone, complete penalty game and visual animation still require real-device checks.
