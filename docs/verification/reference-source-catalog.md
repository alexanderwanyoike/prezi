# Reference source catalog

Review finding: #6. Archived layout references travelled with every edit snapshot and dirty-content comparison. Structural history sharing had already removed per-entry deep copies in #14; this change removes the remaining reference-source payload from editing paths.

The owner now keeps read-only reference source beside editable content. Snapshots carry a catalog ID; Code fetches that catalog through a trusted, typed request when opened or when its ID changes. Keystrokes keep the same catalog ID. MCP source reads and file inventories use the retained catalog. Portable and legacy saves reattach it at the persistence boundary. Opening another project or New replaces the catalog and its ID. Editable custom source and drafts remain normal content with Undo.

This follows the existing owner-managed resource pattern and Electron's explicit two-way IPC pattern: https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-2-renderer-to-main-two-way . No external implementation was copied.

Both owner and native regressions failed before implementation because snapshots contained the archived reference. The owner regression covers 50 edits, source-free snapshots, Undo/Redo, dirty state, save preservation and defensive catalog copies. All 99 unit tests pass. Five native source, draft, MCP and archive journeys pass. Targeted lint, strict types and production build pass.

A separate private-display manual run verified the retained source in Code and MCP, edited the slide, saved a portable project and reopened the same reference code. The edited fixture snapshot was 481 bytes and contained no reference source. That size describes this small fixture only; editable scene code and drafts still travel as document content. The screenshot shows the reopened archived reference.
