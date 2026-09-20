/**
 * Staking utility functions for Cardano
 * Ported from Python staking.py and delegate_to_drep.py
 */
import { CardanoWitness, CardanoRewardWithdrawal, DRepInfo, DRepAction, BuildPayloadOptions, CardanoCertificate } from "../types/index.js";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
/** Raw CBOR array - used for hand-built Cardano transaction structures */
export type CborArray = unknown[];
/**
 * Blake2b hash with configurable digest size (default 28 bytes for address hash, 32 for TX hash)
 */
export declare const blakeHash: (payload: Buffer, digestSize?: number) => Buffer;
/**
 * Calculate transaction hash for signing (32 byte Blake2b hash)
 */
export declare const getSigningPayload: (serializedTx: Buffer) => Buffer;
/**
 * Get stake address HRP (human readable part) based on network
 */
export declare const getStakeAddressHrp: (mainnet: boolean) => string;
/**
 * Get address HRP based on network
 */
export declare const getAddressHrp: (mainnet: boolean) => string;
/**
 * Get stake address bytes prefix based on network
 */
export declare const stakeAddressBytesPrefix: (mainnet: boolean) => Buffer;
/**
 * Encode stake address from bytes to bech32 format
 */
export declare const encodeStakeAddress: (decodedAddress: Buffer, mainnet: boolean) => string;
/**
 * Decode Cardano address from bech32 to bytes
 */
export declare const decodeAddress: (encodedAddress: string, mainnet: boolean) => Buffer;
/**
 * Extract stake credential (last 28 bytes) from a base address
 */
export declare const getCertificateFromBaseAddress: (baseAddress: string, mainnet: boolean) => Buffer;
/**
 * Get stake address from certificate (credential hash)
 */
export declare const getStakeAddressFromCertificate: (certificate: Buffer, mainnet: boolean) => string;
/**
 * Get stake address from base address
 */
export declare const getStakeAddressFromBaseAddress: (baseAddress: string, mainnet: boolean) => string;
/**
 * Serialize certificate for CBOR encoding
 * Returns [0, certificate] array
 */
export declare const serializeCertificate: (certificate: Buffer) => [number, Uint8Array];
/**
 * Build stake key registration certificate (Shelley era)
 * Certificate type: 0 (STAKE_KEY_REGISTRATION) - no deposit field
 * Note: Conway-era registration (type 7, with deposit) is not used here;
 * Shelley-era certs remain valid on the Conway ledger.
 */
export declare const buildRegistrationCertificate: (credential: Buffer) => CardanoCertificate;
/**
 * Build stake key deregistration certificate (Shelley era)
 * Certificate type: 1 (STAKE_KEY_DEREGISTRATION) - no refund field
 * Note: Conway-era deregistration (type 8, with refund) is not used here;
 * Shelley-era certs remain valid on the Conway ledger.
 */
export declare const buildDeregistrationCertificate: (credential: Buffer) => CardanoCertificate;
/**
 * Build pool delegation certificate
 */
export declare const buildDelegationCertificate: (credential: Buffer, poolId: string) => CardanoWasm.Certificate;
/**
 * Build vote delegation certificate (Conway era)
 */
export declare const buildVoteDelegationCertificate: (credential: Buffer, drep: DRepInfo) => CborArray;
/**
 * Serialize withdrawals as a map for CBOR encoding
 */
export declare const serializeWithdrawals: (withdrawals: CardanoRewardWithdrawal[]) => Map<Uint8Array, number>;
/**
 * Embed signatures in transaction to create final signed transaction
 * Witnesses are automatically sorted by key hash as required by Cardano
 */
export declare const embedSignaturesInTx: (deserializedTxPayload: Map<number, unknown>, signatures: CardanoWitness[]) => Buffer;
/**
 * Build transaction payload (transaction body) for CBOR encoding
 */
export declare const buildPayload: (options: BuildPayloadOptions) => {
    serialized: Buffer;
    deserialized: Map<number, unknown>;
};
/**
 * Calculate TTL (time to live) for transaction
 */
export declare const calculateTtl: (currentSlot: number, ttlSecs?: number) => number;
/**
 * Find suitable UTXO for staking operations
 */
export interface UtxoForStaking {
    txHash: string;
    indexInTx: number;
    nativeAmount: number;
}
export declare const findSuitableUtxo: (utxos: Array<{
    transaction_id: string;
    output_index: number;
    value: {
        lovelace: number;
        assets?: Record<string, number>;
    };
}>, minAmount: number) => UtxoForStaking | null;
/**
 * Convert DRep action string to DRepInfo
 * Supports both bech32 (drep1...) and hex formats for custom DReps
 */
export declare const drepActionToDRepInfo: (action: DRepAction, drepId?: string) => DRepInfo;
/**
 * Build voting_procedures map for a DRep governance vote (Conway era, TX body key 19)
 *
 * CBOR structure:
 *   { voter => { gov_action_id => voting_procedure } }
 *
 * Where:
 *   voter            = [2, drep_key_hash_bytes]         (Conway CDDL: tag 2 = drep_keyhash, flat 2-tuple)
 *   gov_action_id    = [tx_hash_bytes, index]
 *   voting_procedure = [vote, anchor_or_null]           (vote: 0=No, 1=Yes, 2=Abstain)
 *   anchor           = [url_string, data_hash_bytes]
 *
 * Conway voter tags (IntersectMBO/cardano-ledger conway.cddl):
 *   0 = committee_hot_keyhash
 *   1 = committee_hot_scripthash
 *   2 = drep_keyhash       ← this SDK
 *   3 = drep_scripthash
 *   4 = stake_pool_keyhash
 */
export declare const buildVotingProcedures: (credential: Buffer, governanceActionId: {
    txHash: string;
    index: number;
}, vote: 0 | 1 | 2, anchor?: {
    url: string;
    dataHash: string;
}) => Map<CborArray, Map<CborArray, CborArray>>;
/**
 * Build DRep registration certificate (Conway era, cert type 16)
 * CBOR structure: [16, [0, credential_bytes], coin_deposit, anchor_or_null]
 * where anchor = [url_string, data_hash_bytes] if provided
 */
export declare const buildDRepRegistrationCertificate: (credential: Buffer, depositLovelace: number, anchor?: {
    url: string;
    dataHash: string;
}) => CborArray;
/**
 * Encode a stake credential as a bech32 DRep ID
 * Key-based DRep: hrp="drep", header=0x22
 * Script-based DRep: hrp="drep_script", header=0x23
 */
export declare const encodeDRepId: (credential: Buffer, isScript?: boolean) => string;
/**
 * Sort witnesses by public key hash in lexicographic order
 * Cardano requires witnesses to be sorted for transaction validation
 */
export declare const sortWitnesses: (witnesses: CardanoWitness[]) => CardanoWitness[];
//# sourceMappingURL=staking.utils.d.ts.map