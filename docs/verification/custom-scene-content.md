# Custom scene content

Generated custom scenes retain the attached image/video and actual reveal text. The public prezi module exposes Media and typed SceneProps.reveals/hasMedia. Video remains mounted and keeps playing through reveal changes. Code references and portable project sources include isolated runtime helpers and project font loading, excluding test files.

Separate failing compiler, native workflow and source-reference tests precede their implementations. The native journey exercises conversion to a custom scene and reveal changes in both Canvas and Present. Video playback is started programmatically in this journey; pointer control geometry is verified in the following viewport change.

`yarn verify` passed with 70 unit tests; all 33 Electron journeys passed. Manual private-Xvfb verification retained the video and reveal text, inspected runtime helper code, then saved/reopened the portable archive. Both runtime helpers and font-loader source were present among its 55 source references. The actual Canvas and Code screenshots were inspected.
