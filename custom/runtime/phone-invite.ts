import { phonePairingLink, type PairingE2EDescriptor } from "../../shared/pairing-link.ts";

/** Native E2E clients select direct routes from hosts/endpoints, not the legacy address field alone. */
export function wifiPhoneInvite(input: { address: string; port: number; token: string; code: string; e2e?: PairingE2EDescriptor | null }): string {
  const link = phonePairingLink({ ...input, name: "WORKROOM", hosts: [input.address],
    endpoints: [{ url: `http://${input.address}:${input.port}`, kind: "lan", priority: 0 }] });
  if (!link) throw new Error("The native Wi-Fi pairing invitation is invalid");
  return link;
}
