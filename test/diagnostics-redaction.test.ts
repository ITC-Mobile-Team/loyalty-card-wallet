import assert from "node:assert/strict";
import test from "node:test";

import {
  BoundedLocalDiagnosticsService,
  redactDiagnosticString
} from "../src/data/diagnostics/BoundedLocalDiagnosticsService";

test("diagnostics redact card numbers, image bytes, passphrases, keys, coordinates, and platform errors", () => {
  const service = new BoundedLocalDiagnosticsService();
  service.record({
    code: "restore_failure",
    component: "backup",
    level: "error",
    metadata: {
      cardNumber: "1234 5678 9012 3456",
      imageBytes: new Uint8Array([1, 2, 3]),
      passphrase: "never export this",
      encryptionKey: "deadbeef",
      latitude: 50.450123,
      longitude: 30.523456,
      platformError: "SQLite failed at file:///private/path?token=secret",
      safeMessage: "Card 123456789012 could not be restored near 50.450123,30.523456"
    }
  });

  const exported = service.exportText();
  for (const secret of [
    "1234 5678 9012 3456",
    "never export this",
    "deadbeef",
    "50.450123",
    "30.523456",
    "SQLite failed",
    "123456789012"
  ]) {
    assert.equal(exported.includes(secret), false);
  }
  assert.match(exported, /\[REDACTED/);
});

test("diagnostics remain bounded", () => {
  const service = new BoundedLocalDiagnosticsService(2);
  service.record({ code: "one", component: "test", level: "info" });
  service.record({ code: "two", component: "test", level: "info" });
  service.record({ code: "three", component: "test", level: "info" });
  assert.deepEqual(service.list().map((event) => event.code), ["two", "three"]);
  assert.equal(redactDiagnosticString("4111 1111 1111 1111").includes("4111"), false);
});
