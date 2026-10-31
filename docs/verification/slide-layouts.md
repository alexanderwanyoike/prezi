# Reusable explanation layouts

The layout selector adds Code explanation and Process / workflow alongside Title / chapter and Text / reveals. Code has an editable block on the canvas and in the inspector, plus manually revealed notes. Process stages use the existing reveal definitions, with up to six labelled boxes and connecting arrows. The newest stage fades and moves gently into place, then holds. Navigation and video time remain independent.

The starting Vibez deck now uses a real process diagram for Planning, Implementation, Review and Human testing. Its final slide includes a tiny generated, muted, looping video. The application registers that bundled file as managed media without adding undo history or a content revision. Save streams it into the portable project, so the example remains self-contained on another computer. New presentation still creates a blank project.

The diagrams use the existing Remotion `useCurrentFrame` and clamped `interpolate` entrance pattern. No new animation framework or reference-application code was copied. The generated video is the same fixture documented in `tests/fixtures/README.md`; it contains synthetic test imagery and a quiet synthetic tone, with muted playback by default.

## Verification

Separate failing tests and implementation commits cover shared layout editing and undo, the six-stage limit, the initial diagram and managed example media. The Electron journey exercises each end-state box/arrow count, inspector and direct-canvas code edits, and decoded video playback.

Manual isolated-display verification inspects the completed workflow, a code walkthrough and moving example video, then saves and reopens the portable archive and plays its video again. Screenshots are in `docs/screenshots/workflow-layout.png`, `code-layout.png` and `example-video.png`.

Code and diagram text must still fit the composition. Code blocks are intended for short explanations, not entire source files; full source remains in the Code workspace. No recording or transcoding is added to presentation playback.
