import { fileURLToPath } from "url";
import path, { dirname } from "path";
import http from "http";
import { BasePath } from "@fireblocks/ts-sdk";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config, Logger } from "./utils/index.js";
import { getSwaggerSpec, swaggerUi } from "./utils/swagger.js";
import { SdkManager } from "./pool/sdkManager.js";
import { configureRouter } from "./api/router.js";
import { FireblocksCardanoRawSDK } from "./FireblocksCardanoRawSDK.js";
import { Networks } from "./types/index.js";
import { protectApi, requireApiKey, validateServerApiKey } from "./api/security.js";
const logger = new Logger("app:server-setup");
/**
 * Valid Cardano networks supported by this SDK
 */
const VALID_NETWORKS = ["mainnet", "preprod", "preview"];
/**
 * Validate and parse CARDANO_NETWORK environment variable
 * @throws Error if network is invalid
 */
const validateNetwork = (networkStr) => {
    const network = networkStr?.toLowerCase() || "mainnet";
    if (!VALID_NETWORKS.includes(network)) {
        throw new Error(`Invalid CARDANO_NETWORK: "${networkStr}". Must be one of: ${VALID_NETWORKS.join(", ")}`);
    }
    if (network === "mainnet")
        return Networks.MAINNET;
    if (network === "preview")
        return Networks.PREVIEW;
    return Networks.PREPROD;
};
const startServer = () => {
    // Validate required environment variables for server mode
    if (!process.env.FIREBLOCKS_API_USER_KEY) {
        throw new Error("Missing required environment variable: FIREBLOCKS_API_USER_KEY");
    }
    if (!process.env.FIREBLOCKS_API_USER_SECRET_KEY_PATH &&
        !process.env.FIREBLOCKS_API_USER_SECRET_KEY) {
        throw new Error("FIREBLOCKS_API_USER_SECRET_KEY_PATH or FIREBLOCKS_API_USER_SECRET_KEY is required");
    }
    const providerType = (process.env.CHAIN_PROVIDER || "demeter").toLowerCase();
    let chainProvider;
    if (providerType === "demeter") {
        if (!process.env.DEMETER_BLOCKFROST_URL || !process.env.DEMETER_API_KEY) {
            throw new Error("DEMETER_BLOCKFROST_URL and DEMETER_API_KEY are required");
        }
        chainProvider = {
            type: "demeter",
            baseUrl: process.env.DEMETER_BLOCKFROST_URL,
            apiKey: process.env.DEMETER_API_KEY,
        };
    }
    else if (providerType === "iagon") {
        if (!process.env.IAGON_API_KEY) {
            throw new Error("IAGON_API_KEY is required when CHAIN_PROVIDER=iagon");
        }
        chainProvider = { type: "iagon", apiKey: process.env.IAGON_API_KEY };
    }
    else {
        throw new Error("CHAIN_PROVIDER must be either 'demeter' or 'iagon'");
    }
    const serverApiKey = validateServerApiKey(process.env.SERVER_API_KEY);
    const serverHost = process.env.SERVER_HOST || "127.0.0.1";
    const bodyLimit = process.env.REQUEST_BODY_LIMIT || "256kb";
    const rateLimitWindowMs = parsePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000, "RATE_LIMIT_WINDOW_MS");
    const rateLimitMax = parsePositiveInteger(process.env.RATE_LIMIT_MAX, 100, "RATE_LIMIT_MAX");
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
    app.use(helmet());
    app.use(rateLimit({
        windowMs: rateLimitWindowMs,
        limit: rateLimitMax,
        standardHeaders: "draft-8",
        legacyHeaders: false,
    }));
    // Configure middlewares with raw body preservation for webhook endpoint
    app.use(express.json({
        limit: bodyLimit,
        verify: (req, _res, buf, _encoding) => {
            // Preserve raw body for webhook signature verification
            const r = req;
            if (r.url?.split("?")[0] === "/api/webhook") {
                r.rawBody = buf;
            }
        },
    }));
    app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
    // Initialize base config for Fireblocks
    const baseConfig = {
        apiKey: config.FIREBLOCKS.apiKey || "",
        secretKey: config.FIREBLOCKS.secretKey || "",
        basePath: config.FIREBLOCKS.basePath || BasePath.US,
    };
    // Get and validate network from environment variable
    const network = validateNetwork(process.env.CARDANO_NETWORK);
    // Initialize SDK Manager with pool configuration and the SDK factory used for each vault.
    const sdkManager = new SdkManager(baseConfig, network, {
        maxPoolSize: parseInt(process.env.POOL_MAX_SIZE || "100"),
        idleTimeoutMs: parseInt(process.env.POOL_IDLE_TIMEOUT_MS || "1800000"),
        cleanupIntervalMs: parseInt(process.env.POOL_CLEANUP_INTERVAL_MS || "300000"),
        connectionTimeoutMs: parseInt(process.env.POOL_CONNECTION_TIMEOUT_MS || "30000"),
        retryAttempts: parseInt(process.env.POOL_RETRY_ATTEMPTS || "3"),
    }, async (vaultAccountId, fireblocksConfig, network) => FireblocksCardanoRawSDK.createInstance({
        fireblocksConfig,
        vaultAccountId,
        network,
        chainProvider,
    }));
    // Mount API routes with SDK Manager
    app.use("/api", protectApi(serverApiKey), configureRouter(sdkManager));
    // Health check endpoint
    app.get("/health", (_req, res) => {
        logger.info("alive");
        res.status(200).send("Alive");
    });
    // Swagger documentation endpoints (lazy loaded)
    const swaggerSpec = getSwaggerSpec();
    app.use("/api-docs", requireApiKey(serverApiKey), swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get("/api-docs-json", requireApiKey(serverApiKey), (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerSpec);
    });
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    app.use("/docs", requireApiKey(serverApiKey), express.static(path.join(__dirname, "../docs")));
    app.use(errorHandler);
    // Create HTTP server for graceful shutdown support
    const server = http.createServer(app);
    server.requestTimeout = 30_000;
    server.headersTimeout = 10_000;
    server.keepAliveTimeout = 5_000;
    // Graceful shutdown handler
    let isShuttingDown = false;
    const gracefulShutdown = async (signal) => {
        if (isShuttingDown) {
            logger.warn(`Shutdown already in progress, ignoring ${signal}`);
            return;
        }
        isShuttingDown = true;
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        // Stop accepting new connections
        server.close((err) => {
            if (err) {
                logger.error("Error closing HTTP server:", err);
            }
            else {
                logger.info("HTTP server closed");
            }
        });
        try {
            // Shutdown SDK manager (clears cleanup interval, releases all SDK instances)
            await sdkManager.shutdown();
            logger.info("Graceful shutdown complete");
            process.exit(0);
        }
        catch (err) {
            logger.error("Error during graceful shutdown:", err);
            process.exit(1);
        }
    };
    // Register signal handlers
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("unhandledRejection", (reason) => {
        logger.error("Unhandled promise rejection:", reason);
    });
    process.on("uncaughtException", (err) => {
        logger.error("Uncaught exception:", err);
        gracefulShutdown("uncaughtException");
    });
    server.listen(config.PORT, serverHost, () => {
        logger.info(`${config.APP_NAME} listening on ${serverHost}:${config.PORT}`);
        logger.info(`Network: ${network}`);
    });
};
const parsePositiveInteger = (rawValue, fallback, variableName) => {
    if (rawValue === undefined)
        return fallback;
    const parsed = Number(rawValue);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`${variableName} must be a positive integer`);
    }
    return parsed;
};
const errorHandler = (err, _req, res, _next) => {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: "Internal server error" });
};
export default startServer;
//# sourceMappingURL=server.js.map