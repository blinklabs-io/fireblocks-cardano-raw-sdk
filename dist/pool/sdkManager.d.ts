import { PoolConfig, SdkManagerMetrics, Networks } from "../types/index.js";
import { ConfigurationOptions } from "@fireblocks/ts-sdk";
import type { FireblocksCardanoRawSDK } from "../FireblocksCardanoRawSDK.js";
/**
 * Manages a pool of FireblocksCardanoRawSDK instances for efficient resource utilization.
 *
 * The SdkManager implements connection pooling for FireblocksCardanoRawSDK instances, allowing
 * reuse across multiple API requests. This reduces initialization overhead and manages resource
 * limits effectively. The manager handles:
 * - FireblocksCardanoRawSDK instance creation and lifecycle management per vault account
 * - Automatic cleanup of idle connections
 * - Pool size limits and LRU eviction policies
 * - Per-vault-account SDK instance tracking
 * - Each SDK instance is initialized with its vaultAccountId, eliminating repeated Fireblocks API calls
 *
 * @class SdkManager
 * @example
 * ```typescript
 * import { FireblocksCardanoRawSDK } from './FireblocksCardanoRawSDK.js';
 * import { Networks } from './types/index.js';
 *
 * const config: ConfigurationOptions = {
 *   apiKey: 'your-api-key',
 *   secretKey: 'your-secret-key',
 *   basePath: BasePath.US
 * };
 *
 * const network = Networks.MAINNET;
 *
 * const manager = new SdkManager(
 *   config,
 *   network,
 *   {
 *     maxPoolSize: 50,
 *     idleTimeoutMs: 20 * 60 * 1000
 *   },
 *   async (vaultAccountId, fireblocksConfig, network) =>
 *     FireblocksCardanoRawSDK.createInstance({
 *       fireblocksConfig,
 *       vaultAccountId,
 *       network
 *     })
 * );
 *
 * // Get SDK for a vault account (async)
 * const sdk = await manager.getSdk('vault-123');
 * const balance = await sdk.getBalanceByAddress();
 * ```
 */
export declare class SdkManager {
    private sdkPool;
    private baseConfig;
    private poolConfig;
    private cleanupInterval;
    private readonly logger;
    private sdkFactory;
    private network;
    /**
     * Creates an instance of SdkManager with connection pooling.
     *
     * @param baseConfig - Fireblocks SDK configuration used for all FireblocksCardanoRawSDK instances
     * @param network - The Cardano network to use (mainnet, preprod, preview)
     * @param poolConfig - Optional pool configuration settings
     * @param sdkFactory - Factory function to create FireblocksCardanoRawSDK instances (used to avoid circular dependency)
     */
    constructor(baseConfig: ConfigurationOptions, network: Networks, poolConfig?: Partial<PoolConfig>, sdkFactory?: (vaultAccountId: string, config: ConfigurationOptions, network: Networks) => Promise<FireblocksCardanoRawSDK>);
    /**
     * Sets the SDK factory function (called by FireblocksCardanoRawSDK to avoid circular dependency)
     * @param factory - Factory function to create FireblocksCardanoRawSDK instances
     */
    setSdkFactory(factory: (vaultAccountId: string, config: ConfigurationOptions, network: Networks) => Promise<FireblocksCardanoRawSDK>): void;
    /**
     * Gets or creates a FireblocksCardanoRawSDK instance for a specific vault account.
     *
     * Implements pooling with LRU eviction for efficient resource management.
     * Each vault account gets its own FireblocksCardanoRawSDK instance that can be reused across requests.
     * The SDK instance is initialized with the vaultAccountId, so methods don't need to fetch
     * vault-specific data from Fireblocks repeatedly.
     *
     * @param vaultAccountId - The Fireblocks vault account ID (used as pool key)
     * @returns A Promise that resolves to a FireblocksCardanoRawSDK instance
     *
     * @example
     * ```typescript
     * const sdk = await manager.getSdk('vault-123');
     * // SDK is pre-initialized with vault-123, no need to pass vaultAccountId again
     * const balance = await sdk.getBalanceByAddress();
     * const publicKey = await sdk.getPublicKey();
     * ```
     */
    getSdk(vaultAccountId: string): Promise<FireblocksCardanoRawSDK>;
    /**
     * Releases an SDK instance back to the pool.
     *
     * @param vaultAccountId - The vault account ID
     */
    releaseSdk(vaultAccountId: string): void;
    /**
     * Acquires an SDK instance, runs a callback, then releases it back to the pool.
     * Guarantees release even if the callback throws.
     *
     * @param vaultAccountId - The vault account ID
     * @param callback - Async function that receives the SDK instance
     * @returns The value returned by the callback
     *
     * @example
     * ```typescript
     * const balance = await manager.withSdk('vault-123', (sdk) => sdk.getBalanceByAddress());
     * ```
     */
    withSdk<T>(vaultAccountId: string, callback: (sdk: FireblocksCardanoRawSDK) => Promise<T>): Promise<T>;
    /**
     * Removes the oldest idle SDK from the pool (LRU eviction).
     *
     * @returns True if an SDK was removed, false otherwise
     * @private
     */
    private removeOldestIdleSdk;
    /**
     * Performs periodic cleanup of idle SDKs.
     * @private
     */
    private cleanupIdleSdks;
    /**
     * Get pool metrics
     */
    getMetrics(): SdkManagerMetrics;
    /**
     * Graceful shutdown of the pool
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=sdkManager.d.ts.map