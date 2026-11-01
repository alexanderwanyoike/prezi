# Persisted content budget

Follow-up review: #54. Moving references out of editable state stopped counting their serialized bytes, although persistence still reattached them.

The owner caches the source catalog's UTF-8 JSON contribution on successful Open and clears it on New. Edit and compiled-scene installation budgets include that contribution plus the final legacy-JSON newline. Save checks the same budget before touching the destination. The existing 8 MiB reader limit and archive format remain unchanged. This extends the existing byte-budget and atomic-persistence pattern; no new dependency or external code was added.

Three regressions failed before their respective fixes: an oversized draft edit was accepted, an oversized compiled scene was installed, and saving a compact opened project overwrote a destination with formatted content too large to reopen. The tests now verify rejection without changing the project or destination, and successful legacy/portable reopening with all retained references. Regression tests and each implementation change are separate commits.

Formatting, lint, strict types, all 102 unit tests and the production build pass. A separate private-display manual run opens an 8 MiB-minus-one-byte compact fixture, verifies the save is rejected without overwriting the existing file, shrinks it, rejects a new oversized edit, saves both formats and reopens the portable file with its 900,000 reference characters intact. Screenshots show the rejected save and successfully reopened deck. Verification uses private profiles, muted audio and a 2 GiB/zero-swap scope.
