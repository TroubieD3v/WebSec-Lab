# Contributing

Thanks for helping make WebSec Lab better. The project's rule of thumb: **a lab is only done when it is provable**.
That means a runnable vulnerable mode, a fixed mode, automated checks that show the difference, and honest teaching
content.

## Setup

See "Local development" in the [README](README.md). Run the checks before opening a pull request:

```bash
pytest
cd frontend && npm run typecheck && npm run build
cd tests/e2e && npx playwright test      # needs the stack running (docker compose up, or the three dev servers)
```

## Release checklist

```bash
pytest && (cd frontend && npm run typecheck && npm run build)
python tests/check_links.py                    # every reference URL still resolves (needs internet)
docker compose up --build --detach --wait
python tests/smoke.py                          # every lab verifies against both modes
(cd tests/e2e && npx playwright test)          # browser tests against the Docker stack
docker compose down --volumes
```

Then update `CHANGELOG.md`, bump the versions (`backend/app/__init__.py`, `frontend/package.json`,
`tests/e2e/package.json`), commit, and tag `vX.Y.Z` (the release workflow publishes the notes).

## Adding a lab

The step-by-step list is at the end of [docs/architecture.md](docs/architecture.md). In short:

1. `labs/<package>/router.py`: the vulnerable and fixed code between `# region vulnerable` / `# region fixed`.
   Detect the learner's progress with `mark_solved` (the attack worked in vulnerable mode) and `mark_blocked` (the same
   attack was refused in fixed mode; ordinary use must not trigger it). Keep both in the endpoint glue, **outside** the
   regions, so the Code Diff shows only
   the lesson.
2. `backend/app/content/<lab>.py`: English **and** Russian text, three hints, presets, references.
3. A verifier in `backend/app/services/verification.py` with `functional`, `attack` and `defense` checks.
4. A widget in `frontend/src/labs/` and strings in both `i18n/en.ts` and `i18n/ru.ts` (the types enforce parity).
5. Tests in `tests/security/` (both modes, normal use, that only a real exploit sets the challenge flag) and
   `tests/e2e/specs/`.

## Safety rules for lab code

Vulnerable code must be unable to hurt the machine running it:

- no real file-system access driven by user input (simulate it in memory), no shell, no outbound network;
- databases are in-memory and read-only where an injection is possible (see the SQL lab's authorizer);
- anything that renders attacker-controlled HTML does so in the sandboxed iframe on the isolated origin, never on the
  dashboard origin;
- cap sizes and runtime of anything the learner controls.

New labs must keep these properties and add a test for each that applies.

## Style

- Python: type hints, small functions, comments only where the reason is not obvious.
- TypeScript: strict mode, no `any`, components stay small.
- Commits: imperative, one logical change each.
- Security issues in the *platform* (not the intentional labs): see [SECURITY.md](SECURITY.md).
