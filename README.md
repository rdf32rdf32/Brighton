# Albion Fan Hub — r85 (9 October 2026)

Independent Brighton & Hove Albion supporter website. Not affiliated with or endorsed by the club.

## Website

- Next match and match centre
- Fixtures and results (the results are grouped by month; latest month expanded, older months collapsed)
- Squad profiles, Albion history and club records
- Medium/hard Albion quiz, XI builder and predictions
- Amex stand information, travel and supporter guides
- Brighton v Crystal Palace penalty shoot-out with alternate shooting/saving and sudden death

## Current release

r85 refines the penalty goalkeeper's sizing, movement and gloves, reduces exaggerated ball movement on mobile, improves pre-whistle reactions, and protects against stale penalty outcomes after a restart.

It also fixes incorrect home-match weather handling, defaults the fixture month selector to the current month, includes kick-off times in downloadable calendars, and validates quiz question options.

**Football information is maintained in** `albion-data-r78.js` **and is not automatically retrieved live.** The site displays a last-checked label; verify results and future kick-off dates against the official club website. The fixture carousel and countdown can advance within the data already provided.

## Files

- `index.html` — single-page UI and accessibility markup
- `albion-data-r78.js` — squad, fixtures, penalty takers
- `app-r77.js` — fixtures, squad, quiz, search, guides and other site logic
- `shootout-r82.js` — penalty game physics, keyboard/touch handling, scoring and animations
- `site-r76.css` and `site-r77.css`–`site-r83.css` — current stylesheets and responsive fixes

File basenames retain historical release names. The current delivered bundle is identified as r85 by the HTML release metadata and cache-query strings.

## Tests and publishing

Run `node tests/smoke.cjs` to validate local asset links, JavaScript syntax, quiz options, current fixture records, monthly results and core penalty safeguards. GitHub Actions runs this check on changes to the main branch and pull requests.

These are source-level checks, **not** a substitute for manual game testing in real desktop/mobile browsers. For a publish check, confirm the latest commit on `main`, the GitHub Pages deployment status in repository Settings, and the game behaviour on desktop, mobile portrait and landscape. GitHub Pages may have a brief deploy/cache delay.

The live URL is https://rdf32rdf32.github.io/Brighton/.
