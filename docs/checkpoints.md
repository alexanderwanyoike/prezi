# Delivery checkpoints

The implementation is grouped around checkpoints 5, 8 and 14. Feature work targets `dev`; promotion to `main` uses a release PR. No feature PR is merged without explicit instruction.

## Checkpoint 1: phases 1-5

- [x] Electron foundation, Yarn tooling, linting, formatting, strict TypeScript, tests and CI.
- [x] Three-panel editor with related-app themes, modes and accents.
- [x] Shared project owner, revisioned atomic edits, stable slide IDs and undo/redo.
- [x] Native new/open/save flow with atomic persistence and unsaved-change protection.
- [x] Remotion text slides, manually controlled reveals, keyboard guards and fullscreen presentation.

## Checkpoint 2: phases 6-8

- [x] Additional recovery slice: labelled undo/redo history and retry-safe history requests for agent batches.
- [x] Additional editor slice: direct canvas heading/body editing with shared properties, selection and undo.

- [x] Additional application slice: styled File/Edit/View menus, desktop shortcuts and Canvas/Code workspace tabs.
- [x] Additional source slice: read-only Remotion Code view and live instance properties.
- [x] Additional persistence slice: a self-contained `.prezi` archive with source, assets and built-in fonts/licences.
- [x] Import local images/video and persist asset references; stream media with range requests.
- [x] Keep video playing while the reveal holds; stop inactive media and expose useful playback settings.
- [x] Official MCP SDK adapter connected to the existing owner, selection and edits, conflict/retry verification, and connection instructions.

## Checkpoint 3: phases 9-14

- [x] Serial, cancellable custom-source compilation with resource budgets and last-working recovery.
- [x] Expose custom scenes, source inspection and editable properties in UI and MCP.
- [ ] Human code authoring in the Code workspace, with retained drafts and Apply diagnostics.
- [ ] Code/media/process layouts and the animated Vibez workflow example.
- [ ] Font import, provenance and missing-asset recovery.
- [ ] Bounded preview capture, job status and static thumbnails.
- [x] Update runtime: explicit download/progress, protected restart and saved-deck recovery.
- [x] Desktop updates: release feeds, explicit download/restart, unsaved-change protection and platform installer/update metadata. Native cross-platform verification runs in CI; Linux update/restart was exercised locally.
- [ ] Desktop packaging, memory/CPU verification and an OBS or ClipForge recording rehearsal.

Each checkpoint needs focused delivery, explicit dependencies if stacking becomes necessary, actual rendered screenshots in its PR and a user decision before any code review.
