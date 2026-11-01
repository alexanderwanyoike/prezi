# Transition code editor

Code view has Scene and Transition resource tabs. Transition TSX/TS/JSON drafts and generated property controls share one controller. Properties are staged in the saved draft; Apply compiles and samples the transition before replacing the working version. Duration is a shared theme setting. Invalid drafts remain editable and save inside the portable project. Version conflicts require explicit force-apply or discard.

The full combined implementation passed `yarn verify` with 68 tests and all 32 real Electron journeys. The final caption/feedback cleanup passed changed-file lint, strict types, build and the focused transition authoring journey. The authoring journey also passed after rebasing onto the preceding playback delivery. Separate failing-test commits precede implementation and authored-file diagnostic mapping.

Manually edited distance to 8 percent and duration to 350 ms, applied source, inspected the editor, introduced a string opacity error and inspected its Transition.tsx:1:1 diagnostic. Saved/reopened the portable file and verified that both the bad draft and previous working transition remained. Screenshots were captured and inspected on private Xvfb displays. No user desktop session was used.
