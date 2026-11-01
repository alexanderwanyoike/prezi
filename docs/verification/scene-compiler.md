# Bounded scene compiler

The source compiler bundles TSX and local TS/JSON files through esbuild's in-memory plugin API. Only react, react/jsx-runtime, remotion and the application helper module prezi may remain external. TypeScript checks against an offline virtual filesystem containing approved declarations. It cannot resolve arbitrary host files. Dynamic module loading and explicit any types are rejected. A TSX entry must export a compatible default React component.

Sources are limited to 32 files and 1 MB; compiled output is limited to 2 MiB. Diagnostics include bounded file, line and column information. Compilation does not execute the submitted source. A shared queue permits one active and at most three waiting compilations; queued cancellation removes work immediately.

Linux workers require a functioning user systemd session. Each worker has a configurable 256-1024 MiB RAM budget (PREZI_WORKER_MEMORY_MB, default 1024), zero swap, one CPU and a 25-second deadline. There is no unbounded Linux fallback. The worker checks its kernel cgroup limits and reports peak memory and CPU use. Other platforms use a separate process, V8 heap limit and deadline; they do not currently have the Linux hard process-tree memory limit. Cancellation stops the Linux unit and its process tree.

## Verified

- Separate red tests and implementation commits cover real bundling, syntax locations, type errors, unsupported modules, missing exports, dynamic imports, worker compilation, cancellation and queue serialization.
- A real Electron executable running as Node launched the worker under systemd, compiled a Remotion scene and reported peakMemoryBytes 169,291,776, cpuMicros 1,571,419, memoryLimitBytes 1,073,741,824 and swapLimitBytes 0. This is a measured small-scene run, not a maximum-use prediction.
- The worker used no browser window or host display. No user desktop session was manipulated.

The compiler foundation is connected to project revisions, last-working scene replacement, UI and MCP in the next focused slice. This delivery does not yet make the Code tab editable.

Design references: [esbuild plugin API](https://esbuild.github.io/plugins/) and [TypeScript compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API), plus read-only inspection of Forgecut's source validation and bounded-worker approach. No reference source was copied.
