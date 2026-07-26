# Production r22

- Replaced estimated save points with live collision points from the rendered glove, boot, leg, chest or body.
- Synchronized the ball, goalkeeper, impact feedback and result timing around one physical contact frame.
- Added catches secured into the goalkeeper’s chest, visible glove/boot recoil and body-part-specific contact feedback.
- Ensured saved outcomes are only shown after visible goalkeeper contact.
- Merged Albion facts and supporter memories into the interactive Albion Timeline and removed the standalone Moments tab.
- Added a Timeline “Surprise me” control and improved timeline keyboard labels.
- Forced full page reloads/F5 to reopen at the top of the site.
- Unified active release, cache and content metadata at r22.
- Added visible freshness labels, mobile overscroll protection and final accessibility/performance polish.
- Improved animation cancellation when leaving the page or switching browser tabs.

- Rebuilt the exceptional-save replay so it owns the keeper/ball animations, cannot be interrupted by recovery or celebration timers, and still runs in reduced-motion mode.
