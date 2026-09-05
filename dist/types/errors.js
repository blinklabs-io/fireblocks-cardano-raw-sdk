export class SdkApiError extends Error {
    statusCode;
    errorType;
    errorInfo;
    service;
    constructor(message, statusCode, errorType, errorInfo, service) {
        super(message);
        this.statusCode = statusCode;
        this.errorType = errorType;
        this.errorInfo = errorInfo;
        this.service = service;
        this.name = "SdkApiError";
    }
}
//# sourceMappingURL=errors.js.map