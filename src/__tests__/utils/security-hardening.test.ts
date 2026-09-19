import { IagonApiService } from "../../services/iagon.api.service.js";
import { Networks } from "../../types/index.js";
import { Logger, LogLevel } from "../../utils/logger.js";
import { inspect } from "node:util";

describe("security hardening", () => {
  it("never disables IAGON certificate verification", () => {
    const original = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "development";
      expect(() => new IagonApiService("api-key", Networks.PREVIEW, 1000, true)).toThrow(
        "SSL verification cannot be disabled"
      );
      expect(() => new IagonApiService("api-key", Networks.PREVIEW)).not.toThrow();
    } finally {
      if (original === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = original;
    }
  });

  it("keeps caller-controlled text on one log line", () => {
    const original = Logger.getLogLevel();
    const output = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      Logger.setLogLevel(LogLevel.ERROR);
      new Logger("context\nforged").error("failed\r\n[INFO] forged\u2028next", "arg\nforged");
      expect(output).toHaveBeenCalledTimes(1);
      expect(output.mock.calls[0][0]).toContain("context\\u000aforged");
      expect(output.mock.calls[0][0]).toContain("failed\\u000d\\u000a[INFO] forged");
      expect(output.mock.calls[0][0]).toContain("forged\\u2028next");
      expect(output.mock.calls[0][1]).toBe("arg\\u000aforged");
    } finally {
      output.mockRestore();
      Logger.setLogLevel(original);
    }
  });

  it("enforces the one-line invariant at every log level", () => {
    const original = Logger.getLogLevel();
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      Logger.setLogLevel(LogLevel.DEBUG);
      const logger = new Logger("context\nforged");
      const customInspected = function () {};
      Object.defineProperty(customInspected, inspect.custom, {
        value: () => "forged\n[INFO] second record",
      });
      logger.debug("debug\r\nforged", "arg\nforged");
      logger.info("info\r\nforged", customInspected);
      logger.warn("warn\r\nforged", "arg\nforged");
      logger.error("error\r\nforged", "arg\nforged");

      const calls = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls];
      expect(calls).toHaveLength(4);
      for (const call of calls) {
        for (const value of call) {
          expect(typeof value).toBe("string");
          expect(value).not.toMatch(/[\r\n]/);
        }
      }
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
      Logger.setLogLevel(original);
    }
  });
});
