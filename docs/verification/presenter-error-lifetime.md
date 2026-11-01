# Presenter error lifetime

Follow-up review: #42. A fullscreen-exit error remained above subsequent application errors in the status bar.

The editor clears that error when project activity/revision changes or a presentation/view command resumes work. Current project, desktop, font, workspace and appearance errors take priority over any remaining presenter error. Both Escape and Back to editor still leave immediately after a fullscreen failure. This uses the existing React state/effect synchronization pattern without timers or new dependencies.

Both native regressions failed with the old fullscreen message masking the later save error before implementation. After the fix, both exit paths and the normal presentation journey pass, alongside targeted lint, strict types and production build.

Separate private-display manual runs injected the fullscreen and save failures through main IPC, exercised both exit controls, verified the later save error, then edited the heading and checked the clean status. Screenshots show the later error and its cleared state. No user desktop or physical audio session was used.
