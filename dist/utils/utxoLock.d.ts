/**
 * UTxO locking to prevent double-spend in concurrent requests.
 *
 * Locks are held for UTXO_LOCK_TTL_MS and automatically expire, so a crashed
 * request can never permanently block a UTxO.
 */
export declare class UtxoLockManager {
    private readonly locks;
    private key;
    isLocked(txId: string, index: number): boolean;
    /**
     * Lock a set of UTxOs and return a release function.
     * Calling release() more than once is safe (idempotent).
     */
    lock(utxos: ReadonlyArray<{
        transaction_id: string;
        output_index: number;
    }>): () => void;
}
export declare const utxoLocks: UtxoLockManager;
//# sourceMappingURL=utxoLock.d.ts.map