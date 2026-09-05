/**
 * Transaction Builder and Submitter Helpers
 * Handles transaction building and submission to the blockchain
 */
import { buildPayload, calculateTtl } from "../../../utils/index.js";
export class TransactionBuilder {
    iagonApiService;
    networkConfig;
    logger;
    constructor(iagonApiService, networkConfig, logger) {
        this.iagonApiService = iagonApiService;
        this.networkConfig = networkConfig;
        this.logger = logger;
    }
    async buildTransaction(context) {
        return buildPayload({
            toAddress: context.toAddress,
            netAmount: context.netAmount,
            txInputs: [
                { txHash: Buffer.from(context.utxo.txHash, "hex"), indexInTx: context.utxo.indexInTx },
            ],
            feeAmount: context.fee,
            ttl: context.ttl,
            certificates: context.certificates,
            withdrawals: context.withdrawals,
            votingProcedures: context.votingProcedures,
            network: context.network,
        });
    }
    async getCurrentTtl() {
        const epochResponse = await this.iagonApiService.getCurrentEpoch();
        const currentSlot = epochResponse.data.tip.slot;
        this.logger.info(`Current slot: ${currentSlot}`);
        return calculateTtl(currentSlot);
    }
}
export class TransactionSubmitter {
    iagonApiService;
    constructor(iagonApiService) {
        this.iagonApiService = iagonApiService;
    }
    async submitTransaction(signedTx, skipValidation) {
        return await this.iagonApiService.submitTransfer(signedTx.toString("hex"), skipValidation);
    }
}
//# sourceMappingURL=transaction-builder.helper.js.map