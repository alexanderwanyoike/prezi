# Private, shared history snapshots

The owner uses immutable updates to share unchanged project content across history and retry records. Every public snapshot remains a structured clone. Retry records hold private immutable project references, so changing an accepted response cannot poison a later retry. The 50-batch history and 128-request retry limits remain unchanged.

The design follows Redux's [immutable update patterns](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns): copy the changed object and array levels, retain unchanged values and never expose private references. No Redux dependency or implementation was copied; Redux is MIT licensed.

## Measured verification

The same temporary benchmark populated a real ProjectOwner with 100 slides, including 97 unique approximately 9,900-character bodies. It performed 150 labelled project renames, forced garbage collection before and after, recorded process.memoryUsage and exercised Undo. Each run used a separate systemd unit limited to 1 GiB RAM, zero swap and one CPU.

| Measurement                         |            Before |            After |
| ----------------------------------- | ----------------: | ---------------: |
| Additional retained JS heap         | 174,837,952 bytes |    145,296 bytes |
| Process resident memory after edits | 329,691,136 bytes | 85,102,592 bytes |

These are measurements of this scenario, not a maximum-memory guarantee for arbitrary projects. The benchmark was temporary verification code and is not shipped.

A separate red regression reproduced caller mutation corrupting the cached response. It now passes for both editing and Undo retries. All 27 domain tests, strict types, lint and build passed. Actual Electron canvas and shared MCP edit/Undo/Redo journeys passed on an isolated display. No visual appearance changed.
