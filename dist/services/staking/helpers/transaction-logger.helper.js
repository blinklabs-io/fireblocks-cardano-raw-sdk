/**
 * Transaction Logger Helper
 * Handles transaction logging for debugging
 */
export class TransactionLogger {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    logTransactionDetails(serialized, txHash, witnesses, signedTx) {
        this.logger.info("=== Transaction Details ===");
        this.logger.info(`Serialized transaction body size: ${serialized.length} CBOR bytes`);
        this.logger.info(`TX hash for signing: ${txHash.toString("hex")}`);
        this.logger.info(`Witnesses count: ${witnesses.length}`);
        this.logger.info(`Final signed transaction size: ${signedTx.length} CBOR bytes`);
        this.logger.info("===========================");
    }
}
//# sourceMappingURL=transaction-logger.helper.js.map