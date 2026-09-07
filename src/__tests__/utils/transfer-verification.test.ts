import {
  EnterpriseAddress,
  Credential,
  Ed25519KeyHash,
  Transaction,
  TransactionWitnessSet,
} from "@emurgo/cardano-serialization-lib-nodejs";
import { blake2b } from "blakejs";
import {
  buildAdaTransactionWithCalculatedFee,
  buildCntTransactionWithCalculatedFee,
  buildMultiTokenTransactionWithCalculatedFee,
  buildConsolidationTransactionWithCalculatedFee,
  createTransactionInputs,
  submitTransaction,
  validateProtocolParameters,
} from "../../utils/cardano.js";
import {
  CardanoDataProvider,
  ProtocolParameterSnapshot,
  SdkApiError,
  UtxoData,
} from "../../types/index.js";
import { Logger, LogLevel } from "../../utils/logger.js";

const sender = EnterpriseAddress.new(
  0,
  Credential.from_keyhash(Ed25519KeyHash.from_hex("a".repeat(56)))
).to_address();
const recipient = EnterpriseAddress.new(
  0,
  Credential.from_keyhash(Ed25519KeyHash.from_hex("b".repeat(56)))
).to_address();
const policy = "c".repeat(56);
const selectedUtxos: UtxoData[] = [
  {
    transaction_id: "d".repeat(64),
    output_index: 0,
    address: sender.to_bech32(),
    value: { lovelace: 50000000, assets: { [`${policy}.00`]: 10 } },
    datum_hash: null,
    script_hash: null,
  },
];
const snapshot = (): ProtocolParameterSnapshot => ({
  networkMagic: 2,
  epoch: 1413,
  fetchedAt: Date.now(),
  minFeeA: 44,
  minFeeB: 155381,
  coinsPerUtxoByte: 4310,
  maxTxSize: 16384,
  keyDeposit: 2000000,
  poolDeposit: 500000000,
});
const build = (kind: string, protocolParameters?: ProtocolParameterSnapshot) => {
  const inputs = createTransactionInputs(selectedUtxos);
  const common = {
    senderAddress: sender,
    recipientAddress: recipient,
    selectedUtxos,
    protocolParameters,
  };
  if (kind === "CNT")
    return buildCntTransactionWithCalculatedFee(
      {
        ...common,
        requiredLovelace: 2000000,
        tokenPolicyId: policy,
        tokenName: "00",
        transferAmount: 1,
      },
      inputs,
      100000,
      1
    );
  if (kind === "multi")
    return buildMultiTokenTransactionWithCalculatedFee(
      { ...common, tokens: [{ tokenPolicyId: policy, tokenName: "00", amount: 1 }] },
      inputs,
      100000,
      1
    );
  if (kind === "consolidation")
    return buildConsolidationTransactionWithCalculatedFee(common, inputs, 100000, 1);
  return buildAdaTransactionWithCalculatedFee(
    { ...common, lovelaceAmount: 2000000 },
    inputs,
    100000,
    1
  );
};

describe("verified transfer construction", () => {
  beforeAll(() => Logger.setLogLevel(LogLevel.NONE));
  it.each(["ADA", "CNT", "multi", "consolidation"])(
    "%s uses supplied fees and returns exactly the fee encoded in its body",
    (kind) => {
      const first = build(kind, snapshot());
      const second = build(kind, { ...snapshot(), epoch: 1414, minFeeA: 88, minFeeB: 310762 });
      expect(first.fee).toBe(Number(first.txBody.fee().to_str()));
      expect(second.fee).toBe(Number(second.txBody.fee().to_str()));
      expect(second.fee).toBeGreaterThan(first.fee);
      const outputs = second.outputs.reduce(
        (sum, output) => sum + BigInt(output.amount().coin().to_str()),
        0n
      );
      expect(outputs + BigInt(second.fee)).toBe(50000000n);
    }
  );
  it("uses current byte cost for minimum ADA and rejects oversized transactions", () => {
    expect(() => build("ADA", { ...snapshot(), coinsPerUtxoByte: 50000 })).toThrow(
      "minimum required"
    );
    expect(() => build("ADA", { ...snapshot(), maxTxSize: 100 })).toThrow("maxTxSize");
    expect(() => build("ADA", { ...snapshot(), fetchedAt: Date.now() - 301000 })).toThrow(
      "expired"
    );
  });
  it("rejects wrong-network/missing/unsafe protocol snapshots", () => {
    expect(() => validateProtocolParameters(snapshot(), 1)).toThrow("network");
    expect(() => validateProtocolParameters({ ...snapshot(), minFeeA: NaN })).toThrow("Invalid");
    expect(() => validateProtocolParameters({} as ProtocolParameterSnapshot)).toThrow("Invalid");
  });
  it("keeps the legacy no-snapshot builder available", () => {
    const tx = build("ADA");
    expect(tx.fee).toBe(Number(tx.txBody.fee().to_str()));
  });
  it("binds successful submission to the actual body hash", async () => {
    const built = build("ADA", snapshot());
    const signed = Transaction.new(built.txBody, TransactionWitnessSet.new());
    const expected = Buffer.from(blake2b(built.txBody.to_bytes(), undefined, 32)).toString("hex");
    const submitTransfer = jest.fn(async () => ({
      success: true,
      data: { txHash: expected.toUpperCase() },
    }));
    const provider = { kind: "demeter", submitTransfer } as unknown as CardanoDataProvider;
    await expect(submitTransaction(provider, signed)).resolves.toBe(expected);
    submitTransfer.mockResolvedValue({ success: true, data: { txHash: "e".repeat(64) } });
    await expect(submitTransaction(provider, signed)).rejects.toThrow("hash mismatch");
  });
  it("reconciles duplicate submission only after lookup of the exact body hash", async () => {
    const built = build("ADA", snapshot());
    const signed = Transaction.new(built.txBody, TransactionWitnessSet.new());
    const expected = Buffer.from(blake2b(built.txBody.to_bytes(), undefined, 32)).toString("hex");
    const submitTransfer = jest.fn().mockRejectedValue(new SdkApiError("duplicate", 409));
    const getTransactionDetails = jest
      .fn()
      .mockResolvedValue({ success: true, data: { tx_hash: expected } });
    const provider = {
      kind: "demeter",
      submitTransfer,
      getTransactionDetails,
    } as unknown as CardanoDataProvider;
    await expect(submitTransaction(provider, signed)).resolves.toBe(expected);
    expect(getTransactionDetails).toHaveBeenCalledWith(expected);
    expect(submitTransfer).toHaveBeenCalledTimes(1);
    getTransactionDetails.mockResolvedValue(null);
    await expect(submitTransaction(provider, signed)).rejects.toThrow("outcome unknown");
    expect(submitTransfer).toHaveBeenCalledTimes(2);
  });
});
