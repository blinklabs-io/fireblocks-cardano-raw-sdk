jest.mock("cbor2", () => ({ encode: jest.fn(), decode: jest.fn() }));
jest.mock("jose", () => ({ createRemoteJWKSet: jest.fn(), compactVerify: jest.fn() }));

import { BasePath, ConfigurationOptions } from "@fireblocks/ts-sdk";
import type { FireblocksCardanoRawSDK } from "../../FireblocksCardanoRawSDK.js";
import { SdkManager } from "../../pool/sdkManager.js";
import { Networks } from "../../types/index.js";
import { Logger, LogLevel } from "../../utils/logger.js";

const baseConfig: ConfigurationOptions = {
  apiKey: "fixture-key",
  secretKey: "fixture-secret",
  basePath: BasePath.US,
};

const mockSdk = (shutdownImplementation: () => Promise<void> = async () => undefined) => {
  const shutdown = jest.fn(shutdownImplementation);
  return {
    sdk: { shutdown } as unknown as FireblocksCardanoRawSDK,
    shutdown,
  };
};

describe("SdkManager", () => {
  const originalLogLevel = Logger.getLogLevel();

  beforeAll(() => Logger.setLogLevel(LogLevel.NONE));
  afterAll(() => Logger.setLogLevel(originalLogLevel));
  afterEach(() => jest.useRealTimers());

  it("reuses vault instances and releases withSdk acquisitions on success and failure", async () => {
    const fixture = mockSdk();
    const factory = jest.fn(async () => fixture.sdk);
    const manager = new SdkManager(baseConfig, Networks.PREVIEW, undefined, factory);

    const first = await manager.getSdk("vault-1");
    manager.releaseSdk("vault-1");
    const second = await manager.getSdk("vault-1");

    expect(first).toBe(fixture.sdk);
    expect(second).toBe(first);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith("vault-1", baseConfig, Networks.PREVIEW);
    expect(manager.getMetrics()).toEqual({
      totalInstances: 1,
      activeInstances: 1,
      idleInstances: 0,
      instancesByVaultAccount: { "vault-1": true },
    });

    manager.releaseSdk("vault-1");
    await expect(manager.withSdk("vault-1", async () => "result")).resolves.toBe("result");
    expect(manager.getMetrics().idleInstances).toBe(1);

    await expect(
      manager.withSdk("vault-1", async () => {
        throw new Error("callback failed");
      })
    ).rejects.toThrow("callback failed");
    expect(manager.getMetrics().idleInstances).toBe(1);

    manager.releaseSdk("missing-vault");
    await manager.shutdown();
    expect(fixture.shutdown).toHaveBeenCalledTimes(1);
    expect(manager.getMetrics().totalInstances).toBe(0);
  });

  it("evicts the least-recently-used idle SDK when the pool is full", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const first = mockSdk();
    const second = mockSdk();
    const factory = jest.fn(async (vaultAccountId: string) =>
      vaultAccountId === "vault-1" ? first.sdk : second.sdk
    );
    const manager = new SdkManager(
      baseConfig,
      Networks.PREVIEW,
      { maxPoolSize: 1, cleanupIntervalMs: 60_000 },
      factory
    );

    await manager.getSdk("vault-1");
    manager.releaseSdk("vault-1");
    jest.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));

    await expect(manager.getSdk("vault-2")).resolves.toBe(second.sdk);
    expect(first.shutdown).toHaveBeenCalledTimes(1);
    expect(manager.getMetrics().instancesByVaultAccount).toEqual({ "vault-2": true });

    manager.releaseSdk("vault-2");
    await manager.shutdown();
    expect(second.shutdown).toHaveBeenCalledTimes(1);
  });

  it("refuses a new SDK when every full-pool instance is active", async () => {
    const fixture = mockSdk();
    const factory = jest.fn(async () => fixture.sdk);
    const manager = new SdkManager(baseConfig, Networks.PREVIEW, { maxPoolSize: 1 }, factory);

    await manager.getSdk("vault-1");
    await expect(manager.getSdk("vault-2")).rejects.toThrow(
      "SDK pool at maximum capacity (1) with no idle connections"
    );

    manager.releaseSdk("vault-1");
    await manager.shutdown();
  });

  it("removes released SDKs after the idle timeout", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const fixture = mockSdk();
    const manager = new SdkManager(
      baseConfig,
      Networks.PREVIEW,
      { idleTimeoutMs: 1_000, cleanupIntervalMs: 500 },
      async () => fixture.sdk
    );

    await manager.getSdk("vault-1");
    manager.releaseSdk("vault-1");
    await jest.advanceTimersByTimeAsync(1_501);

    expect(fixture.shutdown).toHaveBeenCalledTimes(1);
    expect(manager.getMetrics()).toMatchObject({
      totalInstances: 0,
      activeInstances: 0,
      idleInstances: 0,
    });
    await manager.shutdown();
  });

  it("supports late factory initialization", async () => {
    const fixture = mockSdk();
    const manager = new SdkManager(baseConfig, Networks.PREVIEW);

    await expect(manager.getSdk("vault-1")).rejects.toThrow("SDK factory not initialized");
    manager.setSdkFactory(async () => fixture.sdk);
    await expect(manager.getSdk("vault-1")).resolves.toBe(fixture.sdk);

    manager.releaseSdk("vault-1");
    await manager.shutdown();
  });

  it("completes shutdown when an SDK shutdown rejects", async () => {
    const fixture = mockSdk(async () => {
      throw new Error("shutdown failed");
    });
    const manager = new SdkManager(
      baseConfig,
      Networks.PREVIEW,
      undefined,
      async () => fixture.sdk
    );

    await manager.getSdk("vault-1");
    manager.releaseSdk("vault-1");
    await expect(manager.shutdown()).resolves.toBeUndefined();
    expect(manager.getMetrics().totalInstances).toBe(0);
  });
});
