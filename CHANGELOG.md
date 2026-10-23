# Changelog

All notable changes are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [1.1.0]

### Changed
- **A lab is completed only after you watch the fix block your own attack.** Previously exploiting the vulnerable mode
  and clicking "Run automatic verification" was enough, so the "verify the fix" step was ticked without the learner
  ever touching the fixed mode. Every lab now detects, on the server, when the same kind of attack reaches the fixed
  mode and is refused. Progress shows four steps: exploit, repeat in fixed mode, verification, completed; the hint
  under the task always names the next step.
- Existing progress databases are migrated: completions recorded under the old rule are withdrawn (your exploits,
  hints and verification runs are kept).
- Verification results show a fourth verdict, "You saw the fix block your attack".

### Fixed
- Mobile layout: the header and every Attack Playground (plus the CSRF widget) overflowed horizontally below ~640 px;
  the "Local Lab" badge could not be hidden on small screens.
- `<html lang>` was always `en` until the language was switched by hand.
- A lab page could keep the previous lab's mode and tab when navigating between labs with browser history.
- One untranslated preset label in the Broken Access Control lab; a test now checks Russian coverage for every lab,
  hint, preset and verification check.

## [1.0.2]

### Added
- `DASHBOARD_PORT` selects the host port of the dashboard (default `3000`), e.g. when another project already uses it.

### Verified
- The Docker Compose stack was built and run on Docker Desktop 4.69 (Docker 29.4): all three images build, all services
  become healthy, `tests/smoke.py` verifies 12/12 labs and the 43 Playwright tests pass against the containers.
- On the running containers: non-root users, read-only root file systems, `cap_drop: ALL`, `no-new-privileges`, memory
  limits, no outbound network from `labs` and `backend`, the lab origin (`:8081`) returns `404` for everything except the
  pages the sandboxed previews need, and the dashboard sends its CSP and hardening headers.

## [1.0.1]

### Fixed
- Two dead reference links in the JWT lab (the WSTG page moved to `06-Session_Management/10-JSON_Web_Tokens`, the OWASP
  cheat sheet is now `JSON_Web_Token_Cheat_Sheet`).
- WSTG links now use the canonical `wstg.owasp.org` host instead of relying on redirects.

### Added
- `tests/check_links.py` verifies every reference URL (run it before a release). CWE links are reported as unverifiable
  when `cwe.mitre.org` cannot be reached from the machine running the check.

## [1.0.0]

First stable release: twelve labs, bilingual interface, hardened Docker setup.

### Added
- **Four labs**: CSRF (simulated victim browser sending real cookies and `Origin` / `Sec-Fetch-Site` headers),
  JWT Misconfiguration (`alg: none`, guessable secret, ignored expiry; in-browser token workbench), File Upload
  (active content served from an in-memory store; allow-list, magic bytes, random names) and Race Condition
  (check-then-act on a single-use coupon; parallel burst in the UI).
- Per-mode "reset" helpers for the CSRF bank and the Race Condition wallet so experiments can be repeated.
- `python-multipart` for the labs service (multipart uploads and form posts).
- `CONTRIBUTING.md`, this changelog, a release workflow, `tests/smoke.py` (every lab verifies against a running stack)
  and a CI job that starts each service with only its own `requirements.txt` (caught a missing `httpx` in the labs image).

### Changed
- Dashboard no longer shows a roadmap section once every lab is playable; the labs statistic reports how many
  OWASP Top 10:2025 categories are covered.
- The dashboard's `img-src` allows the isolated lab origin so uploaded images can be previewed.
- The lab origin (`:8081`) additionally exposes uploaded files, nothing else.

## [0.5.0]

### Added
- Labs: Stored XSS, Broken Access Control, Path Traversal (in-memory simulated file system), Security Misconfiguration.
- The API proxy reports every upstream response header in `X-Upstream-Headers` without applying any of them.
- Shared `SandboxPreview` component and shared XSS helpers.

### Fixed
- A status poll in flight during "reset progress" could resurrect a cleared exploit; sync and reset are now
  serialised (regression test included).

## [0.4.0]

### Added
- Complete automated test suites: pytest for lab behaviour and the control plane, Playwright end-to-end tests.
- GitHub Actions CI (Python tests, frontend typecheck and build, end-to-end against Docker Compose).

## [0.3.0]

### Added
- Code Diff generated from the code that really runs, three progressive hints per lab, progress tracking with
  achievements and history, English and Russian interface.

## [0.2.0]

### Added
- Labs: Reflected XSS (sandboxed iframe on a separate origin), IDOR, Broken Authentication.

## [0.1.0]

### Added
- React + TypeScript + Vite dashboard, FastAPI control plane, isolated lab service, Docker Compose setup and the
  SQL Injection lab.
