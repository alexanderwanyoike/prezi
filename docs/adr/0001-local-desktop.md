# 0001: One local project owner

Status: accepted for checkpoint one.

Electron main owns project content, revisions and history. The isolated renderer uses a narrow typed preload bridge. MCP will connect to that same owner at checkpoint two. Presentation position belongs to the presenter and is not part of content undo history.

## Established patterns

- Electron request/response IPC and contextBridge: https://www.electronjs.org/docs/latest/tutorial/ipc
- Remotion Player for a React composition with explicit frame control: https://www.remotion.dev/docs/player/player
- Forgecut editing-service.ts and state.ts informed revision guards, a bounded idempotency cache, isolated batch validation and one undo entry per batch. These are design references, not copied source; no repository licence was found at its root.
- Auto Digger and Muzo informed semantic appearance tokens, light/dark surfaces and independent accents. Auto Digger's tooling configuration was adapted under its MIT licence; attribution is in THIRD_PARTY_NOTICES.md.

Use an active Player for the current reveal and at most one outgoing scene during a transition. Thumbnails are static HTML. Frame progress never advances presentation position. Text-only Players disable the unused shared audio pool. The 400 ms input lock ignores extra progression requests while animation completes; Escape always remains available. Worker compilation and media playback are later checkpoints.
