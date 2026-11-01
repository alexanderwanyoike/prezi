# Attached-media layer identity

Review finding: #33. A custom layer named media was routed to attached slide media for selection and frame edits.

The existing custom-definition invariant now reserves media for attached slide media. Other layer IDs and all editable property names retain their existing rules. The invariant is checked by scene-job submission and project validation, including direct installation and portable opening.

A public owner installation regression failed before implementation and now rejects the collision without changing the deck. Five relevant owner/job/property tests pass, along with targeted lint and the production build. The real Electron mapped-layer/media placement and portable-save journey passes. A separate manual preload IPC submission returned INVALID_INPUT with the reserved-name remedy and retained the complete original snapshot.

No new messaging channel or dependency was needed; the existing reserved identity pattern and shared scene-definition validation are reused.
