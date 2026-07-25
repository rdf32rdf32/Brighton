# Albion Fan Hub Release 10

## Penalty shoot-out rebuild

- Replaced the previous penalty engine with a self-contained `shootout.js` and `shootout.css` module.
- Removed the moving power/accuracy bar, numbered target zones and separate Shoot button.
- Albion penalties now use direct mouse or touch aiming: click or tap inside the goal to shoot immediately.
- Palace penalties use reaction controls: press Ready, wait for the strike, then click or tap where Verbruggen should dive.
- Replaced the dislocated HTML/CSS figures with connected inline SVG figures.
- Added stable run-up, ball-flight, keeper-dive, landing and net-response animation.
- Added three difficulty levels, optional Panenka, keyboard controls, automatic turn progression, early finish and sudden death.
- Added saves, catches, fingertip saves, misses, woodwork, reaction times and a final goalkeeper report.

## Site smoothness and polish

- Removed the obsolete legacy penalty JavaScript and old penalty patch files.
- Added active navigation highlighting and calmer section entrance transitions.
- Reduced mobile interface clutter while the penalty game is visible.
- Improved quiz control states, labels, focus behaviour and media loading.
- Added additional accessibility semantics and external-link protection.
- Updated offline caching to Release 10 and deferred chant audio caching until requested.
- Preserved Tour, Settings, diagnostics, data tools, quiz records, fixtures, XI builder and saved supporter progress.
