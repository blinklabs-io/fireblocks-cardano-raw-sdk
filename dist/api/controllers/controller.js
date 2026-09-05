import { BasePath } from "@fireblocks/ts-sdk";
import { Logger, config } from "../../utils/index.js";
import { SdkApiError } from "../../types/index.js";
import { CardanoAmounts } from "../../constants.js";
// standard success envelope
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
/**
 * Map Fireblocks BasePath to webhook environment
 */
const getWebhookEnvironment = (basePath) => {
    // Handle string or enum values
    const path = basePath;
    if (path === BasePath.EU2) {
        return "EU2";
    }
    else if (path === BasePath.EU) {
        return "EU";
    }
    else if (path === BasePath.Sandbox) {
        return "SANDBOX";
    }
    else {
        return "US"; // Default for US or any other value
    }
};
/**
 * Controller class that handles HTTP requests for Fireblocks operations.
 *
 * This controller serves as the interface between Express routes and the SdkManager,
 * handling the four core operations:
 * 1. Get vault account address
 * 2. Get vault account addresses
 * 3. Submit transaction
 * 4. Get transaction history
 *
 * @class ApiController
 * @example
 * ```typescript
 * const sdkManager = new SdkManager(config);
 * const controller = new ApiController(sdkManager);
 *
 * app.use('/api', controller.getRouter());
 * ```
 */
