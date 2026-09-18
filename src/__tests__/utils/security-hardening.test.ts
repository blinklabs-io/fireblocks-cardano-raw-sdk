import { IagonApiService } from "../../services/iagon.api.service.js";
import { Networks } from "../../types/index.js";
import { Logger, LogLevel } from "../../utils/logger.js";

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
});
