# Canvas frame editing

Selecting attached media or a custom layer with a declared frame exposes move and resize handles. Pointer movement previews locally; release commits changed axes in one labelled shared history action. Escape, pointer cancellation and incoming frame/pending changes discard the local gesture. Declared numeric limits and composition bounds constrain movement. Video controls retain their own pointer and keyboard behavior, and presentation mode has no editing handles.

Separate native failing tests precede implementation. The first exercises media movement, resize, one Undo per gesture, Redo, cancellation and native video controls. The second catches source styles overriding mapped properties, moves a custom layer, checks media selection through the real MCP SDK and retains positions through portable saving/reopening.

`yarn verify` passed with 70 unit tests and all 36 Electron journeys passed. The cancellation check was then strengthened to require an actual changed preview and a settled resized frame; the manual journey passed with those assertions. Manual private-Xvfb verification exercised move, resize, Undo/Redo, active-gesture cancellation, video controls, mapped-layer placement, MCP media selection and portable reopening. Actual media, mapped-layer and custom-media handle screenshots were inspected.
