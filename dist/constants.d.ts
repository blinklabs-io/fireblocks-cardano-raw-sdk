export declare const iagonBaseUrl = "https://api.fireblocks.partners.iagon.com";
export declare enum CardanoConstants {
    ADA_COIN_TYPE = 1815,
    ADA_TEST_COIN_TYPE = 1,
    CHANGE_INDEX = 0,
    CHIMERIC_INDEX = 2,
    CARDANO_BASE_ADDRESS_MIN_LENGTH = 57,// 1 byte header + 28 bytes payment + 28 bytes stake
    CARDANO_PAYMENT_CREDENTIAL_OFFSET = 29,// 1 byte header + 28 bytes payment hash
    ADA_DECIMALS = 6,// 1 ADA = 1,000,000 lovelace
    MIN_FEE_A = 44,// Cardano protocol parameter: minFeeA - lovelace per transaction byte
    MIN_FEE_B = 155381,// Cardano protocol parameter: minFeeB - constant lovelace term in the fee formula
    /**
     * Bytes per Ed25519 signature witness in the CBOR-encoded transaction
     */
    TX_WITNESS_SIZE_BYTES = 139,
    /**
     * Maximum iterations for the transaction-fee convergence loop
     */
    TX_FEE_MAX_ITERATIONS = 5,
    /**
     * TTL for in-memory UTxO locks (ms). Locks expire automatically to prevent
     * permanent blocking if a request crashes before calling release().
     */
    UTXO_LOCK_TTL_MS = 120000,
    /**
     * Maximum number of UTxO inputs per transaction.
     * Cardano's 16KB transaction size limit allows ~100–150 inputs in practice.
     * This cap prevents dust-attack vectors where many tiny UTxOs are sent to an
     * address to make future transactions exceed the size limit.
     */
    MAX_TX_INPUTS = 100,
    /**
     * Base minimum lovelace for any UTxO (Cardano protocol parameter).
     * Minimum ADA required for ADA-only or single-policy UTxOs.
     * Kept here (not in CardanoAmounts) to avoid a duplicate-value clash with
     * CardanoAmounts.GOVERNANCE_TX_FEE - both happen to be 1 ADA today but are
     * independent protocol constants that must be updated separately if either changes.
     */
    MIN_UTXO_BASE_LOVELACE = 1000000
}
export declare enum CardanoAmounts {
    DEPOSIT_AMOUNT = 2000000,
    /**
     * Fee for staking operations (register, deregister, delegate, withdraw)
     * These are ADA-only transactions with fixed-size certificates.
     * Sized to cover 2-witness transactions (payment key + stake key)
     */
    STAKING_TX_FEE = 300000,
    /**
     * Fee for governance operations (DRep delegation, DRep registration)
     * These transactions involve governance certificates
     */
    GOVERNANCE_TX_FEE = 1000000,
    /**
     * Deposit required to register as a DRep on Cardano mainnet (Conway era)
     * 500 ADA = 500,000,000 lovelace
     */
    DREP_REGISTRATION_DEPOSIT = 500000000,
    /**
     * Conservative fee estimate for UTXO selection in CNT transfers
     * Used to ensure sufficient ADA is available before calculating actual fee
     * Set to 0.5 ADA (500,000 lovelace) as a safe upper bound
     */
    ESTIMATED_MAX_FEE = 500000,
    /**
     * Additional lovelace required per token policy (Cardano protocol parameter)
     * Each distinct policy in a UTXO adds ~0.15 ADA to the minimum requirement
     */
    MIN_UTXO_PER_POLICY_LOVELACE = 150000,
    /**
     * Cardano protocol parameter: coins per UTXO byte
     * Used for calculating minimum ADA required for outputs with native assets
     * Mainnet value: 4310 lovelace per byte
     */
    COINS_PER_UTXO_BYTE = 4310,
    TX_TTL_SECS = 7200,
    /**
     * Initial fee estimate for the fee-convergence loop.
     * A reasonable conservative starting point; the loop converges to the real fee.
     */
    TX_FEE_INITIAL_ESTIMATE = 200000,
    /**
     * Stop the fee-convergence loop when the delta between iterations is within this bound (lovelace).
     */
    TX_FEE_TOLERANCE = 1000
}
/**
 * Fireblocks webhook validation constants
 */
