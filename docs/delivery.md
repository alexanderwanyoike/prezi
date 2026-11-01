# Delivery

All requested implementation checkpoints are complete. The application is available on feature/final-desktop-verification and as the locally built Linux AppImage in release/Prezi-0.1.0-linux-x64.AppImage. No PR has been merged and no release has been published. main and dev still point to the approved empty bootstrap commit.

## Verification

- The combined application passed formatting, lint, strict types, 77 unit tests and its production build. All 38 real Electron journeys passed on private displays.
- Both installed Linux journeys passed, including isolated compilation, imported fonts, media controls, shared MCP state and portable reopening. The custom scene was also manually presented with its imported font and playing video.
- The latest 0.1.0 to 0.1.1 AppImage update passed download/checksum validation, replacement, restart and saved-project recovery.
- Linux x64, Windows x64, macOS arm64 and macOS x64 installer journeys and complete release-set assembly are covered by the [final verification PR checks](https://github.com/alexanderwanyoike/prezi/pull/36/checks), including custom scenes and imported fonts.
- An actual OBS recording was decoded and inspected. See [recording rehearsal](verification/recording-rehearsal.md) for frames, counters and measured resource limits.

## Scope and current limits

Built-in layouts are read-only starting points. Project-owned Remotion scenes and transitions can be authored in Code or through MCP, expose declared properties and retain invalid drafts alongside the last accepted source. Canvas edits and agent batches use the same owner and Undo history. A portable .prezi includes source, attached assets, imported fonts and supplied notices.

Entrance/reveal players currently use 12 frames at 30 fps; videos run on their own clock. Transition duration is 250 to 400 ms. Each slide has one attached media resource. Custom source runs without Node or network access, with bounded compilation and isolated rendering. Linux enforces cgroup memory/CPU/swap limits; other platforms retain process isolation and deadlines. Ad-hoc signed macOS previews have automatic updates disabled. Live updater replacement was rehearsed on Linux; Windows/macOS installation is verified by native CI.

## PR order

Every feature PR targets dev. These PRs are stacked because dev remains unmerged; each description links its focused comparison. Review and merge dependencies in the order below only when explicitly authorized. A subsequent dev-to-main promotion requires a release PR.

| PR                                                        | Change                                                               | Depends on         |
| --------------------------------------------------------- | -------------------------------------------------------------------- | ------------------ |
| [#1](https://github.com/alexanderwanyoike/prezi/pull/1)   | Add a local text-deck editor and manual Remotion presenter           | Bootstrap branches |
| [#2](https://github.com/alexanderwanyoike/prezi/pull/2)   | Use saturated editor accents in light and dark modes                 | #1                 |
| [#3](https://github.com/alexanderwanyoike/prezi/pull/3)   | Keep held presentation frames fitted across viewport changes         | #2                 |
| [#4](https://github.com/alexanderwanyoike/prezi/pull/4)   | Edit scene text directly on the canvas                               | #3                 |
| [#5](https://github.com/alexanderwanyoike/prezi/pull/5)   | Import and persist local media assets                                | #4                 |
| [#6](https://github.com/alexanderwanyoike/prezi/pull/6)   | Save portable self-contained prezi projects                          | #5                 |
| [#7](https://github.com/alexanderwanyoike/prezi/pull/7)   | Inspect Remotion source in a read-only Code view                     | #6                 |
| [#8](https://github.com/alexanderwanyoike/prezi/pull/8)   | Keep video independent of held reveal frames                         | #7                 |
| [#9](https://github.com/alexanderwanyoike/prezi/pull/9)   | Use styled application menus and Canvas/Code workspace tabs          | #8                 |
| [#10](https://github.com/alexanderwanyoike/prezi/pull/10) | Label shared undo history and make history retries safe              | #9                 |
| [#11](https://github.com/alexanderwanyoike/prezi/pull/11) | Connect MCP to shared project edits, selection and undo              | #10                |
| [#12](https://github.com/alexanderwanyoike/prezi/pull/12) | Add protected desktop update download and restart controls           | #11                |
| [#13](https://github.com/alexanderwanyoike/prezi/pull/13) | Package native installers and rehearse installed updates             | #12                |
| [#14](https://github.com/alexanderwanyoike/prezi/pull/14) | Share private history content and protect retry responses            | #13                |
| [#15](https://github.com/alexanderwanyoike/prezi/pull/15) | Compile Remotion scenes in bounded cancellable workers               | #14                |
| [#16](https://github.com/alexanderwanyoike/prezi/pull/16) | Create editable Remotion scene instances through shared MCP jobs     | #15                |
| [#17](https://github.com/alexanderwanyoike/prezi/pull/17) | Author saved Remotion drafts and apply validated scene code          | #16                |
| [#18](https://github.com/alexanderwanyoike/prezi/pull/18) | Add reusable workflow and code layouts with a playable Vibez example | #17                |
| [#19](https://github.com/alexanderwanyoike/prezi/pull/19) | Use the primary registry for pinned Yarn installer bootstrap         | #18                |
| [#20](https://github.com/alexanderwanyoike/prezi/pull/20) | Save shared presentation styling for layouts and custom scenes       | #19                |
| [#21](https://github.com/alexanderwanyoike/prezi/pull/21) | Import portable project fonts with retained provenance and notices   | #20                |
| [#22](https://github.com/alexanderwanyoike/prezi/pull/22) | Repair missing media and fonts while retaining settings and credits  | #21                |
| [#23](https://github.com/alexanderwanyoike/prezi/pull/23) | fix: synchronize focused shared fields and save numeric drafts       | #22                |
| [#24](https://github.com/alexanderwanyoike/prezi/pull/24) | fix: remove decorative interface and starter-deck copy               | #23                |
| [#25](https://github.com/alexanderwanyoike/prezi/pull/25) | fix: publish MCP connection details atomically                       | #24                |
| [#26](https://github.com/alexanderwanyoike/prezi/pull/26) | feat: capture bounded slide previews and static thumbnails           | #25                |
| [#27](https://github.com/alexanderwanyoike/prezi/pull/27) | fix: initialize bounded scenes with sandboxed muted validation       | #26                |
| [#28](https://github.com/alexanderwanyoike/prezi/pull/28) | feat: validate and persist programmable transition source            | #27                |
| [#29](https://github.com/alexanderwanyoike/prezi/pull/29) | feat: play programmed transitions after incoming scenes are ready    | #28                |
| [#30](https://github.com/alexanderwanyoike/prezi/pull/30) | feat: author transition code and portable property drafts            | #29                |
| [#31](https://github.com/alexanderwanyoike/prezi/pull/31) | Preserve custom scene media, reveals and portable helper source      | #30                |
| [#32](https://github.com/alexanderwanyoike/prezi/pull/32) | Fit custom scenes and video controls to the actual viewport          | #31                |
| [#33](https://github.com/alexanderwanyoike/prezi/pull/33) | Move and resize media and mapped custom layers on Canvas             | #32                |
| [#34](https://github.com/alexanderwanyoike/prezi/pull/34) | Recover stalled custom scenes without blocking the editor            | #33                |
| [#35](https://github.com/alexanderwanyoike/prezi/pull/35) | Bound image resources before import and decoder access               | #34                |
| [#36](https://github.com/alexanderwanyoike/prezi/pull/36) | Reliable installed custom scenes and final verification              | #35                |
