type Params = {
  thread: Record<string, unknown>;
  turn: Record<string, unknown>;
  fallback?: { thread: Record<string, unknown>; turn: Record<string, unknown> };
};

/** Native execution stays read-only; writable project tools require their independent sandbox. */
export function restrictedNativeApproval(params: Params, mode: string, enabled: boolean): Params {
  if (!enabled) return params;
  if (mode !== "ask") throw new Error("This restricted Codex executor requires Ask mode; Full, Auto and Custom are unavailable.");
  return {
    thread: { approvalPolicy: "on-request", approvalsReviewer: "user", sandbox: "read-only" },
    turn: { approvalPolicy: "on-request", approvalsReviewer: "user", sandboxPolicy: { type: "readOnly" } },
  };
}
