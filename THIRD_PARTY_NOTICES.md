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
