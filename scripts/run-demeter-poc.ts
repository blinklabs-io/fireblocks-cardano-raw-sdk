import { readFileSync } from "node:fs";
import {
  Address,
  BaseAddress,
  Bip32PrivateKey,
  Credential,
  TransactionHash,
  TransactionWitnessSet,
  Vkeywitnesses,
  make_vkey_witness,
} from "@emurgo/cardano-serialization-lib-nodejs";
import { BasePath } from "@fireblocks/ts-sdk";
import { blake2b } from "blakejs";
import bip39 from "bip39";
import dotenv from "dotenv";
import { FireblocksCardanoRawSDK } from "../src/FireblocksCardanoRawSDK.js";
import { CardanoAmounts } from "../src/constants.js";
import { DemeterBlockfrostProvider } from "../src/services/index.js";
import { Networks } from "../src/types/index.js";
import {
  buildAdaTransactionWithCalculatedFee,
  calculateTtl,
  createTransactionInputs,
  fetchAndSelectUtxosForAda,
} from "../src/utils/index.js";

dotenv.config({ path: process.env.CARDANO_ENV_FILE || ".env.development" });

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const enabled = (name: string): boolean => process.env[name] === "1";

const transferAmount = (): number => {
  const value = Number(process.env.LIVE_TRANSFER_LOVELACE || "2000000");
  if (!Number.isSafeInteger(value) || value < 1_000_000 || value > 5_000_000) {
    throw new Error("LIVE_TRANSFER_LOVELACE must be an integer between 1000000 and 5000000");
  }
  return value;
};

const parseNetwork = (): Networks => {
  const value = (process.env.CARDANO_NETWORK || "preview").toLowerCase();
  if (value === Networks.MAINNET) return Networks.MAINNET;
  if (value === Networks.PREPROD) return Networks.PREPROD;
  if (value === Networks.PREVIEW) return Networks.PREVIEW;
  throw new Error(`Unsupported CARDANO_NETWORK '${process.env.CARDANO_NETWORK}'`);
};

const resolveSecretKey = (): string => {
  const direct = process.env.FIREBLOCKS_API_USER_SECRET_KEY?.trim();
  if (direct) {
    if (direct.startsWith("-----BEGIN")) return direct.replace(/\\n/g, "\n");
    const decoded = Buffer.from(direct, "base64").toString("utf8");
    if (decoded.startsWith("-----BEGIN")) return decoded;
    throw new Error("FIREBLOCKS_API_USER_SECRET_KEY is not PEM or base64-encoded PEM");
  }
  return readFileSync(required("FIREBLOCKS_API_USER_SECRET_KEY_PATH"), "utf8");
};

const derivePaymentKey = (mnemonic: string): Bip32PrivateKey => {
  if (!bip39.validateMnemonic(mnemonic)) throw new Error("CARDANO_MNEMONIC is invalid");
  const entropy = Buffer.from(bip39.mnemonicToEntropy(mnemonic), "hex");
  const harden = (index: number) => 0x80000000 + index;
  return Bip32PrivateKey.from_bip39_entropy(entropy, new Uint8Array())
    .derive(harden(1852))
    .derive(harden(1815))
    .derive(harden(0))
    .derive(0)
    .derive(0);
};

const assertPaymentKeyMatchesAddress = (
  paymentKey: Bip32PrivateKey,
  mnemonic: string,
  expectedAddress: string
): void => {
  const root = Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(bip39.mnemonicToEntropy(mnemonic), "hex"),
    new Uint8Array()
  );
  const harden = (index: number) => 0x80000000 + index;
  const account = root.derive(harden(1852)).derive(harden(1815)).derive(harden(0));
  const stake = account.derive(2).derive(0).to_public().to_raw_key();
  const expected = Address.from_bech32(expectedAddress);
  const paymentCredential = Credential.from_keyhash(paymentKey.to_public().to_raw_key().hash());
  const stakeCredential = Credential.from_keyhash(stake.hash());
  const derived = BaseAddress.new(
    expected.network_id(),
    paymentCredential,
    stakeCredential
  ).to_address();
  if (derived.to_bech32() !== expectedAddress) {
    throw new Error("CARDANO_MNEMONIC does not derive CARDANO_ADDRESS_1");
  }
};

const createProvider = () =>
  new DemeterBlockfrostProvider({
    baseUrl: required("DEMETER_BLOCKFROST_URL"),
    apiKey: required("DEMETER_API_KEY"),
  });

