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

The daily launcher enables WORKROOM_CODEX_WAIT_GUARD=1. Before the current
native turn emits any content, reasoning, tool or approval activity, a small
read-only monitor checks Codex 0.170.0's own logs_2.sqlite for an exact current
thread/turn capacity retry. A confirmed capacity refusal ends this wait through
the native driver lifecycle, preserving usage and history without replay or
provider switching. The renderer displays its existing runtime error message.
After 30 seconds of otherwise unexplained silence a native notice appears;
after 90 seconds the wait ends with an explicitly uncertain cause. This is a
first-response guard, not a total task deadline. Any tool/approval/content
activity disables it. Already-running tasks and background calls are outside
this guard. CLI log-schema changes fall back to the bounded silence path.

No credentials, prompts or raw log text are copied into the notice. The guard
opens only the configured independent CLI home's log database read-only and
closes it after each check. It never changes a provider, login, sandbox or
approval grant. It does not guarantee model capacity or a successful retry.

## Native phone pairing on trusted Wi-Fi

The optional official Companion runs separately; the harness stays on loopback.
From the parent workspace:

```sh
./workroom phone-start
./workroom phone-status
./workroom phone-pair
./workroom phone-stop
```

Start explicitly opts into the Companion's authenticated private-network socket
on port 8810. Its native connection filter refuses public peers; only Wi-Fi is
enabled. The token-protected control page on 8811 remains loopback-only. No
firewall rule, router forwarding or login service is installed. Relay is off
until explicitly enabled with the separate commands below. The existing harness is not restarted. Native E2E support
is enabled, with its persistent key in the independent Companion home; the relay
starts off. Legacy direct HTTP pairing/chat still requires a trusted LAN, and only
the actual phone handshake proves which encrypted transport it negotiated.

Pair prints a fresh native six-digit, two-minute credential, the phone address,
an official deep link, a terminal QR, and the Mac-only control link. Never redirect its output
to a log or commit a QR/credential. Browser pairing codes from `workroom pair`
are a different invitation and do not enable the Companion. On iPhone, allow
MausBot local-network access, connect to the same trusted Wi-Fi, and enter the
advertised host:8810 and fresh phone code in a manual-address screen, or scan
the native terminal QR. An invitation/QR paste box needs the complete
openmausbot://pair link, not the plain HTTP address or health-check URL. The phone must not
use 127.0.0.1 (which refers to the phone), 0.0.0.0 or Docker's bridge address.
The Wi-Fi IP can change with DHCP; use phone-status/phone-pair again then.

Companion state lives under `.local/workroom/companion`, mode 0700. Its control
secret, hashed device registry and E2E key are private deployment state, excluded
from Git. Normal stdout is discarded so the native startup control URL is not
written into project logs. Only stderr is retained there. No new device gets
browser or computer control grants by default. Use the native Mac control page
to revoke a lost phone. Phone access does not broaden Agent execution sandboxes.
Stop Companion explicitly with phone-stop when it is not wanted; workroom stop
also stops Companion and its renewal helper. No autostart is
registered. Mac restart requires manual workroom start and phone-start.

For remote access, prefer the official Companion Tailscale route on a tailnet,
or the supported native authenticated E2E relay after its account and client
requirements are verified. Tailscale remains disabled. Relay can be explicitly enabled after login as
described below. Do not forward ports
28145/28146/8810/8811 on a router or expose the loopback owner-trust harness with
an arbitrary proxy. Installing Tailscale, logging into a relay, or publishing an
HTTPS endpoint requires a separate concrete configuration and authorization.


## Native encrypted Relay

After the owner completes the official `login --relay --data-dir` command with
the independent WORKROOM data directory, run:

```sh
./workroom phone-relay-start
./workroom phone-status
./workroom phone-relay-stop
```

Relay start attaches the official short-lived grant to the existing Companion
through its local authenticated control API. It preserves the same transport
key and paired devices. The native createRelayTokenService handles renewal and
backoff in a small separate process; only credentials from the explicit
WORKROOM account file are read. No browser address or Cloud VPS is reserved.
The control plane may refuse a grant because of availability or admission;
a failed grant never initiates a purchase or disables Wi-Fi.

phone-start resumes renewal when this profile was explicitly enabled before.
phone-relay-stop disables it persistently and leaves Wi-Fi pairing intact;
phone-stop stops both processes but remembers the opted-in mode for the next
manual phone-start. There is no login/autostart service. Standard proxy values
from the existing private runtime manifest apply only to the renewal process.

A paired app learns the relay descriptor from the native endpoint response: it
contains the same pinned key plus relay host ID and nodes. Reopen the app on
Wi-Fi once to refresh that information, then test with Wi-Fi off and cellular
data on. A green label alone is insufficient: verify actual historical chat
reads and the Companion's device route=relay. The Mac must remain powered,
awake and online. No sleep settings are changed by these scripts.

Relay credentials and account state must remain private and backed up with
Companion's key/device registry. The relay-status.json file contains only
status and expiry times, never a token. After an account sign-out or expired
installation credential, repeat the official login on the Mac; do not paste
verification codes into chat. Long-duration operation and sleep/wake recovery
need separate observation; the initial grant and real phone route were tested.
