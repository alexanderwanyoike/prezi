Build a small, local-first presentation application powered by Remotion, with MCP support so a human and an AI agent can create and edit presentations together.

The main use case is recording narrated explanations for YouTube. The presenter opens the presentation, speaks naturally and advances slides or reveals with the Space bar. OBS or ClipForge handles recording the screen and microphone.

The application should make that workflow easy and dependable.

## Product goal

Create an animated presentation tool with:

- A visual editor for the human.
- MCP tools for the AI agent.
- Remotion-powered slides, animations and transitions.
- Support for text, diagrams, images, code and video.
- A clean presentation view suitable for recording.
- Simple keyboard navigation.
- Local project saving and reopening.

The human and AI must edit the same project state. Changes made through MCP must appear in the interface, and changes made in the interface must be visible through MCP.

Work in the current repository. Read its AGENTS.md and other applicable instructions before implementation.

## Recording workflow

Recording happens outside this application.

For the first version, do not build:

- Microphone or webcam recording.
- Narration editing.
- Transcription or automatic speech alignment.
- A general video-editing timeline.
- Video export or a rendering queue for complete presentations.

The first version succeeds when the user can present a polished animated deck and record it with OBS or ClipForge.

## Interface

Provide two main views.

### Editor

Use a straightforward layout:

- Slide list on the left.
- Large animated preview in the centre.
- Properties for the selected slide or element on the right.
- Clear controls for adding slides, saving and presenting.

The user should be able to:

- Add, duplicate, delete and reorder slides.
- Edit text and supported visual properties.
- Choose a slide layout.
- Configure reveal steps.
- Adjust animation and transition settings.
- Import images, fonts and videos.
- Preview a slide from its initial state.
- Select an element and inspect its editable properties.
- Undo and redo changes.

Keep the interface restrained and readable. Prioritise the presentation canvas.

### Presentation view

Provide a dedicated presentation route or window:

- Clean 16:9 stage.
- Default composition size of 1920 × 1080.
- Fullscreen support.
- Editor panels and controls excluded from the recorded stage.
- Predictable keyboard navigation.
- Responsive scaling without changing the composition layout.

Entering presentation mode must start from a predictable slide and reveal state.

Leaving presentation mode must preserve the project.

## Keyboard behaviour

In presentation mode:

- Space or Right Arrow advances to the next reveal.
- Once the current slide has no remaining reveals, the next advance changes slides.
- Left Arrow returns to the previous reveal or slide.
- Escape leaves fullscreen or presentation mode predictably.

Important details:

- One deliberate keypress should produce one navigation action.
- Ignore keyboard auto-repeat so holding Space does not race through the deck.
- Prevent Space from scrolling the presentation page.
- Do not intercept navigation keys while the user is typing in an editor field.
- Clicking a video control must not accidentally advance the presentation.
- The final slide should remain visible when reached.
- Slides must not advance automatically because an animation or video finishes.

Handle input during transitions predictably without unexpectedly skipping slides.

## Slides and reveal steps

A slide can contain an initial state followed by reveal steps.

Examples:

- Reveal a heading.
- Introduce a diagram.
- Highlight its first stage.
- Add an arrow.
- Reveal the next stage.
- Show a short video demonstration.
- Finish with the complete diagram visible.

Advancing a reveal should trigger its animation, then leave the resulting state visible until the presenter advances again.

Support both:

1. Reusable slide layouts with editable properties.
2. Custom Remotion slide components for more specific visual explanations.

The AI must be able to create a bespoke animated scene through MCP and expose useful properties for the human to edit.

Avoid restricting the application to a fixed catalogue of bullet-point templates.

## Initial content types

Support these practical building blocks:

- Headings and body text.
- Images and screenshots.
- Code blocks.
- Simple diagrams using boxes, labels, arrows and highlights.
- Video.
- Custom Remotion components.

A small collection of good layouts is sufficient:

- Title or chapter slide.
- Text with image or video.
- Code explanation.
- Process or workflow diagram.
- Custom scene.

Use a shared theme for fonts, colours, spacing and transition defaults.

