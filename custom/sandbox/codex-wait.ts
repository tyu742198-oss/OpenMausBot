import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const CAPACITY_MESSAGE = "Codex 服务端返回模型容量不足，本轮已停止等待。请稍后手动重试，或在同一 Codex 订阅下选择其他模型；没有自动重发或切换付费 API。";
export const SILENT_MESSAGE = "Codex 超过 90 秒未返回内容或工具活动，本轮已停止等待。原因尚未确认，请检查网络或服务状态后手动重试；没有自动重发。";

/** Codex 0.170.0 may record capacity backoff only in logs_2.sqlite, without an app-server error notification. */
export function hasCapacityRetry(home: string, thread: string, turn: string, started: number): boolean {
  const file = join(home, "logs_2.sqlite");
  if (!existsSync(file)) return false;
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const rows = db.prepare("SELECT feedback_log_body AS body FROM logs WHERE ts >= ? AND target = 'codex_core::responses_retry' AND instr(feedback_log_body, ?) > 0 ORDER BY id DESC LIMIT 16").all(Math.floor(started / 1000), turn);
    return rows.some(row => typeof row.body === "string" && row.body.includes(thread) && /Selected model is at capacity\b/i.test(row.body));
  } catch { return false; }
  finally { db?.close(); }
}

export function watchCodexWait(input: {
  home: string;
  current: () => { thread: string | null; turn: string | null; started: number; active: boolean; worked: boolean };
  notice: (message: string) => void;
  fail: (message: string) => void;
}): () => void {
  let noticed = false;
  const stop = () => clearInterval(timer);
  const timer = setInterval(() => {
    const s = input.current();
    if (!s.active || s.worked) { stop(); return; }
    if (!s.thread || !s.turn || !s.started) return;
    if (hasCapacityRetry(input.home, s.thread, s.turn, s.started)) {
      stop(); input.fail(CAPACITY_MESSAGE); return;
    }
    const elapsed = Date.now() - s.started;
    if (elapsed >= 90_000) { stop(); input.fail(SILENT_MESSAGE); return; }
    if (!noticed && elapsed >= 30_000) {
      noticed = true;
      input.notice("正在等待 Codex 首个响应，尚未收到内容或工具活动；若持续 90 秒将停止本轮等待，不会自动重发。");
    }
  }, 1000);
  timer.unref?.();
  return stop;
}
