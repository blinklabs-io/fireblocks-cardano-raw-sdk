export declare const toHex: (str: string) => string;
export declare const decodeAssetName: (assetId: string) => string;
/**
 * Convert raw amount to human-readable format with decimals.
 * Uses BigInt arithmetic to avoid floating-point precision loss for large lovelace values
 * (max ADA supply exceeds Number.MAX_SAFE_INTEGER when expressed in lovelace).
 *
 * @param rawAmount - The raw integer amount in smallest units (lovelace)
 * @param decimals - Number of decimal places (6 for ADA)
 * @returns Object with formatted value and formatted raw value with commas
 * @example
 * formatWithDecimals(1700000, 6) // { value: "1.700000", raw: "1,700,000" }
 * formatWithDecimals(470000, 6) // { value: "0.470000", raw: "470,000" }
 */
export declare const formatWithDecimals: (rawAmount: number | bigint, decimals: number) => {
    value: string;
    raw: string;
};
/**
 * Parse an ADA decimal string (e.g. "0.178701") to lovelace as an integer.
 * Uses string splitting to avoid floating-point precision loss.
 */
export declare const parseAdaStringToLovelace: (ada: string) => number;
//# sourceMappingURL=general.d.ts.map