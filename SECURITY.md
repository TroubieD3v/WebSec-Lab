# Security Policy

## Intentional vulnerabilities

WebSec Lab contains **deliberately vulnerable code** in `labs/` (in `vulnerable` mode of every lab). These are not
bugs and should not be reported as vulnerabilities. Examples: SQL injection in `labs/sql_injection`, unescaped
reflection in `labs/xss`, missing ownership checks in `labs/idor`, weak authentication in `labs/authentication`, forgeable tokens in `labs/jwt_misconfig`, unrestricted uploads in
`labs/file_upload`, a cookie-only bank in `labs/csrf`, a check-then-act race in `labs/race_condition`.

Never deploy WebSec Lab on a shared network or the public internet. The default Docker setup binds only to
`127.0.0.1`; keep it that way.

## What *is* in scope

Please report issues that let a lab escape its intended boundary or compromise the machine running it:

- the control plane (`backend/`, `frontend/`) being exploitable (XSS on the dashboard origin, SSRF or path tricks
  through the Attack Playground proxy, injection in progress storage, etc.);
- a way to reach the lab service's internal endpoints (`status`, `source`, `reset`) or other labs from the
  published lab origin;
- a way to make the lab service read or write files, run commands, or reach the network (the SQL lab is meant to be
  confined to read-only queries on an in-memory database);
- container isolation weaknesses in `compose.yaml`;
- vulnerable-mode behaviour that is *more* dangerous than documented (e.g. an exploit that leaves the intended
  scenario), or a fixed mode that can still be bypassed.

## Reporting

Use GitHub's private vulnerability reporting for this repository ("Security" tab, "Report a vulnerability"). If it
is not available, open an issue asking for a private contact without including exploit details. Please include
reproduction steps and the version or commit.

We aim to acknowledge reports within a few days. This is a volunteer-run educational project, so there is no bug
bounty.
