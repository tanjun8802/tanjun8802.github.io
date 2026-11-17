# Release verification

## Automated local checks

- Python public-CLI tests cover missing-image diagnostics; content edits reaching homepage and CV; exclusion of the original CV/editor; invalid links, duplicate IDs, unknown project references, unsupported diagrams and empty timelines; protection of unrelated output directories; and local page links/assets.
- JavaScript syntax checks run on the website and editor.
- GitHub Actions repeats syntax, CLI tests and public build on PRs.

## Browser checks completed on 16 November 2026

Using the actual built website in the CUA browser, `tests/browser-qa.mjs` passed 42 assertions: carousel keyboard focus and Home/End, full-story search, empty-state recovery, filters, all 15 project dialogs opening/closing and restoring focus, timeline selection, loaded images and horizontal overflow.

Additional checks passed: project Back/Forward navigation; 390 px mobile menu open/close and tap expansion; 320 px layout without horizontal overflow. Desktop and mobile layouts were visually inspected.

A carousel keyboard focus loss was reproduced before the fix: pressing ArrowRight from the project link replaced its focused caption and left focus on the body. Slide keyboard shortcuts now apply to stable controls, leaving the caption's project link alone. The same sequence passed after the fix. Hashed script/style URLs also prevent stale assets after deployment.

The editor loaded correctly and its profile fields and section navigation were inspected. The subsequent export test was interrupted; folder saving, image selection, JSON export/import and editing on mobile have not been verified in-browser. Browser control became unavailable on resumption. These paths received source review and syntax checks, not a claimed end-to-end browser pass.

## Release boundary

The PR is the deliverable. Production deployment and GitHub Pages settings have not been changed. External LinkedIn content could not be retrieved. No claim is made of exhaustive cross-browser, screen-reader or Lighthouse certification.

## Independent reviews

Two separate agents reviewed the complete change against main and the release requirements. Standards review found two editor defects (blank optional links in new entries and missing object forms after clearing a section) and an asset-publication mismatch. Spec review independently found the empty-section defect and an ignored editable page title. These were fixed, then both reviewers rechecked the changes and reported no new blocking issue. The owner-browser verification limitation above remains.

Six CLI regression tests pass after the review fixes. Editorial notes are excluded from public JSON and HTML, and only referenced images are copied. The first gallery photograph and the editable profile title now update the generated fallback and metadata as well as the interactive page.
