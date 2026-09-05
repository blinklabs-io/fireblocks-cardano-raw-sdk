import { createHash, timingSafeEqual } from "crypto";
import { NextFunction, Request, RequestHandler, Response } from "express";

export const MIN_SERVER_API_KEY_BYTES = 32;

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

/** Compare credentials without leaking a useful character-by-character timing signal. */
export const credentialsMatch = (provided: string, expected: string): boolean =>
  timingSafeEqual(digest(provided), digest(expected));

export const extractApiCredential = (req: Pick<Request, "headers">): string | undefined => {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string" && apiKey.length > 0) return apiKey;

  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1];
};

export const validateServerApiKey = (apiKey: string | undefined): string => {
  if (!apiKey) {
    throw new Error(
      "SERVER_API_KEY is required in HTTP server mode. Generate a random secret of at least 32 bytes."
    );
  }
  if (Buffer.byteLength(apiKey, "utf8") < MIN_SERVER_API_KEY_BYTES) {
    throw new Error(`SERVER_API_KEY must be at least ${MIN_SERVER_API_KEY_BYTES} bytes long`);
  }
  return apiKey;
};

export const requireApiKey =
  (expected: string): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
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
export const allowSignedWebhook = (req: Request): boolean =>
  req.method === "POST" && req.path === "/webhook";

export const protectApi = (expected: string): RequestHandler => {
  const authenticate = requireApiKey(expected);
  return (req, res, next) => {
    if (allowSignedWebhook(req)) {
      next();
      return;
    }
    authenticate(req, res, next);
  };
};
