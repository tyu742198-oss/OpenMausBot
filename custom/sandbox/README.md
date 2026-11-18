# Restricted project executor

This source-run profile uses OM's native Codex driver, approval cards, MCP gate,
coordination and Usage ledger. One opt-in hook tightens Ask to native read-only.
The default upstream driver behaviour remains unchanged without the flag.

The policy is fail-closed: Full, Auto, Custom, a writable native sandbox,
unverified project MCP mounts and background Codex exec are refused. Codex's
native tool selector alone cannot enforce file isolation. Native terminal,
editing, browser, computer, plugin and skill capabilities are disabled in an
independent CLI home; personal config is neither imported nor modified.

Project operations run through role-specific MCP tools in three Docker
containers. Each has one project bind, no Docker socket, no credentials,
network=none, read-only root, no capabilities, no-new-privileges, non-root uid,
256 MiB memory, one CPU and bounded process/time/output limits. Reviewer mounts
the project read-only. Researcher may write only PLAN.md; Builder may read,
write, SHA-checked edit and run bounded Python commands. Temporary files belong
in the container's /tmp. This is a restriction on model execution, not an OS
sandbox around the trusted OM server or Docker daemon.

`WORKROOM_STATE_DIR` must be an absolute private directory outside the checkout.
Its `runtime.json` contains explicit runtime paths, project path and owned
container names. The verification fixture uses an independently copied existing
Codex login, not the person's config, Skills or MCP servers. Credentials and
raw receipts must never enter Git. No subscription quota unit is inferred from
token counts. An unknown model price remains null.

Before a real task, run the role boundary and native policy tests, inspect the
effective Codex config, list the actual MCP catalog without a model call, and
check every native role selection. An approval deadline is a denial, never a
reason to resend automatically. Completed send identities must be reused for
receipt checks, not replaced with new identities. Business acceptance requires
Builder execution evidence and independent Reviewer output; an engine's normal
exit alone is insufficient.

This profile is verified from source. A packaged deployment additionally needs
explicit staging of the external MCP `.mjs` and Python worker assets, repaired
runtime paths and its own packaged boundary tests. The upstream server bundle
includes the native policy hook; it does not package external project tools.
