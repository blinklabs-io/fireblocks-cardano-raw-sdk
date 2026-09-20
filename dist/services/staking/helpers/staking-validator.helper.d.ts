/**
 * Staking Validator Helper
 * Validates registration status and delegation prerequisites
 */
import { Logger } from "../../../utils/index.js";
import { IagonApiService } from "../../index.js";
import { IStakeAddressResolver, IStakingValidator } from "../types/staking.interfaces.js";
export declare class StakingValidator implements IStakingValidator {
    private readonly iagonApiService;
    private readonly addressResolver;
    private readonly logger;
    constructor(iagonApiService: IagonApiService, addressResolver: IStakeAddressResolver, logger: Logger);
    validateRegistrationStatus(vaultAccountId: string, shouldBeRegistered: boolean): Promise<void>;
    validateDelegationPrerequisites(vaultAccountId: string, poolId: string): Promise<void>;
    checkRegistrationStatus(vaultAccountId: string): Promise<boolean>;
}
//# sourceMappingURL=staking-validator.helper.d.ts.map