export declare const FireblocksWebhookConstants: {
    /**
     * JWKS endpoints for webhook signature verification
     * Use the endpoint that matches your Fireblocks workspace environment
     */
    readonly JWKS_ENDPOINTS: {
        readonly US: "https://keys.fireblocks.io/.well-known/jwks.json";
        readonly EU: "https://eu-keys.fireblocks.io/.well-known/jwks.json";
        readonly EU2: "https://eu2-keys.fireblocks.io/.well-known/jwks.json";
        readonly SANDBOX: "https://sandbox-keys.fireblocks.io/.well-known/jwks.json";
    };
    /**
     * Legacy public keys for webhook signature verification (RSA-SHA512)
     * These are being phased out in favor of JWKS-based validation
     */
    readonly LEGACY_PUBLIC_KEYS: {
        readonly US: "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA0+6wd9OJQpK60ZI7qnZG\njjQ0wNFUHfRv85Tdyek8+ahlg1Ph8uhwl4N6DZw5LwLXhNjzAbQ8LGPxt36RUZl5\nYlxTru0jZNKx5lslR+H4i936A4pKBjgiMmSkVwXD9HcfKHTp70GQ812+J0Fvti/v\n4nrrUpc011Wo4F6omt1QcYsi4GTI5OsEbeKQ24BtUd6Z1Nm/EP7PfPxeb4CP8KOH\nclM8K7OwBUfWrip8Ptljjz9BNOZUF94iyjJ/BIzGJjyCntho64ehpUYP8UJykLVd\nCGcu7sVYWnknf1ZGLuqqZQt4qt7cUUhFGielssZP9N9x7wzaAIFcT3yQ+ELDu1SZ\ndE4lZsf2uMyfj58V8GDOLLE233+LRsRbJ083x+e2mW5BdAGtGgQBusFfnmv5Bxqd\nHgS55hsna5725/44tvxll261TgQvjGrTxwe7e5Ia3d2Syc+e89mXQaI/+cZnylNP\nSwCCvx8mOM847T0XkVRX3ZrwXtHIA25uKsPJzUtksDnAowB91j7RJkjXxJcz3Vh1\n4k182UFOTPRW9jzdWNSyWQGl/vpe9oQ4c2Ly15+/toBo4YXJeDdDnZ5c/O+KKadc\nIMPBpnPrH/0O97uMPuED+nI6ISGOTMLZo35xJ96gPBwyG5s2QxIkKPXIrhgcgUnk\ntSM7QYNhlftT4/yVvYnk0YcCAwEAAQ==\n-----END PUBLIC KEY-----";
        readonly EU: "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA6hLRQL0jPf5OEuaDYGjO\nxSyaYIlv08S0+4giiwgKSfV3Onc5hn03mvE0znzaUq2ReSxi9KYDdMYFfzf1uwF7\n7kYy2MY0oTYGdQb+PS4Ym4R4tgZ2otuoAXt8YRKq2maWyguFiaowMcYwwAVQv8JB\nafIm6Jq1nI6v1mEDVX065ePlBlAt+BGAqr6ahPxnaIz3L4eztpuNrt5nTbSxs7eF\naqQx1p56W1nl3Hl0V3tLkaXbuVtbFNR/mGMInrkPnpsG+mt35b9vmqAOvLPI0Cx1\n59uVeEs62Hj1AOCRyT6SuwIaFynRj2KnD42ioQtkodHQ0xDtgdiYGsxuwQ9vTIe7\n5oLsL8gBDeX5gdcTfSZhfGjZ7RggLNJ7vCAbYKMuUOdgWVMYnJfrhNLCq3zDSZPO\n+H0x5m/Yeq/Hn5o7xCmLNT3qARfwDd5IHfQyXqVYB6TMU75xqH5fdSRw0iMdoPyL\nALnr9/JT0av3qssNMRdWCXr+j9Ys3NkfcbU/a49657mg8e2QGSkl9w39csEKojnr\nomUz25szIL8CcXLmc5cAmnimFCe4L7UT4mvVP3+fOo+cbc/82zqA8tsSwd2Y93/6\nueGnNZD9V5rewrKjmdPfrwoI2gntzc8QJUu+nxAWhoqHV91AQeglu6WIF/DiEJC5\nWPoNk2SdlAuA6RYmgB2YyikCAwEAAQ==\n-----END PUBLIC KEY-----";
        readonly SANDBOX: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApZE6wL2+7P1ohvVYSpCd\ngSgtmyGwiLbUC1UoGJhn1zwfY7ZWbNH7Pg8Osk8OzZTZHSG/arcgE8HnGCmGKtbE\nQBkf2XlBRBQ01FcCMlZuJQJ3nElCPaMl9N6fq0VKNEIlVSVUpDCgvag5kFhDKS/L\np3YYJLFR46/hDlVLn+vM84diO3xGyMc16YJGNz7Z4jb8dmSZQE5E2XaQMDXW6uxC\nc2ChjWJ3X5H70MzRG35JsN0j58SQTwbf4Pxm0aJfhPuaIBn3mJuZL5etsuFihoFG\nFDnT+qWRcgD/pRNulBFAFhJeUnFrE4fFTJ1iaHhjBrStBCrxJk6QI0pGznoapTgA\n2QIDAQAB\n-----END PUBLIC KEY-----";
    };
    /**
     * Header names for webhook signature verification
     */
    readonly HEADERS: {
        readonly JWKS_SIGNATURE: "fireblocks-webhook-signature";
        readonly LEGACY_SIGNATURE: "fireblocks-signature";
    };
};
//# sourceMappingURL=constants.d.ts.map