import assert from "node:assert/strict";
import test from "node:test";

import type { HttpClient, HttpRequest, HttpResponse, NetworkError } from "../src/core/network/HttpClient";
import { OverpassStoreRepository } from "../src/data/stores/OverpassStoreRepository";

class FakeHttpClient implements HttpClient {
  requests: HttpRequest[] = [];

  async request<TBody = unknown>(request: HttpRequest): Promise<HttpResponse<TBody>> {
    this.requests.push(request);

    return makeStoreResponse<TBody>();
  }
}

function makeStoreResponse<TBody = unknown>(): HttpResponse<TBody> {
    return {
      body: {
        elements: [
          {
            id: 1,
            lat: 50.45,
            lon: 30.52,
            tags: {
              "addr:city": "Kyiv",
              "addr:housenumber": "10",
              "addr:street": "Market Street",
              "contact:phone": "+380 44 000 00 00",
              "contact:website": "https://fresh.example",
              name: "Fresh Market",
              opening_hours: "Mo-Fr 09:00-21:00",
              shop: "supermarket"
            },
            type: "node"
          },
          {
            center: { lat: 50.46, lon: 30.53 },
            id: 2,
            tags: {
              name: "Book House",
              shop: "books"
            },
            type: "way"
          },
          {
            id: 3,
            tags: {
              shop: "clothes"
            },
            type: "node"
          }
        ]
      } as TBody,
      headers: {},
      status: 200
    };
}

class FailingThenSuccessfulHttpClient extends FakeHttpClient {
  async request<TBody = unknown>(request: HttpRequest): Promise<HttpResponse<TBody>> {
    this.requests.push(request);

    if (this.requests.length === 1) {
      throw {
        kind: "bad-status",
        message: "Request failed with status 429.",
        retryable: true,
        status: 429
      } satisfies NetworkError;
    }

    return makeStoreResponse<TBody>();
  }
}

test("Overpass store repository maps named shop elements as one bounded list", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);

  const result = await repository.search({
    origin: { city: "Kyiv", kind: "city" }
  });

  assert.equal(result.total, 2);
  assert.equal(result.stores.length, 2);
  assert.equal(result.stores[0].name, "Book House");
  assert.equal(result.stores[1].name, "Fresh Market");
  assert.equal(result.stores[1].openingHours, "Mo-Fr 09:00-21:00");
  assert.equal(result.stores[1].phone, "+380 44 000 00 00");
  assert.equal(result.stores[1].website, "https://fresh.example");
  assert.equal(result.sourceAttribution.includes("OpenStreetMap"), true);
});

test("Overpass store repository filters cached city results without another network request", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);

  await repository.search({
    origin: { city: "Kyiv", kind: "city" }
  });

  const filtered = await repository.search({
    origin: { city: "Kyiv", kind: "city" },
    searchTerm: "fresh"
  });

  assert.equal(httpClient.requests.length, 1);
  assert.equal(filtered.total, 1);
  assert.equal(filtered.stores[0].name, "Fresh Market");
});

test("Overpass store repository returns cached store details by ID", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);

  await repository.search({
    origin: { city: "Kyiv", kind: "city" }
  });

  const store = await repository.getCachedById("node/1");

  assert.equal(store?.name, "Fresh Market");
  assert.equal(store?.address, "Market Street 10, Kyiv");
});

test("Overpass store repository builds city queries from administrative boundaries", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);

  await repository.search({
    origin: { city: "Kyiv", kind: "city" }
  });

  const body = decodeURIComponent(String(httpClient.requests[0].body));

  assert.equal(body.includes('relation["boundary"="administrative"]["name:en"~"^Kyiv$",i]'), true);
  assert.equal(body.includes("map_to_area->.searchArea"), true);
  assert.equal(body.includes("out center tags 120"), true);
});

test("Overpass store repository does not send an Accept header rejected by Overpass", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);

  await repository.search({
    origin: { city: "Kyiv", kind: "city" }
  });

  assert.equal("Accept" in (httpClient.requests[0].headers ?? {}), false);
  assert.equal(httpClient.requests[0].headers?.["Content-Type"], "application/x-www-form-urlencoded");
});

test("Overpass store repository retries a fallback endpoint for retryable network failures", async () => {
  const httpClient = new FailingThenSuccessfulHttpClient();
  const repository = new OverpassStoreRepository(httpClient, [
    "https://primary.example/api/interpreter",
    "https://fallback.example/api/interpreter"
  ]);

  const result = await repository.search({
    origin: { city: "Kyiv", kind: "city" }
  });

  assert.equal(result.total, 2);
  assert.equal(httpClient.requests.length, 2);
  assert.equal(httpClient.requests[0].url, "https://primary.example/api/interpreter");
  assert.equal(httpClient.requests[1].url, "https://fallback.example/api/interpreter");
});

test("Overpass store repository builds nearby queries from coordinates", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);

  await repository.search({
    origin: {
      kind: "nearby",
      latitude: 50.45,
      longitude: 30.52,
      radiusMeters: 2500
    }
  });

  assert.equal(decodeURIComponent(String(httpClient.requests[0].body)).includes("around:2500,50.45,30.52"), true);
});

test("nearby lookups do not reuse a coordinate-derived origin cache", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);
  const query = {
    origin: {
      kind: "nearby" as const,
      latitude: 50.4501,
      longitude: 30.5234,
      radiusMeters: 2500
    }
  };

  await repository.search(query);
  await repository.search(query);

  assert.equal(httpClient.requests.length, 2);
  assert.equal((await repository.getCachedById("node/1"))?.name, "Fresh Market");
});

test("source resolution verifies explicit OSM IDs and reports missing references", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);

  const result = await repository.resolveSourceReferences([
    { id: "1", type: "node" },
    { id: "404", type: "relation" }
  ]);
  const body = decodeURIComponent(String(httpClient.requests[0].body));

  assert.equal(body.includes("node(1);"), true);
  assert.equal(body.includes("relation(404);"), true);
  assert.equal(result[0].status, "found");
  assert.equal(result[0].store?.id, "node/1");
  assert.deepEqual(result[1], {
    reference: { id: "404", type: "relation" },
    status: "missing"
  });
});

test("source resolution batches more than 100 OSM references", async () => {
  const httpClient = new FakeHttpClient();
  const repository = new OverpassStoreRepository(httpClient);
  const references = Array.from({ length: 101 }, (_, index) => ({
    id: String(index + 1),
    type: "node" as const
  }));

  const result = await repository.resolveSourceReferences(references);

  assert.equal(httpClient.requests.length, 2);
  assert.equal(result.length, 101);
});
