# Linux AppImage menu integration

Each packaged Linux AppImage launch registers a user-local desktop entry pointing at the runtime's absolute APPIMAGE path. Its icon is copied to XDG user data. Reopening a moved AppImage refreshes the same managed entry. A user-owned entry at that location is preserved. Development, unpackaged launches, Windows and macOS skip registration. Expected storage failures return typed Results and are reported without preventing the editor from opening.

The entry is applications/io.github.alexanderwanyoike.prezi.desktop beneath XDG_DATA_HOME, with its copied PNG in icons/. Unset, empty and relative data-home values use the XDG default. Invalid executable paths and control characters are rejected before writing. Entry publication uses an exclusive temporary file and atomic replacement; first creation preserves a competing entry. Exec quoting handles spaces, quotes, backslashes, dollar signs, backticks and literal percent characters.

The implementation adapts Auto Digger's user-local registration and Muzo's launcher ownership and quoting under their MIT licences, retained in THIRD_PARTY_NOTICES.md. References: [Auto Digger](https://github.com/alexanderwanyoike/auto-digger/blob/main/src/main/desktop/appImage.ts), [Muzo](https://github.com/alexanderwanyoike/muzo/blob/main/apps/desktop/electron/appimage-menu-entry.ts), [AppImage runtime variables](https://docs.appimage.org/packaging-guide/environment-variables.html), [XDG directories](https://specifications.freedesktop.org/basedir/latest/) and [desktop Exec quoting](https://specifications.freedesktop.org/desktop-entry/latest/exec-variables.html).

## Verification

Meaningful regressions failed before each implementation: missing registration, overwriting a user-owned entry, GIO failing to launch a metacharacter filename, accepting invalid locations and packaged startup omitting registration. Each test phase was committed separately from its implementation.

All 118 unit tests, formatting, lint, strict TypeScript and the production build passed. All three installed Linux journeys passed, including the new startup registration check. Packaged tests keep their menu data private.

A freshly built real AppImage was exercised using its supported extract-and-run mode, a private display, isolated session bus and private XDG directories. The run verified:

- Empty first launch, native GIO discovery, window identity and desktop-file-validate acceptance.
- Persistent icon bytes after the temporary AppImage extraction closed.
- Actual launch through the generated desktop entry, including spaces, quotes and a percent character in the AppImage filename.
- A moved AppImage updating one existing launcher.
- The editor opening normally when a file blocked the menu-data directory.

Both screenshots were inspected. The user's desktop and menu files were not used. FUSE-mounted launch and the user's desktop environment's menu UI were not exercised; the real launcher was discovered and launched through GIO on the private display.
