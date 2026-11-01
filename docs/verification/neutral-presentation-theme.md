# Neutral new presentations

The new-project factory stores a white background with neutral text, accents, panels and borders in the existing presentation-theme value. Startup and New share that factory. Application appearance remains a separate preference. Fallback thumbnails resolve their colours from the same saved theme as the canvas.

Older documents without an explicit theme retain the original fallback palette. Opening an existing document preserves its theme, and custom colours survive portable save/reopen. This uses the current project theme and archive model without changing document versions or migrating saved content.

The backend regression failed because a new project had no explicit neutral palette. A real Electron regression then exposed hardcoded green thumbnail colours. Both test phases were committed before their implementations. All 106 unit tests, formatting, lint, strict types and the production build passed. Four targeted Electron journeys passed for startup, New, interface copy and theme editing, including custom-scene styling and portable reopening.

Manual verification used an isolated profile and private display. It checked white canvas/thumbnail defaults and neutral text/accent values, both app appearance modes, editable custom colours, independent app accents, portable custom-palette reopening, legacy rendering and New restoring neutral defaults. Fullscreen verification waited for the renderer viewport and composition to fit before capture. All four screenshots were inspected. No user desktop was used.
