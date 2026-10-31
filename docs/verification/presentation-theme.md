# Saved presentation styling

View > Presentation theme edits deck colours, body/detail fonts, canvas padding, entrance motion and crossfade duration. The application appearance remains a local preference. Theme changes are revision-guarded project edits, visible through MCP, saved in portable projects and reversible through shared Undo.

Reusable layouts use the theme directly. Custom scene authors receive `SceneProps.theme`, including resolved `fontFamily` and `monoFamily` strings. New human-authored scenes use the deck background and font, and seed their exposed text-colour property from the current theme. Custom code can deliberately override any theme value.

Colour inputs are six-digit hex values. Spacing is 64-180 composition pixels; crossfades are 250-400 ms. Motion can be a gentle rise, fade, or no entrance animation. These settings do not automatically advance slides or determine video time.

## Verification

Separate red-test commits cover atomic theme edits and undo, invalid spacing preserving the project, portable save/reopen, presentation styling, MCP theme reads, typed custom-source access and themed custom-scene validation. Manual verification inspects the actual styling dialog, the resulting editor stage and presentation output on an isolated display.

The implementation extends the existing Remotion interpolation and manually controlled navigation patterns, with standard HTML dialog, colour and numeric controls. No reference-application source is copied.

`yarn verify` passed with 48 domain/worker tests; all 22 isolated Electron tests passed. Screenshots: presentation-theme-dialog.png, themed-workflow.png and themed-presentation.png under docs/screenshots/.
