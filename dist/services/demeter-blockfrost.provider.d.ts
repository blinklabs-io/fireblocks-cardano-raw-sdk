import { AxiosInstance } from "axios";
import { BalanceResponse, CardanoDataProvider, ChainProviderCapability, GroupedBalanceResponse, HealthStatusResponse, TransactionDetailsResponse, TransferResponse, UtxoIagonResponse, getBalanceByAddressOpts, ProtocolParameterSnapshot } from "../types/index.js";
import type { ChainQueries } from "../types/chain-queries.js";
export interface DemeterBlockfrostProviderOptions {
    baseUrl: string;
    apiKey: string;
    maxRetries?: number;
    pageSize?: number;
    /** Fail closed if a wallet scan exceeds this bound. */
    maxPages?: number;
    axiosInstance?: AxiosInstance;
}
/** Core Cardano provider backed by a Demeter-hosted Blockfrost gateway. */
export declare class DemeterBlockfrostProvider implements CardanoDataProvider {
    readonly queries: ChainQueries;
    readonly kind: "demeter";
    readonly capabilities: Set<ChainProviderCapability>;
    private readonly logger;
    private readonly client;
    private readonly maxRetries;
    private readonly pageSize;
    private readonly maxPages;
    constructor(options: DemeterBlockfrostProviderOptions);
    checkHealth(): Promise<HealthStatusResponse>;
    getBalanceByAddress(params: getBalanceByAddressOpts): Promise<BalanceResponse | GroupedBalanceResponse>;
    getUtxosByAddress(address: string): Promise<UtxoIagonResponse>;
    getCurrentSlot(): Promise<number>;
    /** Unlike /health, this exposes the chain tip time so callers can check freshness. */
    getChainTip(): Promise<{
        slot: number;
        height: number;
        time: number;
        hash: string;
    }>;
    /** Read the Cardano network identifier from the provider's genesis data. */
    getNetworkMagic(): Promise<number>;
    /** No long-lived cache: fetch a new snapshot for each build, including network identity. */
    getProtocolParameters(): Promise<ProtocolParameterSnapshot>;
    submitTransfer(tx: string): Promise<TransferResponse>;
    getTransactionDetails(hash: string): Promise<TransactionDetailsResponse | null>;
    /** Fetch real inputs and outputs. A missing/pruned UTxO response is an error, not an empty success. */
    getFullTransactionDetails(hash: string): Promise<TransactionDetailsResponse | null>;
    private toBalanceResponse;
    private toUtxo;
    private assetParts;
    private safeQuantity;
    private parseResponse;
    private request;
    private isRetryable;
    private statusCode;
    private errorMessage;
}
//# sourceMappingURL=demeter-blockfrost.provider.d.ts.map