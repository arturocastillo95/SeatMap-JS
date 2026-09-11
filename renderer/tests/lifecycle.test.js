import { test } from "node:test";
import assert from "node:assert/strict";
import { abortable, nextFrame } from "../core/Lifecycle.js";
test("aborted work rejects promptly and ignores late completion", async () => {
  const controller = new AbortController();
  let finish;
  const operation = new Promise((r) => (finish = r));
  const pending = abortable(operation, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  finish();
});
test("canceling a frame releases the scheduled callback", async () => {
  let scheduled;
  globalThis.requestAnimationFrame = (fn) => {
    scheduled = fn;
    return 1;
  };
  globalThis.cancelAnimationFrame = (id) => {
    assert.equal(id, 1);
    scheduled = null;
  };
  const controller = new AbortController(),
    pending = nextFrame(controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(scheduled, null);
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});
