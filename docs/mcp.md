# Connect an agent

Open Prezi, then choose **View > Agent connection**. Copy the connection configuration into an MCP client that supports Streamable HTTP and custom headers. Keep Prezi open. The copied JSON has this shape; the actual clipboard value contains your private token:

```json
{
  "mcpServers": {
    "prezi": {
      "type": "http",
      "url": "http://127.0.0.1:39471/mcp",
      "headers": { "Authorization": "Bearer YOUR_PRIVATE_TOKEN" }
    }
  }
}
```

The endpoint binds only to 127.0.0.1. Host and Origin guards reject non-local browser origins. The token stays in the main process and a private `mcp-token` file inside Electron's user-data directory. `mcp-connection.json` in the same directory supports local client discovery; both files use private permissions on Linux/macOS. They are not part of a `.prezi` archive. The dialog displays the address, without displaying the token.

The default port is 39471. Set `PREZI_MCP_PORT` to another available port before starting if necessary. Port 0 chooses a free port, useful for isolated verification. A failed MCP startup leaves the editor usable and is reported in the connection dialog. Use the newly copied configuration after changing the port or profile. Connection discovery is valid only while that app instance is running.

## Tools

| Tool             | Purpose                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| `read_project`   | Identity, ordered slide summaries, source paths/lengths, revision and history labels |
| `read_slide`     | Full properties and reveals for one stable slide ID                                  |
| `read_view`      | Selected slide/element and current presentation position                             |
| `select_element` | Select in the editor without navigating the presenter or editing content             |
| `read_source`    | Stored project source, default 16,000 characters per chunk, maximum 64,000           |
| `edit_project`   | One labelled atomic edit batch with revision and request ID                          |
| `import_media`   | Register an absolute local image/video path as one reversible edit                   |
| `undo` / `redo`  | Shared content history with revision guards and retry IDs                            |

Editable text element IDs are `<slide UUID>:heading` and `<slide UUID>:body`. Imported media uses `<slide UUID>:media`. Pass null for the element to select the slide itself. Media positioning currently uses the inspector and `updateMedia` properties; canvas drag handles follow separately.

For an edit, first read the latest project revision. Supply a unique request ID, a short human-readable label and operations. A stale revision or invalid operation rejects the whole batch. Agent labels appear as `Agent: <label>` in the UI. Keep related operations in one batch so the human can undo them together. Undo/redo affect the shared chronological content history, including human work; read their labels before invoking them.

If a response is uncertain, retry the exact request ID and payload. Successful edits and history operations are remembered in a bounded cache. Concurrent identical media registrations share their result. A reused ID with a different payload is rejected. Read current state after an old retry response; its revision describes the original operation. Request bodies are limited to 1 MiB and edit batches to 100 operations.

Source reads access the project's stored source map, falling back to bundled scene source for a new deck. They cannot read arbitrary filesystem paths. Custom source updates/compilation, preview capture and asynchronous job tools are introduced in later slices; they are not advertised by this adapter yet.
