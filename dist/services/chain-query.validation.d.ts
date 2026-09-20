import { z } from "zod";
import type { ChainPage } from "../types/chain-queries.js";
export declare const integer: z.ZodNumber;
export declare const quantity: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const hash: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const unitSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const metadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export declare const pageOptions: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    count: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>;
export declare const historyOptions: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    count: z.ZodDefault<z.ZodNumber>;
    fromBlock: z.ZodOptional<z.ZodNumber>;
    toBlock: z.ZodOptional<z.ZodNumber>;
    details: z.ZodDefault<z.ZodEnum<{
        none: "none";
        full: "full";
    }>>;
}, z.core.$strict>;
export declare const parse: <T>(schema: z.ZodType<T>, value: unknown, context: string) => T;
export declare const parseInput: <T>(schema: z.ZodType<T>, value: unknown, context: string) => T;
export declare const paymentAddress: (value: string) => string;
export declare const stakeAddress: (value: string) => string;
export declare const poolId: (value: string) => string;
export declare const fingerprint: (unit: string) => string;
export declare const isoTime: (seconds: number) => string;
export declare const pageResult: <T>(items: T[], options: {
    page: number;
    count: number;
}, key: (item: T) => string, total?: number | null, order?: ChainPage<T>["order"]) => ChainPage<T>;
//# sourceMappingURL=chain-query.validation.d.ts.map