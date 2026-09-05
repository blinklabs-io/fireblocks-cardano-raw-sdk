import { Address, TransactionInput, TransactionOutput, TransactionBody, Transaction } from "@emurgo/cardano-serialization-lib-nodejs";
import { CardanoDataProvider } from "../types/providers.js";
import { CntTransactionOutputsParams, MultiTokenTransactionOutputsParams, ConsolidationTransactionOutputParams, UtxoData, fetchAndSelectUtxosForCntParams, fetchAndSelectUtxosForAdaParams, fetchAndSelectUtxosForMultiTokenParams } from "../types/index.js";
/**
 * Calculate the minimum required lovelace for a UTXO based on number of policies
 *
 * The minimum ADA required for a UTXO scales with the number of distinct token policies:
 * - Base: 1 ADA (1,000,000 lovelace) for ADA-only or single policy
 * - Additional: ~0.15 ADA (150,000 lovelace) per additional policy
 *
 * This implements the Cardano protocol's minUTxO requirement which prevents
 * UTXOs from being too small and bloating the blockchain state.
 *
 * @param numPolicies - Number of distinct token policies in the UTXO
 * @returns The minimum lovelace required for the UTXO
 * @example
 * calculateMinLovelaceForUtxo(0) // 1,000,000 (ADA-only)
 * calculateMinLovelaceForUtxo(1) // 1,150,000 (1 token policy)
 * calculateMinLovelaceForUtxo(3) // 1,450,000 (3 token policies)
 */
export declare const calculateMinLovelaceForUtxo: (numPolicies: number) => number;
/**
 * Count distinct token policies from a collection of assets
 * @param assets - Record of assetUnit (policyId.tokenName) to amount
 * @returns Number of distinct policies
 */
export declare const countDistinctPolicies: (assets: Record<string, number>) => number;
export declare const getExtraPolicies: (changeAssets: Record<string, number>, intendedPolicies: string[]) => string[];
/**
 * Calculate the minimum required fee for a transaction based on its size
 * @param tx - The transaction to calculate fee for
 * @returns The calculated fee in lovelace
 */
export declare const calculateTransactionFee: (tx: Transaction) => number;
export declare const fetchAndSelectUtxosForCnt: (params: fetchAndSelectUtxosForCntParams) => Promise<{
    selectedUtxos: UtxoData[];
    accumulatedAda: number;
    accumulatedTokenAmount: number;
    minRecipientLovelace: number;
    minChangeLovelace: number;
    release: () => void;
}>;
export declare const fetchUtxos: (chainProvider: CardanoDataProvider, address: string) => Promise<UtxoData[]>;
export declare const calculateTokenAmount: (utxo: UtxoData, policyId: string, tokenName: string) => number;
export declare const getLovelaceAmount: (utxo: UtxoData) => number;
export declare const filterUtxos: (utxos: UtxoData[], tokenPolicyId: string, tokenName: string) => UtxoData[];
export declare const createTransactionInputs: (selectedUtxos: UtxoData[]) => TransactionInput[];
export declare const createTransactionOutputs: (params: CntTransactionOutputsParams) => TransactionOutput[];
/**
 * Number of witnesses (signatures) required per transaction type.
 * Token transfers only need the payment key; staking operations also require the stake key.
 * Pass the appropriate constant to buildCntTransactionWithCalculatedFee to get an accurate fee.
 */
export declare const WITNESS_COUNT_PAYMENT_KEY_ONLY = 1;
export declare const WITNESS_COUNT_PAYMENT_AND_STAKE_KEY = 2;
/**
 * Builds CNT transaction outputs with dynamically calculated fees.
 * Uses iterative fee convergence - see convergeTransactionFee for the algorithm.
 *
 * @param params               - Parameters for createTransactionOutputs (excluding fee)
 * @param txInputs             - Transaction inputs
 * @param ttl                  - Slot deadline for the transaction
 * @param estimatedWitnessCount - Number of signatures - use WITNESS_COUNT_* constants
 */
export declare const buildCntTransactionWithCalculatedFee: (params: Omit<CntTransactionOutputsParams, "fee">, txInputs: TransactionInput[], ttl: number, estimatedWitnessCount: number) => {
    outputs: TransactionOutput[];
    fee: number;
    txBody: TransactionBody;
};
export declare const buildTransaction: ({ txInputs, txOutputs, fee, ttl, }: {
    txInputs: TransactionInput[];
    txOutputs: TransactionOutput[];
    fee: number;
    ttl: number;
}) => TransactionBody;
export declare const submitTransaction: (chainProvider: CardanoDataProvider, signedTx: Transaction) => Promise<string>;
/**
 * Selects UTxOs for a native ADA transfer.
 *
 * Selection priority:
 *   1. ADA-only UTxOs (no native tokens) - preferred, keeps change output clean
 *   2. Multi-asset UTxOs only if ADA-only selection is insufficient
 *
 * When multi-asset UTxOs are consumed, ALL their tokens MUST appear in the
 * change output (Cardano protocol requirement). The returned `changeTokenAssets`
 * captures the full token inventory the change output must carry.
 */
