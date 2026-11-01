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

Editable text element IDs are `<slide UUID>:heading` and `<slide UUID>:body`. Imported media uses `<slide UUID>:media`. Pass null for the element to select the slide itself. Media and custom layers with declared numeric frame mappings support Canvas move/resize handles. Each completed gesture publishes one shared edit and Undo action; Escape or pointer cancellation restores the previous frame. Media controls remain independent.

For an edit, first read the latest project revision. Supply a unique request ID, a short human-readable label and operations. A stale revision or invalid operation rejects the whole batch. Agent labels appear as `Agent: <label>` in the UI. Keep related operations in one batch so the human can undo them together. Undo/redo affect the shared chronological content history, including human work; read their labels before invoking them.

If a response is uncertain, retry the exact request ID and payload. Successful edits and history operations are remembered in a bounded cache. Concurrent identical media registrations share their result. A reused ID with a different payload is rejected. Read current state after an old retry response; its revision describes the original operation. Request bodies are limited to 1 MiB and edit batches to 100 operations.

Source reads access the project's stored source map, falling back to bundled scene source for a new deck. They cannot read arbitrary filesystem paths. Custom source jobs are described below. Bounded preview-image retrieval follows separately.

## Custom Remotion scenes

`compile_scene` accepts requestId, expectedRevision, slideId, label, candidate and properties. The candidate contains a stable UUID id, name, source `{entry, files}`, fields and layers. Use a TSX entry and static imports from local source files, react, remotion or prezi. Source is limited to 32 files and 1 MB. Editable fields support text (optional multiline), number (optional min/max), color and boolean, each with a label and default. Layers declare stable id/label, an optional property and optional frame mapping `{x, y, width, height}` to numeric field names.

A component default-exports a React scene. Import SceneProps from prezi for exact generated property types; it exposes title, body, reveal, the actual reveals array, hasMedia and props. Import Text and Layer for viewer editing, and Media to render the slide's attached image or video. For example, `Text property="headline"` binds a declared text field. Layer's id matches a layer declaration. Remotion's useCurrentFrame controls the current 12-frame entrance/reveal animation; reveal is manually controlled and independent of video time.

Read `read_job` with the returned job ID until complete, failed or cancelled. Compilation and preview validation run serially, with at most three waiting jobs and 32 retained status records. Completed jobs report the accepted revision and compiler resource measurements. An uncertain retry uses the original requestId and payload. A changed candidate needs a new requestId. Cancel pending work with cancel_job; reverse accepted work through shared Undo.

The source is accepted only after type checking and isolated render validation. Failed/stale/cancelled jobs preserve the working version. `updateSceneProperties` in edit_project merges a property patch into one scene instance and validates its types/limits. Named custom element IDs are `<slide UUID>:<layer id>`. Source paths returned by read_project include `scenes/<definition UUID>/source/<file>` and `scenes/<definition UUID>/definition.json`; read_source remains bounded and never reads arbitrary disk paths. Successful custom source and instance properties persist inside portable projects.

Human drafts are exposed at `drafts/<slide UUID>/source/<file>` and `drafts/<slide UUID>/definition.json`. `setSceneDraft` in edit_project retains incomplete source without replacing the working scene. compile_scene accepts optional expectedDefinitionVersion (UUID or null) and consumeDraft. Agent installs preserve drafts by default; set consumeDraft only when deliberately applying that human draft. Working definitions include a fresh version UUID after every accepted installation.

read_project includes the resolved presentation theme. Use setTheme with a partial patch in edit_project; it is one shared history action. Custom SceneProps.theme includes deck colours, padding, motion defaults, and resolved fontFamily/monoFamily strings.

## Project fonts

read_project lists registered font IDs, names, format, provenance and notice length. read_font({fontId}) returns one retained notice (maximum 65,536 characters). import_font accepts requestId, expectedRevision, absolute path and optional credit {provenance, license}. Retry with identical input. Use a setTheme patch with bodyFont or monoFont set to that UUID to select it. updateFont edits supplied credit metadata. Font imports are limited to 16 MiB input and declared WOFF/WOFF2 decoded size of 64 MiB; only 16 registrations are allowed per project.

## Resource replacement

import_media accepts optional credit {provenance, license} and replace: true. Replacement retains the old frame/playback/credits, requires the same image/video kind and registers a new resource identity. updateMedia can edit provenance and licence text. import_font accepts replaceFontId to replace one registration, retain its supplied credits and update body/detail theme references atomically. Both replacement routes use the same request-ID retry and revision rules as normal imports. Undo restores the original resource references.

Focused editor text and numeric properties follow accepted MCP updates. Valid numeric values commit while typing; unfinished invalid drafts are retained with an explicit conflict notice. updateMedia.frame accepts partial coordinates and merges them with the current frame before validating bounds, so clients should send only the components they intend to change.

## Preview capture

`capture_preview({requestId: "preview:<unique ID>", expectedRevision, slideId, reveal})` captures any slide at held frame 11, including custom scenes, deck fonts and media. It leaves the human view, selection, playback, revision and Undo history untouched. Poll `read_job`, then call `read_preview({jobId})` for JPEG image content. `cancel_job` cancels queued or active capture. Retrying identical input reuses the job.

Compilation/validation and captures share one serial queue with at most three waiting jobs. Captures use a muted offscreen renderer, a 10-second deadline and 960 × 540 JPEG output capped at 1 MiB. Linux renderer limits default to 512 MiB, zero swap and one CPU after preparation; `PREZI_SCENE_MEMORY_MB` configures 256 to 1024 MiB before startup. Other platforms retain process isolation and deadlines. Preview records expire after 16 entries or 4 MiB of image text; the editor retains at most 2 MiB. Previews are temporary. Use the camera control above the slide list to update the selected thumbnail; edits invalidate its image without starting background renders.

## Transition source

`compile_transition` accepts a `transition:` requestId, expectedRevision, label, candidate `{id, name, source, fields}` and properties. Optional expectedVersion guards the working definition; consumeDraft is explicit. Retry identical input and poll `read_job`; `cancel_job` cancels queued/running work. Source, properties and validated samples persist as one shared Undo action. Errors and stale revisions retain the previous working transition.

Default-export a function using `TransitionProps` and `TransitionStyle` from `prezi`. Inputs are progress (0 to 1), direction (`entering`/`exiting`), navigation (`advance`/`back`) and generated typed props. Remotion interpolation and easing functions are available; React hooks require a component context and do not belong in this function.

Outputs are numeric: opacity 0 to 1, x/y in slide percentages from -200 to 200, scale 0.1 to 4, rotate in degrees from -360 to 360, blur 0 to 24 pixels, and clipTop/Right/Bottom/Left from 0 to 100 percent. Missing values use the normal slide state. Entering must finish at that normal state; exiting must start there. All 61 samples for each role/navigation direction are checked in a muted, isolated worker with a 10-second evaluation deadline. Compilation/evaluation share the existing serial queue. Presentation plays the accepted numeric samples after the incoming scene is ready. Space/Right and Left still control slide/reveal navigation.

`read_project` exposes transition metadata and properties. `read_source` exposes `transition/definition.json` and `transition/source/<file>`. A raw saved draft uses `setTransitionDraft` and `transition-draft/` source paths. Accepted agent jobs preserve drafts by default.

Human authors use **Code > Transition**, then **Create transition code** or **Edit transition code**. Property changes enter the same saved draft as source edits and take effect through **Apply transition code**. Drafts can contain invalid source/metadata without replacing accepted playback. A changed working version blocks normal Apply; an explicit force apply uses the latest accepted version. The preceding working source and the invalid draft both survive portable save/reopen.
