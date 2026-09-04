jest.mock("cbor2", () => ({ encode: jest.fn(), decode: jest.fn() }));
jest.mock("jose", () => ({ createRemoteJWKSet: jest.fn(), compactVerify: jest.fn() }));

import {
  BaseAddress,
  Credential,
  PrivateKey,
  Transaction,
} from "@emurgo/cardano-serialization-lib-nodejs";
import { blake2b } from "blakejs";
import { FireblocksCardanoRawSDK } from "../FireblocksCardanoRawSDK.js";
import { FireblocksService } from "../services/fireblocks.service.js";
import {
  CardanoDataProvider,
  ChainProviderCapability,
  Networks,
  UtxoData,
} from "../types/index.js";
import { Logger, LogLevel } from "../utils/logger.js";

const addressFor = (paymentKey: PrivateKey, stakeKey: PrivateKey): string =>
  BaseAddress.new(
    0,
    Credential.from_keyhash(paymentKey.to_public().hash()),
    Credential.from_keyhash(stakeKey.to_public().hash())
  )
    .to_address()
    .to_bech32();

describe("Fireblocks governed ADA transfer", () => {
  beforeAll(() => Logger.setLogLevel(LogLevel.NONE));

  const createHarness = (
    authorizationStatus: "APPROVED" | "PENDING_AUTHORIZATION" = "APPROVED",
    signerId = "designated-signer",
    transactionResponseId = "fireblocks-tx-123",
    fireblocksStatus = "COMPLETED",
    invalidSignature = false
  ) => {
    const paymentKey = PrivateKey.generate_ed25519();
    const stakeKey = PrivateKey.generate_ed25519();
    const recipientPaymentKey = PrivateKey.generate_ed25519();
    const recipientStakeKey = PrivateKey.generate_ed25519();
    const senderAddress = addressFor(paymentKey, stakeKey);
    const recipientAddress = addressFor(recipientPaymentKey, recipientStakeKey);
    const selectedUtxo: UtxoData = {
      transaction_id: "a".repeat(64),
      output_index: 0,
      address: senderAddress,
      value: { lovelace: 10_000_000, assets: {} },
      datum_hash: null,
      script_hash: null,
    };

    const submitTransfer = jest.fn(async (cborHex: string) => {
      const transaction = Transaction.from_hex(cborHex);
      const body = transaction.body();
      const hash = Buffer.from(blake2b(body.to_bytes(), undefined, 32)).toString("hex");
      return { success: true as const, data: { txHash: hash } };
    });
    const provider: CardanoDataProvider = {
      kind: "demeter",
      capabilities: new Set([ChainProviderCapability.CORE]),
      checkHealth: jest.fn(async () => ({
        success: true,
        data: { status: "healthy", timestamp: new Date().toISOString() },
      })),
      getBalanceByAddress: jest.fn(async () => ({
        success: true,
        data: { lovelace: 10_000_000, assets: {} },
      })),
      getUtxosByAddress: jest.fn(async () => ({ success: true, data: [selectedUtxo] })),
      getCurrentSlot: jest.fn(async () => 12_000_000),
      submitTransfer,
      getTransactionDetails: jest.fn(async () => null),
    };

    const signTransaction = jest.fn(async (payload: any) => {
      const content = payload.extraParameters.rawMessageData.messages[0].content as string;
      const signature = (invalidSignature ? PrivateKey.generate_ed25519() : paymentKey).sign(
        Buffer.from(content, "hex")
      );
      return {
        id: "fireblocks-tx-123",
        data: [
          {
            content,
            publicKey: paymentKey.to_public().to_hex(),
            signature: { fullSig: signature.to_hex() },
          },
        ],
        transaction: {
          id: transactionResponseId,
          externalTxId: payload.externalTxId,
          status: fireblocksStatus,
          signedBy: [signerId],
          authorizationInfo: {
            logic: "AND",
            allowOperatorAsAuthorizer: false,
            groups: [
              {
                th: 1,
                users: { "approval-user": authorizationStatus },
              },
            ],
          },
        },
      };
    });
    const fireblocksService = {
      getVaultAccountAddress: jest.fn(async () => ({
        address: senderAddress,
        bip44AddressIndex: 0,
      })),
      signTransaction,
    } as unknown as FireblocksService;

    const sdk = new FireblocksCardanoRawSDK({
      vaultAccountId: "vault-1",
      fireblocksService,
      chainProvider: provider,
      network: Networks.PREVIEW,
      logger: new Logger("governance-test"),
    });

    return { sdk, senderAddress, recipientAddress, signTransaction, submitTransfer };
  };

  it("correlates preflight, Fireblocks policy evidence, signature, and Cardano hash", async () => {
    const harness = createHarness();
    const result = await harness.sdk.transferAda({
      recipientAddress: harness.recipientAddress,
      lovelaceAmount: 2_000_000,
      governance: {
        externalTxId: "cardano-governance-test-001",
        allowedRecipientAddresses: [harness.recipientAddress],
        maxFeeLovelace: 200_000,
        minimumApprovals: 1,
        minimumSigners: 1,
        allowedSignerIds: ["designated-signer"],
      },
    });

    expect(result.governance).toMatchObject({
      externalTxId: "cardano-governance-test-001",
      fireblocksTransactionId: "fireblocks-tx-123",
      fireblocksStatus: "COMPLETED",
      transactionBodyHash: result.txHash,
      signedMessageHash: result.txHash,
      signatureVerified: true,
      signerMatchesSource: true,
      transactionBodyUnchanged: true,
      demeterSubmissionHashMatchesBody: true,
      matchedPolicy: {
        authorizationInfoPresent: true,
        approvedAuthorizers: 1,
        signerCount: 1,
        configuredDesignatedSignerCount: 1,
        allSignersDesignated: true,
        requirementsSatisfied: true,
      },
      preflight: {
        network: Networks.PREVIEW,
        recipientAllowed: true,
        amountLovelace: 2_000_000,
        inputCount: 1,
        outputCount: 2,
        assetsPreserved: true,
      },
    });
    expect(harness.signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        externalTxId: "cardano-governance-test-001",
        operation: "RAW",
      })
    );
    expect(harness.submitTransfer).toHaveBeenCalledTimes(1);
  });

  it("blocks a recipient outside the local governance allowlist before signing", async () => {
    const harness = createHarness();
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-002",
          allowedRecipientAddresses: [harness.senderAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceRecipientBlocked" });
    expect(harness.signTransaction).not.toHaveBeenCalled();
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });

  it("refuses to submit when Fireblocks approval evidence is insufficient", async () => {
    const harness = createHarness("PENDING_AUTHORIZATION");
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-003",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceApprovalInsufficient" });
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });

  it("blocks a fee above the local governance ceiling before Fireblocks", async () => {
    const harness = createHarness();
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-004",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 1,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceFeeBlocked" });
    expect(harness.signTransaction).not.toHaveBeenCalled();
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });

  it("refuses submission when the required signer quorum is not present", async () => {
    const harness = createHarness();
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-005",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 2,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceApprovalInsufficient" });
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });

  it("refuses submission when Fireblocks reports an undesignated signer", async () => {
    const harness = createHarness("APPROVED", "unexpected-signer");
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-006",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceApprovalInsufficient" });
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });

  it("rejects a Demeter submission hash that differs from the signed body", async () => {
    const harness = createHarness();
    harness.submitTransfer.mockResolvedValueOnce({
      success: true,
      data: { txHash: "c".repeat(64) },
    });
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-007",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceCorrelationError" });
  });

  it("rejects mismatched Fireblocks response IDs before submission", async () => {
    const harness = createHarness(
      "APPROVED",
      "designated-signer",
      "different-fireblocks-transaction"
    );
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-008",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceCorrelationError" });
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });

  it("requires Fireblocks COMPLETED status before submission", async () => {
    const harness = createHarness(
      "APPROVED",
      "designated-signer",
      "fireblocks-tx-123",
      "BROADCASTING"
    );
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-009",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "GovernanceAuthorizationIncomplete" });
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });

  it("rejects a Fireblocks signature that does not verify against the body", async () => {
    const harness = createHarness(
      "APPROVED",
      "designated-signer",
      "fireblocks-tx-123",
      "COMPLETED",
      true
    );
    await expect(
      harness.sdk.transferAda({
        recipientAddress: harness.recipientAddress,
        lovelaceAmount: 2_000_000,
        governance: {
          externalTxId: "cardano-governance-test-010",
          allowedRecipientAddresses: [harness.recipientAddress],
          maxFeeLovelace: 200_000,
          minimumApprovals: 1,
          minimumSigners: 1,
          allowedSignerIds: ["designated-signer"],
        },
      })
    ).rejects.toMatchObject({ errorType: "SignatureVerificationError" });
    expect(harness.submitTransfer).not.toHaveBeenCalled();
  });
});
