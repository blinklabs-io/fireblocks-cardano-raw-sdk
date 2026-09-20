export class ChainReadUnsupportedError extends Error {
    provider;
    operation;
    statusCode;
    constructor(provider, operation, statusCode) {
        super(`Provider '${provider}' does not support the '${operation}' read operation`);
        this.provider = provider;
        this.operation = operation;
        this.statusCode = statusCode;
        this.name = "ChainReadUnsupportedError";
    }
}
//# sourceMappingURL=chain-queries.js.map