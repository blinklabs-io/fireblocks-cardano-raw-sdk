/**
 * Transaction Logger Helper
 * Handles transaction logging for debugging
 */
import { Logger } from "../../../utils/index.js";
import { CardanoWitness } from "../../../types/index.js";
export declare class TransactionLogger {
    private readonly logger;
    constructor(logger: Logger);
    logTransactionDetails(serialized: Buffer, txHash: Buffer, witnesses: CardanoWitness[], signedTx: Buffer): void;
}
//# sourceMappingURL=transaction-logger.helper.d.ts.map