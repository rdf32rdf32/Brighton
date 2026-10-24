### 24 October 2026 — Automatic verified results (hourly scheduled GitHub Actions)
- `automatic-results.yml` checks recent Albion fixtures hourly against ESPN; both teams, competition, London fixture date, home/away side, full-time status and score are validated. Two consistent provider responses are required.
- Newly confirmed final results are stored in `auto-results.json` and served through `auto-results.js` ahead of the main application. Existing manually confirmed scores are never overwritten. Match pages, monthly results, next opponent and Stats Centre then recompute on page load. Automatic results can appear after an hourly GitHub Actions run and GitHub Pages propagation; they do not require a visitor to leave the site open.
- Goalscorers and own goals are added by competition only when individual goal attribution from the provider accounts for every Brighton goal. Missing details do not cause guessed scorers: the existing scorer discrepancy warning remains until verified attribution becomes available. Unlisted cup ties or rescheduled fixtures must still be added to the baseline fixture calendar, and squad/team sheet content is not automatically inferred.
- The integration is best-effort and depends on ESPN's **unofficial** soccer feed and GitHub Actions scheduling. Failed jobs are visible in GitHub Actions; errors do not erase earlier confirmed results. Run `node scripts/automate-results.cjs` manually to recheck recent matches.
- Browser display is an additive overlay of the original trusted fixture data. `npm test` includes final-only, venue, date, scorer and own-goal safeguards.

### 23 October 2026 — r98: Verified Jablonec draw and fixture reliability audit
- Entered the official **FK Jablonec 0–0 Brighton** Conference League result (22 October); included the official report, 6,114 attendance and draw status. The manually checked archive now has **12 competitive matches, 8 wins, 3 draws, 1 defeat, 34 scored and 7 conceded**. Scorers remain unchanged after a goalless draw.
- Next opponent and no-JavaScript fallback now correctly show **Liverpool at Anfield, Sunday 25 October, 14:00 UK** (Sky Sports). Refreshed match centre, latest result, all-competition figures, monthly result cards and relevant verification dates. The squad's separate last-check date remains 15 October.
- Corrected three previously out-of-date Premier League fixtures following [the club's rescheduling announcement](https://www.brightonandhovealbion.com/media-article/mft-fixture-news-brentford-hull-city-newcastle-united-november-selection-september-2026): **Brentford 8 November 14:00**, **Hull City 22 November 14:00** and **Newcastle United 29 November 14:05**.
- Fixed match-report links for historical fixture records that use `sourceUrl` rather than `reportUrl`; only HTTPS reports are offered.
- Added automated fixture consistency tests and updated browser checks to prevent stale result totals, broken report links and obsolete fallback match details. Existing security and penalty controls are preserved.
- Season archives are still **manually verified**, not silently overwritten by the optional ESPN feed. UK times are local UK kick-off times and subject to official changes.

### 22 October 2026 — r97: Automatic matchday score feed
- Live matchday scores: the site checks ESPN's **unofficial, undocumented public soccer scoreboard** for the competition and match date; it only displays scores after validating both Albion and the opponent.
- Checks every 45 seconds while a verified match is in play, less often around fixtures; suspends polling while the tab is hidden. Displays source, state and UK checking time.
- Provider failure/missing data falls back clearly; **no scores are invented**. The archived match results, goalscorers, squad and full-season statistics remain **manually curated**, and the live feed does not silently alter them.
- GitHub Pages hosts the site without PHP. Automated Node tests and mobile Chromium/WebKit tests cover the feed and safe failure; **real iPhone Safari audio/gesture tests still require a physical device**.
- Provider availability, CORS or endpoint shape can change without warning; see ESPN and official Albion fixtures for confirmation.

### 18 October 2026 — r96: Interactive archive, improved XI and Stats Centre
- **Stats Centre** (#stats-centre): competition filters, results KPIs, win rate, goals per match, monthly trend, home/away splits, competition table and top goalscorers. Calculated from completed fixtures already in the site; **no invented appearance, assists or minutes data**. Manual fixture/scoring updates still required.
- **Albion history archive** (#history-archive): search 12 milestones, filter by era, explore sourced details and three historic stadium photographs (Goldstone 1996, Withdean, Amex 2011). Each photograph has creator attribution and Creative Commons licence links; the club's 125th anniversary gallery and Historic England archive provide further source images.
- **XI enhancements** (#xi): current first-team players appear as searchable draggable/tappable chips; eligible pitch positions are highlighted, with mouse drag and touch-to-place alongside the existing dropdowns. Players may be moved/swapped where position eligibility permits.
- **Prediction accuracy**: lock an 11-player XI for the next recorded fixture, enter the actual 11 starters **manually** from the official team sheet, and compare by player identity. Results and overall accuracy are stored only on the current device, with a history of completed checks. No automatic line-up feed is claimed.
- New regression tests cover all three sections, source data and asset links. Existing matchday and penalty features remain unchanged.
- The earlier \`top-scorers.js\` and \`top-scorers.css\` are intentionally reused for these extensions, preserving the active eight-asset performance limit.


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
