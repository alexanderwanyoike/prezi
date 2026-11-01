# Custom scene viewport

The isolated iframe occupies the actual preview viewport. Its runtime scales a fixed 1920 by 1080 composition using the same CSS container transform as built-in scenes. Counter-scaled video controls remain 32 CSS pixels across window sizes.

The native regression first failed because iframe layout width differed from its visible width. Strict types, build, changed-file lint and six targeted Electron journeys passed after implementation. These cover native pointer Play/Pause, resize, media/reveal continuity, custom text editing, full-frame capture and offscreen sandbox/viewport checks.

Manual private-Xvfb verification clicked Play and Pause, changed reveal and resized from 1280 by 920 to 1100 by 740. The first iframe measured 724 by 407 CSS pixels, matching its visible bounds within rounding; the control measured 31.999 pixels wide. Actual screenshots at both sizes were inspected. The composition dimensions remain fixed and offscreen captures retain the full frame.
