# Portable project fonts

File > Import font copies a local TTF, OTF, WOFF or WOFF2 into managed project storage. View > Presentation theme lists imported fonts for body and detail typography. Its font credit section retains supplied source/attribution and licence text. Importing or changing a font uses the same revisioned owner and undo history as slide editing.

Portable saves stream the font bytes into `assets/`; metadata and notices live in `project.json`. Legacy JSON saves copy fonts into the adjacent asset directory. Reopening restores the managed paths. Font bytes are never placed in JSON. New presentation clears font registrations; history retains bytes needed by Undo until the application closes.

Imports support up to 16 fonts, 16 MiB per compressed/input file and a declared decoded size of at most 64 MiB for WOFF/WOFF2. The browser performs actual font decoding and reports a useful error if a chosen font cannot load. Only the selected body/detail fonts load, sequentially; font faces are released when those choices or the project change. Runtime messages omit licence text and attribution.

Custom scene validation and the live isolated viewer load the same selected fonts and receive the resolved family through SceneProps.theme. Font and media IDs cannot collide. Agent imports use retry-safe request IDs; read_project lists font identities and notice lengths, and read_font returns one retained notice. import_font accepts optional credit metadata, and setTheme selects a registered font ID.

## Established patterns

Forgecut's graphic resource importer informed managed copying, font header detection, explicit resource identities and retained licence metadata. Its resource format, schema and import tests were inspected. No source was copied. Browser loading follows the standard [CSS Font Loading API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_Loading_API), using FontFace.load and document.fonts with explicit cleanup and typed failure results.

## Verification

Separate failing tests and implementation commits cover actual portable font bytes, notices, undo, idempotent imports, missing font IDs, unsupported/oversized input, asset identity collisions and declared compressed-font expansion limits.

The real Electron journey imports and decodes an installed Fontsource fixture, selects it, edits credits, saves/reopens the archive, confirms the loaded font face, reads notices through the official MCP client, imports a second font through MCP and retries without duplication. Manual isolated-display verification uses the actual bundled SIL notice, checks decoded type in both a reusable layout and a newly compiled custom scene, then saves/reopens that project.

Screenshots in docs/screenshots/: project-font-notice.png, project-font-canvas.png and custom-project-font.png. No user desktop or physical audio device was accessed. The tiny font fixture does not establish a worst-case memory measurement for every supported font.

`yarn verify` passed with 52 domain/worker tests. All 23 isolated Electron journeys passed. The final pinned-header positioning also passed the focused font journey and manual recapture after that full run.
