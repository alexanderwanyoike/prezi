# Missing resources and retained media credits

A portable project with an absent asset entry now opens its content and shows the missing resource in the viewer. Legacy JSON projects behave the same way when their adjacent asset file is absent. Saving fails atomically until the missing resource is repaired, preserving the original project file. Corrupt archive structure, bad checksums and oversized declared entries still reject the open.

Media properties provide Locate replacement plus editable source/attribution and licence notice. A replacement must have the same image/video kind. Its new resource identity retains the existing frame, contain/cover choice, playback settings and supplied credits. The old identity and bytes remain available to shared Undo. A replaced failed custom-scene Media helper resets its decoder and error state.

Presentation theme provides Locate font on each registration. Replacing a missing selected font retains its notice and attribution, replaces that registration rather than adding another, and updates both body/detail references in the same history action. Undo restores the original identity and theme references.

MCP import_media accepts optional credit metadata and replace; import_font accepts replaceFontId. Both use existing revision guards and request-ID retry caches. Rejected/stale requests leave the project unchanged. Media credits persist with the asset descriptor inside portable saves.

## Established patterns

This extends the existing managed-copy and immutable-history patterns used by media/font imports. Replacements use new resource identities and React keys, following the existing built-in SceneMedia mount pattern, so decoder/error state cannot survive a resource change. No reference-application code was copied.

## Verification

Separate red-test and implementation commits cover a portable archive with absent media, failed save preserving the original bytes, wrong-kind replacement rejection, retained frame/playback/credits, retry-safe repair, selected-font reference repair and shared Undo. A renderer test exercises failed custom-scene image recovery after its identity changes.

The real Electron journey opens a legacy project with a missing image and selected font, uses both native Locate controls, retains/edits credits, saves/reopens the repaired portable archive, confirms decoded resources and repeats replacements through the official MCP client without duplicate effects. Manual isolated-display verification inspects the missing and repaired states and portable reopen. Screenshots are missing-assets.png and repaired-assets.png in docs/screenshots/.

Replacement notices are retained as supplied; users can edit them for the chosen replacement. No media transcoding is performed. Missing resources are repairable; malformed project metadata and corrupt archive content remain explicit open failures.

`yarn verify` passed with 55 domain/renderer/worker tests. All 24 isolated Electron journeys passed.
