# Third-party notices

## Auto Digger and Muzo

Tooling configuration adapted from https://github.com/alexanderwanyoike/auto-digger. Appearance tokens adapted from https://github.com/alexanderwanyoike/muzo. The following MIT licence applies to both portions.

MIT License

Copyright (c) 2026 Alexander Wanyoike

Copyright (c) 2026 Muzo contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Fonts

Manrope and IBM Plex Mono are provided through their Fontsource packages with their bundled SIL Open Font License notices.

## Remotion

`remotion` and `@remotion/player` are pinned to 4.0.539. Remotion is source-available under its own free/company licence, not MIT. The exact installed licence is retained at [licenses/remotion-4.0.539.md](licenses/remotion-4.0.539.md). Its free eligibility includes individuals; distribution or changed organisational use must be assessed against those exact terms.

The bundled font licences are retained in [licenses/manrope.txt](licenses/manrope.txt) and [licenses/ibm-plex-mono.txt](licenses/ibm-plex-mono.txt).

## zip.js

Portable `.prezi` files use @zip.js/zip.js 2.24.0 under the BSD 3-Clause licence. Its streaming reader/writer APIs and documented lazily read file Blob pattern inform the project container. The licence is preserved in [licenses/zipjs.txt](licenses/zipjs.txt). No dependency source is copied or modified.

## CodeMirror and Lezer

Read-only source inspection uses CodeMirror 6 and Lezer language highlighting under their MIT licences. The official focusable read-only example informs EditorState.readOnly, EditorView.editable and keyboard focus. One view is mounted only while Code view is open and is destroyed on replacement or exit. Licences are preserved in [licenses/codemirror.txt](licenses/codemirror.txt) and [licenses/lezer-highlight.txt](licenses/lezer-highlight.txt).

## Application commands

The styled application menu uses Electron's documented `before-input-event` and `webContents` editing APIs, the WAI-ARIA APG menubar keyboard pattern, and CodeMirror's public keymap/selectAll commands. These inform command routing, focus and selection; no reference application's source or styling was copied. Electron and CodeMirror are MIT licensed. The APG reference is used as design guidance; no example code was copied.

## Model Context Protocol SDK

The official MCP server/client 2.4.0 and Node adapter 2.1.2 provide the protocol and Streamable HTTP transport. Upstream identifies these packages as Apache-2.0 with existing MIT contributions; its exact licence is retained at [licenses/mcp-sdk.txt](licenses/mcp-sdk.txt). The official stateless Node example informs lifecycle, loopback binding and Host/Origin guards. Auto Digger's authenticated local connection pattern informs private credentials and client configuration. No reference source was copied.

## Desktop updates

Electron-updater 6.8.11 and electron-builder 26.18.0 use the MIT licence; the runtime licence is retained in [licenses/electron-updater.txt](licenses/electron-updater.txt). semver 7.7.3 uses ISC. Official v26 updater APIs inform download and checksum verification. Muzo's candidate validation/staged replacement and Auto Digger's will-quit restart inform the application design. No reference source was copied or modified; their MIT notices are retained above.

## Custom scene compilation

esbuild 0.28.2 uses MIT; its licence is retained in [licenses/esbuild.txt](licenses/esbuild.txt). TypeScript 5.9 uses Apache-2.0. Prepared offline declarations carry their original package licences in out/compiler/THIRD_PARTY_NOTICES.txt and ship with installers. The official esbuild in-memory plugin API and TypeScript compiler-host API inform bundling and virtual-file type checking. Forgecut's source compiler and systemd worker budgets were inspected as design references; no Forgecut code was copied. Custom source is never evaluated by the compiler.

## Slide preview capture

Electron's documented offscreen BrowserWindow, webContents.capturePage, nativeImage.resize and JPEG APIs inform preview capture. The existing isolated scene runtime and bounded serial work queue are reused. Electron uses MIT. No upstream implementation code was copied. Reference: https://www.electronjs.org/docs/latest/api/web-contents#contentscapturepagerect-opts

## Isolated renderer setup

The CSP sandbox response-header pattern follows the browser directive documented by Mozilla: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox . The existing restrictive network policy remains in document metadata. Electron's offscreen window, audio mute and post-navigation zoom APIs inform worker setup: https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering . These references inform API use; no implementation code was copied.

## Programmed transitions

Remotion's custom presentation pattern supplies explicit progress, entering/exiting direction and passed properties: https://www.remotion.dev/docs/transitions/presentations/custom . This informs the transition function contract; Remotion interpolation/easing functions execute in the existing isolated worker. Editor playback uses the retained bounded numeric samples. No upstream implementation code was copied; the existing Remotion licence applies to the dependency.

Presentation applies those samples through the browser Web Animations API. The existing Remotion progress/direction pattern informs the two scene roles; no additional animation library or upstream code was added.

## Canvas frame editing

The W3C Pointer Events capture/cancellation pattern informs canvas gestures: https://www.w3.org/TR/pointerevents3/ . Movement stays local until pointer release and uses the existing revisioned project commands. No implementation code or additional gesture library was copied. Declared layer frames take precedence over source styles; numeric field limits and composition bounds constrain gestures.

## Stalled scene recovery

Electron's frame tree and process metrics identify the exact prepared scene renderer. Its documented PID plus creation-time identity prevents targeting a reused process ID: https://www.electronjs.org/docs/latest/api/structures/process-metric . The frame tree includes all application web contents before termination. Failed scenes detach before their process stops to avoid Chromium propagating a page-crash event. No upstream implementation code was copied.

## Image resource limits

image-size 2.0.2 supplies header-only image dimensions under MIT; its licence is retained at [licenses/image-size.txt](licenses/image-size.txt). Its documented buffer API and Forgecut's inspected image dimension limits inform validation before copying or serving image resources. Reads are bounded to 512 KiB; no dependency or reference-application source was copied. Reference: https://github.com/image-size/image-size/tree/v2.0.2 .

## Isolated viewer readiness

Penpal's postMessage connection handshake provides an established reference for waiting for a remote frame before sending calls: https://github.com/Aaronius/penpal . Penpal is MIT licensed. The existing runtime protocol uses a repeated readiness announcement with an instance identity before its single scene load. No Penpal dependency or implementation code was copied.

## Linux CI controller delegation

Docker's rootless resource-limit documentation describes delegating cpu, memory and pids controllers to the user systemd manager: https://docs.docker.com/engine/security/rootless/tips/#limiting-resources . This informs the ephemeral CI fixture needed to exercise enforced renderer budgets. No Docker implementation code was copied or added as a dependency.