export declare const fetchAndSelectUtxosForAda: (params: fetchAndSelectUtxosForAdaParams) => Promise<{
    selectedUtxos: UtxoData[];
    accumulatedAda: number;
    changeTokenAssets: Record<string, number>;
    minChangeLovelace: number;
    release: () => void;
}>;
export interface createAdaTransactionOutputsParams {
    lovelaceAmount: number;
    fee: number;
    recipientAddress: Address;
    senderAddress: Address;
    selectedUtxos: UtxoData[];
}
/**
 * Builds transaction outputs for a native ADA transfer.
 *
 * Recipient output: pure ADA only.
 * Change output:    remaining ADA + ALL tokens from spent UTxOs (token preservation).
 *
 * Throws if either output would violate the Cardano min-UTxO rule.
 */
export declare const createAdaTransactionOutputs: (params: createAdaTransactionOutputsParams) => TransactionOutput[];
/**
 * Builds a native ADA transaction with iteratively calculated fee.
 * Uses the shared convergeTransactionFee loop.
 *
 * @param params               - Parameters for createAdaTransactionOutputs (excluding fee)
 * @param txInputs             - Transaction inputs
 * @param ttl                  - Slot deadline for the transaction
 * @param estimatedWitnessCount - Number of signatures - use WITNESS_COUNT_* constants
 */
export declare const buildAdaTransactionWithCalculatedFee: (params: Omit<createAdaTransactionOutputsParams, "fee">, txInputs: TransactionInput[], ttl: number, estimatedWitnessCount: number) => {
    outputs: TransactionOutput[];
    fee: number;
    txBody: TransactionBody;
};
/**
 * Selects UTxOs for a multi-token transfer (one or more CNTs in a single transaction).
 *
 * Selection strategy:
 *   Phase 1: Pick UTxOs that satisfy all required token amounts (coverage-score heuristic).
 *   Phase 2: Supplement with ADA-only UTxOs (preferred) if the total ADA is insufficient
 *            to cover fee + minRecipient + minChange.
 *
 * Throws if any required token cannot be fully covered.
 */
export declare const fetchAndSelectUtxosForMultiToken: (params: fetchAndSelectUtxosForMultiTokenParams) => Promise<{
    selectedUtxos: UtxoData[];
    accumulatedAda: number;
    changeTokenAssets: Record<string, number>;
    minChangeLovelace: number;
    release: () => void;
}>;
/**
 * Builds transaction outputs for a multi-token transfer.
 *
 * Recipient output: all requested tokens + minimum required ADA.
 * Change output:    remaining ADA + all unrequested (or partially-used) tokens.
 *
 * Throws if either output would violate the Cardano min-UTxO rule.
 */
export declare const createMultiTokenTransactionOutputs: (params: MultiTokenTransactionOutputsParams) => TransactionOutput[];
/**
 * Builds a multi-token transaction with iteratively calculated fee.
 *
 * @param params               - Parameters for createMultiTokenTransactionOutputs (excluding fee)
 * @param txInputs             - Transaction inputs
 * @param ttl                  - Slot deadline for the transaction
 * @param estimatedWitnessCount - Number of signatures - use WITNESS_COUNT_* constants
 */
export declare const buildMultiTokenTransactionWithCalculatedFee: (params: Omit<MultiTokenTransactionOutputsParams, "fee">, txInputs: TransactionInput[], ttl: number, estimatedWitnessCount: number) => {
    outputs: TransactionOutput[];
    fee: number;
    txBody: TransactionBody;
};
/**
 * Builds a single consolidation output that sweeps all UTxOs into one.
 *
 * Unlike regular transfers there is no change output - the single output IS the result.
 * All ADA (minus fee) and ALL tokens from the input UTxOs are merged into it.
 *
 * Throws if the remaining lovelace after the fee is below the protocol minimum.
 */
export declare const createConsolidationOutput: (params: ConsolidationTransactionOutputParams) => TransactionOutput[];
/**
 * Builds a UTxO consolidation transaction with iteratively calculated fee.
 *
 * @param params               - Parameters for createConsolidationOutput (excluding fee)
 * @param txInputs             - Transaction inputs (all UTxOs at the address)
 * @param ttl                  - Slot deadline for the transaction
 * @param estimatedWitnessCount - Number of signatures - use WITNESS_COUNT_* constants
 */
export declare const buildConsolidationTransactionWithCalculatedFee: (params: Omit<ConsolidationTransactionOutputParams, "fee">, txInputs: TransactionInput[], ttl: number, estimatedWitnessCount: number) => {
    outputs: TransactionOutput[];
    fee: number;
    txBody: TransactionBody;
};
//# sourceMappingURL=cardano.d.ts.map