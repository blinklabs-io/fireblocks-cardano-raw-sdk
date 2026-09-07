import type { ChainQueries, ChainReadOperation, ChainHistoryOptions, ChainPageOptions, ChainAssetDetails, ChainStakeAccount, CardanoDataProvider } from "../types/index.js";
type GetJson = (path: string, params?: Record<string, string | number>) => Promise<unknown>;
/** Indexed reads only. No pool validation, certificate creation or signing is implied. */
export declare class BlockfrostQueries implements ChainQueries {
    private readonly get;
    private readonly provider;
    readonly supportedOperations: ReadonlySet<ChainReadOperation>;
    constructor(get: GetJson, provider: Pick<CardanoDataProvider, "getFullTransactionDetails">);
    private read;
    addressHistory(address: string, options?: ChainHistoryOptions): Promise<import("../types/chain-queries.js").ChainPage<{
        txHash: string;
        blockHeight: number;
        transactionIndex: number;
        blockTime: string;
    }>>;
    assetDetails(inputUnit: string): Promise<ChainAssetDetails>;
    stakeAccount(input: string): Promise<ChainStakeAccount>;
    stakeAddresses(input: string, options?: ChainPageOptions): Promise<import("../types/chain-queries.js").ChainPage<string>>;
    stakeRewards(input: string, options?: ChainPageOptions): Promise<import("../types/chain-queries.js").ChainPage<{
        epoch: number;
        amount: string;
        poolId: string;
        type: string;
    }>>;
    poolMetadata(input: string): Promise<{
        poolId: string;
        name: string | null;
        ticker: string | null;
        description: string | null;
        homepage: string | null;
    }>;
    poolDelegators(input: string, options?: ChainPageOptions): Promise<import("../types/chain-queries.js").ChainPage<{
        stakeAddress: string;
        amount: string;
        amountKind: "live-stake";
        activeEpoch: null;
    }>>;
}
export {};
//# sourceMappingURL=blockfrost.queries.d.ts.map