import { timingSafeEqual } from "crypto";
export const MIN_SERVER_API_KEY_BYTES = 32;
/** Compare credentials without leaking a useful character-by-character timing signal. */
export const credentialsMatch = (provided, expected) => {
    const providedBytes = Buffer.from(provided, "utf8");
    const expectedBytes = Buffer.from(expected, "utf8");
    // The configured key length is not secret; compare equal-length keys in constant time.
    return (providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes));
};
export const extractApiCredential = (req) => {
    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey === "string" && apiKey.length > 0)
        return apiKey;
    const authorization = req.headers.authorization;
    if (typeof authorization !== "string")
        return undefined;
    if (authorization.slice(0, 6).toLowerCase() !== "bearer")
        return undefined;
    if (!/\s/.test(authorization.charAt(6)))
        return undefined;
    let credentialStart = 7;
    while (credentialStart < authorization.length &&
        /\s/.test(authorization.charAt(credentialStart))) {
        credentialStart++;
    }
    const credential = authorization.slice(credentialStart);
    return credential && !credential.includes("\n") && !credential.includes("\r")
        ? credential
        : undefined;
};
export const validateServerApiKey = (apiKey) => {
    if (!apiKey) {
        throw new Error("SERVER_API_KEY is required in HTTP server mode. Generate a random secret of at least 32 bytes.");
    }
    if (Buffer.byteLength(apiKey, "utf8") < MIN_SERVER_API_KEY_BYTES) {
        throw new Error(`SERVER_API_KEY must be at least ${MIN_SERVER_API_KEY_BYTES} bytes long`);
    }
    return apiKey;
};
export const requireApiKey = (expected) => (req, res, next) => {
    const provided = extractApiCredential(req);
    if (!provided || !credentialsMatch(provided, expected)) {
        res.setHeader("WWW-Authenticate", 'Bearer realm="cardano-raw-sdk"');
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
    }
    next();
};
/**
 * Fireblocks authenticates this one endpoint with its detached webhook signature.
 * The controller verifies that signature before processing the payload.
 */
export const allowSignedWebhook = (req) => req.method === "POST" && req.path === "/webhook";
export const protectApi = (expected) => {
    const authenticate = requireApiKey(expected);
    return (req, res, next) => {
        if (allowSignedWebhook(req)) {
            next();
            return;
        }
        authenticate(req, res, next);
    };
};
//# sourceMappingURL=security.js.map