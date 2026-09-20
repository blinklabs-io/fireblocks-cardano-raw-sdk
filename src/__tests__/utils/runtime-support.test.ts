import { BasePath } from "@fireblocks/ts-sdk";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ErrorHandler } from "../../utils/errorHandler.js";
import {
  config,
  getConfig,
  initConfig,
  isConfigInitialized,
  resetConfig,
} from "../../utils/config.js";
import { Logger, LogLevel } from "../../utils/logger.js";
import { sanitizeForLogging } from "../../utils/sanitizer.js";
import { UtxoLockManager } from "../../utils/utxoLock.js";
import { SdkApiError } from "../../types/errors.js";

const ENVIRONMENT_KEYS = [
  "APP_NAME",
  "BASE_PATH",
  "FIREBLOCKS_API_USER_KEY",
  "FIREBLOCKS_API_USER_SECRET_KEY",
  "FIREBLOCKS_API_USER_SECRET_KEY_PATH",
  "FIREBLOCKS_BASE_PATH",
  "PORT",
] as const;

describe("runtime support utilities", () => {
  const originalLogLevel = Logger.getLogLevel();
  let originalEnvironment: Record<string, string | undefined>;

  beforeAll(() => Logger.setLogLevel(LogLevel.NONE));
  beforeEach(() => {
    originalEnvironment = Object.fromEntries(
      ENVIRONMENT_KEYS.map((key) => [key, process.env[key]])
    );
    for (const key of ENVIRONMENT_KEYS) delete process.env[key];
    resetConfig();
  });
  afterEach(() => {
    resetConfig();
    for (const key of ENVIRONMENT_KEYS) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.useRealTimers();
  });
  afterAll(() => Logger.setLogLevel(originalLogLevel));

  describe("configuration", () => {
    it("merges custom configuration with defaults and permits reinitialization", () => {
      expect(isConfigInitialized()).toBe(false);
      initConfig({
        PORT: 9000,
        APP_NAME: "fixture-app",
        FIREBLOCKS: { apiKey: "fixture-key", secretKey: "fixture-secret" },
      });

      expect(getConfig()).toEqual({
        PORT: 9000,
        APP_NAME: "fixture-app",
        FIREBLOCKS: {
          apiKey: "fixture-key",
          secretKey: "fixture-secret",
          basePath: BasePath.US,
        },
      });
      expect(isConfigInitialized()).toBe(true);

      initConfig({ PORT: 9001 });
      expect(getConfig().PORT).toBe(9001);
    });

    it("loads direct PEM and base64-encoded keys from the environment", () => {
      process.env.PORT = "7000";
      process.env.APP_NAME = "environment-app";
      process.env.FIREBLOCKS_API_USER_KEY = "environment-key";
      process.env.FIREBLOCKS_BASE_PATH = BasePath.EU;
      process.env.FIREBLOCKS_API_USER_SECRET_KEY = Buffer.from(
        "-----BEGIN PRIVATE KEY-----\nbase64-fixture"
      ).toString("base64");

      initConfig();
      expect(getConfig()).toEqual({
        PORT: 7000,
        APP_NAME: "environment-app",
        FIREBLOCKS: {
          apiKey: "environment-key",
          secretKey: "-----BEGIN PRIVATE KEY-----\nbase64-fixture",
          basePath: BasePath.EU,
        },
      });

      resetConfig();
      process.env.FIREBLOCKS_API_USER_SECRET_KEY =
        "  -----BEGIN PRIVATE KEY-----\ndirect-fixture  ";
      expect(getConfig().FIREBLOCKS.secretKey).toBe("-----BEGIN PRIVATE KEY-----\ndirect-fixture");
    });

    it("loads a key file and reports missing or unreadable key sources", () => {
      const directory = mkdtempSync(join(tmpdir(), "cardano-config-test-"));
      const keyPath = join(directory, "fireblocks.pem");
      writeFileSync(keyPath, "file-fixture-key");
      try {
        process.env.FIREBLOCKS_API_USER_SECRET_KEY_PATH = keyPath;
        expect(getConfig().FIREBLOCKS.secretKey).toBe("file-fixture-key");

        resetConfig();
        process.env.FIREBLOCKS_API_USER_SECRET_KEY_PATH = join(directory, "missing.pem");
        expect(() => getConfig()).toThrow("Failed to read secret key file");

        resetConfig();
        delete process.env.FIREBLOCKS_API_USER_SECRET_KEY_PATH;
        expect(() => getConfig()).toThrow(
          "FIREBLOCKS_API_USER_SECRET_KEY or FIREBLOCKS_API_USER_SECRET_KEY_PATH is required"
        );
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    it("supports lazy proxy reads while rejecting proxy writes", () => {
      process.env.PORT = "8123";
      process.env.FIREBLOCKS_API_USER_SECRET_KEY = "fixture-secret";

      expect(config.PORT).toBe(8123);
      expect(isConfigInitialized()).toBe(true);
      expect(() => {
        config.PORT = 9000;
      }).toThrow("Config is read-only");
    });
  });

  describe("sensitive-data sanitization", () => {
    it("redacts default and custom sensitive keys recursively without mutating input", () => {
      const input = {
        username: "alice",
        apiKey: "api-secret",
        nested: {
          PASSWORD: "password-secret",
          safe: "visible",
          items: [{ authorization: "bearer-secret" }, { tenantId: "tenant-secret" }],
        },
      };

      expect(sanitizeForLogging(input, ["tenantId"])).toEqual({
        username: "alice",
        apiKey: "[REDACTED]",
        nested: {
          PASSWORD: "[REDACTED]",
          safe: "visible",
          items: [{ authorization: "[REDACTED]" }, { tenantId: "[REDACTED]" }],
        },
      });
      expect(input.apiKey).toBe("api-secret");
    });

    it("preserves nullish and primitive values", () => {
      expect(sanitizeForLogging(null)).toBeNull();
      expect(sanitizeForLogging(undefined)).toBeUndefined();
      expect(sanitizeForLogging("visible")).toBe("visible");
      expect(sanitizeForLogging(42)).toBe(42);
    });
  });

  describe("API error handling", () => {
    const createHandler = () => {
      const error = jest.fn();
      const logger = { error } as unknown as Logger;
      return { handler: new ErrorHandler("fixture-service", logger), error };
    };

    it("maps provider responses without logging provider-controlled details", () => {
      const { handler, error } = createHandler();
      const result = handler.handleApiError(
        {
          isAxiosError: true,
          message: "fallback-message",
          response: {
            status: 429,
            statusText: "Too Many Requests",
            data: {
              message: "rate limited",
              type: "rate_limit",
              info: { retryAfter: 10 },
            },
          },
        },
        "fetching data"
      );

      expect(result).toEqual(
        new SdkApiError("rate limited", 429, "rate_limit", { retryAfter: 10 }, "fixture-service")
      );
      expect(error.mock.calls).toEqual([
        ["Error fetching data"],
        ["Provider returned an HTTP error response"],
      ]);
    });

    it("distinguishes request and setup failures without a response", () => {
      const requestFailure = createHandler();
      const requestResult = requestFailure.handler.handleApiError(
        { isAxiosError: true, message: "network failed", request: {} },
        "submitting"
      );
      expect(requestResult.message).toBe("network failed");
      expect(requestFailure.error).toHaveBeenLastCalledWith(
        "Request was made but no response received"
      );

      const setupFailure = createHandler();
      setupFailure.handler.handleApiError(
        { isAxiosError: true, message: "setup failed" },
        "submitting"
      );
      expect(setupFailure.error).toHaveBeenLastCalledWith("Error setting up request");
    });

    it("passes through SDK errors and wraps unexpected values", () => {
      const { handler, error } = createHandler();
      const sdkError = new SdkApiError("already structured", 400);
      expect(handler.handleApiError(sdkError, "processing")).toBe(sdkError);

      expect(handler.handleApiError(new Error("unexpected"), "processing")).toMatchObject({
        message: "unexpected",
        service: "fixture-service",
      });
      expect(handler.handleApiError({ reason: "unknown" }, "processing")).toMatchObject({
        message: "Error processing",
        errorInfo: { reason: "unknown" },
      });
      expect(error).toHaveBeenCalledWith("Unexpected error processing");
    });
  });

  describe("UTxO locking", () => {
    it("locks distinct outputs and releases idempotently", () => {
      const manager = new UtxoLockManager();
      const release = manager.lock([
        { transaction_id: "transaction", output_index: 0 },
        { transaction_id: "transaction", output_index: 1 },
      ]);

      expect(manager.isLocked("transaction", 0)).toBe(true);
      expect(manager.isLocked("transaction", 1)).toBe(true);
      expect(manager.isLocked("transaction", 2)).toBe(false);

      release();
      release();
      expect(manager.isLocked("transaction", 0)).toBe(false);
      expect(manager.isLocked("transaction", 1)).toBe(false);
    });

    it("expires stale locks", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const manager = new UtxoLockManager();
      manager.lock([{ transaction_id: "transaction", output_index: 0 }]);

      jest.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
      expect(manager.isLocked("transaction", 0)).toBe(false);
      expect(manager.isLocked("transaction", 0)).toBe(false);
    });
  });
});
