/** Strict controls applied to a Fireblocks RAW-signing ADA transfer. */
export interface FireblocksGovernanceRequirements {
  /** Caller-generated idempotency and audit identifier sent to Fireblocks. */
  externalTxId: string;
  /** Exact Cardano recipients this operation is allowed to use. */
  allowedRecipientAddresses: string[];
  /** Hard upper bound checked against the locally calculated Cardano fee. */
  maxFeeLovelace: number;
  /** Minimum distinct approved authorizers required in Fireblocks TAP evidence. */
  minimumApprovals: number;
  /** Minimum Fireblocks signers required in the completed signing response. */
  minimumSigners: number;
  /** Fireblocks user IDs permitted to appear in the terminal signedBy evidence. */
  allowedSignerIds: string[];
}

export interface GovernanceAuthorizationGroupEvidence {
  threshold: number;
  approved: number;
  pending: number;
  rejected: number;
  notApplicable: number;
  satisfied: boolean;
}

/** Sanitized evidence returned after Fireblocks governance and Cardano submission. */
export interface FireblocksGovernanceEvidence {
  externalTxId: string;
  fireblocksTransactionId: string;
  fireblocksStatus: string;
  chainProvider: "demeter";
  submittedTransactionHash: string;
  transactionBodyHash: string;
  signedMessageHash: string;
  matchedPolicy: {
    authorizationInfoPresent: true;
    evidenceSource: "fireblocks-authorization-info";
    logic: string;
    allowOperatorAsAuthorizer: boolean;
    groups: GovernanceAuthorizationGroupEvidence[];
    approvedAuthorizers: number;
    signerCount: number;
    designatedSignerEvidencePresent: true;
    configuredDesignatedSignerCount: number;
    allSignersDesignated: true;
    minimumApprovals: number;
    minimumSigners: number;
    requirementsSatisfied: true;
  };
  preflight: {
    network: string;
    recipientAllowed: true;
    amountLovelace: number;
    feeLovelace: number;
    maxFeeLovelace: number;
    inputCount: number;
    inputLovelace: number;
    outputCount: number;
    recipientLovelace: number;
    changeLovelace: number;
    assetsPreserved: true;
  };
  signatureVerified: true;
  signerMatchesSource: true;
  transactionBodyUnchanged: true;
  demeterSubmissionHashMatchesBody: true;
}
