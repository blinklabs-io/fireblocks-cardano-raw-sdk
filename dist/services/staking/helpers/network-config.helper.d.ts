/**
 * Network Configuration Helper
 * Handles network-specific configuration and asset ID resolution
 */
import { Networks, SupportedAssets } from "../../../types/index.js";
import { INetworkConfiguration } from "../types/staking.interfaces.js";
export declare class NetworkConfiguration implements INetworkConfiguration {
    readonly network: Networks;
    readonly assetId: SupportedAssets;
    constructor(network: Networks);
    isMainnet(): boolean;
}
//# sourceMappingURL=network-config.helper.d.ts.map