import { ConfigurationOptions, VaultWalletAddress } from "@fireblocks/ts-sdk";
import { Logger } from "./utils/index.js";
import { BalanceResponse, GroupedBalanceResponse, DetailedTxHistoryResponse, CntTransferOpts, TransactionHistoryResponse, GroupedTransactionHistoryResponse, GroupedDetailedTxHistoryResponse, TransactionDetailsResponse, WebhookPayloadData, Networks, UtxoIagonResponse, UtxoData, GroupByOptions, VaultBalanceResponse, RegisterStakingOptions, StakingTransactionResult, DelegationOptions, DeregisterStakingOptions, WithdrawRewardsOptions, DRepDelegationOptions, RegisterAsDRepOptions, RegisterAsDRepResult, CastVoteOptions, CastVoteResult, RewardsData, StakeAccountInfo, HealthStatusResponse, CurrentEpochResponse, AssetInfoResponse, PoolInfoResponse, PoolMetadataResponse, PoolDelegatorsResponse, PoolDelegatorsListResponse, PoolBlocksResponse, CntFeeEstimationRequest, CntFeeEstimationResponse, AdaTransferOpts, AdaFeeEstimationRequest, AdaFeeEstimationResponse, AdaTransferResult, MultiTokenTransferOpts, MultiTokenTransferResult, MultiTokenFeeEstimationRequest, MultiTokenFeeEstimationResponse, ConsolidateUtxosOpts, ConsolidateUtxosResult, CardanoDataProvider, ChainProviderConfig } from "./types/index.js";
import { FireblocksService, IagonApiService, StakingService } from "./services/index.js";
export interface SDKConfig {
    vaultAccountId: string;
    fireblocksService: FireblocksService;
    chainProvider: CardanoDataProvider;
    iagonApiService?: IagonApiService;
    stakingService?: StakingService;
    network: Networks;
    logger: Logger;
}
export declare class FireblocksCardanoRawSDK {
    private readonly fireblocksService;
    private readonly chainProvider;
    private readonly iagonApiService?;
    private readonly stakingService?;
    private network;
    private vaultAccountId;
    private addresses;
    private publicKeys;
    private readonly logger;
    private jwksCache;
    /**
     * Creates a new FireblocksCardanoRawSDK instance
     *
     * @param config - SDK configuration
     */
    constructor(config: SDKConfig);
    /**
     * Gets the Fireblocks asset ID for the current network
     * @returns SupportedAssets.ADA for mainnet, SupportedAssets.ADA_TEST for testnets
     */
    private get assetId();
    private requireIagonProvider;
    private requireStakingService;
    /** Prove the selected Demeter resource belongs to the configured Cardano network. */
    private validateGovernedProviderNetwork;
    static createInstance: (params: {
        fireblocksConfig: ConfigurationOptions;
        vaultAccountId: string;
        network: Networks;
        /** Select the Cardano chain-data provider. */
        chainProvider?: ChainProviderConfig;
        /** @deprecated Use chainProvider: { type: "iagon", apiKey } instead. */
        iagonApiKey?: string;
        /** Asset metadata cache TTL in milliseconds (default: 1 hour) */
        assetCacheTTL?: number;
        /** Disable SSL certificate verification (use only in development) */
        disableSslVerification?: boolean;
    }) => Promise<FireblocksCardanoRawSDK>;
    checkProviderHealth: () => Promise<HealthStatusResponse>;
    /** @deprecated Use checkProviderHealth(). */
    checkIagonHealth: () => Promise<HealthStatusResponse>;
    /**
     * Get balance by address for a vault account
     * @param options.index - Address index (default: 0)
     * @param options.groupByPolicy - Group assets by policy (default: false)
     * @param options.includeMetadata - Enrich tokens with metadata (default: false)
     */
    getBalanceByAddress: (options?: {
        index?: number;
        groupByPolicy?: boolean;
        includeMetadata?: boolean;
    }) => Promise<BalanceResponse | GroupedBalanceResponse>;
    /**
     * Get total balance for all addresses in a vault account
     * @param options.groupBy - How to group the balance data
     * @param options.includeMetadata - Whether to enrich tokens with metadata (names, decimals, logos)
     */
    getVaultBalance: (options?: {
        groupBy?: GroupByOptions;
        includeMetadata?: boolean;
    }) => Promise<VaultBalanceResponse>;
    /**
     * Get balance by credential for a vault account
     * @param options.credential - Payment credential
     * @param options.groupByPolicy - Group assets by policy (default: false)
     * @param options.includeMetadata - Enrich tokens with metadata (default: false)
     */
    getBalanceByCredential: (options: {
        credential: string;
        groupByPolicy?: boolean;
        includeMetadata?: boolean;
    }) => Promise<BalanceResponse | GroupedBalanceResponse>;
    /**
     * Get balance by stake key for a vault account
     * Automatically derives the stake key from the vault account address.
     * Note: The stake key is shared across all addresses in the vault account.
     * @param options.groupByPolicy - Group assets by policy (default: false)
     * @param options.includeMetadata - Enrich tokens with metadata (default: false)
     */
    getBalanceByStakeKey: (options?: {
        groupByPolicy?: boolean;
        includeMetadata?: boolean;
    }) => Promise<BalanceResponse | GroupedBalanceResponse>;
    /**
     * Helper to return empty vault balance based on groupBy
     */
    private getEmptyVaultBalance;
    /**
     * Helper method to fetch and validate address for a vault account
     */
    private getAddressByIndex;
    /**
     * Resolves recipient address from either a direct address or a vault account ID.
     * Validates that exactly one recipient option is provided.
     */
    private resolveRecipientAddress;
    /**
     * Fetches current network slot and returns TTL for transaction building.
     */
    private fetchCurrentTtl;
    /**
     * Logs an error and re-throws it, wrapping non-Error values in a typed Error.
     */
    private logAndRethrow;
    /**
     * Fetches transaction history across all vault addresses.
     * Shared by getAllTransactionHistory() and getAllDetailedTxHistory().
     */
    private fetchAllVaultHistory;
    /**
     * Get transaction details by hash
     */
    getTransactionDetails: (hash: string) => Promise<TransactionDetailsResponse | null>;
    /**
     * Get UTXOs for a vault account address
     */
    getUtxosByAddress: (index?: number) => Promise<UtxoIagonResponse>;
    /**
     * Get UTXOs for all addresses in a vault account, grouped by address.
     */
    getUtxosByVaultAccountId: () => Promise<Array<{
        index: number;
        address: string;
        utxos: UtxoData[];
    }>>;
    /**
     * Get transaction history for a vault account address
     */
    getTransactionHistory: (index?: number, options?: {
        limit?: number;
        offset?: number;
        fromSlot?: number;
    }) => Promise<TransactionHistoryResponse>;
    /**
     * Get detailed transaction history for a vault account address
     */
    getDetailedTxHistory: (index?: number, options?: {
        limit?: number;
        offset?: number;
        fromSlot?: number;
    }) => Promise<DetailedTxHistoryResponse>;
    /**
     * Get transaction history for all addresses in the vault account
     * @param options.groupByAddress - If true, returns data grouped by address. If false, returns flat array with address field
     */
    getAllTransactionHistory: (options?: {
        limit?: number;
        offset?: number;
        fromSlot?: number;
        groupByAddress?: boolean;
    }) => Promise<TransactionHistoryResponse | GroupedTransactionHistoryResponse>;
    /**
     * Get detailed transaction history for all addresses in the vault account
     * @param options.groupByAddress - If true, returns data grouped by address. If false, returns flat array with address field
     */
    getAllDetailedTxHistory: (options?: {
        limit?: number;
        offset?: number;
        fromSlot?: number;
        groupByAddress?: boolean;
    }) => Promise<DetailedTxHistoryResponse | GroupedDetailedTxHistoryResponse>;
    /**
     * Selects and validates UTXOs for the transaction
     * Minimum lovelace values are calculated dynamically based on policies
     */
    private selectAndValidateUtxos;
    /**
     * Calculates the transaction hash from transaction body
     */
    private calculateTransactionHash;
    /**
     * Creates Fireblocks transaction payload for signing
     */
    private createFireblocksTransactionPayload;
    /**
     * Reduces the matched Fireblocks authorization policy to non-identifying evidence.
     */
    private validateGovernanceAuthorization;
    /** Signs the exact Cardano body hash and optionally captures governance evidence. */
    private signTransactionWithEvidence;
    /** Existing signing path retained for non-governed operations. */
    private signTransaction;
    /**
     * Private helper that prepares and validates CNT transaction parameters.
     * Shared by both estimateTransactionFee() and transfer()
     */
    private prepareTransaction;
    /**
     * Estimates transaction fee for a CNT transfer without signing or submitting
     *
     * @param request - Fee estimation request parameters
     * @returns Fee estimation response with detailed breakdown
     * @throws SdkApiError if validation fails or insufficient balance
     */
    estimateTransactionFee: (request: CntFeeEstimationRequest) => Promise<CntFeeEstimationResponse>;
    transfer: (options: CntTransferOpts) => Promise<{
        txHash: string;
        senderAddress: string;
        tokenPolicyId: string;
        tokenName: string;
        amount: number;
        fee: {
            lovelace: string;
            ada: string;
        };
    }>;
    /**
     * Shared preparation logic for native ADA transfers.
     * Validates inputs, selects UTxOs (preferring ADA-only), and builds the transaction body.
     * Called by both transferAda() and estimateAdaTransactionFee().
     */
    private prepareAdaTransaction;
    /** Extract a flat policyId.assetNameHex map from a Cardano output. */
    private getOutputAssets;
    /** Validate the complete locally built Cardano intent before Fireblocks sees a hash. */
    private validateGovernedAdaPreflight;
    /**
     * Estimates the fee for a native ADA transfer without signing or submitting.
     *
     * @param request - AdaFeeEstimationRequest
     * @returns AdaFeeEstimationResponse with fee breakdown; includes tokenChangeWarning when token UTxOs are consumed
     */
    estimateAdaTransactionFee: (request: AdaFeeEstimationRequest) => Promise<AdaFeeEstimationResponse>;
    /**
     * Transfers native ADA (lovelace) to a recipient address or vault.
     *
     * UTxO selection prefers ADA-only UTxOs. If multi-asset UTxOs must be spent,
     * all their tokens are returned to the sender in the change output - no tokens are lost.
     *
     * @param options - AdaTransferOpts (lovelaceAmount + recipient)
     * @returns AdaTransferResult including txHash, fee, and optional tokensPresentedInChange
     */
    transferAda: (options: AdaTransferOpts) => Promise<AdaTransferResult>;
    /**
     * Shared preparation logic for multi-token transfers.
     * Validates inputs, selects UTxOs, and builds the transaction body.
     */
    private prepareMultiTokenTransaction;
    /**
     * Estimates the fee for a multi-token transfer without signing or submitting.
     *
     * @param request - MultiTokenFeeEstimationRequest
     * @returns MultiTokenFeeEstimationResponse with fee, minAdaRequired, totalCost,
     *          and optional tokenChangeWarning when extra-token UTxOs are consumed
     */
    estimateMultiTokenTransactionFee: (request: MultiTokenFeeEstimationRequest) => Promise<MultiTokenFeeEstimationResponse>;
    /**
     * Transfers multiple CNTs to a recipient in a single Cardano transaction.
     *
     * All specified tokens are bundled into one recipient output. Any tokens present
     * in consumed UTxOs but not listed in `tokens` are returned to the sender in the
     * change output - no tokens are lost.
     *
     * @param options - MultiTokenTransferOpts
     * @returns MultiTokenTransferResult with txHash, fee, and optional tokensPresentedInChange
     */
    transferMultipleTokens: (options: MultiTokenTransferOpts) => Promise<MultiTokenTransferResult>;
    private static readonly DEFAULT_BATCH_SIZE;
    private static readonly DEFAULT_MAX_BATCHES;
    /**
     * Consolidates UTxOs at the given address index.
     *
     * By default consolidates all UTxOs in a single transaction. For dust-attacked
     * addresses with >100 UTxOs, use `batched: true` to process in multiple txs.
     *
     * @param opts - ConsolidateUtxosOpts
     * @returns ConsolidateUtxosResult with txHash, fee, UTxO count merged, and token policies
     * @throws SdkApiError (400) if the address has fewer UTxOs than minUtxoCount
     */
    consolidateUtxos: (opts?: ConsolidateUtxosOpts) => Promise<ConsolidateUtxosResult>;
    /** Single-transaction consolidation (original behavior) */
    private consolidateSingleBatch;
    /** Batched consolidation for dust-attacked addresses */
    private consolidateBatched;
    /** Extract lovelace and token policies from a transaction output */
    private extractOutputMetadata;
    /** Extract unique token policy IDs from a list of UTxOs */
    private extractTokenPoliciesFromUtxos;
    /**
     * Retrieves the wallet addresses associated with a specific Fireblocks vault account.
     *
     * @returns A promise that resolves to an array of VaultWalletAddress objects.
     * @throws Error if the retrieval fails.
     */
    getVaultAccountAddresses: () => Promise<VaultWalletAddress[]>;
    /**
     * Gets the JWKS endpoint URL based on Fireblocks environment
     * Defaults to US production if not specified
     */
    private getJwksEndpoint;
    /**
     * Verifies webhook signature using JWKS (JSON Web Key Set) method
     * This is the new recommended method for webhook verification
     *
     * @param rawBody - The raw request body as Buffer
     * @param jwsSignature - The value from Fireblocks-Webhook-Signature header
     * @param environment - Fireblocks environment (US, EU, EU2, or SANDBOX)
     * @returns true if signature is valid, false otherwise
     */
    private verifyWebhookJWKS;
    /**
     * Verifies webhook signature using legacy RSA-SHA512 method
     * This method is being phased out in favor of JWKS
     *
     * @param rawBody - The raw request body as Buffer
     * @param signature - The value from Fireblocks-Signature header (base64 encoded)
     * @param environment - Fireblocks environment to determine which public key to use
     * @returns true if signature is valid, false otherwise
     */
    private verifyWebhookLegacy;
    /**
     * Verifies Fireblocks webhook authenticity using both JWKS and legacy methods
     *
     * @param rawBody - The raw request body as Buffer (before JSON parsing)
     * @param headers - Request headers object (case-insensitive)
     * @param environment - Fireblocks environment (US, EU, EU2, or SANDBOX). Defaults to US.
     * @returns true if webhook is authentic, false otherwise
     * @throws Error if verification fails critically
     */
    verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>, environment?: "US" | "EU" | "EU2" | "SANDBOX"): Promise<boolean>;
    /**
     * Enriches a webhook payload with detailed Cardano transaction data
     *
     * Note: This method only handles enrichment. Webhook signature verification
     * should be performed separately using the verifyWebhook() method before calling this.
     *
     * @param payload - The webhook payload to enrich
     * @returns The enriched webhook payload with cardanoTokensData if applicable
     */
    enrichWebhookPayload: (payload: WebhookPayloadData) => Promise<WebhookPayloadData>;
    /**
     * Get public key for a vault account address with caching
     */
    getPublicKey: (change?: number, addressIndex?: number) => Promise<string>;
    /**
     * Helper to batch fetch and enrich asset metadata
     * @param assetIds - Array of asset IDs (format: "policyId.assetName")
     * @param amounts - Map of assetId to amount (for formatting)
     * @returns Map of assetId to enriched metadata
     */
    private enrichAssetMetadata;
    /**
     * Helper to transform Iagon balance responses to include metadata
     * @param response - Raw Iagon API response
     * @returns Enriched response with metadata
     */
    private enrichIagonResponse;
    /**
     * Helper to aggregate vault balances based on groupBy option
     */
    private aggregateVaultBalance;
    /**
     * Aggregate balances by token (default view)
     */
    private aggregateByToken;
    /**
     * Aggregate balances by address
     */
    private aggregateByAddress;
    /**
     * Aggregate balances by policy
     */
    private aggregateByPolicy;
    /**
     * Get direct access to the Fireblocks service
     * @internal - For advanced usage only
     */
    getFireblocksService(): FireblocksService;
    /**
     * Get direct access to the Iagon API service
     * @internal - For advanced usage only
     */
    getIagonApiService(): IagonApiService;
    /**
     * Get direct access to the Staking service
     * @internal - For advanced usage only
     */
    getStakingService(): StakingService;
    /**
     * Register staking credential for a vault account
     *
     * This is the first step to enable staking. It registers the staking key on-chain
     * and requires a deposit of 2 ADA (DEPOSIT_AMOUNT) which will be returned upon deregistration.
     *
     * @param options - Registration options
     * @returns Transaction result with hash and status
     * @throws Error if registration fails
     *
     * @example
     * ```typescript
     * const result = await sdk.registerStakingCredential({
     *   vaultAccountId: "0",
     *   depositAmount: 2000000, // 2 ADA
     *   fee: 300000 // 0.3 ADA
     * });
     * console.log(`Registration TX: ${result.txHash}`);
     * ```
     */
    registerStakingCredential: (options: RegisterStakingOptions) => Promise<(StakingTransactionResult & {
        stakeAddress: string;
        addressIndex: number;
    }) | null>;
    /**
     * Delegate ADA to a stake pool
     *
     * Delegates the staking credential to a specific stake pool. The staking credential
     * must be registered first using registerStakingCredential().
     *
     * @param options - Delegation options including pool ID
     * @returns Transaction result with hash and status
     * @throws Error if delegation fails
     *
     * @example
     * ```typescript
     * const result = await sdk.delegateToPool({
     *   vaultAccountId: "0",
     *   poolId: "pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy", // Pool ID in bech32 or hex
     *   fee: 300000 // 0.3 ADA
     * });
     * console.log(`Delegation TX: ${result.txHash}`);
     * ```
     */
    delegateToPool: (options: DelegationOptions) => Promise<StakingTransactionResult>;
    /**
     * Deregister staking credential
     *
     * Deregisters the staking credential and withdraws all available rewards.
     * Returns the 2 ADA deposit that was paid during registration.
     *
     * @param options - Deregistration options
     * @returns Transaction result with hash and status
     * @throws Error if deregistration fails
     *
     * @example
     * ```typescript
     * const result = await sdk.deregisterStakingCredential({
     *   vaultAccountId: "0",
     *   fee: 300000 // 0.3 ADA
     * });
     * console.log(`Deregistration TX: ${result.txHash}`);
     * ```
     */
    deregisterStakingCredential: (options: DeregisterStakingOptions) => Promise<StakingTransactionResult>;
    /**
     * Withdraw staking rewards
     *
     * Withdraws accumulated staking rewards without deregistering the staking credential.
     * You can continue to stake after withdrawing rewards.
     *
     * @param options - Withdrawal options with optional limit
     * @returns Transaction result with hash and status
     * @throws Error if withdrawal fails
     *
     * @example
     * ```typescript
     * // Withdraw all available rewards
     * const result = await sdk.withdrawRewards({
     *   vaultAccountId: "0",
     *   fee: 300000 // 0.3 ADA
     * });
     *
     * // Withdraw up to 5 ADA
     * const result = await sdk.withdrawRewards({
     *   vaultAccountId: "0",
     *   limit: 5000000, // 5 ADA in Lovelace
     *   fee: 300000
     * });
     * console.log(`Withdrawal TX: ${result.txHash}`);
     * ```
     */
    withdrawRewards: (options: WithdrawRewardsOptions) => Promise<StakingTransactionResult & {
        rewardAmount?: number;
    }>;
    getStakeAccountInfo: (vaultAccountId: string) => Promise<StakeAccountInfo>;
    getCurrentEpoch: () => Promise<CurrentEpochResponse>;
    /**
     * Query staking rewards for a vault account
     *
     * Retrieves detailed information about staking rewards including:
     * - Individual rewards per epoch
     * - Historical withdrawals
     * - Total and available rewards
     *
     * @param vaultAccountId - Vault account ID
     * @returns Detailed rewards data
     * @throws Error if query fails
     *
     * @example
     * ```typescript
     * const rewards = await sdk.queryStakingRewards("0");
     * console.log(`Available rewards: ${rewards.availableRewards} Lovelace`);
     * console.log(`Total rewards earned: ${rewards.totalRewards} Lovelace`);
     * console.log(`Total withdrawn: ${rewards.totalWithdrawals} Lovelace`);
     *
     * // List rewards by epoch
     * rewards.rewards.forEach(r => {
     *   console.log(`Epoch ${r.epoch}: ${r.amount} from pool ${r.poolId}`);
     * });
     * ```
     */
    queryStakingRewards: (vaultAccountId: string) => Promise<RewardsData>;
    /**
     * Delegate voting power to a DRep (Delegated Representative) - Conway Era Governance
     *
     * In Cardano's Conway era, ADA holders can delegate their voting power to DReps
     * who participate in on-chain governance. This is separate from stake pool delegation.
     *
     * Options:
     * - "always-abstain": Automatically abstain from all governance votes
     * - "always-no-confidence": Automatically vote no confidence on all proposals
     * - "custom-drep": Delegate to a specific DRep (requires drepId)
     *
     * @param options - DRep delegation options
     * @returns Transaction result with hash and status
     * @throws Error if delegation fails
     *
     * @example
     * ```typescript
     * // Delegate to always abstain
     * const result = await sdk.delegateToDRep({
     *   vaultAccountId: "0",
     *   drepAction: "always-abstain",
     *   fee: 1000000 // 1 ADA
     * });
     *
     * // Delegate to a specific DRep
     * const result = await sdk.delegateToDRep({
     *   vaultAccountId: "0",
     *   drepAction: "custom-drep",
     *   drepId: "drep1abc123...", // DRep ID in hex format
     *   fee: 1000000
     * });
     * console.log(`DRep delegation TX: ${result.txHash}`);
     * ```
     */
    /**
     * Register the vault account as a DRep (Delegated Representative) on Cardano
     *
     * Submits a Conway-era `reg_drep_cert` certificate to register the vault's stake
     * credential as a DRep. This costs a 500 ADA deposit (refundable on deregistration).
     * An optional anchor can point to publicly accessible DRep metadata.
     *
     * @param options - DRep registration options
     * @returns Transaction result with hash, status, and the bech32 DRep ID
     *
     * @example
     * ```typescript
     * // Register without metadata anchor
     * const result = await sdk.registerAsDRep({ vaultAccountId: "0" });
     *
     * // Register with a metadata anchor
     * const result = await sdk.registerAsDRep({
     *   vaultAccountId: "0",
     *   anchor: {
     *     url: "https://example.com/drep-metadata.json",
     *     dataHash: "abc123...", // blake2b-256 hex hash of the JSON file
     *   },
     * });
     * console.log(`DRep registration TX: ${result.txHash}, DRep ID: ${result.drepId}`);
     * ```
     */
    registerAsDRep: (options: RegisterAsDRepOptions) => Promise<RegisterAsDRepResult>;
    /**
     * Cast a governance vote as a DRep (Conway era)
     *
     * Submits a `voting_procedures` transaction allowing a registered DRep to vote
     * Yes, No, or Abstain on a governance action.
     *
     * @param options - Vote options including governance action ID and vote choice
     * @returns Transaction result with hash, status, and the vote cast
     *
     * @example
     * ```typescript
     * const result = await sdk.castGovernanceVote({
     *   vaultAccountId: "0",
     *   governanceActionId: {
     *     txHash: "abc123...", // TX hash of the governance action proposal
     *     index: 0,
     *   },
     *   vote: "yes",
     * });
     * console.log(`Vote TX: ${result.txHash}`);
     * ```
     */
    castGovernanceVote: (options: CastVoteOptions) => Promise<CastVoteResult>;
    delegateToDRep: (options: DRepDelegationOptions) => Promise<StakingTransactionResult>;
    /**
     * Get the stake address for a vault account
     *
     * Extracts the BASE address from the vault account and derives the stake address.
     * The stake address is used to identify staking credentials and query staking-related
     * information like rewards, delegation history, and registration status.
     *
     * @param vaultAccountId - The vault account ID
     * @returns The stake address in bech32 format (stake1... or stake_test1...)
     * @throws Error if no BASE address is found for the vault account
     *
     * @example
     * ```typescript
     * const stakeAddress = await sdk.getStakeAddress("0");
     * console.log(`Stake address: ${stakeAddress}`);
     * // Output: stake1u9r76...
     * ```
     */
    getStakeAddress: (vaultAccountId: string) => Promise<string>;
    /**
     * Clear all cached data (addresses and public keys)
     */
    clearCache(): void;
    /**
     * Get asset information including metadata, decimals, and supply
     *
     * Retrieves detailed information about a Cardano native token including:
     * - Asset name (decoded from hex)
     * - Metadata (name, ticker, description, decimals, logo, etc.)
     * - Total supply and mint/burn counts
     * - Fingerprint for unique identification
     *
     * @param policyId - The policy ID of the asset (hex string)
     * @param assetName - The asset name in hex format
     * @returns Detailed asset information including metadata
     * @throws Error if asset info retrieval fails
     *
     * @example
     * ```typescript
     * const assetInfo = await sdk.getAssetInfo(
     *   "f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a",
     *   "4e4654"
     * );
     * console.log("Token Name:", assetInfo.data.metadata?.name);
     * console.log("Decimals:", assetInfo.data.metadata?.decimals);
     * console.log("Total Supply:", assetInfo.data.total_supply);
     * ```
     */
    getAssetInfo(policyId: string, assetName: string, skipCache?: boolean): Promise<AssetInfoResponse>;
    /**
     * Get staking pool information by pool ID
     *
     * Returns live metrics including saturation, stake, delegator count, margin, and fixed cost.
     *
     * @param poolId - Pool ID in bech32 format (pool1...) or hex
     * @returns Pool information including saturation and financial metrics
     */
    getPoolInfo(poolId: string): Promise<PoolInfoResponse>;
    /**
     * Get pool metadata (name, ticker, description, homepage)
     * @param poolId - Pool ID in bech32 format (pool1...) or hex
     */
    getPoolMetadata(poolId: string): Promise<PoolMetadataResponse>;
    /**
     * Get aggregate pool delegator count and total active stake
     * @param poolId - Pool ID in bech32 format (pool1...) or hex
     */
    getPoolDelegators(poolId: string): Promise<PoolDelegatorsResponse>;
    /**
     * Get paginated list of individual pool delegators
     * @param poolId - Pool ID in bech32 format (pool1...) or hex
     * @param limit - Maximum number of results (default: 100)
     * @param offset - Pagination offset (default: 0)
     */
    getPoolDelegatorsList(poolId: string, limit?: number, offset?: number): Promise<PoolDelegatorsListResponse>;
    /**
     * Get pool block production statistics
     * @param poolId - Pool ID in bech32 format (pool1...) or hex
     */
    getPoolBlocks(poolId: string): Promise<PoolBlocksResponse>;
    /**
     * Clear asset info cache
     * @param policyId - Optional: Clear cache for specific policy ID only
     * @param assetName - Op
     * tional: Clear cache for specific asset only (requires policyId)
     * @example
     * ```typescript
     * // Clear entire cache
     * sdk.clearAssetInfoCache();
     *
     * // Clear all assets for a specific policy
     * sdk.clearAssetInfoCache("f0ff48bbb...");
     *
     * // Clear specific asset
     * sdk.clearAssetInfoCache("f0ff48bbb...", "4e4654");
     * ```
     */
    clearAssetInfoCache(policyId?: string, assetName?: string): void;
    /**
     * Get asset cache statistics
     * @returns Cache statistics including size, TTL, and entry details
     * @example
     * ```typescript
     * const stats = sdk.getAssetCacheStats();
     * console.log(`Cache size: ${stats.size}`);
     * console.log(`Cache TTL: ${stats.ttl}ms`);
     * stats.entries.forEach(entry => {
     *   console.log(`${entry.asset}: age ${entry.age}ms, expires in ${entry.expiresIn}ms`);
     * });
     * ```
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
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        addressCount: number;
        publicKeyCount: number;
    };
    /**
     * Gracefully shutdown the SDK
     *
     * Closes all connections, cleans up resources, and prepares for application termination.
     * Should be called when the application is shutting down.
     *
     * @returns Promise that resolves when shutdown is complete
     *
     * @example
     * ```typescript
     * process.on('SIGTERM', async () => {
     *   console.log('Shutting down...');
     *   await sdk.shutdown();
     *   process.exit(0)
     * });
     * ```
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=FireblocksCardanoRawSDK.d.ts.map