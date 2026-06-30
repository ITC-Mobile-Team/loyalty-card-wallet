import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto";
import test from "node:test";

import { bytesToBase64 } from "../src/core/encoding/base64";
import { EncryptedBackupContainer } from "../src/data/backup/EncryptedBackupContainer";
import { JsonBundleCodec } from "../src/data/backup/JsonBundleCodec";
import type {
  BackupByteWriter,
  BackupCrypto,
  BackupCryptoKey,
  BackupPayload
} from "../src/domain/backup/Backup";

class MemoryWriter implements BackupByteWriter {
  chunks: Uint8Array[] = [];
  aborted = false;
  async write(bytes: Uint8Array) {
    this.chunks.push(new Uint8Array(bytes));
  }
  async close() {}
  async abort() {
    this.aborted = true;
  }
  bytes() {
    const length = this.chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }
}

type NodeKey = BackupCryptoKey & { material: Uint8Array };

class DeterministicNodeBackupCrypto implements BackupCrypto {
  private nonceCounter = 0;
  async randomBytes(length: number) {
    return Uint8Array.from({ length }, (_, index) => index + 1);
  }
  async deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<NodeKey> {
    return { material: pbkdf2Sync(passphrase, salt, iterations, 32, "sha256") };
  }
  async encryptRecord(
    plaintext: Uint8Array,
    key: BackupCryptoKey,
    additionalData: Uint8Array,
    nonce?: Uint8Array
  ) {
    const iv =
      nonce ??
      Uint8Array.from({ length: 12 }, (_, index) => (this.nonceCounter * 17 + index + 3) & 255);
    this.nonceCounter += 1;
    const cipher = createCipheriv("aes-256-gcm", (key as NodeKey).material, iv);
    cipher.setAAD(additionalData);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return new Uint8Array(Buffer.concat([iv, ciphertext, cipher.getAuthTag()]));
  }
  async decryptRecord(sealed: Uint8Array, key: BackupCryptoKey, additionalData: Uint8Array) {
    const iv = sealed.slice(0, 12);
    const ciphertext = sealed.slice(12, -16);
    const tag = sealed.slice(-16);
    const decipher = createDecipheriv("aes-256-gcm", (key as NodeKey).material, iv);
    decipher.setAAD(additionalData);
    decipher.setAuthTag(tag);
    return new Uint8Array(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
  }
}

const emptyPayload: BackupPayload = {
  payloadVersion: 2,
  exportedAt: "2026-06-24T12:00:00.000Z",
  cards: []
};

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function stream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
}

async function encode(payload: BackupPayload, version: 1 | 2 = 2) {
  const writer = new MemoryWriter();
  const container = new EncryptedBackupContainer(new DeterministicNodeBackupCrypto(), new JsonBundleCodec());
  await container.write(payload, "correct horse battery staple", writer, version);
  return writer.bytes();
}

const GOLDEN_ENVELOPE_1_PAYLOAD_1 =
  "TENXQktQMDEAAADbeyJhcHAiOiJsb3lhbHR5LWNhcmQtd2FsbGV0IiwiZW52ZWxvcGVWZXJzaW9uIjoxLCJwYXlsb2FkVmVyc2lvbiI6MSwia2RmIjp7Im5hbWUiOiJQQktERjItSE1BQy1TSEEyNTYiLCJzYWx0IjoiQVFJREJBVUdCd2dKQ2dzTURRNFBFQT09IiwiaXRlcmF0aW9ucyI6MjEwMDAwfSwiY2lwaGVyIjp7Im5hbWUiOiJBRVMtMjU2LUdDTSIsIml2TGVuZ3RoIjoxMiwidGFnTGVuZ3RoIjoxNn19AAAAdAMEBQYHCAkKCwwNDm1xzf0uQCv/IRsdNXqcGqfIKtOcjY4qSrfjfYFjSpnaxGXS0leraVXH6Gg1PWZD4m1XzM3ZHXTk37FOcGUexOPmyPFIN8GzW+StC/Z7f9UXOOhTwdp8y9/wn85axjbrWyQx+7sLF804AAAAUBQVFhcYGRobHB0eH0gDoem1JixLSvWrt0QVbq9fB3mRhqOt29M3rB9/5vHu6+FnmdY7k1JMExD8Vw/reOPNdCXfIOXcXwJ1uxiEldH1Kwoj";
