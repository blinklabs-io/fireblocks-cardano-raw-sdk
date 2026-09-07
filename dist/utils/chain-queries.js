/** Collect retained pages within an explicit budget. Never return a silently truncated scan. */
export const collectChainPages = async (fetchPage, identity, options = {}) => {
    const count = options.count ?? 100;
    const maxPages = options.maxPages ?? 10;
    if (!Number.isInteger(count) ||
        count < 1 ||
        count > 100 ||
        !Number.isInteger(maxPages) ||
        maxPages < 1 ||
        maxPages > 1000) {
        throw new Error("Invalid query scan budget");
    }
    const items = [];
    const seen = new Set();
    for (let page = 1; page <= maxPages; page++) {
        const result = await fetchPage({ page, count });
        if (result.page !== page ||
            result.count !== count ||
            result.items.length > count ||
            (result.nextPage !== null && result.nextPage !== page + 1))
            throw new Error("Invalid query continuation");
        for (const item of result.items) {
            const key = identity(item);
            if (seen.has(key))
                throw new Error("Duplicate item across query pages; scan may have shifted");
            seen.add(key);
            items.push(item);
        }
        if (result.nextPage === null)
            return items;
    }
    throw new Error("Query scan exceeded maxPages; refusing incomplete result");
};
//# sourceMappingURL=chain-queries.js.map