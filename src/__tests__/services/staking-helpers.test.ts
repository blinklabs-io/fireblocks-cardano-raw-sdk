jest.mock("cbor2", () => ({
  encode: jest.fn(() => new Uint8Array([0])),
  decode: jest.fn(),
}));
jest.mock("jose", () => ({ createRemoteJWKSet: jest.fn(), compactVerify: jest.fn() }));

import type { FireblocksService } from "../../services/fireblocks.service.js";
import type { IagonApiService } from "../../services/iagon.api.service.js";
import { StakeAddressResolver } from "../../services/staking/helpers/address-resolver.helper.js";
import { RegistrationVerifier } from "../../services/staking/helpers/registration-verifier.helper.js";
import { RewardsQueryService } from "../../services/staking/helpers/rewards-query.helper.js";
import { StakingValidator } from "../../services/staking/helpers/staking-validator.helper.js";
import {
  TransactionBuilder,
  TransactionSubmitter,
} from "../../services/staking/helpers/transaction-builder.helper.js";
import { TransactionLogger } from "../../services/staking/helpers/transaction-logger.helper.js";
import { TransactionSigner } from "../../services/staking/helpers/transaction-signer.helper.js";
import { UtxoProvider } from "../../services/staking/helpers/utxo-provider.helper.js";
import type {
  INetworkConfiguration,
  IStakeAddressResolver,
} from "../../services/staking/types/staking.interfaces.js";
import { CardanoAmounts } from "../../constants.js";
import { Networks, SupportedAssets } from "../../types/index.js";
import type { ErrorHandler } from "../../utils/errorHandler.js";
import type { Logger } from "../../utils/logger.js";

const loggerFixture = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const networkConfig: INetworkConfiguration = {
  network: Networks.PREVIEW,
  assetId: SupportedAssets.ADA_TEST,
  isMainnet: () => false,
};

