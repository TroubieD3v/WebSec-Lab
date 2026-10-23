# Threat model

WebSec Lab runs deliberately vulnerable code on a learner's machine, so the main goal is that **the vulnerabilities
stay inside the labs**. Everything else is derived from that.

## Assets

- the learner's machine and network;
- the dashboard origin (it holds the learner's progress and can call the control-plane API);
- the integrity of the lab explanation (a fixed mode that is secretly still vulnerable is a teaching bug).

## Trust boundaries

1. **Browser ↔ dashboard origin (`:3000`)**: trusted UI and API.
2. **Dashboard ↔ lab origin (`:8081`)**: untrusted. Lab pages are rendered only inside a sandboxed iframe from a
   different origin.
3. **backend ↔ labs**: the lab service is treated as untrusted. Its responses are never rendered as HTML.
4. **Containers ↔ host/internet**: the `labs` and `backend` containers have no outbound network access.

## Threats and mitigations

| Threat | Mitigation | Verified by |
|---|---|---|
| Reflected XSS payload runs on the dashboard origin | Lab HTML only in `sandbox="allow-scripts"` iframe on a separate origin; proxy returns HTML as `text/plain` + `CSP: sandbox` + `nosniff`; dashboard CSP | `tests/e2e/specs/xss.spec.ts`, `backend/tests/test_proxy.py` |
| Injected lab script reads or acts on the dashboard | No `allow-same-origin`, separate origin, message accepted only from the iframe's window | e2e: "injected script cannot reach the dashboard" |
| SSRF / path tricks through the Playground proxy | Fixed upstream host, no redirects, allow-list of labs and modes, `.`/`..`/`//`/`\\` rejected, path re-encoded | `backend/tests/test_proxy.py` |
| Reaching internal lab endpoints (`reset-all`, `source`) from outside | Proxy only builds `/<lab>/<mode>/...`; nginx exposes only the XSS pages and upload previews on `:8081` | proxy tests, `frontend/nginx.conf` |
| SQL injection used to attack the host | In-memory SQLite, authorizer allows only `SELECT`/`READ`/safe functions (no `ATTACH`, `PRAGMA`, DDL, `load_extension`), 0.5 s per-query limit, row cap | `tests/security/test_sql_injection.py` |
| Lab escapes its container | Non-root user, `read_only` filesystem, `cap_drop: ALL`, `no-new-privileges`, memory/CPU/PID limits, internal network without egress | `compose.yaml` |
| Lab exposed to the local network | Published ports bind to `127.0.0.1` only | `compose.yaml` |
| Learner (or malware) spoofs the verifier header to skip a challenge | Proxy forwards only `Authorization`, `Content-Type`, `Accept`; the header only *prevents* counting an exploit | `backend/tests/test_proxy.py` |
| Verification regresses silently (fix stops working) | Defense checks run against the real fixed code on every verification and in CI | `backend/tests/test_verification.py` |
| Path Traversal lab reads real files on the learner's machine | The lab's files live in an in-memory dict keyed by POSIX paths; no real file is ever opened | `tests/security/test_path_traversal.py` (patches `open`/`Path.read_text` to fail) |
| Verbose headers or errors from a lab reach the dashboard | The proxy only *reports* upstream headers in `X-Upstream-Headers`; none is applied to its own response | `backend/tests/test_proxy.py` |
| CSRF lab depends on browser cookie behaviour | The victim's browser is simulated server-side with real cookie, `Origin` and `Sec-Fetch-Site` headers; the session cookie never leaves the lab | `tests/security/test_csrf.py` |
| Uploaded active content runs on a trusted origin | Files live in memory, are served only from the isolated lab origin and previewed in a sandboxed iframe without `allow-same-origin`; nginx exposes only `uploads/<safe-name>` | `tests/security/test_file_upload.py` (nothing is written to disk), e2e |
| JWT lab leaks real secrets or keys | Only fake credentials; the fixed mode uses a random per-process secret; tokens are signed in the browser and the secret field is local | `tests/security/test_jwt.py` |
| Race lab used as a CPU or thread sink | Simulated latency is 50 ms, wallets are tiny in-memory counters, requests are bounded by the proxy limits | `tests/security/test_race_condition.py` |
| Control plane abused for DoS | Request/response size caps, 5 s upstream timeout | `backend/app/routes/proxy.py` |

## Known limitations

- Demo credentials and tokens (`alice-demo-token`, `sunshine`) are public by design and valid only inside the
  fake dataset.
- Lab state is process-wide and in memory: there is one learner per instance.
- The control plane has no authentication. It is a single-user local tool bound to loopback.
- Browsers share cookies across ports of the same host, so a script running on the lab origin (`:8081`) could read cookies of `127.0.0.1`. The dashboard sets none; do not host anything else on that host name while the lab runs.
- The dashboard CSP in `frontend/nginx.conf` allows the lab origin on `127.0.0.1:8081` and `localhost:8081`; other
  hostnames require editing it.
- Docker isolation depends on the container runtime. On shared machines prefer a dedicated VM.
