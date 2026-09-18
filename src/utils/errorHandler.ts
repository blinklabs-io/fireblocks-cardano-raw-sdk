import axios from "axios";
import { Logger } from "./logger.js";
import { SdkApiError } from "../types/index.js";

export class ErrorHandler {
  constructor(
    private readonly serviceName: string,
    private readonly logger: Logger
  ) {}

  /**
   * Handles API errors consistently
   * @param error - The caught error
   * @param context - Description of what operation failed
   * @returns ApiError with structured error information
   */
  handleApiError(error: unknown, context: string): SdkApiError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      // Provider response bodies and request URLs may contain credentials or signed payloads.
      this.logger.error(`Error ${context}`);
      this.logger.error("Status:", status);

      // Log additional axios error details for non-response errors
      if (!error.response) {
        this.logger.error("Error Code:", error.code);
        if (error.request) {
          this.logger.error("Request was made but no response received");
        } else {
          this.logger.error("Error setting up request");
        }
      }

      const message =
        data?.message ||
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
    return new SdkApiError(
      error instanceof Error ? error.message : `Error ${context}`,
      undefined,
      undefined,
      error,
      this.serviceName
    );
  }
}