## Video support

Video must work as a normal presentation element.

The user should be able to:

- Import a local video.
- Place and resize it within a slide.
- Choose contain or cover.
- Configure autoplay, looping, muting and volume.
- Play, pause and restart it.
- Combine it with text, diagrams and other elements.

Important playback requirements:

- A held slide must be able to keep playing its video.
- Holding the final state of a reveal must not unintentionally freeze video playback.
- Video completion must not advance the presentation.
- Leaving a slide should stop its media playback.
- Returning to a slide should have predictable restart behaviour.
- Hidden slides must not continue playing audio.
- Handle browser autoplay restrictions through clear presenter interaction.

Start with browser-playable MP4 and WebM. Detect unsupported media and explain the problem clearly. Avoid automatically starting expensive conversions.

Store media on disk and serve it efficiently, including HTTP range requests for video. Do not put video bytes into project JSON or repeatedly load entire files into memory.

## Animation and transitions

Use Remotion for the visual behaviour.

Default to restrained animations:

- Short fades.
- Gentle movement.
- Progressive diagram construction.
- Highlights that direct attention.
- Brief typewriter effects when appropriate.

Provide a subtle crossfade as the default slide transition, approximately 250 to 400 milliseconds.

Transitions should connect scenes cleanly without adding an unexpected blank pause.

The presenter controls progression. Animation duration must not determine when a slide advances.

Keep these concepts separate:

- The active slide.
- The active reveal step.
- Animation progress.
- Media playback time.

A slide can finish its entrance animation and remain visually stable while an embedded video continues playing.

## Collaborative MCP workflow

Expose a small, coherent MCP interface.

It must support:

- Reading project structure and slide order.
- Reading the selected slide, element and presentation position.
- Adding and editing slides.
- Reordering slides.
- Editing element properties and reveal steps.
- Registering local media assets.
- Reading and updating a slide's Remotion source.
- Obtaining a bounded preview image for visual inspection.
- Undo and redo.
- Reading asynchronous job status where necessary.

Content edits and presentation navigation must be separate operations. Editing an unrelated slide must not reset the presenter's current slide, reveal or media playback.

Use stable IDs for projects, slides, elements and assets.

Use project revisions and labelled edit batches so:

- A stale edit cannot silently overwrite a newer manual edit.
- A rejected batch leaves the project unchanged.
- A successful batch is one undo action.
- Retrying an uncertain request does not duplicate its effects.

The MCP adapter must operate on the same project owner as the interface. Do not maintain a second project copy inside the MCP server.

Use the official MCP TypeScript SDK.

## Remotion source editing

Support custom slide source through the established React/Remotion workflow.

When source changes:

- Validate and compile it.
- Report useful errors with file and line information.
- Preserve the last working version if validation fails.
- Keep unrelated slides usable.
- Retain editable property definitions and asset references.

Use the same slide components for editor preview and presentation playback.

Inspect the existing Forgecut implementation at:

/home/alexander/Code/Apps/forgecut

Reuse suitable patterns for:

- Shared project state.
- Revision-guarded edits.
- Undo and redo.
- MCP integration.
- Remotion source validation and preview.
- Font and asset handling.
- Bounded worker processes.

Check the current implementation and applicable licences before copying anything. Record which existing patterns informed the new application.

Do not modify Forgecut or the user's existing video projects as part of this task.

## Technical direction

Prefer a small TypeScript application using:

- React and Vite for the interface.
- Remotion Player and Remotion components.
- One local Node backend owning project state and persistence.
- An MCP endpoint connected to that backend.
- JSON project files and a project asset directory.

Use normal browser playback for presenting. Avoid encoding video during live presentation.

Provide documented Yarn commands for development, checks and production startup, together with clear MCP connection instructions.

Keep the architecture small and responsibilities explicit. Avoid building a general production platform.

## Persistence and recovery

Save:

- Slide order.
- Slide source and component versions.
- Editable properties.
- Reveal definitions.
- Theme settings.
- Asset references.
- Presentation settings.

Save atomically.

