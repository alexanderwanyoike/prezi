# Stalled scene recovery

The isolated runtime sends a heartbeat every 500 ms. A visible editor watches for six seconds without a heartbeat, detaches the failed scene, reports the failure and releases presentation navigation. Undo or content correction creates a new isolated instance; Restart scene is also available. Hidden documents do not trigger the timeout. Unmounting a scene cleans up its process even before the watchdog deadline.

The main process tracks the prepared UUID, frame, PID and process creation time. Termination requires a detached frame, the same application Tab process identity and no other live application frame using that PID, including offscreen workers. The editor bridge validates the caller and UUID. No global process termination command is used.

The native regression first failed with an accepted boolean property that entered an infinite loop. A direct kill of the attached renderer propagated a page-crash signal during diagnosis; detaching first resolved it. Strict types, build, changed-file lint and four targeted Electron journeys passed, covering stall cleanup, Undo recovery, normal custom editing and ready-gated programmed transitions. The viewport journey also passed during the preceding iteration.

Manual private-Xvfb verification stopped scene PID 1592019 while editor PID 1591866 remained unchanged. Undo rendered the scene again; a second stall was cleaned up on slide switch. The actual stopped/recovered screenshots were inspected. Only synthetic scene code ran in the private app profile.
