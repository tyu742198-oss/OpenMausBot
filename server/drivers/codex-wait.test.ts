import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it, vi } from "vitest";
import { hasCapacityRetry, watchCodexWait, CAPACITY_MESSAGE, SILENT_MESSAGE } from "../../custom/sandbox/codex-wait.ts";
const homes: string[] = [];
function home() { const h = mkdtempSync(join(tmpdir(), "om-capacity-")); homes.push(h); return h; }
function seed(h: string, body: string, ts: number) {
 const db = new DatabaseSync(join(h, "logs_2.sqlite"));
 db.exec("CREATE TABLE logs(id INTEGER PRIMARY KEY, ts INTEGER, target TEXT, feedback_log_body TEXT)");
 db.prepare("INSERT INTO logs VALUES(1, ?, 'codex_core::responses_retry', ?)").run(ts, body); db.close();
}
afterEach(() => { vi.useRealTimers(); for (const h of homes.splice(0)) rmSync(h, { recursive: true, force: true }); });
it("matches only this turn's recent capacity record", () => {
 const h = home(); expect(hasCapacityRetry(h, "thread-a", "turn-a", 100000)).toBe(false);
 seed(h, "thread-a turn-a Selected model is at capacity. retrying in 326s", 100);
 expect(hasCapacityRetry(h, "thread-a", "turn-a", 100000)).toBe(true);
 expect(hasCapacityRetry(h, "thread-a", "turn-b", 100000)).toBe(false);
 expect(hasCapacityRetry(h, "thread-b", "turn-a", 100000)).toBe(false);
 expect(hasCapacityRetry(h, "thread-a", "turn-a", 101000)).toBe(false);
});
it("ends confirmed capacity waits once", () => {
 vi.useFakeTimers(); vi.setSystemTime(100000); const h = home(); seed(h, "thread-a turn-a Selected model is at capacity", 100);
 const fail = vi.fn(), notice = vi.fn();
 const stop = watchCodexWait({ home: h, current: () => ({ thread: "thread-a", turn: "turn-a", started: 100000, active: true, worked: false }), fail, notice });
 vi.advanceTimersByTime(10000); expect(fail).toHaveBeenCalledExactlyOnceWith(CAPACITY_MESSAGE); expect(notice).not.toHaveBeenCalled(); stop();
});
it("reports uncertain silence honestly at 30 seconds then stops at 90", () => {
 vi.useFakeTimers(); vi.setSystemTime(100000); const fail = vi.fn(), notice = vi.fn();
 const stop = watchCodexWait({ home: home(), current: () => ({ thread: "t", turn: "v", started: 100000, active: true, worked: false }), fail, notice });
 vi.advanceTimersByTime(30000); expect(notice).toHaveBeenCalledTimes(1); expect(fail).not.toHaveBeenCalled();
 vi.advanceTimersByTime(60000); expect(fail).toHaveBeenCalledExactlyOnceWith(SILENT_MESSAGE); stop();
});
it.each(["worked", "inactive", "cancelled"])("does not cut off %s tasks", mode => {
 vi.useFakeTimers(); vi.setSystemTime(100000); const fail = vi.fn(), notice = vi.fn();
 const stop = watchCodexWait({ home: home(), current: () => ({ thread: "t", turn: "v", started: 100000, active: mode !== "inactive", worked: mode === "worked" }), fail, notice });
 if (mode === "cancelled") stop(); vi.advanceTimersByTime(400000); expect(fail).not.toHaveBeenCalled(); expect(notice).not.toHaveBeenCalled(); stop();
});