A saved project must reopen with the same content and working asset references.

Preserve font licences and asset provenance where supplied.

Show useful errors for missing media and allow the user to locate replacement files.

Do not silently discard manual changes after failed imports or source edits.

## Visual direction

The initial theme is for The 0smosys Show.

Use:

- Black or near-black backgrounds.
- Restrained green accents.
- Monospace typography where appropriate.
- Clear hierarchy.
- Generous spacing.
- Brief terminal-style details and an occasional blinking cursor.

Keep the presentation understated and quietly confident.

Avoid exaggerated motion, giant shouting headlines, neon/grunge styling and constant decorative effects.

Make scenes interesting through composition, explanation and meaningful animation.

## Performance and memory

The user's computer has previously crashed during media work.

Design for low memory use:

- Mount only the active slide and the incoming slide during a transition.
- Use small static thumbnails in the slide list.
- Do not mount a Remotion Player for every thumbnail.
- Stop and release inactive media.
- Run expensive jobs serially.
- Make jobs cancellable.
- Avoid background renders triggered by every edit.
- Keep large media on disk.

For spawned preview or compilation workers, use configurable resource budgets. On Linux, start with a conservative limit around 1 GiB of memory, no swap and limited CPU usage.

Measure actual resource use during verification. Do not assume a successful run proves low memory usage.

## First working example

Create a small example deck for explaining how Vibez was built:

1. “Vibez / how I built it”
2. A workflow diagram:
   Planning → Implementation → Review → Human testing
3. Progressive reveals that explain each stage.
4. A media slide demonstrating imported video playback.

The workflow diagram should be a real animated example, not a static placeholder.

Use a tiny generated video fixture for verification rather than copying the user's large recordings into the repository.

## Verification

Follow TDD for application code changes.

Write meaningful tests for behaviour, including:

- Slide and reveal navigation.
- Keyboard handling while typing.
- Prevention of repeated-key skipping.
- Shared UI and MCP state.
- Revision conflicts and atomic edits.
- Undo and redo.
- Save and reopen.
- Invalid source preserving the last working slide.
- Asset persistence.

Manually exercise the finished application:

1. Create and edit a deck through the interface.
2. Change the same deck through MCP and observe the update.
3. Select a slide in the interface and inspect that selection through MCP.
4. Present the deck using Space and Left Arrow.
5. Confirm reveals hold until manually advanced.
6. Confirm video continues playing while a slide is held.
7. Confirm hidden slides stop producing audio.
8. Confirm transitions do not unexpectedly advance or reset the presentation.
9. Save, close and reopen the project.
10. Record a short presentation using OBS or ClipForge and review the result.

Capture screenshots of the actual rendered interface and presentation.

Report what was verified, resource measurements and any remaining limitations. Do not describe transcript or waveform inspection as listening to audio.

## Engineering and delivery

Follow applicable repository instructions.

Use Yarn throughout.

Use:
main <- dev <- feature/branch

Create feature branches from dev and target feature PRs at dev. Do not merge or push directly to dev or main without explicit instruction.

Keep commits atomic. For TDD:

- Run and confirm the meaningful failing test.
- Commit that test separately.
- Implement the smallest passing change in a separate commit.
- Keep refactoring separate.

Use strict TypeScript, typed Result values for expected failures, and the required linting and formatting rules.

For a new project, establish runnable linting, formatting, type checks, tests and CI from the outset.

Deliver each focused change through a pull request.

Use this PR description structure:

## Background

## Tasks

## Tested

Embed screenshots of manually verified visual results directly under Tested using image URLs accessible to reviewers.

After delivering a coding PR, ask whether the user wants a code review. Do not start that review before they agree.

Never use the Unicode em dash character.

## Implementation approach

First inspect the repository, available dependencies and reusable Forgecut patterns.

Then implement the smallest complete workflow:

Create slides → edit collaboratively through MCP → present with manual reveals and video → save and reopen.

Get that workflow working end to end before expanding the feature set.

If delivery needs multiple PRs, keep them focused and explain their dependencies and merge order.
