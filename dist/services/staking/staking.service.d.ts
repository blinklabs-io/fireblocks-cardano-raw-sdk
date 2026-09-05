/**
 * Staking Service for Cardano
 * Orchestrates staking operations with clear separation of concerns
 */
import { FireblocksService, IagonApiService } from "../index.js";
import { RegisterStakingOptions, DelegationOptions, DeregisterStakingOptions, WithdrawRewardsOptions, DRepDelegationOptions, RegisterAsDRepOptions, RegisterAsDRepResult, CastVoteOptions, CastVoteResult, StakingTransactionResult, RewardsData, Networks } from "../../types/index.js";
/**
 * Main Staking Service
 * Orchestrates staking operations by coordinating specialized helper services
 */
export declare class StakingService {
    private readonly logger;
    private readonly errorHandler;
    private readonly networkConfig;
    private readonly addressResolver;
    private readonly utxoProvider;
    private readonly transactionSigner;
    private readonly transactionSubmitter;
    private readonly validator;
    private readonly transactionBuilder;
    private readonly transactionLogger;
    private readonly rewardsService;
    private readonly registrationVerifier;
    private readonly iagonApiService;
    constructor(fireblocksService: FireblocksService, iagonApiService: IagonApiService, network?: Networks);
    /**
     * Register staking credential for a vault account
     * Automatically finds an address with suitable pure ADA UTXO
     */
    registerStakingCredential(options: RegisterStakingOptions): Promise<StakingTransactionResult & {
        stakeAddress: string;
        addressIndex: number;
    }>;
    /**
     * Delegate to a stake pool
     */
    delegateToPool(options: DelegationOptions): Promise<StakingTransactionResult>;
    /**
     * Deregister staking credential (includes reward withdrawal)
     */
    deregisterStakingCredential(options: DeregisterStakingOptions): Promise<StakingTransactionResult>;
    /**
     * Withdraw staking rewards
     */
    withdrawRewards(options: WithdrawRewardsOptions): Promise<StakingTransactionResult & {
        rewardAmount?: number;
    }>;
    /**
     * Delegate voting power to a DRep (Conway era governance)
     */
    delegateToDRep(options: DRepDelegationOptions): Promise<StakingTransactionResult>;
    /**
     * Register the vault account as a DRep (Conway era governance)
     */
    registerAsDRep(options: RegisterAsDRepOptions): Promise<RegisterAsDRepResult>;
    /**
     * Cast a governance vote as a DRep (Conway era)
     */
    castVote(options: CastVoteOptions): Promise<CastVoteResult>;
    /**
     * Get stake address for a vault account
     */
    getStakeAddress(vaultAccountId: string): Promise<string>;
    /**
     * Query staking rewards for a vault account
     */
    queryStakingRewards(vaultAccountId: string): Promise<RewardsData>;
    /**
     * Get delegation history for a vault account
     */
    getDelegationHistory(vaultAccountId: string, limit?: number): Promise<import("../../types/index.js").DelegationHistoryResponse>;
    /**
     * Get registration/deregistration history for a vault account
     */
    getRegistrationHistory(vaultAccountId: string, limit?: number): Promise<import("../../types/index.js").RegistrationHistoryResponse>;
    /**
     * Get complete stake account information
     */
    getStakeAccountInfo(vaultAccountId: string): Promise<import("../../types/index.js").StakeAccountInfoResponse>;
    private handleAlreadyRegistered;
    /**
     * Common transaction execution workflow
     * Handles: TTL calculation, transaction building, signing, logging, and submission
     */
    private executeTransaction;
    private executeRegistration;
    private executeDeregistration;
    private buildSignAndSubmit;
    private validateWithdrawalLimit;
    private validateDRepOptions;
    /**
     * Returns true when the error is a Cardano ledger rejection indicating that the
     * withdrawal amount in the transaction does not match the on-chain reward balance.
     * This happens when the API returns a stale reward value.
     */
    private isIncompleteWithdrawalsError;
}
//# sourceMappingURL=staking.service.d.ts.map