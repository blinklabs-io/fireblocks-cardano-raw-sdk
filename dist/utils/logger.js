import { sanitizeForLogging } from "./sanitizer.js";
/** Keep one caller-controlled value from forging a second log record or terminal control. */
const escapeLogText = (value) => Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029
        ? `\\u${code.toString(16).padStart(4, "0")}`
        : character;
})
    .join("")
    // Explicit postcondition for static analyzers and future formatter changes:
    // no caller-controlled CR/LF may reach a plain-text log sink.
    .replace(/\n|\r/g, "");
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (LogLevel = {}));
export class Logger {
    static level = LogLevel.INFO;
    static sanitizeLogs = true;
    static customSensitiveKeys = [];
    context;
    /**
     * Create a new logger instance
     * @param context The context for this logger (e.g. class name)
     */
    constructor(context) {
        this.context = escapeLogText(context);
    }
    /**
     * Set the global log level
     * @param level Log level
     */
    static setLogLevel(level) {
        Logger.level = level;
    }
    /**
     * Get current log level
     * @returns Current log level
     */
    static getLogLevel() {
        return Logger.level;
    }
    /**
     * Enable or disable automatic sanitization of sensitive data in logs
     * @param enabled Whether to sanitize logs (default: true)
     */
    static setSanitizeLogs(enabled) {
        Logger.sanitizeLogs = enabled;
    }
    /**
     * Add custom keys that should be treated as sensitive
     * @param keys Array of key names to treat as sensitive
     */
    static addSensitiveKeys(...keys) {
        Logger.customSensitiveKeys.push(...keys);
    }
    /**
     * Clear all custom sensitive keys
     */
    static clearSensitiveKeys() {
        Logger.customSensitiveKeys = [];
    }
    /**
     * Get formatted timestamp
     * @returns Formatted timestamp string
     */
    getTimestamp() {
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
    sanitizeArgs(args) {
        return args.map((arg) => {
            if (typeof arg === "string")
                return escapeLogText(arg);
            if (arg instanceof Error)
                return JSON.stringify({ name: arg.name });
            const sanitized = Logger.sanitizeLogs
                ? sanitizeForLogging(arg, Logger.customSensitiveKeys)
                : arg;
            if (sanitized === null || sanitized === undefined)
                return String(sanitized);
            if (typeof sanitized === "number" ||
                typeof sanitized === "boolean" ||
                typeof sanitized === "bigint") {
                return String(sanitized);
            }
            if (typeof sanitized === "function" || typeof sanitized === "symbol") {
                return `[${typeof sanitized}]`;
            }
            try {
                const serialized = JSON.stringify(sanitized, (_key, value) => {
                    if (value instanceof Error)
                        return { name: value.name };
                    if (typeof value === "bigint")
                        return value.toString();
                    if (typeof value === "function" || typeof value === "symbol") {
                        return `[${typeof value}]`;
                    }
                    return value;
                });
                return escapeLogText(serialized ?? `[${typeof sanitized}]`);
            }
            catch {
                return "[Unserializable value]";
            }
        });
    }
    /**
     * Log a debug message
     * @param message Log message
     * @param args Additional arguments
     */
    debug(message, ...args) {
        if (Logger.level <= LogLevel.DEBUG) {
            const sanitizedArgs = this.sanitizeArgs(args);
            console.log(`[${this.getTimestamp()}] [DEBUG] [${this.context}] ${escapeLogText(message)}`, ...sanitizedArgs);
        }
    }
    /**
     * Log an info message
     * @param message Log message
     * @param args Additional arguments
     */
    info(message, ...args) {
        if (Logger.level <= LogLevel.INFO) {
            const sanitizedArgs = this.sanitizeArgs(args);
            console.log(`[${this.getTimestamp()}] [INFO] [${this.context}] ${escapeLogText(message)}`, ...sanitizedArgs);
        }
    }
    /**
     * Log a warning message
     * @param message Log message
     * @param args Additional arguments
     */
    warn(message, ...args) {
        if (Logger.level <= LogLevel.WARN) {
            const sanitizedArgs = this.sanitizeArgs(args);
            console.warn(`[${this.getTimestamp()}] [WARN] [${this.context}] ${escapeLogText(message)}`, ...sanitizedArgs);
        }
    }
    /**
     * Log an error message
     * @param message Log message
     * @param args Additional arguments
     */
    error(message, ...args) {
        if (Logger.level <= LogLevel.ERROR) {
            const sanitizedArgs = this.sanitizeArgs(args);
            console.error(`[${this.getTimestamp()}] [ERROR] [${this.context}] ${escapeLogText(message)}`, ...sanitizedArgs);
        }
    }
    /**
     * Create a child logger with a subcontext
     * @param subContext Subcontext name
     * @returns Child logger instance
     */
    createChild(subContext) {
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
//# sourceMappingURL=logger.js.map