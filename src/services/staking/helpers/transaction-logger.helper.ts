/**
 * Transaction Logger Helper
 * Handles transaction logging for debugging
 */

import { Logger } from "../../../utils/index.js";
import { CardanoWitness } from "../../../types/index.js";

export class TransactionLogger {
  constructor(private readonly logger: Logger) {}

  logTransactionDetails(
    serialized: Buffer,
    txHash: Buffer,
    witnesses: CardanoWitness[],
    signedTx: Buffer
  ): void {
    this.logger.info("=== Transaction Details ===");
    this.logger.info(`Serialized transaction body size: ${serialized.length} CBOR bytes`);
    this.logger.info(`TX hash for signing: ${txHash.toString("hex")}`);
    this.logger.info(`Witnesses count: ${witnesses.length}`);
    this.logger.info(`Final signed transaction size: ${signedTx.length} CBOR bytes`);
    this.logger.info("===========================");
  }
}
