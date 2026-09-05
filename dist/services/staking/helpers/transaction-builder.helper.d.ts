/**
 * Transaction Builder and Submitter Helpers
 * Handles transaction building and submission to the blockchain
 */
import { Logger } from "../../../utils/index.js";
import { TransferResponse } from "../../../types/index.js";
import { IagonApiService } from "../../index.js";
import { INetworkConfiguration, ITransactionSubmitter, TransactionBuildContext } from "../types/staking.interfaces.js";
export declare class TransactionBuilder {
    private readonly iagonApiService;
    private readonly networkConfig;
    private readonly logger;
    constructor(iagonApiService: IagonApiService, networkConfig: INetworkConfiguration, logger: Logger);
    buildTransaction(context: TransactionBuildContext): Promise<{
        serialized: Buffer;
        deserialized: Map<number, unknown>;
    }>;
    getCurrentTtl(): Promise<number>;
}
export declare class TransactionSubmitter implements ITransactionSubmitter {
    private readonly iagonApiService;
    constructor(iagonApiService: IagonApiService);
    submitTransaction(signedTx: Buffer, skipValidation: boolean): Promise<TransferResponse>;
}
//# sourceMappingURL=transaction-builder.helper.d.ts.map