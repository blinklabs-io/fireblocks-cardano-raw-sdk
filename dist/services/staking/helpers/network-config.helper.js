/**
 * Network Configuration Helper
 * Handles network-specific configuration and asset ID resolution
 */
import { Networks, SupportedAssets } from "../../../types/index.js";
export class NetworkConfiguration {
    network;
    assetId;
    constructor(network) {
        this.network = network;
        this.assetId = network === Networks.MAINNET ? SupportedAssets.ADA : SupportedAssets.ADA_TEST;
    }
    isMainnet() {
        return this.network === Networks.MAINNET;
    }
}
//# sourceMappingURL=network-config.helper.js.map