# Prezi instructions

Follow the user's global engineering instructions. Use Yarn exclusively.

- Git flow is `main <- dev <- feature/branch`. Deliver focused PRs targeting dev; never merge or commit/push changes to dev without explicit authorization.
- TDD is mandatory for application changes. Confirm the meaningful failing test and commit it separately before its implementation. Keep refactoring in separate commits.
- Verify the real Electron workflow. Visual PRs must embed reviewer-accessible screenshots under Tested.
- PR sections are Background, Tasks (checklist), Tested, and optional Tech Debt. Ask whether to run the code-review skill after delivery; do not start it without agreement.
- Use strict TypeScript, typed Results for expected failures, Airbnb-based lint rules and no explicit or implicit any or unsafe operations. Never suppress safety rules.
- Small cohesive files, one class per file, composition, KISS and YAGNI. Comments explain non-obvious constraints only.
- Keep expected failures explicit at boundaries. Keep presentation position separate from content revisions and animation progress.
- Inspect established implementations and licences; record adopted patterns. Never modify the reference applications.
- The Unicode em dash character is prohibited in output and authored content.

## Agent skills

### Issue tracker

GitHub Issues in alexanderwanyoike/prezi. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role names are the proposed vocabulary; do not create labels without a triage task. See `docs/agents/triage-labels.md`.

### Domain docs

Single context in CONTEXT.md and docs/adr/. See `docs/agents/domain.md`.
