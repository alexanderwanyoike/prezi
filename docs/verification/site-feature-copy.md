# Product explanation and features

The download page now explains that Prezi is a local desktop presentation editor, describes canvas/code authoring and manual presentation, and explains portable projects and external screen recording. A Features section covers canvas editing, Remotion scenes/transitions, manual reveals, portable files, MCP collaboration, shared Undo/Redo, presentation styling and platform-specific updates. The navigation links directly to it.

The static build regression failed because the previous page contained no product explanation or feature section. Both site tests now pass, including the existing validated release links and local assets. Formatting, lint, strict types and the CLI build passed. The preview used actual published v0.1.0 release metadata.

Manual verification used a private-display browser at desktop and 390-pixel mobile sizes in light/dark modes. The product description, feature/download navigation, installation notes, local images/fonts, keyboard skip link and absence of horizontal overflow were checked. All four rendered screenshots were inspected. The user's desktop was not used.