const GOLDEN_ENVELOPE_1_PAYLOAD_2 =
  "TENXQktQMDEAAADbeyJhcHAiOiJsb3lhbHR5LWNhcmQtd2FsbGV0IiwiZW52ZWxvcGVWZXJzaW9uIjoxLCJwYXlsb2FkVmVyc2lvbiI6Miwia2RmIjp7Im5hbWUiOiJQQktERjItSE1BQy1TSEEyNTYiLCJzYWx0IjoiQVFJREJBVUdCd2dKQ2dzTURRNFBFQT09IiwiaXRlcmF0aW9ucyI6MjEwMDAwfSwiY2lwaGVyIjp7Im5hbWUiOiJBRVMtMjU2LUdDTSIsIml2TGVuZ3RoIjoxMiwidGFnTGVuZ3RoIjoxNn19AAAAdAMEBQYHCAkKCwwNDm1xzf0uQCv/IRsdNXqcGqfIKtOcjY4qSrfjfYFjSpnaxGXS0leraVXH6Gg1PWZD4m1XzM3ZHXTk37FOcGUexOPmyPFIN8GzW+StC/Z7f9UXOOhTwdp8y99dt50ULlk8m221R37OnCyfAAAAUBQVFhcYGRobHB0eH0gDoem1JixLSvWrt0QVbq9fB3mRhqOt29M3rB9/5vHu6+FnmdY7k1JMExD8Vw/reOPNdCWe1A6YLQc/yW2GNBcY+Ro9";

test("golden vectors cover envelope v1 with payload v1 and v2", async () => {
  const v1 = bytesToBase64(await encode(emptyPayload, 1));
  const v2 = bytesToBase64(await encode(emptyPayload, 2));
  assert.equal(v1, GOLDEN_ENVELOPE_1_PAYLOAD_1);
  assert.equal(v2, GOLDEN_ENVELOPE_1_PAYLOAD_2);
});

test("bundle codec consumes export cards lazily with record backpressure", async () => {
  let requestedCards = 0;
  async function* cards() {
    requestedCards += 1;
    yield {
      storeName: "Lazy Market",
      cardNumber: "12345678",
      barcodeFormat: "code128" as const,
      images: []
    };
  }
  const iterator = new JsonBundleCodec()
    .encode({
      payloadVersion: 2,
      exportedAt: emptyPayload.exportedAt,
      cardCount: 1,
      imageCount: 0,
      totalDecodedBytes: 0,
      cards: cards()
    })
    [Symbol.asyncIterator]();

  await iterator.next();
  assert.equal(requestedCards, 0);
  await iterator.next();
  assert.equal(requestedCards, 1);
});

test("correct passphrase decrypts and payload v1 migrates image dimensions to current", async () => {
  const image = png(7, 9);
  const payload: BackupPayload = {
    payloadVersion: 2,
    exportedAt: emptyPayload.exportedAt,
    cards: [
      {
        storeName: "Synthetic Market",
        cardNumber: "12345678",
        barcodeFormat: "code128",
        images: [
          {
            role: "primary",
            mimeType: "image/png",
            width: 7,
            height: 9,
            byteLength: image.byteLength,
            data: image
          }
        ]
      }
    ]
  };
  const bytes = await encode(payload, 1);
  const decoded = await new EncryptedBackupContainer(
    new DeterministicNodeBackupCrypto(),
    new JsonBundleCodec()
  ).read(stream(bytes), "correct horse battery staple");
  assert.equal(decoded.sourcePayloadVersion, 1);
  assert.equal(decoded.payload.payloadVersion, 2);
  assert.deepEqual(
    { width: decoded.payload.cards[0].images[0].width, height: decoded.payload.cards[0].images[0].height },
    { width: 7, height: 9 }
  );
});

test("wrong passphrase, tampering, and truncation return typed failures", async () => {
  const bytes = await encode(emptyPayload);
  const container = new EncryptedBackupContainer(new DeterministicNodeBackupCrypto(), new JsonBundleCodec());
  await assert.rejects(() => container.read(stream(bytes), "wrong passphrase"), {
    kind: "backup",
    reason: "wrongPassphrase"
  });

  const tampered = new Uint8Array(bytes);
  tampered[tampered.length - 1] ^= 1;
  await assert.rejects(() => container.read(stream(tampered), "correct horse battery staple"), {
    kind: "backup",
    reason: "tampered"
  });

  await assert.rejects(
    () => container.read(stream(bytes.slice(0, -3)), "correct horse battery staple"),
    { kind: "backup", reason: "truncated" }
  );
});

test("future envelope and future payload versions are rejected before restore", async () => {
  const bytes = await encode(emptyPayload);
  const text = new TextDecoder().decode(bytes.slice(12, 12 + new DataView(bytes.buffer).getUint32(8)));
  const envelopeOffset = text.indexOf('"envelopeVersion":1') + '"envelopeVersion":'.length;
  const payloadOffset = text.indexOf('"payloadVersion":2') + '"payloadVersion":'.length;

  const futureEnvelope = new Uint8Array(bytes);
  futureEnvelope[12 + envelopeOffset] = "9".charCodeAt(0);
  const container = new EncryptedBackupContainer(new DeterministicNodeBackupCrypto(), new JsonBundleCodec());
  await assert.rejects(
    () => container.read(stream(futureEnvelope), "correct horse battery staple"),
    { kind: "backup", reason: "futureEnvelope" }
  );

  const futurePayload = new Uint8Array(bytes);
  futurePayload[12 + payloadOffset] = "9".charCodeAt(0);
  await assert.rejects(
    () => container.read(stream(futurePayload), "correct horse battery staple"),
    { kind: "backup", reason: "futurePayload" }
  );
});
