# Empty startup project

Startup and New presentation use the same project factory: an untitled project with one empty title slide, no reveals and no media. The owner begins clean at revision zero with no file path or history. Saved projects and update-resume reopening retain their supplied content.

The owner regression and the fresh-profile Electron regression both failed against the previous Vibez startup. The blank factory replaced the demo, and the unused packaged video was removed. Playback, layout and media journeys now explicitly open a test-only example file through the public file command; portable save journeys use Save As. The installed-editor journey also checks the blank startup before editing.

Formatting, lint, strict types, all 104 unit tests and the production build passed. Native checks cover a fresh launch and New presentation. Manual verification uses a private display and profile; screenshots show the actual blank editor in both appearance modes.

The broad Electron run passed 54 journeys and exposed one test synchronization assumption: an empty heading no longer proves that New has finished. That test now waits for the new project ID. The corrected interface and startup journeys passed together (three targeted tests), completing coverage of all 55 journeys. Manual verification checked a fresh empty launch, typing and Undo, a new project identity and both appearance modes; both screenshots were inspected.
