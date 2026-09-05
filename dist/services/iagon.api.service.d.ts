import { BalanceResponse, getBalanceByAddressOpts, getBalanceByCredentialOpts, getBalanceByStakeKeyOpts, GroupedBalanceResponse, DetailedTxHistoryResponse, TransferResponse, UtxoIagonResponse, GetTransactionHistoryOpts, TransactionDetailsResponse, Networks, StakeAccountRewardsResponse, StakeAccountInfoResponse, CurrentEpochResponse, PoolInfoResponse, PoolMetadataResponse, PoolDelegatorsResponse, PoolDelegatorsListResponse, PoolBlocksResponse, DelegationHistoryResponse, AccountAssetsResponse, RegistrationHistoryResponse, WithdrawalHistoryResponse, PaymentAddressesResponse, HealthStatusResponse, AssetInfoResponse, CardanoDataProvider, ChainProviderCapability } from "../types/index.js";
export declare class IagonApiService implements CardanoDataProvider {
    readonly kind: "iagon";
    readonly capabilities: Set<ChainProviderCapability>;
    private readonly logger;
    private network;
    private readonly iagonBaseUrl;
    private readonly iagonApiKey;
    private readonly errorHandler;
    private readonly axiosInstance;
    private assetInfoCache;
    private readonly ASSET_CACHE_TTL;
    constructor(apiKey: string, network?: Networks, assetCacheTTL?: number, // Default: 24 hours
    disableSslVerification?: boolean);
    private validateResponse;
    private withRetry;
    checkHealth: () => Promise<HealthStatusResponse>;
    getUtxosByAddress: (address: string) => Promise<UtxoIagonResponse>;
    getUtxosByCredential: (credential: string) => Promise<UtxoIagonResponse[]>;
    getUtxosByStakeKey: (stakeKey: string) => Promise<UtxoIagonResponse[]>;
    getBalanceByAddress: (params: getBalanceByAddressOpts) => Promise<BalanceResponse | GroupedBalanceResponse>;
    getBalanceByCredential: (params: getBalanceByCredentialOpts) => Promise<BalanceResponse | GroupedBalanceResponse>;
    getBalanceByStakeKey: (params: getBalanceByStakeKeyOpts) => Promise<BalanceResponse | GroupedBalanceResponse>;
    /**
     * Helper method to build query parameters for transaction history requests
     */
    private buildTransactionHistoryQueryParams;
    /**
     * Helper method to fetch transaction history from a specific endpoint
     */
    private fetchTransactionHistory;
    getTransactionDetails: (hash: string) => Promise<TransactionDetailsResponse | null>;
    getTransactionHistory: (params: GetTransactionHistoryOpts) => Promise<DetailedTxHistoryResponse>;
    getDetailedTxHistory: (params: GetTransactionHistoryOpts) => Promise<DetailedTxHistoryResponse>;
    submitTransfer: (tx: string, skipValidation?: boolean) => Promise<TransferResponse>;
    /**
     * Get staking rewards for a stake address
     */
    getStakeAccountRewards: (stakeAddress: string, offset?: number, limit?: number, order?: "asc" | "desc") => Promise<StakeAccountRewardsResponse>;
    /**
     * Get stake account information
     */
    getStakeAccountInfo: (stakeAddress: string) => Promise<StakeAccountInfoResponse>;
    /**
     * Get current epoch and slot information
     */
    getCurrentEpoch: () => Promise<CurrentEpochResponse>;
    getCurrentSlot: () => Promise<number>;
    /**
     * Get pool information by pool ID
     */
    getPoolInfo: (poolId: string) => Promise<PoolInfoResponse>;
    /**
     * Get pool metadata (name, ticker, description, homepage)
     */
    getPoolMetadata: (poolId: string) => Promise<PoolMetadataResponse>;
    /**
     * Get pool delegator count and total active stake
     */
    getPoolDelegators: (poolId: string) => Promise<PoolDelegatorsResponse>;
    /**
     * Get paginated list of individual pool delegators
     */
    getPoolDelegatorsList: (poolId: string, limit?: number, offset?: number) => Promise<PoolDelegatorsListResponse>;
    /**
     * Get pool block production statistics
     */
    getPoolBlocks: (poolId: string) => Promise<PoolBlocksResponse>;
    getDelegationHistory: (stakeAddress: string, offset?: number, limit?: number, order?: "asc" | "desc") => Promise<DelegationHistoryResponse>;
    getWithdrawalHistory: (stakeAddress: string, offset?: number, limit?: number, order?: "asc" | "desc") => Promise<WithdrawalHistoryResponse>;
    getPaymentAddresses: (stakeAddress: string, limit?: number, offset?: number) => Promise<PaymentAddressesResponse>;
    /**
     * Assets on stake credential does not mean ownership of the assets.
     * It can be used for easier grouping of addresses/assets,
     * but ownership is defined by payment credential.
     */
    getAccountAssets: (stakeAddress: string) => Promise<AccountAssetsResponse>;
    getRegistrationHistory: (stakeAddress: string, limit?: number, offset?: number, order?: "asc" | "desc") => Promise<RegistrationHistoryResponse>;
    /**
     * Get asset information with caching
     * @param policyId - The policy ID of the asset
     * @param assetName - The asset name in hex format
     * @param skipCache - Optional: bypass cache and fetch fresh data
     * @returns Asset information including metadata
     */
    getAssetInfo: (policyId: string, assetName: string, skipCache?: boolean) => Promise<AssetInfoResponse>;
    /**
     * Clear asset info cache
     * @param policyId - Optional: Clear cache for specific policy ID only
     * @param assetName - Optional: Clear cache for specific asset only (requires policyId)
     */
    clearAssetInfoCache(policyId?: string, assetName?: string): void;
    /**
     * Get cache statistics
     */
    getAssetCacheStats(): {
        size: number;
        ttl: number;
        entries: {
            asset: string;
            age: number;
            expiresIn: number;
        }[];
    };
}
//# sourceMappingURL=iagon.api.service.d.ts.map