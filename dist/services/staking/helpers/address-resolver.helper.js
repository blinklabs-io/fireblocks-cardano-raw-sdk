/**
 * Address Resolver Helper
 * Responsible for address resolution and stake address derivation
 */
import { getStakeAddressFromBaseAddress } from "../../../utils/index.js";
import { SdkApiError } from "../../../types/index.js";
export class StakeAddressResolver {
    fireblocksService;
    networkConfig;
    logger;
    constructor(fireblocksService, networkConfig, logger) {
        this.fireblocksService = fireblocksService;
        this.networkConfig = networkConfig;
        this.logger = logger;
    }
    async getStakeAddress(vaultAccountId) {
        const { address } = await this.getBaseAddress(vaultAccountId);
        return getStakeAddressFromBaseAddress(address, this.networkConfig.isMainnet());
    }
    async getBaseAddress(vaultAccountId, addressIndex) {
        const addresses = await this.fireblocksService.getVaultAccountAddresses(vaultAccountId, this.networkConfig.assetId);
        const baseAddress = this.findBaseAddress(addresses, addressIndex);
        if (!baseAddress?.address) {
            throw new SdkApiError("No BASE address found for vault account", 400, "NO_BASE_ADDRESS", { vaultAccountId, addressIndex }, "staking-service");
        }
        return {
            address: baseAddress.address,
            addressIndex: baseAddress.bip44AddressIndex ?? 0,
        };
    }
    findBaseAddress(addresses, addressIndex) {
        if (addressIndex !== undefined) {
            return addresses.find((addr) => addr.addressFormat === "BASE" && addr.bip44AddressIndex === addressIndex);
        }
        return addresses.find((addr) => addr.addressFormat === "BASE");
    }
}
//# sourceMappingURL=address-resolver.helper.js.map