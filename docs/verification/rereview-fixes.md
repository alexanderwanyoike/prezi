# Follow-up review verification

The three blocking follow-up findings are resolved in focused PRs: #57 shares the MCP status Result schema, #58 clears stale presenter errors, and #59 counts retained source in persisted budgets and protects save destinations. The [review ledger](review-fix-ledger.md) includes these resolutions. All PRs remain unmerged and target dev.

Formatting, lint, strict types, all 102 unit tests and the production build pass. All 54 real Electron journeys pass, including the expanded Escape/Back-to-editor regressions. Both installed Linux journeys and the actual private 0.1.0-to-0.1.1 update/restart/reopen journey pass with the rebuilt application. Application checks and all four native installer targets are covered by [#59](https://github.com/alexanderwanyoike/prezi/pull/59/checks).

The MCP change is a behavior-preserving refactor with round-trip checks green before and after. Each behavior fix has its meaningful failing regression committed before its implementation. Historical commits were retained.

Separate private-display manual verification checked all six MCP error codes through live preload IPC, both presenter exit paths followed by a new save error and successful edit, and large-file save rejection/recovery. The large-file run preserved an existing destination after rejecting an 8,388,607-byte compact input's oversized formatted save. After shrinking content, it rejected another oversized edit, wrote a 7,903,327-byte legacy file and reopened the portable version with all 900,000 reference characters intact. Actual screenshots are embedded in #58 and #59.

Verification used private displays/profiles, muted audio and zero-swap scopes capped at 2 GiB. No user desktop or physical audio session was used. Compiler and scene workers retain their independent budgets. The table records charged scope peaks from these warmed-cache runs, not universal memory guarantees.

| Scope       | Peak MiB | OOM events |
| ----------- | -------: | ---------: |
| verify      |   1146.9 |          0 |
| electron    |    750.4 |          0 |
| budget-demo |    666.0 |          0 |
| package     |   1678.5 |          0 |
| candidate   |   1605.6 |          0 |
| installed   |    852.7 |          0 |
| update      |   1178.6 |          0 |

Every measured scope reports zero OOM/OOM-kill events. Raw readings: [rereview-metrics.json](rereview-metrics.json).

The rebuilt local artifact is release/Prezi-0.1.0-linux-x64.AppImage (149,882,726 bytes), SHA-256 af227763829ba49b12e38c6b7f0d762deee73eefec8515ddc7c1c0d4bd79e462. Its identity is retained in [rereview-appimage.json](rereview-appimage.json). The 0.1.1 update candidate remains a private fixture; no release was published.
