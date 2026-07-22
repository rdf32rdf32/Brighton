# Albion Fan Hub – release checks

Tested on 22 July 2026 using Chromium with the exact HTML, CSS, data and JavaScript files included in this package.

## Passed

- JavaScript syntax: all files passed `node --check`
- Cookie banner: visible initially and removed after clicking **OK, close**
- Albion XI: 11 selectors rendered in 4-3-3 and 4-2-3-1
- League table: 20 clubs rendered
- Fan poll: four choices rendered and selected vote displayed
- History timeline: 13 entries rendered
- Quiz: five questions and 20 answer choices rendered
- New quiz: refreshed the question set
- Quiz scoring: result displayed correctly
- Random fact: changed when requested
- Theme switch: changed between light and dark
- Browser console: no JavaScript errors
- File structure: all internal CSS, JavaScript, data and image paths exist

## Upload structure

The ZIP is flat. Upload everything together so that `index.html`, `assets`, `data`, and the legal pages remain at repository root.
