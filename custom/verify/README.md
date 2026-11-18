# Source-run qualification

These scripts operate only the owned loopback fixture on 127.0.0.1:28155 with
explicit `WORKROOM_STATE_DIR`. They do not install Codex, authenticate an
account, create an admin token, or grant approvals. Starting a fixture is not
evidence that a model task passed.

Prerequisites are the pinned source dependencies, an independent CLI home,
the explicit runtime manifest and three ownership-labelled restricted project
containers described in `../sandbox/README.md`. Inspect their mounts and
capabilities before use. Never substitute the person's live OM home. This is
not a general installer or a migration tool.

- `start-fixture.mjs`: starts the upstream server with an isolated verification
  environment, the existing original renderer, and the restricted driver flag.
  It owns one child process; terminate the foreground supervisor to stop it.
- `prepare-team.mjs`: uses native HTTP routes to create/reuse three roles and
  attach their own MCP tools. It enables only the chosen server per role,
  disables browser/computer/helper/memory work, and keeps Ask mode. Native
  Researcher coordination is limited to the selected coordinator tools. The
  requested task must identify its two intended teammate targets explicitly.
- `audit-usage.mjs`: reads the native Usage ledger and Codex rollout counters,
  checks foreground cumulative totals and duplicate turn IDs, and overwrites a
  private reconciliation report. It never sends a message or records a charge.
  Ephemeral side-calls are reported separately with their evidence limitation.

Use the official `scripts/control-omb.ts` interface for message sends and a
stable `--send-id` for retries. Use only a native **client** token for chat and
ordinary approval responses. No admin token is needed. Keep task-specific
human grants and individual approval decisions in private evidence; do not
save permanent Allow rules. A denied/expired native card stops the workflow.

Acceptance requires real project writes, a SHA-checked edit, executed tests,
native Builder and Reviewer assignment receipts, independent read-only review,
and a final result backed by all of those records. An idle job, a normal engine
exit, simulated output or a researcher's completion statement is insufficient.
Check receipt/history/usage/native-rollout identities after an idle restart
without replaying work. Record crash recovery separately if actually tested.

Follow the upstream verification guide and run affected driver, MCP gate,
idempotency and Usage tests, custom boundary checks, typecheck/lint, Electron
checks, and packaged-server smoke. Keep unrelated platform failures visible;
do not repair the host OS or broaden permissions to turn them green. Revoke
test client tokens and stop owned model processes/containers after the run.
External project files and CLI login homes are outside a native OM backup and
need separately scoped handling during an actual migration.
