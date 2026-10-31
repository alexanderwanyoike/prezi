# Prezi

A local-first Electron presentation app for recording narrated explanations with external recording software.

- Project container: a portable `.prezi` archive containing deck content, scene source, media and built-in fonts/licences. Legacy JSON remains supported.
- Project: saved deck content with stable IDs and one backend owner.
- Slide: ordered scene with initial text and optional reveal steps.
- Text scene definition: code component, validated properties and named editable text layers. Inspector and canvas edit the same slide instance.
- Custom scene definition: reusable TSX code, validated fields, named layers and a compiled browser module.
- Scene draft: retained raw source and metadata for a slide, saved with the project, based on a working definition version. Apply validates before consuming the draft; agent installs preserve human drafts by default.
- Scene instance: definition reference and editable property overrides; working source installs as one labelled history action after bounded compilation/render validation.
- Scene job: serial, cancellable compilation and render validation guarded by the original content revision.
- Reveal: manually triggered addition whose completed appearance holds.
- Workspace: ephemeral editor selection and actual presenter position, shared with MCP without content revisions.
- Presentation position: active slide and reveal, separate from content revisions.
- Edit batch: labelled atomic content update checked against a revision and identified for retry safety; one undo action.

Checkpoint one covers text editing, saving/reopening and manual Remotion presentation. Media and shared MCP editing complete checkpoint two. Custom scenes and desktop updates/installers are available. Human code authoring, fonts, previews and the recording rehearsal follow.

- Presentation theme: saved, revisioned deck colours, fonts, spacing and motion defaults. Separate from application appearance. Custom source receives the resolved theme through SceneProps.

- Project font: a stable resource ID, detected format, managed disk bytes, optional provenance and supplied licence notice. Theme choices reference registered IDs; runtime loading omits credit text and loads only selected faces.

- Resource replacement: a new managed identity retaining the previous placement/playback and supplied credits. Font replacement updates theme references in the same undo action. Absent assets can be repaired after open; saves remain atomic and require readable referenced resources.
