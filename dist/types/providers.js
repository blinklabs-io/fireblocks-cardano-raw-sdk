export var ChainProviderCapability;
(function (ChainProviderCapability) {
    ChainProviderCapability["CORE"] = "core";
    ChainProviderCapability["IAGON_COMPATIBILITY"] = "iagon-compatibility";
    ChainProviderCapability["ACCOUNT_QUERIES"] = "credential-and-stake-queries";
    ChainProviderCapability["HISTORY"] = "history";
    ChainProviderCapability["STAKING"] = "staking";
    ChainProviderCapability["GOVERNANCE"] = "governance";
    ChainProviderCapability["POOLS"] = "pools";
    ChainProviderCapability["ASSET_METADATA"] = "asset-metadata";
})(ChainProviderCapability || (ChainProviderCapability = {}));
export class ProviderCapabilityError extends Error {
    provider;
    capability;
    constructor(provider, capability) {
        super(`Provider '${provider}' does not support the '${capability}' capability`);
        this.provider = provider;
        this.capability = capability;
        this.name = "ProviderCapabilityError";
    }
}
//# sourceMappingURL=providers.js.map