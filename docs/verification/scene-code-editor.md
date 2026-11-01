# Editable scene code

The Code tab now edits a persisted draft rather than the live compiled component. Create a custom scene from a built-in slide, or choose Edit scene code on a custom scene. Edit TSX/TS/JSON files, add helper files, and edit `definition.json` for the scene name, exposed fields and named layers. Built-in reference files remain read-only.

Apply sends the draft through the existing serial compiler and isolated renderer validation. Diagnostics include source paths and line/column information. Invalid code leaves the working slide intact. A successful Apply is one shared undo action and consumes the draft; undo restores both the former working scene and the applied source draft. Discard is undoable too.

Drafts are project content. File > Save retains them even when their code or metadata is incomplete. A working scene version is recorded when a draft is created. An agent can replace the working scene without deleting that draft. A stale draft requires the human to explicitly choose Apply draft anyway, and the final revision guard still rejects changes made during compilation.

CodeMirror 6 supplies editing, syntax highlighting, selection and local text undo. The project owner supplies labelled, revision-guarded document history. This follows [CodeMirror's annotated synchronization pattern](https://codemirror.net/examples/split/): owner updates are marked as external transactions and excluded from the editor's local text history. No reference application code was copied.

## Verification

- Separate failing tests and implementation commits cover persisted incomplete drafts, explicit draft consumption, working-version conflicts, the UTF-8 project budget, undeclared inherited properties and Code-tab slide switching.
- Real Electron journey: save an unapplied draft, reopen the portable project, switch slides, reject malformed TSX while preserving the canvas, apply valid code, and undo to the prior scene and restored draft.
- Manual isolated-display demo: edit the generated Remotion template, inspect syntax diagnostics, Apply it, inspect the actual custom canvas, then Save, New and Open the portable project.
- Screenshots: `scene-code-draft.png`, `scene-code-diagnostics.png`, `scene-code-applied.png` in `docs/screenshots/`.

The existing compiler queue, deadlines and Linux memory/CPU limits apply to human and MCP compilation. A draft's entry filename is fixed; helper files can be added and removed. Leaving the Code tab does not cancel an already submitted job.
