# Focused property collaboration

Focused inspector text and built-in canvas layers now show accepted incoming edits without requiring blur. Pending local edits retain their optimistic text until acknowledgements settle, preserving the caret during local typing. External updates do not generate another edit request.

Numeric properties commit valid values while typing, so Save includes the current number even when the field remains focused. Accepted updates also appear in a focused numeric field. An unfinished invalid draft is retained when another accepted value arrives, with an inline notice; Escape restores the accepted value. Existing range validation still applies.

Media coordinate changes now send and merge only the edited frame component. Editing X cannot reapply stale Y/width/height values. The merged complete frame is validated atomically before acceptance, and the batch remains one undo action.

## Verification

Separate failing tests cover focused text and numeric updates, valid numeric changes without blur, unfinished drafts and Escape, independent coordinate patches, invalid bounds preserving content, and undo. The real Electron journey uses the official MCP client while fields retain focus, types into the middle of inspector/canvas text across acknowledgements, performs shared undo, preserves an unfinished number during an incoming update, and saves a valid focused number through Ctrl+S.

Manual isolated-display verification repeats focused collaboration and numeric draft/save behaviour. Screenshots: focused-shared-text.png and unfinished-numeric-draft.png in docs/screenshots/. No user desktop or physical audio devices are accessed.

This extends the existing pending-update guard used by custom-scene EditableText and the standard React controlled-input pattern. No reference-application code is copied.

`yarn verify` passed with 60 domain/renderer/worker tests. All 25 isolated Electron journeys passed.
