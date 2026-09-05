import { readFileSync } from "fs";
import { BasePath } from "@fireblocks/ts-sdk";
import dotenv from "dotenv";
import { Logger } from "./logger.js";
// Prefer the POC's private development environment while retaining .env compatibility.
dotenv.config({ path: process.env.CARDANO_ENV_FILE || ".env.development" });
dotenv.config();
const logger = new Logger("utils:config");
// Cached config instance
let configCache = null;
/**
 * Resolve secret key from multiple sources:
 * 1. Direct key content via FIREBLOCKS_API_USER_SECRET_KEY env var
 *    - PEM format (starts with -----BEGIN)
 *    - Base64 encoded PEM
 * 2. File path via FIREBLOCKS_API_USER_SECRET_KEY_PATH env var
 */
const getSecretKey = (secretKeyPath) => {
    // check for direct key content first
    const directKey = process.env.FIREBLOCKS_API_USER_SECRET_KEY;
    if (directKey) {
        return resolveKeyContent(directKey);
    }
    // fall back to file path
    const path = secretKeyPath || process.env.FIREBLOCKS_API_USER_SECRET_KEY_PATH;
    if (!path) {
        throw new Error("FIREBLOCKS_API_USER_SECRET_KEY or FIREBLOCKS_API_USER_SECRET_KEY_PATH is required");
    }
    try {
        return readFileSync(path, "utf-8");
    }
    catch (error) {
        throw new Error(`Failed to read secret key file at ${path}: ${error}`, { cause: error });
    }
};
/**
 * Resolve key content - handles PEM and base64 encoded formats
 */
const resolveKeyContent = (key) => {
    const trimmed = key.trim();
    // already PEM format
    if (trimmed.startsWith("-----BEGIN")) {
        return trimmed;
    }
    // try base64 decode
    try {
        const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
        if (decoded.startsWith("-----BEGIN")) {
            return decoded;
        }
    }
    catch {
        // not valid base64, fall through
    }
    // assume it's PEM without proper detection (let Fireblocks SDK handle validation)
    return trimmed;
};
// Validate base path
const validateBasePath = (basePath) => {
    if (basePath && !Object.values(BasePath).includes(basePath)) {
        logger.warn(`Invalid BASE_PATH: ${basePath}. Must be one of: ${Object.values(BasePath).join(", ")}`);
    }
    return basePath || BasePath.US;
};
// Load config from environment variables
const loadConfigFromEnv = () => {
    return {
        PORT: Number(process.env.PORT) || 8000,
        FIREBLOCKS: {
            apiKey: process.env.FIREBLOCKS_API_USER_KEY || "",
            secretKey: getSecretKey(),
            basePath: validateBasePath(process.env.FIREBLOCKS_BASE_PATH || process.env.BASE_PATH || ""),
        },
        APP_NAME: process.env.APP_NAME || "cardano-raw-sdk",
    };
};
// Merge custom config with defaults
const mergeConfig = (customConfig) => {
    const defaults = {
        PORT: Number(process.env.PORT) || 8000,
        FIREBLOCKS: {
            apiKey: "",
            secretKey: "",
            basePath: BasePath.US,
        },
        APP_NAME: process.env.APP_NAME || "cardano-raw-sdk",
    };
    return {
        PORT: customConfig.PORT ?? defaults.PORT,
        FIREBLOCKS: {
            apiKey: customConfig.FIREBLOCKS?.apiKey ?? defaults.FIREBLOCKS.apiKey,
            secretKey: customConfig.FIREBLOCKS?.secretKey ?? defaults.FIREBLOCKS.secretKey,
            basePath: customConfig.FIREBLOCKS?.basePath ?? defaults.FIREBLOCKS.basePath,
        },
        APP_NAME: customConfig.APP_NAME ?? defaults.APP_NAME,
    };
};
/**
 * Manually initialize config with custom values (for library usage)
 * Call this before accessing config if you want to provide custom configuration
 *
 * @param customConfig - Custom configuration object
 * @example
 * ```typescript
 * initConfig({
 *   FIREBLOCKS: {
 *     apiKey: "your-api-key",
 *     secretKey: "your-secret-key",
 *     basePath: BasePath.US
 *   }
 * });
 * ```
 */
export const initConfig = (customConfig) => {
    if (configCache) {
        logger.warn("Config already initialized. Reinitializing with new values.");
    }
    if (customConfig) {
        configCache = mergeConfig(customConfig);
        logger.info("Config manually initialized with custom values");
    }
    else {
        configCache = loadConfigFromEnv();
        logger.info("Config initialized from environment variables");
    }
};
/**
 * Get the config object (lazy initialization)
 * Will automatically load from environment variables on first access
 *
 * @returns Config object
 */
export const getConfig = () => {
    if (!configCache) {
        logger.info("Lazy loading config from environment variables");
        configCache = loadConfigFromEnv();
    }
    return configCache;
};
/**
 * Check if config has been initialized
 */
export const isConfigInitialized = () => {
    return configCache !== null;
};
/**
 * Reset config (mainly for testing)
 */
export const resetConfig = () => {
    configCache = null;
    logger.info("Config reset");
};
// Create a Proxy for backward compatibility
// This allows existing code to use `config.PORT` without breaking
export const config = new Proxy({}, {
    get(_target, prop) {
        // Lazy load config on first property access
        if (!configCache) {
            configCache = loadConfigFromEnv();
        }
        return configCache[prop];
    },
    set(_target, prop, _value) {
        throw new Error(`Config is read-only. Property '${prop}' cannot be modified. Use initConfig() to set custom config.`);
    },
});
//# sourceMappingURL=config.js.map