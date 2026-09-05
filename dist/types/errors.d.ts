export declare class SdkApiError extends Error {
    statusCode?: number | undefined;
    errorType?: string | undefined;
    errorInfo?: unknown | undefined;
    service?: string | undefined;
    constructor(message: string, statusCode?: number | undefined, errorType?: string | undefined, errorInfo?: unknown | undefined, service?: string | undefined);
}
//# sourceMappingURL=errors.d.ts.map