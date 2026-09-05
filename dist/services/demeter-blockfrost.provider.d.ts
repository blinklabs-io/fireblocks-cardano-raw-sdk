import { AxiosInstance } from "axios";
import { BalanceResponse, CardanoDataProvider, ChainProviderCapability, GroupedBalanceResponse, HealthStatusResponse, TransactionDetailsResponse, TransferResponse, UtxoIagonResponse, getBalanceByAddressOpts } from "../types/index.js";
export interface DemeterBlockfrostProviderOptions {
    baseUrl: string;
    apiKey: string;
    maxRetries?: number;
    pageSize?: number;
    axiosInstance?: AxiosInstance;
}
/** Core Cardano provider backed by a Demeter-hosted Blockfrost gateway. */
export declare class DemeterBlockfrostProvider implements CardanoDataProvider {
    readonly kind: "demeter";
    readonly capabilities: Set<ChainProviderCapability>;
    private readonly logger;
    private readonly client;
    private readonly maxRetries;
    private readonly pageSize;
    constructor(options: DemeterBlockfrostProviderOptions);
    checkHealth(): Promise<HealthStatusResponse>;
    getBalanceByAddress(params: getBalanceByAddressOpts): Promise<BalanceResponse | GroupedBalanceResponse>;
    getUtxosByAddress(address: string): Promise<UtxoIagonResponse>;
    getCurrentSlot(): Promise<number>;
    /** Read the Cardano network identifier from the provider's genesis data. */
    getNetworkMagic(): Promise<number>;
    submitTransfer(tx: string): Promise<TransferResponse>;
    getTransactionDetails(hash: string): Promise<TransactionDetailsResponse | null>;
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