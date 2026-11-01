# Isolated renderer setup

Scene documents now receive `sandbox allow-scripts allow-same-origin` in the response header, which also applies to standalone validation/capture workers. Script dialogs and downloads remain disallowed. The existing metadata policy continues restricting resource/network access. Validation is explicitly muted and applies zoom after navigation so components see a 1920 × 1080 viewport.

The Electron regression initially failed because the response header was absent. It now verifies that header, compiles a scene checking viewport dimensions and attempting a confirm dialog, checks completion without a dialog and observes the validation window's actual mute state. Existing custom runtime, compilation and preview journeys also passed.

A separate Linux test initially observed 512 MiB despite configuring 256 MiB. It now checks the actual cgroup file at 256 MiB and rejects an 8192 MiB setting. The default-limit/reused-boundary test still passes. The supported setting is 256 to 1024 MiB, default 512; swap stays zero and CPU stays at one core.

Manually compiled and displayed a scene using the real SDK on an isolated Xvfb display with the 256 MiB setting. The viewport was 1920 × 1080 and confirm returned false. The live renderer reported about 120 MiB working set. Kernel files reported memory.max 268435456, memory.swap.max 0, cpu.max 100000/100000 and memory.peak 10854400. That charged peak excludes allocations before scope attachment, so it is not the process's total peak. Only the editor BrowserWindow remained after validation. Captured and inspected the rendered scene.

`yarn verify` passed with 66 tests. All 29 real Electron journeys passed, including custom scenes, font/media handling and complete-frame preview capture.
