import { Request, RequestHandler } from "express";
export declare const MIN_SERVER_API_KEY_BYTES = 32;
/** Compare credentials without leaking a useful character-by-character timing signal. */
export declare const credentialsMatch: (provided: string, expected: string) => boolean;
export declare const extractApiCredential: (req: Pick<Request, "headers">) => string | undefined;
export declare const validateServerApiKey: (apiKey: string | undefined) => string;
export declare const requireApiKey: (expected: string) => RequestHandler;
/**
 * Fireblocks authenticates this one endpoint with its detached webhook signature.
 * The controller verifies that signature before processing the payload.
 */
export declare const allowSignedWebhook: (req: Request) => boolean;
export declare const protectApi: (expected: string) => RequestHandler;
//# sourceMappingURL=security.d.ts.map