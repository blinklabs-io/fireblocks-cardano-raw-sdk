/**
 * Staking Validator Helper
 * Validates registration status and delegation prerequisites
 */
import { SdkApiError } from "../../../types/index.js";
export class StakingValidator {
    iagonApiService;
    addressResolver;
    logger;
    constructor(iagonApiService, addressResolver, logger) {
        this.iagonApiService = iagonApiService;
        this.addressResolver = addressResolver;
        this.logger = logger;
    }
    async validateRegistrationStatus(vaultAccountId, shouldBeRegistered) {
        const isRegistered = await this.checkRegistrationStatus(vaultAccountId);
        if (shouldBeRegistered && !isRegistered) {
            throw new SdkApiError("Stake credential must be registered first", 400, "NOT_REGISTERED", { vaultAccountId }, "staking-service");
        }
    }
    async validateDelegationPrerequisites(vaultAccountId, poolId) {
        const stakeAddress = await this.addressResolver.getStakeAddress(vaultAccountId);
        const accountInfo = await this.iagonApiService.getStakeAccountInfo(stakeAddress);
        if (!accountInfo.data.active) {
            throw new SdkApiError("Stake credential must be registered first", 400, "NOT_REGISTERED", { vaultAccountId }, "staking-service");
        }
        if (accountInfo.data.pool_id === poolId) {
            this.logger.info(`Already delegated to pool ${poolId}`);
        }
        await this.iagonApiService.getPoolInfo(poolId);
    }
    async checkRegistrationStatus(vaultAccountId) {
        try {
            const stakeAddress = await this.addressResolver.getStakeAddress(vaultAccountId);
            const accountInfo = await this.iagonApiService.getStakeAccountInfo(stakeAddress);
            return accountInfo.data.active;
        }
        catch {
            this.logger.info("Stake key not yet registered");
            return false;
        }
    }
}
//# sourceMappingURL=staking-validator.helper.js.map