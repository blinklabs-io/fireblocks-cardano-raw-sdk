import axios from "axios";
import { SdkApiError } from "../types/index.js";
export class ErrorHandler {
    serviceName;
    logger;
    constructor(serviceName, logger) {
        this.serviceName = serviceName;
        this.logger = logger;
    }
    /**
     * Handles API errors consistently
     * @param error - The caught error
     * @param context - Description of what operation failed
     * @returns ApiError with structured error information
     */
    handleApiError(error, context) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            // Provider response bodies and request URLs may contain credentials or signed payloads.
            this.logger.error(`Error ${context}`);
            // Log only categorical failure information. Provider errors can retain
            // environment-derived identifiers in status/code/message properties.
            if (status !== undefined) {
                this.logger.error("Provider returned an HTTP error response");
            }
            if (!error.response) {
                if (error.request) {
                    this.logger.error("Request was made but no response received");
                }
                else {
                    this.logger.error("Error setting up request");
                }
            }
            const message = data?.message ||
                data?.info ||
                data?.error ||
                error.response?.statusText ||
                error.message ||
                `Error ${context}`;
            return new SdkApiError(message, status, data?.type, data?.info, this.serviceName);
        }
        // Handle ApiError - pass through unchanged
        if (error instanceof SdkApiError) {
            return error;
        }
        this.logger.error(`Unexpected error ${context}`);
        return new SdkApiError(error instanceof Error ? error.message : `Error ${context}`, undefined, undefined, error, this.serviceName);
    }
}
//# sourceMappingURL=errorHandler.js.map