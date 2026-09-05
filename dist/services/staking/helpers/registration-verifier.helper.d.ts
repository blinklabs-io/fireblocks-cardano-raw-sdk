/**
 * Registration Verifier Helper
 * Handles async verification of staking registration
 */
import { Logger } from "../../../utils/index.js";
import { IagonApiService } from "../../index.js";
export declare class RegistrationVerifier {
    private readonly iagonApiService;
    private readonly logger;
    constructor(iagonApiService: IagonApiService, logger: Logger);
    verifyAsync(stakeAddress: string): void;
    private performVerification;
    private delay;
}
//# sourceMappingURL=registration-verifier.helper.d.ts.map