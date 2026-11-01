# Shared isolated renderer lifecycle

Review finding: #28. Scene validation, preview capture and transition evaluation duplicated the same security and cleanup boundary.

All three now compose one withIsolatedRenderer helper. It owns sandboxed offscreen window creation, muted audio, disabled Node integration, navigation/window denial, post-load zoom ordering, renderer-budget preparation, cancellation, deadlines and cleanup. Each caller retains its work, frame rate, content-size choice and typed error messages. The existing serial render queue remains unchanged.

This is a refactoring of the existing tested boundary. Five existing native journeys passed before extraction. All six targeted journeys pass afterward, including 30-reveal validation over slower renderer calls. Targeted lint, strict types and production build pass. Electron's sandbox and renderer termination APIs inform the existing pattern; no external implementation was copied: https://www.electronjs.org/docs/latest/tutorial/sandbox and https://www.electronjs.org/docs/latest/api/web-contents#contentsforcefullycrashrenderer .

A separate private-display manual run compiled a scene, captured its preview, evaluated a transition and cancelled another in-progress validation. Each completed/cancelled operation returned to one editor window. The accepted custom scene remained presentable. Verification used a private profile, muted audio and a 2 GiB/zero-swap scope.