export class ApiController {
    sdkManager;
    logger = new Logger("api:controller");
    /**
     * Creates an instance of ApiController.
     *
     * @param sdkManager - The SdkManager instance to use for SDK operations
     */
    constructor(sdkManager) {
        this.sdkManager = sdkManager;
    }
    getIagonHealth = async (req, res) => {
        try {
            const iagonApiKey = process.env.IAGON_API_KEY;
            if (!iagonApiKey) {
                return res.status(500).json({
                    success: false,
                    error: "IAGON_API_KEY is not configured",
                });
            }
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.checkIagonHealth());
            this.logger.info(`Iagon health check successful`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getIagonHealth");
        }
    };
    getProviderHealth = async (_req, res) => {
        try {
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.checkProviderHealth());
            this.logger.info("Chain provider health check completed");
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getProviderHealth");
        }
    };
    getBalanceByAddress = async (req, res) => {
        const { vaultAccountId } = req.params;
        const { index } = req.query;
        const groupByPolicy = req.query.groupByPolicy === "true";
        const includeMetadata = req.query.includeMetadata === "true";
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getBalanceByAddress({ index, groupByPolicy, includeMetadata }));
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getBalanceByAddress");
        }
    };
    getVaultBalance = async (req, res) => {
        const { vaultAccountId } = req.params;
        const groupBy = req.query.groupBy;
        const includeMetadata = req.query.includeMetadata === "true";
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getVaultBalance({ groupBy, includeMetadata }));
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getVaultBalance");
        }
    };
    getBalanceByCredential = async (req, res) => {
        const { vaultAccountId, credential } = req.params;
        const groupByPolicy = req.query.groupByPolicy === "true";
        const includeMetadata = req.query.includeMetadata === "true";
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getBalanceByCredential({ credential, groupByPolicy, includeMetadata }));
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getBalanceByCredential");
        }
    };
    getBalanceByStakeKey = async (req, res) => {
        const { vaultAccountId } = req.params;
        const groupByPolicy = req.query.groupByPolicy === "true";
        const includeMetadata = req.query.includeMetadata === "true";
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getBalanceByStakeKey({ groupByPolicy, includeMetadata }));
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getBalanceByStakeKey");
        }
    };
    getTransactionDetails = async (req, res) => {
        const { hash } = req.params;
        try {
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getTransactionDetails(hash));
            this.logger.info(`Transaction details retrieved successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getTransactionDetails");
        }
    };
    /**
     * Get asset information including metadata and decimals
     * GET /api/assets/:policyId/:assetName
     */
    getAssetInfo = async (req, res) => {
        const { policyId, assetName } = req.params;
        try {
            if (!policyId || !assetName) {
                return res.status(400).json({
                    success: false,
                    error: "policyId and assetName are required",
                });
            }
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getAssetInfo(policyId, assetName));
            this.logger.info(`Asset info retrieved successfully for ${policyId}.${assetName}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getAssetInfo");
        }
    };
    getUtxosByAddress = async (req, res) => {
        const { vaultAccountId } = req.params;
        const { index } = req.query;
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getUtxosByAddress(index));
            this.logger.info(`UTXOs retrieved successfully for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getUtxosByAddress");
        }
    };
    getVaultUtxos = async (req, res) => {
        const { vaultAccountId } = req.params;
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getUtxosByVaultAccountId());
            this.logger.info(`Vault UTxOs retrieved for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getVaultUtxos");
        }
    };
    getTransactionHistory = async (req, res) => {
        const { vaultAccountId } = req.params;
        const { index, limit, offset, fromSlot } = req.query;
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getTransactionHistory(index, { limit, offset, fromSlot }));
            this.logger.info(`Transactions history retrieved successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getTransactionHistory");
        }
    };
    getDetailedTxHistory = async (req, res) => {
        const { vaultAccountId } = req.params;
        const { index, limit, offset, fromSlot } = req.query;
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getDetailedTxHistory(index, { limit, offset, fromSlot }));
            this.logger.info(`Detailed transactions history retrieved successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getDetailedTxHistory");
        }
    };
    getAllTransactionHistory = async (req, res) => {
        const { vaultAccountId } = req.params;
        const { limit, offset, fromSlot } = req.query;
        const options = {
            limit,
            offset,
            fromSlot,
            groupByAddress: req.query.groupByAddress === "true",
        };
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getAllTransactionHistory(options));
            this.logger.info(`All transactions history retrieved successfully for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getAllTransactionHistory");
        }
    };
    getAllDetailedTxHistory = async (req, res) => {
        const { vaultAccountId } = req.params;
        const { limit, offset, fromSlot } = req.query;
        const options = {
            limit,
            offset,
            fromSlot,
            groupByAddress: req.query.groupByAddress === "true",
        };
        try {
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getAllDetailedTxHistory(options));
            this.logger.info(`All detailed transactions history retrieved successfully for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getAllDetailedTxHistory");
        }
    };
    transfer = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.transfer(req.body));
            this.logger.info(`Transfer executed successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "transfer");
        }
    };
    estimateFee = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.estimateTransactionFee(req.body));
            this.logger.info(`Fee estimation completed successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "estimateFee");
        }
    };
    transferAda = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.transferAda(req.body));
            this.logger.info(`ADA transfer executed successfully: ${result.txHash}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "transferAda");
        }
    };
    estimateAdaFee = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.estimateAdaTransactionFee(req.body));
            this.logger.info(`ADA fee estimation completed successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "estimateAdaFee");
        }
    };
    transferMultipleTokens = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.transferMultipleTokens(req.body));
            this.logger.info(`Multi-token transfer executed successfully: ${result.txHash}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "transferMultipleTokens");
        }
    };
    estimateMultiTokenFee = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.estimateMultiTokenTransactionFee(req.body));
            this.logger.info(`Multi-token fee estimation completed successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "estimateMultiTokenFee");
        }
    };
    consolidateUtxos = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.consolidateUtxos(req.body));
            this.logger.info(`UTxO consolidation executed successfully: ${result.txHash}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "consolidateUtxos");
        }
    };
    enrichWebhookPayload = async (req, res) => {
        try {
            // Extract raw body (Buffer) for signature verification
            // rawBody is attached by express.json verify callback
            const rawBody = req.rawBody;
            if (!rawBody) {
                return res.status(400).json({
                    success: false,
                    error: "Missing raw request body - webhook endpoint requires Content-Type: application/json",
                });
            }
            // Body is already parsed by express.json
            const payload = req.body;
            // Extract headers for signature verification
            const headers = {
                "fireblocks-webhook-signature": req.headers["fireblocks-webhook-signature"],
                "fireblocks-signature": req.headers["fireblocks-signature"],
            };
            // Get webhook environment from Fireblocks basePath config
            const environment = getWebhookEnvironment(config.FIREBLOCKS.basePath || BasePath.US);
            // Step 1: Verify signature using a default SDK instance
            const verifyResult = await this.sdkManager.withSdk("0", (sdk) => sdk.verifyWebhook(rawBody, headers, environment));
            if (!verifyResult) {
                this.logger.error("Webhook signature verification failed");
                return res.status(401).json({
                    success: false,
                    error: "Webhook signature verification failed",
                });
            }
            // Step 2: acquire the correct vault SDK for enrichment
            const vaultAccountId = payload?.data?.destination?.id ?? "0";
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.enrichWebhookPayload(payload));
            this.logger.info("Webhook verified and enriched successfully");
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "enrichWebhookPayload");
        }
    };
    // ======================
    // Staking Operations
    // ======================
    /**
     * Register staking credential for a vault account
     * POST /api/staking/register
     */
    registerStaking = async (req, res) => {
        try {
            const { vaultAccountId, index } = req.body;
            if (!vaultAccountId) {
                return res.status(400).json({
                    success: false,
                    error: "vaultAccountId is required",
                });
            }
            const depositAmount = CardanoAmounts.DEPOSIT_AMOUNT;
            const fee = CardanoAmounts.STAKING_TX_FEE;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.registerStakingCredential({ vaultAccountId, index, depositAmount, fee }));
            this.logger.info(`Staking registration successful for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "registerStaking");
        }
    };
    /**
     * Deregister staking credential
     * POST /api/staking/deregister
     */
    deregisterStaking = async (req, res) => {
        try {
            const { vaultAccountId } = req.body;
            if (!vaultAccountId) {
                return res.status(400).json({
                    success: false,
                    error: "vaultAccountId is required",
                });
            }
            const fee = CardanoAmounts.STAKING_TX_FEE;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.deregisterStakingCredential({ vaultAccountId, fee }));
            this.logger.info(`Staking deregistration successful for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "deregisterStaking");
        }
    };
    /**
     * Delegate to a stake pool
     * POST /api/staking/delegate
     */
    delegateToPool = async (req, res) => {
        try {
            const { vaultAccountId, poolId } = req.body;
            if (!vaultAccountId) {
                return res.status(400).json({
                    success: false,
                    error: "vaultAccountId is required",
                });
            }
            if (!poolId) {
                return res.status(400).json({
                    success: false,
                    error: "poolId is required",
                });
            }
            const fee = CardanoAmounts.STAKING_TX_FEE;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.delegateToPool({ vaultAccountId, poolId, fee }));
            this.logger.info(`Pool delegation successful for vault ${vaultAccountId} to pool ${poolId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "delegateToPool");
        }
    };
    /**
     * Withdraw staking rewards
     * POST /api/staking/withdraw-rewards
     */
    withdrawRewards = async (req, res) => {
        try {
            const { vaultAccountId, limit } = req.body;
            if (!vaultAccountId) {
                return res.status(400).json({
                    success: false,
                    error: "vaultAccountId is required",
                });
            }
            const fee = CardanoAmounts.STAKING_TX_FEE;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.withdrawRewards({ vaultAccountId, limit, fee }));
            this.logger.info(`Reward withdrawal successful for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "withdrawRewards");
        }
    };
    getStakeAccountInfo = async (req, res) => {
        try {
            const { vaultAccountId } = req.params;
            if (!vaultAccountId) {
                return res.status(400).json({
                    success: false,
                    error: "vaultAccountId is required",
                });
            }
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getStakeAccountInfo(vaultAccountId));
            this.logger.info(`Staking account info retrieved successfully for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getStakeAccountInfo");
        }
    };
    getCurrentEpoch = async (req, res) => {
        try {
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getCurrentEpoch());
            this.logger.info(`Current epoch retrieved successfully`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getCurrentEpoch");
        }
    };
    /**
     * Query staking rewards for a vault account
     * GET /api/staking/rewards/:vaultAccountId
     */
    queryStakingRewards = async (req, res) => {
        try {
            const { vaultAccountId } = req.params;
            if (!vaultAccountId) {
                return res.status(400).json({
                    success: false,
                    error: "vaultAccountId is required",
                });
            }
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.queryStakingRewards(vaultAccountId));
            this.logger.info(`Staking rewards queried successfully for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "queryStakingRewards");
        }
    };
    /**
     * Cast a governance vote as a DRep (Conway governance)
     * POST /api/governance/vote
     */
    castGovernanceVote = async (req, res) => {
        try {
            const { vaultAccountId, governanceActionId, vote, anchor, fee } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.castGovernanceVote({ vaultAccountId, governanceActionId, vote, anchor, fee }));
            this.logger.info(`Governance vote "${vote}" submitted for vault ${vaultAccountId}: ${result.txHash}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "castGovernanceVote");
        }
    };
    /**
     * Delegate to a DRep (Conway governance)
     * POST /api/governance/delegate-drep
     */
    delegateToDRep = async (req, res) => {
        try {
            const { vaultAccountId, drepAction, drepId } = req.body;
            const fee = CardanoAmounts.GOVERNANCE_TX_FEE;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.delegateToDRep({ vaultAccountId, drepAction, drepId, fee }));
            this.logger.info(`DRep delegation successful for vault ${vaultAccountId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "delegateToDRep");
        }
    };
    /**
     * Register a vault account as a DRep (Conway governance)
     * POST /api/governance/register-drep
     */
    registerAsDRep = async (req, res) => {
        try {
            const { vaultAccountId, anchor, depositAmount, fee } = req.body;
            const result = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.registerAsDRep({ vaultAccountId, anchor, depositAmount, fee }));
            this.logger.info(`DRep registration submitted for vault ${vaultAccountId}: ${result.txHash}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "registerAsDRep");
        }
    };
    /**
     * Get pool information
     * GET /api/pool/info/:poolId
     */
    getPoolInfo = async (req, res) => {
        try {
            const { poolId } = req.params;
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getPoolInfo(poolId));
            this.logger.info(`Pool info retrieved for ${poolId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getPoolInfo");
        }
    };
    getPoolMetadata = async (req, res) => {
        try {
            const { poolId } = req.params;
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getPoolMetadata(poolId));
            this.logger.info(`Pool metadata retrieved for ${poolId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getPoolMetadata");
        }
    };
    getPoolDelegators = async (req, res) => {
        try {
            const { poolId } = req.params;
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getPoolDelegators(poolId));
            this.logger.info(`Pool delegators retrieved for ${poolId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getPoolDelegators");
        }
    };
    getPoolDelegatorsList = async (req, res) => {
        const { limit, offset } = req.query;
        try {
            const { poolId } = req.params;
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getPoolDelegatorsList(poolId, limit, offset));
            this.logger.info(`Pool delegators list retrieved for ${poolId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getPoolDelegatorsList");
        }
    };
    getPoolBlocks = async (req, res) => {
        try {
            const { poolId } = req.params;
            const result = await this.sdkManager.withSdk("0", (sdk) => sdk.getPoolBlocks(poolId));
            this.logger.info(`Pool blocks retrieved for ${poolId}`);
            ok(res, result);
        }
        catch (error) {
            this.handleError(error, res, "getPoolBlocks");
        }
    };
    /**
     * Get stake address for a vault account
     * GET /api/staking/stake-address/:vaultAccountId
     */
    getStakeAddress = async (req, res) => {
        try {
            const { vaultAccountId } = req.params;
            if (!vaultAccountId) {
                return res.status(400).json({
                    success: false,
                    error: "vaultAccountId is required",
                });
            }
            const stakeAddress = await this.sdkManager.withSdk(vaultAccountId, (sdk) => sdk.getStakeAddress(vaultAccountId));
            this.logger.info(`Stake address retrieved successfully for vault ${vaultAccountId}: ${stakeAddress}`);
            ok(res, { stakeAddress });
        }
        catch (error) {
            this.handleError(error, res, "getStakeAddress");
        }
    };
    /**
     * Handles errors that occur during API operations.
     *
     * @param error - The error that occurred
     * @param res - Express response object
     * @param endpoint - The name of the endpoint where the error occurred (for logging)
     */
    handleError(error, res, endpoint) {
        if (error instanceof SdkApiError) {
            const statusCode = error.statusCode || 500;
            this.logger.error(`${endpoint} - ApiError:`, {
                statusCode: error.statusCode,
                errorType: error.errorType,
                service: error.service,
                message: error.message,
            });
            res.status(statusCode).json({
                success: false,
                error: error.message,
                statusCode: error.statusCode,
                type: error.errorType,
                info: error.errorInfo,
                service: error.service,
            });
        }
        else {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`${endpoint} - UnhandledError:`, message);
            res.status(500).json({
                success: false,
                error: message,
            });
        }
    }
}
//# sourceMappingURL=controller.js.map