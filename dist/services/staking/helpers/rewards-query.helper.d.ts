/**
 * Rewards Query Helper
 * Queries and manages rewards information
 */
import { Logger } from "../../../utils/index.js";
import { RewardsData, CardanoRewardWithdrawal } from "../../../types/index.js";
import { IagonApiService } from "../../index.js";
export declare class RewardsQueryService {
    private readonly iagonApiService;
    private readonly logger;
    constructor(iagonApiService: IagonApiService, logger: Logger);
    queryRewards(stakeAddress: string): Promise<RewardsData>;
    getWithdrawals(stakeAddress: string, certificate: Buffer, maxWithdrawal: number, isMainnet: boolean): Promise<{
        withdrawal: CardanoRewardWithdrawal;
        rewardAmount: number;
    }>;
}
//# sourceMappingURL=rewards-query.helper.d.ts.map