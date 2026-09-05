import { Logger } from "../utils/index.js";
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
export class SdkManager {
    sdkPool = new Map();
    baseConfig;
    poolConfig;
    cleanupInterval;
    logger = new Logger("pool:sdk-manager");
    sdkFactory;
    network;
    /**
     * Creates an instance of SdkManager with connection pooling.
     *
     * @param baseConfig - Fireblocks SDK configuration used for all FireblocksCardanoRawSDK instances
     * @param network - The Cardano network to use (mainnet, preprod, preview)
     * @param poolConfig - Optional pool configuration settings
     * @param sdkFactory - Factory function to create FireblocksCardanoRawSDK instances (used to avoid circular dependency)
     */
    constructor(baseConfig, network, poolConfig, sdkFactory) {
        this.baseConfig = baseConfig;
        this.network = network;
        this.poolConfig = {
            maxPoolSize: poolConfig?.maxPoolSize || 100,
            idleTimeoutMs: poolConfig?.idleTimeoutMs || 30 * 60 * 1000, // 30 minutes
            cleanupIntervalMs: poolConfig?.cleanupIntervalMs || 5 * 60 * 1000, // 5 minutes
            connectionTimeoutMs: poolConfig?.connectionTimeoutMs || 30 * 1000, // 30 seconds
            retryAttempts: poolConfig?.retryAttempts || 3,
        };
        // Store the factory function, will be set by FireblocksCardanoRawSDK
        this.sdkFactory =
            sdkFactory ||
                (async () => {
                    throw new Error("SDK factory not initialized. This should be set by FireblocksCardanoRawSDK.");
                });
        this.cleanupInterval = setInterval(() => this.cleanupIdleSdks(), this.poolConfig.cleanupIntervalMs);
    }
    /**
     * Sets the SDK factory function (called by FireblocksCardanoRawSDK to avoid circular dependency)
     * @param factory - Factory function to create FireblocksCardanoRawSDK instances
     */
    setSdkFactory(factory) {
        this.sdkFactory = factory;
    }
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
    async getSdk(vaultAccountId) {
        const key = vaultAccountId;
        const poolItem = this.sdkPool.get(key);
        // Reuse existing SDK
        if (poolItem) {
            this.logger.debug(`Reusing SDK for vault ${vaultAccountId}`);
            poolItem.lastUsed = new Date();
            poolItem.useCount++;
            return poolItem.sdk;
        }
        // Check pool capacity
        if (this.sdkPool.size >= this.poolConfig.maxPoolSize) {
            const removed = this.removeOldestIdleSdk();
            if (!removed) {
                throw new Error(`SDK pool at maximum capacity (${this.poolConfig.maxPoolSize}) with no idle connections`);
            }
        }
        // Create new SDK
        this.logger.info(`Creating new SDK for Vault #${vaultAccountId}`);
        const sdk = await this.sdkFactory(vaultAccountId, this.baseConfig, this.network);
        this.sdkPool.set(key, {
            sdk,
            lastUsed: new Date(),
            useCount: 1,
        });
        return sdk;
    }
    /**
     * Releases an SDK instance back to the pool.
     *
     * @param vaultAccountId - The vault account ID
     */
    releaseSdk(vaultAccountId) {
        const poolItem = this.sdkPool.get(vaultAccountId);
        if (poolItem) {
            poolItem.useCount = Math.max(0, poolItem.useCount - 1);
            poolItem.lastUsed = new Date();
        }
    }
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
    async withSdk(vaultAccountId, callback) {
        const sdk = await this.getSdk(vaultAccountId);
        try {
            return await callback(sdk);
        }
        finally {
            this.releaseSdk(vaultAccountId);
        }
    }
    /**
     * Removes the oldest idle SDK from the pool (LRU eviction).
     *
     * @returns True if an SDK was removed, false otherwise
     * @private
     */
    removeOldestIdleSdk() {
        let oldestKey = null;
        let oldestDate = new Date();
        for (const [key, value] of this.sdkPool.entries()) {
            if (value.useCount === 0 && value.lastUsed < oldestDate) {
                oldestDate = value.lastUsed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            const item = this.sdkPool.get(oldestKey);
            this.sdkPool.delete(oldestKey);
            item?.sdk
                .shutdown()
                .catch((err) => this.logger.error(`Shutdown error during LRU eviction for vault ${oldestKey}:`, err));
            this.logger.info(`Evicted idle SDK for vault ${oldestKey}`);
            return true;
        }
        return false;
    }
    /**
     * Performs periodic cleanup of idle SDKs.
     * @private
     */
    cleanupIdleSdks() {
        const now = new Date();
        const keysToRemove = [];
        for (const [key, value] of this.sdkPool.entries()) {
            if (value.useCount === 0) {
                const idleTime = now.getTime() - value.lastUsed.getTime();
                if (idleTime > this.poolConfig.idleTimeoutMs) {
                    keysToRemove.push(key);
                }
            }
        }
        for (const key of keysToRemove) {
            const poolItem = this.sdkPool.get(key);
            if (poolItem) {
                // Shutdown the SDK before removing
                poolItem.sdk.shutdown().catch((err) => {
                    this.logger.error(`Error shutting down SDK for vault ${key}:`, err);
                });
            }
            this.sdkPool.delete(key);
            this.logger.info(`Removed idle SDK for vault ${key}`);
        }
    }
    /**
     * Get pool metrics
     */
    getMetrics() {
        const metrics = {
            totalInstances: this.sdkPool.size,
            activeInstances: 0,
            idleInstances: 0,
            instancesByVaultAccount: {},
        };
        for (const [key, value] of this.sdkPool.entries()) {
            if (value.useCount > 0) {
                metrics.activeInstances++;
            }
            else {
                metrics.idleInstances++;
            }
            metrics.instancesByVaultAccount[key] = value.useCount > 0;
        }
        return metrics;
    }
    /**
     * Graceful shutdown of the pool
     */
    async shutdown() {
        clearInterval(this.cleanupInterval);
        // Shutdown all SDKs in the pool
        const shutdownPromises = Array.from(this.sdkPool.values()).map((item) => item.sdk.shutdown().catch((err) => {
            this.logger.error("Error shutting down SDK:", err);
        }));
        await Promise.all(shutdownPromises);
        this.sdkPool.clear();
        this.logger.info("SDK manager shutdown complete");
    }
}
//# sourceMappingURL=sdkManager.js.map