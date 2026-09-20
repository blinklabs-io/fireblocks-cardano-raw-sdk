import { Fireblocks, TransactionResponse } from "@fireblocks/ts-sdk";
/**
 * Polls a Fireblocks transaction until it reaches a terminal state.
 *
 * Continuously monitors transaction status and waits for completion or broadcasting state.
 * Logs status changes and throws errors for failure states (blocked, cancelled, failed, rejected).
 *
 * @param txId - The Fireblocks transaction ID to monitor
 * @param fireblocks - Initialized Fireblocks SDK instance for API calls
 * @param pollingInterval - Optional interval between status checks in milliseconds (default: 1000ms)
 * @param maxWaitMs - Maximum total time to wait before throwing a timeout error (default: 30 minutes, matching Fireblocks RAW signing timeout)
 *
 * @returns Promise resolving to the final TransactionResponse when completed or broadcasting
 *
 * @throws {Error} If transaction is blocked - policy or compliance issue
 * @throws {Error} If transaction is cancelled - user or system cancellation
 * @throws {Error} If transaction fails - signature failure or network error
 * @throws {Error} If transaction is rejected - approval policy rejection
 *
 * @remarks
 * **Terminal Success States:**
 * - `COMPLETED` - Transaction fully processed and confirmed
 * - `BROADCASTING` - Transaction submitted to blockchain network
 *
 * **Terminal Failure States:**
 * - `BLOCKED` - Blocked by policy or compliance
 * - `CANCELLED` - Manually cancelled
 * - `FAILED` - Technical failure during processing
 * - `REJECTED` - Rejected by approval policy
 *
 * **Transient States** (will continue polling):
 * - `SUBMITTED` - Submitted for processing
 * - `QUEUED` - Waiting in queue
 * - `PENDING_SIGNATURE` - Awaiting signature
 * - `PENDING_AUTHORIZATION` - Awaiting approval
 * - `PENDING_3RD_PARTY_MANUAL_APPROVAL` - Waiting for external approval
 * - `PENDING_3RD_PARTY` - Processing with third party
 *
 * @example
 * ```typescript
 * const txResponse = await fireblocks.transactions.createTransaction({...});
 * const completedTx = await getTxStatus(txResponse.data.id, fireblocks, 2000);
 * const signature = completedTx.signedMessages?.[0]?.signature;
 * ```
 */
export declare const getTxStatus: (txId: string, fireblocks: Fireblocks, pollingInterval?: number, maxWaitMs?: number) => Promise<TransactionResponse>;
//# sourceMappingURL=fireblocks.d.ts.map