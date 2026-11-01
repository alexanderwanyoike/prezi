# Programmed transition playback

Presentation plays accepted numeric samples through Web Animations, retaining the default crossfade when no custom transition is installed. Outgoing content stays visible while an incoming custom renderer prepares. Playback starts only after readiness, and navigation remains locked through the captured transition duration. Theme/content updates do not restart that clock. Reveals and video retain independent animation/playback state.

Five real Electron journeys passed on this branch: transition acceptance/recovery, delayed incoming rendering with forward/back transforms, manual reveal navigation and both native video workflows. The delayed scene spends 700 ms preparing; the test observes the outgoing slide still visible at 450 ms, then checks actual positive/negative 50-percent keyframes. A separately committed failing test preceded implementation.

Manually compiled through the SDK, presented, captured the animation at 150 ms, inspected the held next slide and navigated back. Computed transforms were -51.2 and +51.2 pixels for the two layers at the capture point. The held slide remained visible until input. Captured screenshots on a private Xvfb display. Only the editor window remained after validation.
