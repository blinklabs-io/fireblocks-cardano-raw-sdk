const mockGetVaultAccountAssetAddressesPaginated = jest.fn();

jest.mock("cbor2", () => ({ encode: jest.fn(), decode: jest.fn() }));
jest.mock("jose", () => ({ createRemoteJWKSet: jest.fn(), compactVerify: jest.fn() }));

jest.mock("@fireblocks/ts-sdk", () => {
  const actual = jest.requireActual("@fireblocks/ts-sdk");
  return {
    ...actual,
    Fireblocks: jest.fn().mockImplementation(() => ({
      vaults: {
        getVaultAccountAssetAddressesPaginated: mockGetVaultAccountAssetAddressesPaginated,
      },
    })),
  };
});

import { BasePath } from "@fireblocks/ts-sdk";
import { FireblocksCardanoRawSDK } from "../FireblocksCardanoRawSDK.js";
import { IagonApiService } from "../services/iagon.api.service.js";
import {
  ChainProviderCapability,
  Networks,
  ProviderCapabilityError,
  SupportedAssets,
} from "../types/index.js";
import { Logger, LogLevel } from "../utils/logger.js";

describe("FireblocksCardanoRawSDK provider compatibility", () => {
  beforeAll(() => Logger.setLogLevel(LogLevel.NONE));

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVaultAccountAssetAddressesPaginated.mockResolvedValue({
      data: {
        addresses: [
          {
            address: "addr_test1source",
            bip44AddressIndex: 0,
          },
        ],
      },
    });
  });

  const baseConfig = {
    fireblocksConfig: {
      apiKey: "fireblocks-test-key",
      secretKey: "fireblocks-test-secret",
      basePath: BasePath.US,
    },
    vaultAccountId: "vault-1",
    network: Networks.PREVIEW,
  };

  it("preserves deprecated iagonApiKey initialization and maps Preview to ADA_TEST", async () => {
    const sdk = await FireblocksCardanoRawSDK.createInstance({
      ...baseConfig,
      iagonApiKey: "iagon-test-key",
    });

    expect(sdk.getIagonApiService()).toBeInstanceOf(IagonApiService);
    expect(mockGetVaultAccountAssetAddressesPaginated).toHaveBeenCalledWith({
      vaultAccountId: "vault-1",
      assetId: SupportedAssets.ADA_TEST,
    });

    const health = jest.fn().mockResolvedValue({
      success: true,
      data: { status: "healthy", timestamp: "2026-01-01T00:00:00.000Z" },
    });
    sdk.getIagonApiService().checkHealth = health;
    await expect(sdk.checkIagonHealth()).resolves.toMatchObject({ success: true });
    expect(health).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing IAGON ADA transfer path", async () => {
    const sdk = await FireblocksCardanoRawSDK.createInstance({
      ...baseConfig,
      chainProvider: { type: "iagon", apiKey: "iagon-test-key" },
    });
    const createTransfer = jest.fn().mockResolvedValue({
      txHash: "a".repeat(64),
      networkFee: "0.170000",
    });
    sdk.getFireblocksService().createTransfer = createTransfer;

    await expect(
      sdk.transferAda({
        recipientAddress: "addr_test1recipient",
        lovelaceAmount: 2_000_000,
      })
    ).resolves.toEqual({
      txHash: "a".repeat(64),
      senderAddress: "addr_test1source",
      recipientAddress: "addr_test1recipient",
      lovelaceAmount: 2_000_000,
      fee: { lovelace: "170000", ada: "0.170000" },
    });
    expect(createTransfer).toHaveBeenCalledWith({
      assetId: SupportedAssets.ADA_TEST,
      sourceVaultAccountId: "vault-1",
      amount: "2.000000",
      recipientAddress: "addr_test1recipient",
      recipientVaultAccountId: undefined,
    });
  });

  it("selects Demeter and reports unsupported IAGON-only capabilities", async () => {
    const sdk = await FireblocksCardanoRawSDK.createInstance({
      ...baseConfig,
      chainProvider: {
        type: "demeter",
        baseUrl: "https://cardano-preview.blockfrost-m1.demeter.run",
        apiKey: "demeter-test-key",
      },
    });

    expect(() => sdk.getIagonApiService()).toThrow(
      new ProviderCapabilityError("demeter", ChainProviderCapability.IAGON_COMPATIBILITY)
    );
    await expect(sdk.getTransactionHistory()).rejects.toMatchObject({
      name: "ProviderCapabilityError",
      provider: "demeter",
      capability: ChainProviderCapability.HISTORY,
    });
  });
});
