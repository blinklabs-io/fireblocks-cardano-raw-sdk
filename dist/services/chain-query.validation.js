import { z } from "zod";
import { bech32 } from "bech32";
import { blake2b } from "blakejs";
import { Address, RewardAddress } from "@emurgo/cardano-serialization-lib-nodejs";
import { SdkApiError } from "../types/errors.js";
export const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const quantity = z
    .string()
    .regex(/^\d+$/)
    .transform((s) => BigInt(s).toString());
export const hash = z
    .string()
    .regex(/^[a-f\d]{64}$/i)
    .transform((s) => s.toLowerCase());
export const unitSchema = z
    .string()
    .regex(/^[a-f\d]{56}(?:[a-f\d]{2}){0,32}$/i)
    .transform((s) => s.toLowerCase());
export const metadata = z.record(z.string(), z.unknown()).nullable();
export const pageOptions = z
    .object({
    page: integer.min(1).max(1000).default(1),
    count: integer.min(1).max(100).default(100),
})
    .strict();
export const historyOptions = pageOptions
    .extend({
    fromBlock: integer.optional(),
    toBlock: integer.optional(),
    details: z.enum(["none", "full"]).default("none"),
})
    .refine((o) => (o.fromBlock === undefined || o.toBlock === undefined || o.fromBlock <= o.toBlock) &&
    (o.details !== "full" || o.count <= 25), "Invalid block range or full-detail count (maximum 25)");
export const parse = (schema, value, context) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
        throw new SdkApiError(`Invalid ${context}`, 502, "InvalidChainQueryData");
    return parsed.data;
};
export const parseInput = (schema, value, context) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
        throw new SdkApiError(`Invalid ${context}`, 400, "InvalidChainQueryInput");
    return parsed.data;
};
export const paymentAddress = (value) => {
    let address;
    try {
        address = Address.from_bech32(value);
        if (!/^addr(_test)?1/.test(value))
            throw new Error();
        return value;
    }
    catch {
        throw new Error("A bech32 payment address is required; credential queries are separate");
    }
    finally {
        address?.free();
    }
};
export const stakeAddress = (value) => {
    let address;
    let reward;
    try {
        address = Address.from_bech32(value);
        reward = RewardAddress.from_address(address);
        if (!reward)
            throw new Error();
        return address.to_bech32();
    }
    catch {
        throw new Error("A valid stake address is required");
    }
    finally {
        reward?.free();
        address?.free();
    }
};
export const poolId = (value) => {
    try {
        const bytes = /^[a-f\d]{56}$/i.test(value)
            ? Buffer.from(value, "hex")
            : (() => {
                const decoded = bech32.decode(value);
                if (decoded.prefix !== "pool")
                    throw new Error();
                return Buffer.from(bech32.fromWords(decoded.words));
            })();
        if (bytes.length !== 28)
            throw new Error();
        return bech32.encode("pool", bech32.toWords(bytes));
    }
    catch {
        throw new Error("A valid pool ID is required");
    }
};
export const fingerprint = (unit) => bech32.encode("asset", bech32.toWords(blake2b(Buffer.from(unit, "hex"), undefined, 20)));
export const isoTime = (seconds) => {
    if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 8640000000000)
        throw new Error("Invalid block time");
    return new Date(seconds * 1000).toISOString();
};
export const pageResult = (items, options, key, total = null, order = "provider-defined") => {
    if (items.length > options.count || new Set(items.map(key)).size !== items.length)
        throw new Error("Oversized or duplicate query page");
    if (total !== null &&
        items.length > 0 &&
        total < (options.page - 1) * options.count + items.length)
        throw new Error("Inconsistent query total");
    if (total !== null &&
        items.length < options.count &&
        total > (options.page - 1) * options.count + items.length) {
        throw new Error("Short query page contradicts reported total");
    }
    return {
        items,
        page: options.page,
        count: options.count,
        nextPage: items.length === options.count && (total === null || options.page * options.count < total)
            ? options.page + 1
            : null,
        total,
        order,
        coverage: "provider-retained",
    };
};
//# sourceMappingURL=chain-query.validation.js.map