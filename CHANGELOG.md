# Changelog

All notable changes are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [1.3.0]

### Changed
- New design: Manrope headlines and Inter text, square controls, rounded cards, bento layouts, a progress dial on
  the dashboard, stat tiles, a "next up" card and per-lab step bars. Colour roles come from one palette: primary
  #121212, secondary #008542 (fixed mode, success), tertiary #D97706 (vulnerable mode, attacks), neutral #64748B.
- On phones the navigation moves to a bottom bar.
- README screenshots and the demo GIF show the new design.

### Added
- A light theme next to the default dark one, switched from the header and remembered across visits (applied
  before the first paint, so there is no flash). The WCAG 2.1 AA audit now covers both themes.

### Fixed
- Race Condition: the parallel attack could fail on a slow or CPU-starved machine because the race window was only
  50 ms (1 burst in 10 did not race with a tenth of a CPU). The window is now 200 ms, and the verifier retries the
  burst up to three times (in fixed mode every one of those bursts must still redeem exactly once).
- `tests/check_links.py` printed nothing until every link had timed out, which looked like a hang when a host is
  blocked; results now stream, the timeout is 10 s and further links to an unreachable host are skipped.

### Changed
- Frontend build image on Node 24 LTS and nginx-unprivileged 1.31; Dependabot ignores odd (non-LTS) Node majors.
- CI runs once per pull request instead of twice; GitHub Actions updated to current majors.
- The release workflow refreshes an existing release when a tag is pushed again.

## [1.2.1]

### Fixed
- Accessibility (WCAG 2.1 AA): secondary and tertiary grey text was 2.3:1 and 3.8:1 against the dark background and
  is now at least 4.5:1 everywhere; the logo link's accessible name matches its visible text; locked achievements are
  muted with colour instead of opacity; long code blocks can be focused and scrolled from the keyboard.
- The mode and persona switches were buttons pretending to be radio buttons without arrow-key support; they are now
  native radio groups.
- The Stored XSS "Clear comments" button also submitted the comment form (buttons now default to `type="button"`).

### Added
- Linting in CI: Ruff for Python, Biome for the frontend (typescript-eslint does not support TypeScript 7).
- An axe-core audit in the end-to-end tests for every page, lab, tab and mode, plus a keyboard test for the mode switch.
- Pinned Python dependencies (pip-tools) and Dependabot for pip, npm, Docker and GitHub Actions.
- A demo GIF and badges in the README.

### Changed
- The default branch is `main`.

## [1.2.0]

### Changed
- New visual design: minimal, dark, built on two colours that mean something. Amber is the vulnerable mode, glacier
  blue is the fixed mode; switching modes shifts the colour of the whole screen and sweeps a thin line across the lab
  header. Onest (with full Cyrillic) for text and JetBrains Mono for code, both bundled so the lab works offline.
- The dashboard is a list grouped by OWASP category; each lab shows three step markers (exploited, fix blocked the
  attack, verified) that fill in on load.
- Motion answers the learner's actions: a progress step pulses when the server confirms it, verification results
  arrive one by one, tabs fade. `prefers-reduced-motion` turns all of it off.

### Fixed
- Code Diff: a long line in one column ran over the other column; long lines now wrap inside their own column.
- Long outcome messages in the lab widgets no longer run past the card edge on phones.

### Added
- End-to-end layout tests: no sideways scrolling at 375 px on any page or lab tab, no Code Diff line leaving its column,
  the mode colour and the page language are applied.

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
