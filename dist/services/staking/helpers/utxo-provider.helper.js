/**
 * UTXO Provider Helper
 * Handles UTXO finding and selection logic
 */
import { findSuitableUtxo, formatWithDecimals, } from "../../../utils/index.js";
import { SdkApiError } from "../../../types/index.js";
export class UtxoProvider {
    fireblocksService;
    iagonApiService;
    networkConfig;
    logger;
    constructor(fireblocksService, iagonApiService, networkConfig, logger) {
        this.fireblocksService = fireblocksService;
        this.iagonApiService = iagonApiService;
        this.networkConfig = networkConfig;
        this.logger = logger;
    }
    async findAddressWithSuitableUtxo(vaultAccountId, minAmount) {
        const addresses = await this.getVaultAddresses(vaultAccountId);
        for (const addressObj of addresses) {
            if (addressObj.addressFormat !== "BASE" || !addressObj.address) {
                continue;
            }
            const utxo = await this.findUtxoForAddress(addressObj.address, minAmount);
            if (utxo) {
                return {
                    address: addressObj.address,
                    addressIndex: addressObj.bip44AddressIndex ?? 0,
                    utxo,
                };
            }
            this.logger.debug(`No suitable UTXO for address ${addressObj.address}`);
        }
        throw this.createInsufficientFundsError(vaultAccountId, minAmount);
    }
    async getVaultAddresses(vaultAccountId) {
        const addresses = await this.fireblocksService.getVaultAccountAddresses(vaultAccountId, this.networkConfig.assetId);
        if (!addresses || addresses.length === 0) {
            throw new SdkApiError("No addresses found for vault account", 400, "NO_ADDRESSES", { vaultAccountId }, "staking-service");
        }
        return addresses;
    }
    async findUtxoForAddress(address, minAmount) {
        const utxosResponse = await this.iagonApiService.getUtxosByAddress(address);
        if (!utxosResponse.data || utxosResponse.data.length === 0) {
            return null;
        }
        return findSuitableUtxo(utxosResponse.data, minAmount);
    }
    createInsufficientFundsError(vaultAccountId, minAmount) {
        const requiredAda = formatWithDecimals(minAmount, 6).value;
        return new SdkApiError(`No address with pure ADA UTXO of at least ${requiredAda} ADA found. ` +
            `Please send ${requiredAda} ADA (without tokens) to this vault.`, 400, "INSUFFICIENT_PURE_ADA", { vaultAccountId, requiredAmount: minAmount }, "staking-service");
    }
}
//# sourceMappingURL=utxo-provider.helper.js.map