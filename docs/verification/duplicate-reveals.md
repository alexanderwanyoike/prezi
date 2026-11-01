# Duplicate reveal rows

Review finding: #1. Editing the first of two identical reveal lines left an extra row in both the editor overview and presenter.

Each stateless row now uses its position and content, matching the existing CodeExplanation and ProcessDiagram pattern. Repeated text no longer collides; changing a row replaces it. No project schema change is needed. React's documented sibling-key rule informs this fix: https://react.dev/learn/rendering-lists#rules-of-keys . No external code was copied.

Both real Electron regressions failed before implementation with an extra Repeat row. Three native journeys, targeted lint, strict types and production build pass. A separate private-display manual run verified both surfaces after editing repeated rows, including preservation of the presenter's second reveal position. Screenshots show the two resulting rows and no stale third row.
