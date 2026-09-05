/**
 * Registration Verifier Helper
 * Handles async verification of staking registration
 */
import { REGISTRATION_VERIFICATION_DELAY_MS } from "../types/staking.interfaces.js";
export class RegistrationVerifier {
    iagonApiService;
    logger;
    constructor(iagonApiService, logger) {
        this.iagonApiService = iagonApiService;
        this.logger = logger;
    }
    verifyAsync(stakeAddress) {
        setTimeout(() => {
            this.performVerification(stakeAddress).catch((error) => {
                this.logger.warn(`Background verification failed: ${error}`);
            });
        }, 0);
    }
    async performVerification(stakeAddress) {
        await this.delay(REGISTRATION_VERIFICATION_DELAY_MS);
        const verifyInfo = await this.iagonApiService.getStakeAccountInfo(stakeAddress);
        if (verifyInfo.data.active) {
            this.logger.info("Registration verified! Stake key is active.");
            this.logger.info(`Stake address: ${stakeAddress}`);
            this.logger.info(`Active epoch: ${verifyInfo.data.active_epoch}`);
        }
        else {
            this.logger.warn("Registration pending. Check status later.");
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=registration-verifier.helper.js.map