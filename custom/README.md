# WORKROOM custom layer

The sole runtime is OpenMausBot. The official renderer and harness stay intact.
The baseline is v0.1.166 (`2d2d3c5171371a4b641e68d010a488a5d0affb0d`).
`origin` is the personal fork; `upstream` is milind-soni/OpenMausBot.

Custom modules live here, with separate commits for maintenance, execution,
and verification. Runtime state, authentication and task receipts live outside
the checkout under the workspace's ignored `.local` directory.

## Updating

1. Fetch official tags; inspect release notes, the diff from the accepted tag,
   dependency/lockfile changes, driver permission changes and data migrations.
2. Create a `codex/update-VERSION` candidate from `custom`; merge the chosen
   official tag there. Resolve conflicts explicitly, preserving permission gates.
3. Follow `AGENTS.md` and `docs/verification/README.md`. Run custom boundary
   tests, affected native harness tests, typecheck, lint, i18n, Electron checks
   and the upstream test chain. Record unavailable platform checks honestly.
4. With all processes stopped, create and verify an official workspace backup.
   Restore a copy into an isolated candidate environment and verify data format,
   completed tasks, approvals, delegation, usage and no repeated execution.
5. Tag the accepted custom release, fast-forward `custom`, then replace the
   deployment code and restart. No unattended merge or deployment is configured.

Do not reset the fork to upstream: that would discard custom commits. Updates
can conflict or require a data migration; they are never promised conflict-free.

## Rollback

Record the deployed commit and data-format version before each release. Retain
the preceding verified code release and a matching cold data backup. If an
upgrade fails, stop its processes, retain its failed state separately, restore
the preceding code **and matching data**, then check health and completed-task
identities before accepting messages. Old code must not open migrated data
without an explicit compatibility check. Never replay an uncertain task merely
because its UI is disconnected.

## Restricted Codex

The native Ask approval mode is tightened by one driver hook when
`WORKROOM_RESTRICT_CODEX_NATIVE=1`. An independent Codex configuration uses
`sandbox_mode = "read-only"`. Native terminal/editing/browser tools are disabled.
Project operations use a per-bot MCP server backed by a project-only Docker
container, without networking, a Docker socket or personal credentials inside.
Reviewer mounts the same project path read-only. Native OM coordination and
Usage remain responsible for delegation, state, approval cards and accounting.

The Codex tool selector supports MCP selection, but cannot narrow native tools.
Its `native:*` selection is therefore **not the security boundary**: the actual
native configuration, protocol guard, role-specific MCP catalog and container
mounts are tested independently. Full, Auto and desktop-private Custom modes are
refused by this restricted executor. No Full Access fallback is permitted.

The real-call fixture disables native memory upkeep and other helper calls.
The restricted CLI also rejects background `codex exec`; only app-server and
read-only version/login-status checks are accepted. Test accounting includes
failed and denied turns, with cache tokens already included in input tokens.

## License boundary

The OSS code is Apache-2.0. `enterprise/` has a separate source-available
license: development/evaluation is permitted; production enterprise features
require a key and redistribution is restricted. No enterprise license is
activated here. Native enterprise budget/billing features must not be assumed
to be free OSS functionality. Custom code does not modify or bypass this layer.