describe("staking helpers", () => {
  afterEach(() => jest.useRealTimers());

  it("selects BASE addresses by default or BIP44 index and reports missing addresses", async () => {
    const fireblocksService = {
      getVaultAccountAddresses: jest.fn().mockResolvedValue([
        { address: "enterprise", addressFormat: "ENTERPRISE", bip44AddressIndex: 0 },
        { address: "base-3", addressFormat: "BASE", bip44AddressIndex: 3 },
        { address: "base-7", addressFormat: "BASE", bip44AddressIndex: 7 },
      ]),
    } as unknown as FireblocksService;
    const resolver = new StakeAddressResolver(
      fireblocksService,
      networkConfig,
      loggerFixture() as unknown as Logger
    );

    await expect(resolver.getBaseAddress("vault-1")).resolves.toEqual({
      address: "base-3",
      addressIndex: 3,
    });
    await expect(resolver.getBaseAddress("vault-1", 7)).resolves.toEqual({
      address: "base-7",
      addressIndex: 7,
    });
    await expect(resolver.getBaseAddress("vault-1", 99)).rejects.toMatchObject({
      errorType: "NO_BASE_ADDRESS",
      statusCode: 400,
    });
  });

  it("queries rewards and caps withdrawals", async () => {
    const iagonApiService = {
      getStakeAccountInfo: jest.fn().mockResolvedValue({
        data: {
          available_rewards: "5000000",
          rewards_sum: "7000000",
          withdrawn_rewards: "2000000",
        },
      }),
      getStakeAccountRewards: jest.fn().mockResolvedValue({
        data: [{ pool_id: "pool-1", amount: "123", epoch: 42 }],
      }),
    } as unknown as IagonApiService;
    const service = new RewardsQueryService(iagonApiService, loggerFixture() as unknown as Logger);

    await expect(service.queryRewards("stake-test")).resolves.toEqual({
      rewards: [{ poolId: "pool-1", amount: "123", epoch: 42 }],
      availableRewards: 5_000_000,
      totalRewards: 7_000_000,
      totalWithdrawals: 2_000_000,
    });
    const result = await service.getWithdrawals(
      "stake-test",
      Buffer.from([1, 2, 3]),
      2_000_000,
      false
    );
    expect(result.rewardAmount).toBe(2_000_000);
    expect(result.withdrawal.reward).toBe(2_000_000);
    expect(result.withdrawal.certificate.subarray(-3)).toEqual(Buffer.from([1, 2, 3]));
  });

  it("handles zero available rewards without inventing a withdrawal amount", async () => {
    const logger = loggerFixture();
    const service = new RewardsQueryService(
      {
        getStakeAccountInfo: jest.fn().mockResolvedValue({
          data: { available_rewards: "0", rewards_sum: "0", withdrawn_rewards: "0" },
        }),
        getStakeAccountRewards: jest.fn().mockResolvedValue({ data: [] }),
      } as unknown as IagonApiService,
      logger as unknown as Logger
    );

    await expect(
      service.getWithdrawals("stake-test", Buffer.from([1]), 2_000_000, true)
    ).resolves.toMatchObject({ rewardAmount: 0, withdrawal: { reward: 0 } });
    expect(logger.info).toHaveBeenCalledWith("No rewards to withdraw");
  });

  it("validates registration and delegation prerequisites", async () => {
    const logger = loggerFixture();
    const addressResolver = {
      getStakeAddress: jest.fn().mockResolvedValue("stake-test"),
    } as unknown as IStakeAddressResolver;
    const getStakeAccountInfo = jest.fn().mockResolvedValue({
      data: { active: true, pool_id: "pool-1" },
    });
    const getPoolInfo = jest.fn().mockResolvedValue({ data: { pool_id: "pool-1" } });
    const validator = new StakingValidator(
      { getStakeAccountInfo, getPoolInfo } as unknown as IagonApiService,
      addressResolver,
      logger as unknown as Logger
    );

    await expect(validator.checkRegistrationStatus("vault-1")).resolves.toBe(true);
    await expect(validator.validateRegistrationStatus("vault-1", true)).resolves.toBeUndefined();
    await expect(
      validator.validateDelegationPrerequisites("vault-1", "pool-1")
    ).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith("Already delegated to pool pool-1");
    expect(getPoolInfo).toHaveBeenCalledWith("pool-1");

    getStakeAccountInfo.mockResolvedValue({ data: { active: false, pool_id: null } });
    await expect(validator.validateRegistrationStatus("vault-1", true)).rejects.toMatchObject({
      errorType: "NOT_REGISTERED",
    });
    await expect(
      validator.validateDelegationPrerequisites("vault-1", "pool-2")
    ).rejects.toMatchObject({ errorType: "NOT_REGISTERED" });
    await expect(validator.validateRegistrationStatus("vault-1", false)).resolves.toBeUndefined();

    (addressResolver.getStakeAddress as jest.Mock).mockRejectedValueOnce(new Error("not found"));
    await expect(validator.checkRegistrationStatus("vault-1")).resolves.toBe(false);
  });

  it("verifies registration in the background and contains background failures", async () => {
    jest.useFakeTimers();
    const logger = loggerFixture();
    const getStakeAccountInfo = jest
      .fn()
      .mockResolvedValueOnce({ data: { active: true, active_epoch: 123 } })
      .mockRejectedValueOnce(new Error("provider unavailable"));
    const verifier = new RegistrationVerifier(
      { getStakeAccountInfo } as unknown as IagonApiService,
      logger as unknown as Logger
    );

    verifier.verifyAsync("stake-test");
    await jest.runAllTimersAsync();
    expect(logger.info).toHaveBeenCalledWith("Registration verified! Stake key is active.");

    verifier.verifyAsync("stake-test");
    await jest.runAllTimersAsync();
    expect(logger.warn).toHaveBeenCalledWith("Background registration verification failed");
  });

  it("computes TTLs, submits signed transactions, and logs transaction dimensions", async () => {
    const logger = loggerFixture();
    const submitTransfer = jest.fn().mockResolvedValue({
      success: true,
      data: { txHash: "a".repeat(64) },
    });
    const iagonApiService = {
      getCurrentEpoch: jest.fn().mockResolvedValue({ data: { tip: { slot: 1234 } } }),
      submitTransfer,
    } as unknown as IagonApiService;
    const builder = new TransactionBuilder(
      iagonApiService,
      networkConfig,
      logger as unknown as Logger
    );
    const submitter = new TransactionSubmitter(iagonApiService);
    const transactionLogger = new TransactionLogger(logger as unknown as Logger);

    await expect(builder.getCurrentTtl()).resolves.toBe(1234 + CardanoAmounts.TX_TTL_SECS);
    await expect(submitter.submitTransaction(Buffer.from("00a1", "hex"), false)).resolves.toEqual({
      success: true,
      data: { txHash: "a".repeat(64) },
    });
    expect(submitTransfer).toHaveBeenCalledWith("00a1", false);

    transactionLogger.logTransactionDetails(
      Buffer.alloc(10),
      Buffer.from("ab", "hex"),
      [{ pubKey: Buffer.alloc(32), signature: Buffer.alloc(64) }],
      Buffer.alloc(20)
    );
    expect(logger.info).toHaveBeenCalledWith("Serialized transaction body size: 10 CBOR bytes");
    expect(logger.info).toHaveBeenCalledWith("Final signed transaction size: 20 CBOR bytes");
  });

  it("builds raw-signing requests and maps signatures to witnesses", async () => {
    const logger = loggerFixture();
    const signTransaction = jest.fn().mockResolvedValue({
      data: [
        { publicKey: "11".repeat(32), signature: { fullSig: "22".repeat(64) } },
        { publicKey: "33".repeat(32), signature: { fullSig: "44".repeat(64) } },
      ],
    });
    const getAssetPublicKey = jest
      .fn()
      .mockResolvedValueOnce("payment-public-key")
      .mockResolvedValueOnce("stake-public-key");
    const handleApiError = jest.fn((error: unknown) => error);
    const signer = new TransactionSigner(
      { signTransaction, getAssetPublicKey } as unknown as FireblocksService,
      networkConfig,
      logger as unknown as Logger,
      { handleApiError } as unknown as ErrorHandler
    );
    const context = {
      txHash: "ab".repeat(32),
      vaultAccountId: "vault-1",
      operation: "registration",
      addressIndex: 7,
    };

    const witnesses = await signer.signTransaction(context);
    expect(witnesses).toEqual([
      {
        pubKey: Buffer.from("11".repeat(32), "hex"),
        signature: Buffer.from("22".repeat(64), "hex"),
      },
      {
        pubKey: Buffer.from("33".repeat(32), "hex"),
        signature: Buffer.from("44".repeat(64), "hex"),
      },
    ]);
    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: SupportedAssets.ADA_TEST,
        source: expect.objectContaining({ id: "vault-1" }),
        extraParameters: {
          rawMessageData: {
            messages: [
              { content: context.txHash, bip44addressIndex: 7 },
              { content: context.txHash, bip44change: 2 },
            ],
          },
        },
      })
    );
    expect(getAssetPublicKey).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith("Expected payment key: payment-public-key");
    expect(handleApiError).not.toHaveBeenCalled();
  });

  it("rejects null or incomplete signing responses through the error handler", async () => {
    const handleApiError = jest.fn((error: unknown) => error);
    const signTransaction = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ data: [] });
    const signer = new TransactionSigner(
      { signTransaction } as unknown as FireblocksService,
      networkConfig,
      loggerFixture() as unknown as Logger,
      { handleApiError } as unknown as ErrorHandler
    );
    const context = {
      txHash: "ab".repeat(32),
      vaultAccountId: "vault-1",
      operation: "registration",
      addressIndex: 0,
    };

    await expect(signer.signTransaction(context)).rejects.toMatchObject({
      errorType: "NULL_RESPONSE",
    });
    await expect(signer.signTransaction(context)).rejects.toMatchObject({
      errorType: "INVALID_SIGNATURE_COUNT",
    });
    expect(handleApiError).toHaveBeenCalledTimes(2);
  });

  it("selects a pure-ADA UTxO and reports unavailable funds", async () => {
    const getVaultAccountAddresses = jest.fn().mockResolvedValue([
      { address: "enterprise", addressFormat: "ENTERPRISE", bip44AddressIndex: 0 },
      { address: "base-address", addressFormat: "BASE", bip44AddressIndex: 3 },
    ]);
    const getUtxosByAddress = jest.fn().mockResolvedValue({
      data: [
        {
          transaction_id: "a".repeat(64),
          output_index: 1,
          value: { lovelace: 3_000_000, assets: {} },
        },
      ],
    });
    const provider = new UtxoProvider(
      { getVaultAccountAddresses } as unknown as FireblocksService,
      { getUtxosByAddress } as unknown as IagonApiService,
      networkConfig,
      loggerFixture() as unknown as Logger
    );

    await expect(provider.findAddressWithSuitableUtxo("vault-1", 2_000_000)).resolves.toEqual({
      address: "base-address",
      addressIndex: 3,
      utxo: {
        txHash: "a".repeat(64),
        indexInTx: 1,
        nativeAmount: 3_000_000,
      },
    });

    getVaultAccountAddresses.mockResolvedValueOnce([]);
    await expect(provider.findAddressWithSuitableUtxo("vault-1", 2_000_000)).rejects.toMatchObject({
      errorType: "NO_ADDRESSES",
    });

    getUtxosByAddress.mockResolvedValueOnce({ data: [] });
    await expect(provider.findAddressWithSuitableUtxo("vault-1", 2_000_000)).rejects.toMatchObject({
      errorType: "INSUFFICIENT_PURE_ADA",
      errorInfo: { vaultAccountId: "vault-1", requiredAmount: 2_000_000 },
    });
  });
});
