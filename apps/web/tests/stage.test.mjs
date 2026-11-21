import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stagePath = new URL("../src/components/live-stage.tsx", import.meta.url);
const shellPath = new URL("../src/components/live-shell.tsx", import.meta.url);

test("shared stage presents clearly labeled simulated content and sample chat", async () => {
  const stage = await readFile(stagePath, "utf8");
  const shell = await readFile(shellPath, "utf8");

  assert.match(stage, /SIMULATED/);
  assert.match(stage, /Sample chat/);
  assert.match(stage, /Fictional demo messages/);
  assert.match(stage, /No live connection/);
  assert.match(stage, /stageRatio/);
  assert.match(shell, /<LiveStage\s*\/>/);
  for (const state of ["loading", "empty", "partial", "failed", "ready"]) {
    assert.match(stage, new RegExp(`"${state}"`));
  }
  assert.match(stage, /role=\{state === "failed" \? "alert" : "status"\}/);
  assert.match(stage, /sampleMessages\.slice\(0, 1\)/);
  assert.match(stage, /No live connection was attempted/);
});
