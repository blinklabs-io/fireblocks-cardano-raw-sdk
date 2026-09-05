import { ConfigurationOptions as FireblocksConfig } from "@fireblocks/ts-sdk";
export interface Config {
    PORT: number;
    FIREBLOCKS: FireblocksConfig;
    APP_NAME: string;
}
export interface CustomConfig {
    PORT?: number;
    FIREBLOCKS?: Partial<FireblocksConfig>;
    APP_NAME?: string;
}
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
export declare const initConfig: (customConfig?: CustomConfig) => void;
/**
 * Get the config object (lazy initialization)
 * Will automatically load from environment variables on first access
 *
 * @returns Config object
 */
export declare const getConfig: () => Config;
/**
 * Check if config has been initialized
 */
export declare const isConfigInitialized: () => boolean;
/**
 * Reset config (mainly for testing)
 */
export declare const resetConfig: () => void;
export declare const config: Config;
//# sourceMappingURL=config.d.ts.map