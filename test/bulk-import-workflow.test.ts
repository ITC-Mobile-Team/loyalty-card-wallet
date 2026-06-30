import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryCardRepository } from "../src/data/cards/InMemoryCardRepository";
import type {
  CreateImportDraftInput,
  ImportDraft,
  ImportSession,
  ImportSessionRepository,
  ImportSessionStatus,
  UpdateImportDraftInput
} from "../src/domain/importing/ImportSession";
import {
  commitImportDrafts,
  createImportSessionFromScans,
  reviewImportDraft
} from "../src/features/importing/bulkImportWorkflow";

class InMemoryImportSessions implements ImportSessionRepository {
  drafts: ImportDraft[] = [];
  sessions: ImportSession[] = [];

  async create(totalSources: number): Promise<ImportSession> {
    const session = {
      createdAt: "2026-06-24T00:00:00.000Z",
      id: `session-${this.sessions.length + 1}`,
      status: "active" as const,
      totalSources,
      updatedAt: "2026-06-24T00:00:00.000Z"
    };
    this.sessions.push(session);
    return session;
  }
  async addDraft(sessionId: string, input: CreateImportDraftInput): Promise<ImportDraft> {
    const draft = {
      ...input,
      createdAt: "2026-06-24T00:00:00.000Z",
      id: `draft-${this.drafts.length + 1}`,
      sessionId,
      updatedAt: "2026-06-24T00:00:00.000Z"
    };
    this.drafts.push(draft);
    return draft;
  }
  async getActive(): Promise<ImportSession | null> {
    return this.sessions.find((session) => session.status === "active") ?? null;
  }
  async getById(id: string): Promise<ImportSession | null> {
    return this.sessions.find((session) => session.id === id) ?? null;
  }
  async listDrafts(sessionId: string): Promise<ImportDraft[]> {
    return this.drafts.filter((draft) => draft.sessionId === sessionId);
  }
  async setStatus(id: string, status: ImportSessionStatus): Promise<void> {
    const session = this.sessions.find((item) => item.id === id);
    if (session) session.status = status;
  }
  async updateDraft(id: string, input: UpdateImportDraftInput): Promise<ImportDraft | null> {
    const index = this.drafts.findIndex((draft) => draft.id === id);
    if (index < 0) return null;
    const normalized = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, value === null ? undefined : value])
    );
    this.drafts[index] = { ...this.drafts[index], ...normalized };
    return this.drafts[index];
  }
}

test("bulk scan persists normalized drafts but blocks unrenderable formats", async () => {
  const cards = new InMemoryCardRepository();
  const sessions = new InMemoryImportSessions();
  const dependencies = { cardQueryRepository: cards, cardRepository: cards, importSessionRepository: sessions };
  const session = await createImportSessionFromScans(dependencies, [
    { result: { data: "ABC-123", type: "code128" }, sourceIndex: 0, sourceName: "one.png", status: "scanned" },
    { result: { data: "12345678901234", type: "itf14" }, sourceIndex: 1, sourceName: "two.png", status: "scanned" },
    {
      error: { kind: "validation", message: "No barcode." },
      sourceIndex: 2,
      sourceName: "three.png",
      status: "failed"
    }
  ]);
  const drafts = await sessions.listDrafts(session.id);

  assert.equal(drafts.length, 3);
  assert.equal(drafts[0].cardNumber, "ABC123");
  assert.equal(drafts[0].status, "needs_attention");
  assert.equal(drafts[1].errorCode, "unrenderable_format");
  assert.equal(drafts[2].status, "failed");
  assert.ok(!("sourceBytes" in drafts[0]));
});

test("review detects duplicates and commit reports per-item results", async () => {
  const cards = new InMemoryCardRepository([
    {
      barcodeFormat: "code128",
      cardNumber: "ABC123",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "existing",
      storeName: "Synthetic Shop",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]);
  const sessions = new InMemoryImportSessions();
  const dependencies = { cardQueryRepository: cards, cardRepository: cards, importSessionRepository: sessions };
  const session = await sessions.create(1);
  const draft = await sessions.addDraft(session.id, {
    barcodeFormat: "code128",
    cardNumber: "ABC123",
    sourceIndex: 0,
    sourceName: "one.png",
    status: "needs_attention"
  });
  const reviewed = await reviewImportDraft(dependencies, draft, {
    barcodeFormat: "code128",
    cardNumber: "ABC123",
    storeName: "Synthetic Shop"
  });

  assert.equal(reviewed?.status, "duplicate");
  const skipped = await commitImportDrafts(dependencies, [reviewed!], false);
  assert.equal(skipped[0].status, "skipped");
  const imported = await commitImportDrafts(dependencies, [reviewed!], true);
  assert.equal(imported[0].status, "imported");
  assert.equal((await cards.list()).length, 2);
});

test("a 50-image mixed session preserves every per-item result", async () => {
  const cards = new InMemoryCardRepository();
  const sessions = new InMemoryImportSessions();
  const dependencies = { cardQueryRepository: cards, cardRepository: cards, importSessionRepository: sessions };
  const items = Array.from({ length: 50 }, (_, sourceIndex) =>
    sourceIndex % 10 === 0
      ? {
          error: { kind: "validation" as const, message: "Synthetic unreadable image." },
          sourceIndex,
          sourceName: `fixture-${sourceIndex}.png`,
          status: "failed" as const
        }
      : {
          result: { data: `SYNTHETIC-${sourceIndex}`, type: "code128" },
          sourceIndex,
          sourceName: `fixture-${sourceIndex}.png`,
          status: "scanned" as const
        }
  );
  const session = await createImportSessionFromScans(dependencies, items);
  const drafts = await sessions.listDrafts(session.id);

  assert.equal(drafts.length, 50);
  assert.equal(drafts.filter((draft) => draft.status === "failed").length, 5);
  assert.equal(drafts.filter((draft) => draft.status === "needs_attention").length, 45);
  assert.equal((await sessions.getActive())?.id, session.id);
});
