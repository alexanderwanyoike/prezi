# Replaced archive lifetime

Review finding: #6. Extracted archives remained on disk until app quit even after a successful open cleared their history.

After accepting another project, the owner releases prior extraction directories and removes their path mappings. Assets reused by the incoming archive keep their new paths. New presentation also waits for extraction cleanup. Failed opening retains the current project and its resources. Failed old-resource deletion stays tracked for retry on quit and is reported as a nonfatal cleanup diagnostic after the new content is accepted.

The open and New regressions both failed before their respective implementation commits. Relevant archive/font/recovery tests passed after open cleanup; the final eight archive/persistence/recovery tests pass after New cleanup. Strict types, targeted lint, production build and both real Electron file/quit journeys pass.

A separate manual private-display run imported media, saved two portable copies, opened the first, attempted a corrupt archive, then opened the second and created a new presentation. The corrupt open preserved the active extraction; replacement retained one current extraction; New retained zero. Muted audio, private profiles/temp directories and a 2 GiB/zero-swap scope isolated verification.

The existing owned-directory tracking and settled-deletion pattern from shutdown cleanup are reused. File content is accepted before old-resource reclamation, so a cleanup failure cannot reject a successfully opened deck.
