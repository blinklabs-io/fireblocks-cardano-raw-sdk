export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}
export declare class Logger {
    private static level;
    private static sanitizeLogs;
    private static customSensitiveKeys;
    private context;
    /**
     * Create a new logger instance
     * @param context The context for this logger (e.g. class name)
     */
    constructor(context: string);
    /**
     * Set the global log level
     * @param level Log level
     */
    static setLogLevel(level: LogLevel): void;
    /**
     * Get current log level
     * @returns Current log level
     */
    static getLogLevel(): LogLevel;
    /**
     * Enable or disable automatic sanitization of sensitive data in logs
     * @param enabled Whether to sanitize logs (default: true)
     */
    static setSanitizeLogs(enabled: boolean): void;
    /**
     * Add custom keys that should be treated as sensitive
     * @param keys Array of key names to treat as sensitive
     */
    static addSensitiveKeys(...keys: string[]): void;
    /**
     * Clear all custom sensitive keys
     */
    static clearSensitiveKeys(): void;
    /**
     * Get formatted timestamp
     * @returns Formatted timestamp string
     */
    private getTimestamp;
    /**
     * Sanitize arguments for logging if sanitization is enabled
     * @param args Arguments to sanitize
     * @returns Sanitized arguments
     */
    private sanitizeArgs;
    /**
     * Log a debug message
     * @param message Log message
     * @param args Additional arguments
     */
    debug(message: string, ...args: unknown[]): void;
    /**
     * Log an info message
     * @param message Log message
     * @param args Additional arguments
     */
    info(message: string, ...args: unknown[]): void;
    /**
     * Log a warning message
     * @param message Log message
     * @param args Additional arguments
     */
    warn(message: string, ...args: unknown[]): void;
    /**
     * Log an error message
     * @param message Log message
     * @param args Additional arguments
     */
    error(message: string, ...args: unknown[]): void;
    /**
     * Create a child logger with a subcontext
     * @param subContext Subcontext name
     * @returns Child logger instance
     */
    createChild(subContext: string): Logger;
}
//# sourceMappingURL=logger.d.ts.map