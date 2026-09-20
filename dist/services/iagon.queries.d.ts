import type { IagonApiService } from "./iagon.api.service.js";
import type { ChainQueries, ChainReadOperation, ChainHistoryOptions, ChainPageOptions, ChainAssetDetails, ChainStakeAccount } from "../types/chain-queries.js";
/** Translation only: existing IAGON methods and response types are left unchanged. */
export declare class IagonQueries implements ChainQueries {
    private readonly provider;
    readonly supportedOperations: ReadonlySet<ChainReadOperation>;
    constructor(provider: IagonApiService);
    addressHistory(address: string, options?: ChainHistoryOptions): Promise<import("../types/chain-queries.js").ChainPage<{
        txHash: string;
        blockHeight: number;
        blockTime: string;
        transactionIndex: null;
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
        amountKind: "provider-reported";
        activeEpoch: number;
    }>>;
}
//# sourceMappingURL=iagon.queries.d.ts.map