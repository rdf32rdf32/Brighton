# Albion Fan Hub — repaired release

This is a static GitHub Pages site. Upload every file in the ZIP directly to the repository root. No build step is required.

## Main repairs

- Restored the full-width moving power and accuracy bar in the Brighton v Palace shoot-out.
- Added a self-healing penalty control fallback so missing markup cannot stop the rest of the site.
- Restored quiz, cookie notice, sound, navigation and later page initialisation.
- Added cache-busted active CSS and JavaScript references to defeat stale service-worker files.
- Corrected the diagnostics for the 500-question quiz bank.
- Unified the Sussex by the Sea recording credit.

Run `node site-check.js` locally for the static release checks.
