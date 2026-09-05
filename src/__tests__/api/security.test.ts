import express, { Request } from "express";
import request from "supertest";
import {
  allowSignedWebhook,
  credentialsMatch,
  extractApiCredential,
  protectApi,
  validateServerApiKey,
} from "../../api/security.js";

describe("HTTP server security", () => {
  it("accepts an exact credential and rejects a different credential", () => {
    expect(credentialsMatch("a".repeat(32), "a".repeat(32))).toBe(true);
    expect(credentialsMatch("b".repeat(32), "a".repeat(32))).toBe(false);
  });

  it("reads x-api-key before a Bearer credential", () => {
    expect(
      extractApiCredential({
        headers: { "x-api-key": "header-key", authorization: "Bearer bearer-key" },
      } as Pick<Request, "headers">)
    ).toBe("header-key");
  });

  it("reads a case-insensitive Bearer credential", () => {
    expect(
      extractApiCredential({ headers: { authorization: "bearer test-key" } } as Pick<
        Request,
        "headers"
      >)
    ).toBe("test-key");
  });

  it("rejects a missing or short server API key", () => {
    expect(() => validateServerApiKey(undefined)).toThrow("SERVER_API_KEY is required");
    expect(() => validateServerApiKey("too-short")).toThrow("at least 32 bytes");
  });

  it("allows only the exact signed webhook route to bypass application auth", () => {
    expect(allowSignedWebhook({ method: "POST", path: "/webhook" } as Request)).toBe(true);
    expect(allowSignedWebhook({ method: "GET", path: "/webhook" } as Request)).toBe(false);
    expect(allowSignedWebhook({ method: "POST", path: "/transfer/ada" } as Request)).toBe(false);
  });

  it("protects API routes while leaving the signed webhook boundary separate", async () => {
    const key = "s".repeat(32);
    const app = express();
    app.use("/api", protectApi(key));
    app.get("/api/balance", (_req, res) => res.json({ ok: true }));
    app.post("/api/webhook", (_req, res) => res.json({ signatureCheck: "controller" }));

    await request(app).get("/api/balance").expect(401, {
      success: false,
      error: "Unauthorized",
    });
    await request(app).get("/api/balance").set("x-api-key", key).expect(200, { ok: true });
    await request(app)
      .get("/api/balance")
      .set("Authorization", `Bearer ${key}`)
      .expect(200, { ok: true });
    await request(app).post("/api/webhook").expect(200, {
      signatureCheck: "controller",
    });
  });
});
