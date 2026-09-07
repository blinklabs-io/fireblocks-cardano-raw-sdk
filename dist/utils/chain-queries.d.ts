import type { ChainPage, ChainPageOptions } from "../types/chain-queries.js";
/** Collect retained pages within an explicit budget. Never return a silently truncated scan. */
export declare const collectChainPages: <T>(fetchPage: (options: ChainPageOptions) => Promise<ChainPage<T>>, identity: (item: T) => string, options?: {
    count?: number;
    maxPages?: number;
}) => Promise<T[]>;
//# sourceMappingURL=chain-queries.d.ts.map