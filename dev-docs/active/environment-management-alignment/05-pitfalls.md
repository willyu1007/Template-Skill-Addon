# 05 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)
- <!-- One-line rule + keywords for searching (add more as needed) -->

## Pitfall log (append-only)

### 2026-02-05 - Missing `policy_bws` in env-localctl
- Symptom: environment test failed with `NameError: policy_bws is not defined` during `env-localctl` compile/connectivity.
- Context: added policy-backed defaults for `bws` but forgot to initialize `policy_bws` in all command paths.
- What we tried: re-ran suite to capture traceback in `.ai/.tmp/tests/environment/*`.
- Why it failed: `policy_bws` variable was referenced before assignment in `cmd_compile` / `cmd_connectivity`.
- Fix / workaround: initialize `policy_bws = load_policy_bws_defaults(policy_path)` in doctor/compile/connectivity.
- Prevention (how to avoid repeating it): add new helper vars in every command path that calls `resolve_secret`.
- References (paths/commands/log keywords): `.ai/skills/features/environment/env-localctl/scripts/env_localctl.py`, `node .ai/tests/run.mjs --suite environment`
