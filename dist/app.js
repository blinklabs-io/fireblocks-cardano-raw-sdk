import startServer from "./server.js";
import { Logger } from "./utils/index.js";
const logger = new Logger("app:server-initializer");
(() => {
    try {
        logger.info("server starting...");
        startServer();
    }
    catch (error) {
        // Startup errors can contain environment-derived configuration and paths.
        // Preserve a safe error category without logging messages or stack traces.
        logger.error("Error starting server", {
            errorName: error instanceof Error ? error.name : typeof error,
        });
        process.exit(1);
    }
})();
//# sourceMappingURL=app.js.map