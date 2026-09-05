/**
 * Transaction Signer Helper
 * Manages transaction signing with Fireblocks
 */
import { Logger, ErrorHandler } from "../../../utils/index.js";
import { CardanoWitness } from "../../../types/index.js";
import { FireblocksService } from "../../index.js";
import { INetworkConfiguration, ITransactionSigner, SigningContext } from "../types/staking.interfaces.js";
export declare class TransactionSigner implements ITransactionSigner {
    private readonly fireblocksService;
    private readonly networkConfig;
    private readonly logger;
    private readonly errorHandler;
    constructor(fireblocksService: FireblocksService, networkConfig: INetworkConfiguration, logger: Logger, errorHandler: ErrorHandler);
    signTransaction(context: SigningContext): Promise<CardanoWitness[]>;
    private buildSigningPayload;
    private validateTransactionData;
    private fetchPublicKeys;
    private logPublicKeys;
    private mapResponseToWitnesses;
}
//# sourceMappingURL=transaction-signer.helper.d.ts.map