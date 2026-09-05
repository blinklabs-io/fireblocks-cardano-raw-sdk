export var Networks;
(function (Networks) {
    Networks["MAINNET"] = "mainnet";
    Networks["PREPROD"] = "preprod";
    Networks["PREVIEW"] = "preview";
})(Networks || (Networks = {}));
export var TransactionType;
(function (TransactionType) {
    TransactionType["GET_BLALANCE_BY_ADDRESS"] = "checkBalanceByAddress";
    TransactionType["GET_BLALNCE_BY_CREDENTIAL_ID"] = "getBalanceByCredential";
    TransactionType["GET_BALANCE_BY_STAKE_KEY"] = "getBalanceByStakeKey";
    TransactionType["GET_TRANSACTIONS_HISTORY"] = "getTransactionsHistory";
    TransactionType["TRANSFER"] = "TRANSFER";
})(TransactionType || (TransactionType = {}));
/**
 * Fireblocks asset IDs for Cardano networks
 * These map to internal Fireblocks asset identifiers used for transaction signing
 */
export var SupportedAssets;
(function (SupportedAssets) {
    /** Fireblocks asset ID for Cardano mainnet */
    SupportedAssets["ADA"] = "ADA";
    /** Fireblocks asset ID for Cardano testnets (preprod/preview) */
    SupportedAssets["ADA_TEST"] = "ADA_TEST";
})(SupportedAssets || (SupportedAssets = {}));
export var GroupByOptions;
(function (GroupByOptions) {
    GroupByOptions["TOKEN"] = "token";
    GroupByOptions["ADDRESS"] = "address";
    GroupByOptions["POLICY"] = "policy";
})(GroupByOptions || (GroupByOptions = {}));
export var WebhookEventTypes;
(function (WebhookEventTypes) {
    WebhookEventTypes["TRANSACTION_CREATED"] = "transaction.created";
    WebhookEventTypes["TRANSACTION_STATUS_UPDATED"] = "transaction.status.updated";
    WebhookEventTypes["TRANSACTION_APPROVAL_STATUS_UPDATED"] = "transaction.approval_status.updated";
    WebhookEventTypes["TRANSACTION_NETWORK_RECORDS_PROCESSING_COMPLETED"] = "transaction.network_records.processing_completed";
})(WebhookEventTypes || (WebhookEventTypes = {}));
export var RewardType;
(function (RewardType) {
    RewardType["LEADER"] = "leader";
    RewardType["MEMBER"] = "member";
    RewardType["RESERVES"] = "reserves";
    RewardType["TREASURY"] = "treasury";
    RewardType["REFUND"] = "refund";
})(RewardType || (RewardType = {}));
export var PoolStatus;
(function (PoolStatus) {
    PoolStatus["ACTIVE"] = "active";
    PoolStatus["RETIRING"] = "retiring";
    PoolStatus["RETRIED"] = "retried";
})(PoolStatus || (PoolStatus = {}));
/**
 * DRep kind enum matching Conway era specification
 */
export var DRepKind;
(function (DRepKind) {
    DRepKind[DRepKind["KEY_HASH"] = 0] = "KEY_HASH";
    DRepKind[DRepKind["SCRIPT_HASH"] = 1] = "SCRIPT_HASH";
    DRepKind[DRepKind["ALWAYS_ABSTAIN"] = 2] = "ALWAYS_ABSTAIN";
    DRepKind[DRepKind["ALWAYS_NO_CONFIDENCE"] = 3] = "ALWAYS_NO_CONFIDENCE";
})(DRepKind || (DRepKind = {}));
/**
 * Certificate types for Cardano staking and governance
 */
export var CertificateType;
(function (CertificateType) {
    // Pre-Conway era certificates (Shelley through Babbage)
    CertificateType[CertificateType["STAKE_KEY_REGISTRATION"] = 0] = "STAKE_KEY_REGISTRATION";
    CertificateType[CertificateType["STAKE_KEY_DEREGISTRATION"] = 1] = "STAKE_KEY_DEREGISTRATION";
    CertificateType[CertificateType["DELEGATION"] = 2] = "DELEGATION";
    // Conway era certificates
    CertificateType[CertificateType["STAKE_REGISTRATION"] = 7] = "STAKE_REGISTRATION";
    CertificateType[CertificateType["STAKE_DEREGISTRATION"] = 8] = "STAKE_DEREGISTRATION";
    CertificateType[CertificateType["VOTE_DELEGATION"] = 9] = "VOTE_DELEGATION";
    CertificateType[CertificateType["DREP_REGISTRATION"] = 16] = "DREP_REGISTRATION";
})(CertificateType || (CertificateType = {}));
/**
 * DRep (Delegated Representative) action types for Conway governance
 */
export var DRepAction;
(function (DRepAction) {
    DRepAction["ALWAYS_ABSTAIN"] = "always-abstain";
    DRepAction["ALWAYS_NO_CONFIDENCE"] = "always-no-confidence";
    DRepAction["CUSTOM_DREP"] = "custom-drep";
})(DRepAction || (DRepAction = {}));
export var StakingOperation;
(function (StakingOperation) {
    StakingOperation["REGISTER"] = "register";
    StakingOperation["DELEGATE"] = "delegate";
    StakingOperation["DEREGISTER"] = "deregister";
    StakingOperation["WITHDRAW_REWARDS"] = "withdraw-rewards";
    StakingOperation["VOTE_DELEGATE"] = "vote-delegate";
    StakingOperation["REGISTER_DREP"] = "register-drep";
    StakingOperation["CAST_VOTE"] = "cast-vote";
})(StakingOperation || (StakingOperation = {}));
//# sourceMappingURL=enums.js.map