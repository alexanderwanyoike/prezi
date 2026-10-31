# Prezi

A local-first Electron presentation app for recording narrated explanations with external recording software.

- Project: saved deck content with stable IDs and one backend owner.
- Slide: ordered scene with initial text and optional reveal steps.
- Text scene definition: code component, validated properties and named editable text layers. Inspector and canvas edit the same slide instance.
- Reveal: manually triggered addition whose completed appearance holds.
- Presentation position: active slide and reveal, separate from content revisions.
- Edit batch: labelled atomic content update checked against a revision and identified for retry safety; one undo action.

Checkpoint one covers text editing, saving/reopening and manual Remotion presentation. Media, MCP and custom source follow at later checkpoints.
