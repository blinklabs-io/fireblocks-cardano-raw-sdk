import type { DetailedTransaction } from "./iagon/transactions.js";
export type ChainReadOperation = "address-history" | "asset-details" | "stake-account" | "stake-addresses" | "stake-rewards" | "pool-metadata" | "pool-delegators" | "history-block-range";
export interface ChainPageOptions {
    page?: number;
    count?: number;
}
export interface ChainHistoryOptions extends ChainPageOptions {
    /** Block HEIGHT, never a slot. IAGON's legacy fromSlot API is separate. */
    fromBlock?: number;
    toBlock?: number;
    /** Full details cost extra reads; limited to 25 items per page. */
    details?: "none" | "full";
}
export interface ChainPage<T> {
    items: T[];
    page: number;
    count: number;
    /** A continuation to try, not a promise of another nonempty page. */
    nextPage: number | null;
    /** Null when the provider does not report an exact total. */
    total: number | null;
    order: "desc" | "provider-defined";
    /** A short/empty page does not prove the provider retains all chain history. */
    coverage: "provider-retained";
}
export interface ChainHistoryEntry {
    txHash: string;
    blockHeight: number;
    blockTime: string;
    transactionIndex: number | null;
    details?: DetailedTransaction;
}
export interface ChainAssetDetails {
    unit: string;
    policyId: string;
    assetNameHex: string;
    fingerprint: string;
    /** Decimal strings deliberately preserve values larger than Number.MAX_SAFE_INTEGER. */
    supply: string;
    firstMintTx: string | null;
    mintOrBurnCount: number | null;
    mintCount: number | null;
    burnCount: number | null;
    onchainMetadata: Record<string, unknown> | null;
    registryMetadata: Record<string, unknown> | null;
    providerMetadata: Record<string, unknown> | null;
    providerMetadataSource: string | null;
}
export interface ChainStakeAccount {
    stakeAddress: string;
    active: boolean;
    registered: boolean | null;
    activeEpoch: number | null;
    controlledAmount: string | null;
    activeStake: string | null;
    rewardsSum: string;
    withdrawnRewards: string;
    availableRewards: string;
    poolId: string | null;
    drepId: string | null;
}
export interface ChainReward {
    epoch: number;
    amount: string;
    poolId: string;
    type: string;
}
export interface ChainPoolMetadata {
    poolId: string;
    name: string | null;
    ticker: string | null;
    description: string | null;
    homepage: string | null;
}
export interface ChainPoolDelegator {
    stakeAddress: string;
    amount: string;
    amountKind: "live-stake" | "provider-reported";
    activeEpoch: number | null;
}
/** Narrow indexed reads shared by providers, separate from legacy IAGON aggregate models. */
export interface ChainQueries {
    readonly supportedOperations: ReadonlySet<ChainReadOperation>;
    addressHistory(address: string, options?: ChainHistoryOptions): Promise<ChainPage<ChainHistoryEntry>>;
    assetDetails(unit: string): Promise<ChainAssetDetails>;
    stakeAccount(stakeAddress: string): Promise<ChainStakeAccount>;
    stakeAddresses(stakeAddress: string, options?: ChainPageOptions): Promise<ChainPage<string>>;
    stakeRewards(stakeAddress: string, options?: ChainPageOptions): Promise<ChainPage<ChainReward>>;
    poolMetadata(poolId: string): Promise<ChainPoolMetadata>;
    poolDelegators(poolId: string, options?: ChainPageOptions): Promise<ChainPage<ChainPoolDelegator>>;
}
export declare class ChainReadUnsupportedError extends Error {
    readonly provider: "iagon" | "demeter";
    readonly operation: string;
    readonly statusCode?: number | undefined;
    constructor(provider: "iagon" | "demeter", operation: string, statusCode?: number | undefined);
}
//# sourceMappingURL=chain-queries.d.ts.map