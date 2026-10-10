# Albion Fan Hub — r91 (10 October 2026)

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

File basenames retain historical release names. The current delivered bundle is identified as r90 by the HTML release metadata and the updated app cache-query string.

## Tests and publishing

Run `npm test` for syntax, game safeguards, monthly results and football-record checks. Run `npm run test:browser` with Playwright/Chromium installed for desktop and simulated phone-size browser tests. Both run in GitHub Actions; CI retains browser traces when checks fail.

The live URL is https://rdf32rdf32.github.io/Brighton/.


## Maintenance and daily checks (r91)
- `editor.html` now edits the **active** `albion-data-r78.js` for match results and player status, preserving other metadata. It downloads a replacement, but never uploads automatically.
- The daily GitHub Actions freshness job fails when a past result is missing, fixture/result data have not been reviewed within eight days, or the squad has not been checked for over 30 days. GitHub notifications depend on your account settings.
- Browser regression tests now include Sunderland 0–2, the new opponent, the maintenance editor's exported file, and settings. Real iPhone Safari, full gameplay, visual proportions and audio still require device testing.

- Nine football penalty-rule unit scenarios cover early clinches, tied regulation, paired sudden-death kicks and both winning outcomes.
- Active script and CSS assets have a regression performance budget of 1.15 MB, with a custom 125-year supporter mark replacing the generic graphic in the anniversary banner. This is an original supporter graphic, not an official club crest.
