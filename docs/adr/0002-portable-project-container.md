# 0002: A portable .prezi container

Status: accepted following the request for a self-contained project file and source view.

Default saves use a versioned ZIP container with a `.prezi` extension. `manifest.json` identifies the format, text-scene version and application dependency versions. `project.json` contains deck properties; `source/` contains scene TS/TSX, schemas and presentation styles; `assets/` contains UUID-named local media; `fonts/` contains the built-in font files, styles and licences.

Use zip.js under BSD 3-Clause through its documented Web Streams and lazily read filesystem Blob APIs. Configure one worker slot, disable web workers, store entries without recompressing media and process entries serially. Source is bundled from the actual application files through Vite raw imports. Source compilation remains a later checkpoint; this container preserves the source for inspection and subsequent editing work.

Write to a unique temporary file, finish the ZIP, sync it, atomically rename and sync the containing directory on Linux. Failed saves retain the previous file. Opening validates the manifest and project before adopting any extracted media paths. Extraction uses generated paths from validated UUIDs and extensions, never archive filenames as filesystem destinations.

Bound directory reads to 8 MiB, entries to 1000, project text to 8 MiB, source files to 250000 characters each and 1000000 characters combined, and extracted media entries to 8 GiB each. Media reads/writes use 64 KiB ZIP chunks and streams. Sources have validated relative paths. Failed opens remove staged files and preserve the current owner state. Temporary media is released when its owner is disposed.

Continue reading and saving existing `.prezi.json` files. Save As defaults to `.prezi`. Archive files can move independently of original media and adjacent directories. The application remains the runtime; the container is a presentation document, not an Electron installer or a copy of node_modules.
