import { Request, Response } from "express";
import { SdkManager } from "../../pool/sdkManager.js";
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
export declare class ApiController {
    private sdkManager;
    private readonly logger;
    /**
     * Creates an instance of ApiController.
     *
     * @param sdkManager - The SdkManager instance to use for SDK operations
     */
    constructor(sdkManager: SdkManager);
    getIagonHealth: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getProviderHealth: (_req: Request, res: Response) => Promise<void>;
    getBalanceByAddress: (req: Request, res: Response) => Promise<void>;
    getVaultBalance: (req: Request, res: Response) => Promise<void>;
    getBalanceByCredential: (req: Request, res: Response) => Promise<void>;
    getBalanceByStakeKey: (req: Request, res: Response) => Promise<void>;
    getTransactionDetails: (req: Request, res: Response) => Promise<void>;
    /**
     * Get asset information including metadata and decimals
     * GET /api/assets/:policyId/:assetName
     */
    getAssetInfo: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getUtxosByAddress: (req: Request, res: Response) => Promise<void>;
    getVaultUtxos: (req: Request, res: Response) => Promise<void>;
    getTransactionHistory: (req: Request, res: Response) => Promise<void>;
    getDetailedTxHistory: (req: Request, res: Response) => Promise<void>;
    getAllTransactionHistory: (req: Request, res: Response) => Promise<void>;
    getAllDetailedTxHistory: (req: Request, res: Response) => Promise<void>;
    transfer: (req: Request, res: Response) => Promise<void>;
    estimateFee: (req: Request, res: Response) => Promise<void>;
    transferAda: (req: Request, res: Response) => Promise<void>;
    estimateAdaFee: (req: Request, res: Response) => Promise<void>;
    transferMultipleTokens: (req: Request, res: Response) => Promise<void>;
    estimateMultiTokenFee: (req: Request, res: Response) => Promise<void>;
    consolidateUtxos: (req: Request, res: Response) => Promise<void>;
    enrichWebhookPayload: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Register staking credential for a vault account
     * POST /api/staking/register
     */
    registerStaking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Deregister staking credential
     * POST /api/staking/deregister
     */
    deregisterStaking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Delegate to a stake pool
     * POST /api/staking/delegate
     */
    delegateToPool: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Withdraw staking rewards
     * POST /api/staking/withdraw-rewards
     */
    withdrawRewards: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getStakeAccountInfo: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getCurrentEpoch: (req: Request, res: Response) => Promise<void>;
    /**
     * Query staking rewards for a vault account
     * GET /api/staking/rewards/:vaultAccountId
     */
    queryStakingRewards: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Cast a governance vote as a DRep (Conway governance)
     * POST /api/governance/vote
     */
    castGovernanceVote: (req: Request, res: Response) => Promise<void>;
    /**
     * Delegate to a DRep (Conway governance)
     * POST /api/governance/delegate-drep
     */
    delegateToDRep: (req: Request, res: Response) => Promise<void>;
    /**
     * Register a vault account as a DRep (Conway governance)
     * POST /api/governance/register-drep
     */
    registerAsDRep: (req: Request, res: Response) => Promise<void>;
    /**
     * Get pool information
     * GET /api/pool/info/:poolId
     */
    getPoolInfo: (req: Request, res: Response) => Promise<void>;
    getPoolMetadata: (req: Request, res: Response) => Promise<void>;
    getPoolDelegators: (req: Request, res: Response) => Promise<void>;
    getPoolDelegatorsList: (req: Request, res: Response) => Promise<void>;
    getPoolBlocks: (req: Request, res: Response) => Promise<void>;
    /**
     * Get stake address for a vault account
     * GET /api/staking/stake-address/:vaultAccountId
     */
    getStakeAddress: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Handles errors that occur during API operations.
     *
     * @param error - The error that occurred
     * @param res - Express response object
     * @param endpoint - The name of the endpoint where the error occurred (for logging)
     */
    private handleError;
}
//# sourceMappingURL=controller.d.ts.map