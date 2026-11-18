# Persistent local WORKROOM

Run the accepted custom source checkout with the official `openmausbot serve`
entry point. This launcher does not import verification helpers, seed a fake
engine, enable development browser trust, register a service or schedule an
automatic start. The native CLI stays running independently of the initiating
terminal and supervises its own server. Data lives outside the checkout.

The default state is the parent workspace's `.local/workroom`; an explicit
absolute `WORKROOM_STATE_DIR` can select another preconfigured home. Its private
runtime.json names the existing Node/Codex/Docker executables, owned containers,
project path and port. State and login files must never enter Git. This is a
Mac runtime profile, not a Linux installer or permission to restore Mac binaries
onto a server.

An optional `runtime.networkEnvironment` supplies only HTTP_PROXY, HTTPS_PROXY,
ALL_PROXY, NO_PROXY and NODE_USE_ENV_PROXY to the owned server process. Node's
native fetch needs NODE_USE_ENV_PROXY=1 to use an existing authorized proxy for
plan usage. System proxy settings are never changed; keep loopback addresses
in NO_PROXY. Review these deployment-specific values when moving machines.

```sh
node custom/runtime/workroom.mjs start
node custom/runtime/workroom.mjs status
node custom/runtime/workroom.mjs pair
node custom/runtime/workroom.mjs stop
```

Use the independent Node selected during setup. The parent workspace's small
`./workroom` wrapper already selects it. Start is idempotent and refuses a
different process on its port. Stop checks ownership, refuses active tasks,
stops only owned containers and retains data. No auto-start is installed.

Only loopback HTTP is enabled. Browsers use native pairing, not the development
authentication bypass. `pair` issues a one-time chat-and-approvals client code;
each browser profile signs in separately. A workspace owner can use the native
CLI's ordinary pairing mode separately when administration is wanted. No
generic admin API token is created by this launcher.

The three employee instances use the verified restricted Codex wrapper, Ask,
their own MCP selection, and the same project-only container boundaries. The
Reviewer mount is read-only. The default shared daily project is runtime.project;
changing a bot's displayed cwd alone does not change that sandbox root. New
project selection, model providers, browser/Computer Use and unrestricted
terminals are not added here. Model memory/helper side-calls remain disabled.

Initial daily setup uses native bot creation fields, then applies memory policy
through PATCH: memoryEnabled/memoryUpkeep are not supported creation fields in
v0.1.166. Native UI was qualified with one bounded write/read/Python assertion
task, approving each tool in the actual renderer and retaining its real result.
It did not repeat the previous large coding or multi-agent qualification.

Retain a cold native data backup plus separately scoped external project and
CLI-login handling before updating. Follow custom/README.md for upstream merges
and matching code/data rollback. Logs and native Usage remain in the persistent
state directory; stopping or closing a browser does not erase them.
