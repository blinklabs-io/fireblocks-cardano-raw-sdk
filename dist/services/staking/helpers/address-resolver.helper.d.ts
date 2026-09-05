/**
 * Address Resolver Helper
 * Responsible for address resolution and stake address derivation
 */
import { Logger } from "../../../utils/index.js";
import { FireblocksService } from "../../index.js";
import { INetworkConfiguration, IStakeAddressResolver, AddressInfo } from "../types/staking.interfaces.js";
export declare class StakeAddressResolver implements IStakeAddressResolver {
    private readonly fireblocksService;
    private readonly networkConfig;
    private readonly logger;
    constructor(fireblocksService: FireblocksService, networkConfig: INetworkConfiguration, logger: Logger);
    getStakeAddress(vaultAccountId: string): Promise<string>;
    getBaseAddress(vaultAccountId: string, addressIndex?: number): Promise<AddressInfo>;
    private findBaseAddress;
}
//# sourceMappingURL=address-resolver.helper.d.ts.map