/**
 * Sanitize sensitive data in objects for logging
 *
 * Recursively traverses objects and redacts values for keys that match
 * sensitive field patterns (e.g., password, apiKey, token, secret).
 *
 * @param data - The data to sanitize (can be object, array, or primitive)
 * @param customSensitiveKeys - Additional keys to treat as sensitive
 * @returns A deep copy of the data with sensitive values redacted
 *
 * @example
 * ```typescript
 * const data = {
 *   username: 'john',
 *   password: 'secret123',
 *   apiKey: 'sk_12345'
 * };
 *
 * sanitizeForLogging(data);
 * // Returns: { username: 'john', password: '[REDACTED]', apiKey: '[REDACTED]' }
 * ```
 */
export declare const sanitizeForLogging: (data: unknown, customSensitiveKeys?: string[]) => unknown;
//# sourceMappingURL=sanitizer.d.ts.map