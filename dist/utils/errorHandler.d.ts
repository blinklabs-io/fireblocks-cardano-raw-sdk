import { Logger } from "./logger.js";
import { SdkApiError } from "../types/index.js";
export declare class ErrorHandler {
    private readonly serviceName;
    private readonly logger;
    constructor(serviceName: string, logger: Logger);
    /**
     * Handles API errors consistently
     * @param error - The caught error
     * @param context - Description of what operation failed
     * @returns ApiError with structured error information
     */
    handleApiError(error: unknown, context: string): SdkApiError;
}
//# sourceMappingURL=errorHandler.d.ts.map