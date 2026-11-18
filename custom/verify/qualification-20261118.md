# Restricted native Codex qualification

The source-run profile on OM v0.1.166 was qualified on macOS with existing
Codex CLI 0.162.1 and the existing subscription sign-in. This qualifies the
restricted project workflow, not a new desktop release or VPS deployment.
The original renderer, native harness, coordinator and Usage ledger were used.

- Researcher wrote PLAN.md and delegated to the designated Builder.
- Builder created the Python interval-merger project, ran 11 unit tests and
  the sample CLI, then read the README SHA and successfully edited that file.
- Researcher received the native result and delegated to the designated
  Reviewer. Reviewer independently read all five artifacts and ran the original
  tests plus four additional groups, including 17 invalid-input cases and CLI
  error behaviour. The read-only project hashes remained unchanged.
- The native job finished with exactly one Builder assignment and one Reviewer
  assignment. Researcher executed three segments: planning and two native
  continuations. These continuations are not duplicate task dispatches.
- Task-specific human authorization covered the native project approval cards;
  no permanent Allow rule was saved. Three out-of-range timeout requests were
  refused before execution and the agents corrected their parameters. The
  container limits and native read-only policy were not loosened.
- Native Usage agreed with the independently retained Codex cumulative counters.
  Cache tokens are a subset of input; reasoning is a subset of output. Failed
  setup/denied attempts and background memory calls remain in the earlier
  history. Missing prices remain null; subscription quota units are unknown.
- After a graceful completed-task restart, replaying the original send identity
  returned the original receipt. All threads, job execution counts, artifacts,
  Usage bytes and native rollout bytes were identical. In-flight crash recovery
  was not tested.

The qualification retained private task authorization, individual native approval
decisions, actual tool inputs/results, artifact hashes, native job snapshots,
rollouts, resource samples and a counter reconciliation outside Git. The runtime
and project data remain independent from the person's Codex configuration.
No model tool had access to the Mac terminal, network, personal credentials or
another project. The trusted OM server and Docker daemon are outside the model's
project sandbox.

Affected native regression tests (391 assertions), custom boundary checks,
typecheck/lint, Electron syntax, i18n, broker and packaged-server smoke passed.
The full upstream test chain is **not** certified: two Swift speech-helper
tests failed with a host compiler/SDK mismatch; broad Vitest was interrupted
after unrelated DOM storage failures. The two affected UI files passed all
27 assertions with the test-only Node 26 webstorage compatibility flag.
No UI source, host toolchain or model sandbox was altered for those checks.

External project files are not automatically a native OM backup or Files-panel
integration. These need explicit verification in the next project-workspace
stage. Phone/VPS/Computer Use and other model providers are outside this
qualification. Finish each run by revoking its client token and stopping only
its owned model processes and containers.
