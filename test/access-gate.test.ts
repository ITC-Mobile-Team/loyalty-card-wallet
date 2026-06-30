import assert from "node:assert/strict";
import test from "node:test";

import { reduceAccessGate, type AccessGateState } from "../src/domain/security/LocalSecurity";

test("AccessGate locks on enabled launch and unlocks after authentication", () => {
  let state: AccessGateState = { status: "loading" };
  state = reduceAccessGate(state, { type: "settingsLoaded", enabled: true });
  assert.deepEqual(state, { status: "locked", reason: "launch" });
  state = reduceAccessGate(state, { type: "requestUnlock" });
  assert.equal(state.status, "authenticating");
  state = reduceAccessGate(state, { type: "authenticationSucceeded" });
  assert.deepEqual(state, { status: "unlocked" });
});

test("AccessGate resume respects background timeout", () => {
  let state: AccessGateState = { status: "unlocked" };
  state = reduceAccessGate(state, { type: "background", now: 1_000 });
  state = reduceAccessGate(state, { type: "resume", now: 30_000, timeoutMs: 60_000 });
  assert.deepEqual(state, { status: "unlocked" });
  state = reduceAccessGate(reduceAccessGate(state, { type: "background", now: 1_000 }), {
    type: "resume",
    now: 61_000,
    timeoutMs: 60_000
  });
  assert.deepEqual(state, { status: "locked", reason: "timeout" });
});

test("AccessGate cancellation and lockout remain locked", () => {
  for (const reason of ["canceled", "lockout"] as const) {
    let state: AccessGateState = { status: "locked", reason: "launch" };
    state = reduceAccessGate(state, { type: "requestUnlock" });
    state = reduceAccessGate(state, { type: "authenticationFailed", reason });
    assert.deepEqual(state, { status: "locked", reason: "authenticationFailed", pendingPath: undefined });
  }
});

test("AccessGate preserves a locked deep-link path without bypassing authentication", () => {
  let state: AccessGateState = { status: "locked", reason: "launch" };
  state = reduceAccessGate(state, { type: "deepLink", path: "/share/card?payload=synthetic" });
  assert.deepEqual(state, {
    status: "locked",
    reason: "launch",
    pendingPath: "/share/card?payload=synthetic"
  });
});

test("AccessGate preserves a widget checkout deep link without route bypass", () => {
  let state: AccessGateState = { status: "locked", reason: "launch" };
  state = reduceAccessGate(state, { type: "deepLink", path: "/card/card-1/scan-mode" });
  assert.deepEqual(state, {
    status: "locked",
    reason: "launch",
    pendingPath: "/card/card-1/scan-mode"
  });
});