const runMock = async (): Promise<void> => {
  if (!enabled("RUN_LIVE_DEMETER")) {
    throw new Error("Set RUN_LIVE_DEMETER=1 to allow the live read-only Demeter proof");
  }

  const provider = createProvider();
  const senderAddress = required("CARDANO_ADDRESS_1");
  const recipientAddress = required("CARDANO_ADDRESS_2");
  const mnemonic = required("CARDANO_MNEMONIC");
  const lovelaceAmount = transferAmount();

  const health = await provider.checkHealth();
  if (!health.success) throw new Error("Demeter Blockfrost health check failed");
  const balance = await provider.getBalanceByAddress({
    address: senderAddress,
    groupByPolicy: false,
  });
  const utxoResult = await fetchAndSelectUtxosForAda({
    chainProvider: provider,
    address: senderAddress,
    lovelaceAmount,
    transactionFee: CardanoAmounts.ESTIMATED_MAX_FEE,
  });
  const ttl = calculateTtl(await provider.getCurrentSlot());
  const inputs = createTransactionInputs(utxoResult.selectedUtxos);
  const recipient = Address.from_bech32(recipientAddress);
  const sender = Address.from_bech32(senderAddress);
  const built = buildAdaTransactionWithCalculatedFee(
    {
      lovelaceAmount,
      recipientAddress: recipient,
      senderAddress: sender,
      selectedUtxos: utxoResult.selectedUtxos,
    },
    inputs,
    ttl,
    1
  );

  const paymentKey = derivePaymentKey(mnemonic);
  assertPaymentKeyMatchesAddress(paymentKey, mnemonic, senderAddress);
  const hashBytes = Uint8Array.from(blake2b(built.txBody.to_bytes(), undefined, 32));
  const txHash = TransactionHash.from_bytes(hashBytes);
  const rawKey = paymentKey.to_raw_key();
  const signature = rawKey.sign(hashBytes);
  const publicKey = rawKey.to_public();
  if (!publicKey.verify(hashBytes, signature)) {
    throw new Error("Local mock witness verification failed");
  }

  const witness = make_vkey_witness(txHash, rawKey);
  const witnesses = Vkeywitnesses.new();
  witnesses.add(witness);
  const witnessSet = TransactionWitnessSet.new();
  witnessSet.set_vkeys(witnesses);

  console.log("Demeter mock-custody POC succeeded (no transaction was broadcast).");
  console.log(
    JSON.stringify(
      {
        network: parseNetwork(),
        balanceLovelace: balance.data.lovelace,
        selectedUtxos: utxoResult.selectedUtxos.length,
        transferLovelace: lovelaceAmount,
        feeLovelace: built.fee,
        witnessVerified: true,
      },
      null,
      2
    )
  );
};

const waitForConfirmation = async (
  provider: DemeterBlockfrostProvider,
  txHash: string
): Promise<void> => {
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    if (await provider.getTransactionDetails(txHash)) return;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`Transaction ${txHash} was not confirmed within five minutes`);
};

const runFireblocks = async (): Promise<void> => {
  if (!enabled("RUN_LIVE_FIREBLOCKS")) {
    throw new Error("Set RUN_LIVE_FIREBLOCKS=1 to authorize real signing and broadcast");
  }
  const network = parseNetwork();
  if (network !== Networks.PREVIEW) {
    throw new Error("The live POC is restricted to CARDANO_NETWORK=Preview");
  }
  const provider = createProvider();
  const sdk = await FireblocksCardanoRawSDK.createInstance({
    fireblocksConfig: {
      apiKey: required("FIREBLOCKS_API_USER_KEY"),
      secretKey: resolveSecretKey(),
      basePath: (process.env.FIREBLOCKS_BASE_PATH || BasePath.US) as BasePath,
    },
    vaultAccountId: required("FIREBLOCKS_VAULT_ACCOUNT_ID"),
    network,
    chainProvider: {
      type: "demeter",
      baseUrl: required("DEMETER_BLOCKFROST_URL"),
      apiKey: required("DEMETER_API_KEY"),
    },
  });

  try {
    const result = await sdk.transferAda({
      recipientAddress: required("CARDANO_ADDRESS_2"),
      lovelaceAmount: transferAmount(),
    });
    await waitForConfirmation(provider, result.txHash);
    console.log(`Fireblocks/Demeter POC confirmed transaction ${result.txHash}`);
  } finally {
    await sdk.shutdown();
  }
};

const mode = (process.env.CUSTODY_MODE || "mock").toLowerCase();
if (mode === "mock") {
  await runMock();
} else if (mode === "fireblocks") {
  await runFireblocks();
} else {
  throw new Error("CUSTODY_MODE must be 'mock' or 'fireblocks'");
}
