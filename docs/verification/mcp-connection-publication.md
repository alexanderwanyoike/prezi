# MCP connection publication

MCP clients could observe an empty connection file between creation and completion of its write. Publish a private temporary file through a same-directory rename, following the existing project writer's atomic replacement pattern. Startup handles publication failure as a typed Result.

A deterministic slow-write test observes the public path during initial publication and replacement. It sees either no file or the previous complete JSON, then the new complete JSON. A failed replacement preserves the old file and removes temporary bytes. POSIX permissions remain 0600.

The two tests, strict type checking, changed-file lint and build passed. Three real Electron/MCP journeys passed: source compilation, focused shared edits and revisioned edits/Undo. A separate SDK request authenticated successfully and read revision 0; the private file's mode was 0600. Desktop checks used isolated Xvfb displays and profiles.
