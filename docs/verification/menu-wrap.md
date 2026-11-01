# Menu wrapping

Review finding: #9. The closed-menu handler assumed exactly three menus when moving left.

Both handlers now use the same direction-plus-count calculation already used by moveInMenu. The current three-menu behavior is unchanged. No extra menu or speculative abstraction was added.

Both existing native menu journeys passed before and after this refactoring. Targeted lint, strict types and production build pass. A separate private-display manual run verified File-to-View left wrapping, left/right movement through all three headers and wrapping between open File/View menus. The screenshot shows the resulting File menu after wrapping back.
