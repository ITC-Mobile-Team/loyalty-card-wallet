import assert from "node:assert/strict";
import test from "node:test";

import { FetchHttpClient } from "../src/core/network/FetchHttpClient";
import type { NetworkError } from "../src/core/network/HttpClient";

test("FetchHttpClient reports non-OK HTML responses by status before JSON parsing", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response("<html>Not Acceptable</html>", {
      headers: {
        "Content-Type": "text/html"
      },
      status: 406
    });

  try {
    const client = new FetchHttpClient();

    await assert.rejects(
      () =>
        client.request({
          method: "POST",
          url: "https://example.test"
        }),
      (error: unknown) => {
        const networkError = error as NetworkError;

        assert.equal(networkError.kind, "bad-status");
        assert.equal(networkError.status, 406);
        assert.equal(networkError.message, "Request failed with status 406.");

        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
