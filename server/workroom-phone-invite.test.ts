import { createECDH } from "node:crypto";
import { expect, it } from "vitest";
import { wifiPhoneInvite } from "../custom/runtime/phone-invite.ts";
it("carries a dialable native encrypted Wi-Fi route without Docker or Bonjour fallbacks", () => {
  const key = createECDH("prime256v1"); key.generateKeys();
  const e2e = { v: 1 as const, k: key.getPublicKey().toString("base64url") };
  const input = { address: "192.168.1.20", port: 8810, token: "omb_pair_" + "a".repeat(43), code: "123456", e2e };
  const url = new URL(wifiPhoneInvite(input));
  expect(url.protocol).toBe("openmausbot:");
  expect(url.hostname).toBe("pair");
  expect(url.searchParams.get("address")).toBe("192.168.1.20:8810");
  expect(url.searchParams.get("hosts")).toBe("192.168.1.20");
  expect(JSON.parse(Buffer.from(url.searchParams.get("endpoints")!, "base64url").toString())).toEqual([{ url: "http://192.168.1.20:8810", kind: "lan", priority: 0 }]);
  expect(JSON.parse(Buffer.from(url.searchParams.get("e2e")!, "base64url").toString())).toEqual(e2e);
  expect(url.searchParams.get("token")).toBe(input.token);
  expect(url.searchParams.get("code")).toBe(input.code);
});
it("refuses malformed pairing credentials", () => {
  expect(() => wifiPhoneInvite({ address: "192.168.1.20", port: 8810, token: "invalid", code: "123456" })).toThrow(/invalid/);
});
