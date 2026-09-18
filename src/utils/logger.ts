import { sanitizeForLogging } from "./sanitizer.js";

/** Keep one caller-controlled value from forging a second log record or terminal control. */
const escapeLogText = (value: string): string =>
  Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029
      ? `\\u${code.toString(16).padStart(4, "0")}`
      : character;
  }).join("");

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;
  private static sanitizeLogs: boolean = true;
  private static customSensitiveKeys: string[] = [];
  private context: string;

  /**
   * Create a new logger instance
   * @param context The context for this logger (e.g. class name)
   */
  constructor(context: string) {
    this.context = escapeLogText(context);
  }

  /**
   * Set the global log level
   * @param level Log level
   */
  static setLogLevel(level: LogLevel): void {
    Logger.level = level;
  }

  /**
   * Get current log level
   * @returns Current log level
   */
  static getLogLevel(): LogLevel {
    return Logger.level;
  }

  /**
   * Enable or disable automatic sanitization of sensitive data in logs
   * @param enabled Whether to sanitize logs (default: true)
   */
  static setSanitizeLogs(enabled: boolean): void {
    Logger.sanitizeLogs = enabled;
  }

  /**
   * Add custom keys that should be treated as sensitive
   * @param keys Array of key names to treat as sensitive
   */
  static addSensitiveKeys(...keys: string[]): void {
    Logger.customSensitiveKeys.push(...keys);
  }

  /**
   * Clear all custom sensitive keys
   */
  static clearSensitiveKeys(): void {
    Logger.customSensitiveKeys = [];
  }

  /**
   * Get formatted timestamp
   * @returns Formatted timestamp string
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
   * Sanitize arguments for logging if sanitization is enabled
   * @param args Arguments to sanitize
   * @returns Sanitized arguments
   */
  private sanitizeArgs(args: unknown[]): unknown[] {
    if (!Logger.sanitizeLogs) {
      return args.map((arg) => (typeof arg === "string" ? escapeLogText(arg) : arg));
    }
    return args.map((arg) => {
      const sanitized = sanitizeForLogging(arg, Logger.customSensitiveKeys);
      return typeof sanitized === "string" ? escapeLogText(sanitized) : sanitized;
    });
  }
  /**
   * Log a debug message
   * @param message Log message
   * @param args Additional arguments
   */
  debug(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.DEBUG) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.log(
        `[${this.getTimestamp()}] [DEBUG] [${this.context}] ${escapeLogText(message)}`,
        ...sanitizedArgs
      );
    }
  }

  /**
   * Log an info message
   * @param message Log message
   * @param args Additional arguments
   */
  info(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.INFO) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.log(
        `[${this.getTimestamp()}] [INFO] [${this.context}] ${escapeLogText(message)}`,
        ...sanitizedArgs
      );
    }
  }

  /**
   * Log a warning message
   * @param message Log message
   * @param args Additional arguments
   */
  warn(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.WARN) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.warn(
        `[${this.getTimestamp()}] [WARN] [${this.context}] ${escapeLogText(message)}`,
        ...sanitizedArgs
      );
    }
  }

  /**
   * Log an error message
   * @param message Log message
   * @param args Additional arguments
   */
  error(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.ERROR) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.error(
        `[${this.getTimestamp()}] [ERROR] [${this.context}] ${escapeLogText(message)}`,
        ...sanitizedArgs
      );
    }
  }

  /**
   * Create a child logger with a subcontext
   * @param subContext Subcontext name
   * @returns Child logger instance
   */
  createChild(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }
}

// Set log level from environment variable if available
if (typeof process !== "undefined" && process.env.LOG_LEVEL) {
  const envLevel = process.env.LOG_LEVEL.toUpperCase();
  switch (envLevel) {
    case "DEBUG":
      Logger.setLogLevel(LogLevel.DEBUG);
      break;
    case "INFO":
      Logger.setLogLevel(LogLevel.INFO);
      break;
    case "WARN":
      Logger.setLogLevel(LogLevel.WARN);
      break;
    case "ERROR":
      Logger.setLogLevel(LogLevel.ERROR);
      break;
    case "NONE":
      Logger.setLogLevel(LogLevel.NONE);
      break;
  }
}
