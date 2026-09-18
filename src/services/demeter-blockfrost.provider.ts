import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { z } from "zod";
import {
  BalanceResponse,
  CardanoDataProvider,
  ChainProviderCapability,
  DetailedTransaction,
  GroupedBalanceResponse,
  HealthStatusResponse,
  SdkApiError,
  TransactionDetailsResponse,
  TransferResponse,
  UtxoData,
  UtxoIagonResponse,
  getBalanceByAddressOpts,
  ProtocolParameterSnapshot,
} from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { BlockfrostQueries } from "./blockfrost.queries.js";
import type { ChainQueries } from "../types/chain-queries.js";

const hashSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/)
  .transform((hash) => hash.toLowerCase());
const safeIntegerSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amountSchema = z.object({
  unit: z.string().min(1),
  quantity: z.string().regex(/^\d+$/),
});

const addressSchema = z.object({
  address: z.string(),
  amount: z.array(amountSchema),
});

const utxoSchema = z.object({
  tx_hash: hashSchema,
  output_index: safeIntegerSchema,
  address: z.string(),
  amount: z.array(amountSchema),
  block: hashSchema.optional(),
  data_hash: z.string().nullable().optional(),
  reference_script_hash: z.string().nullable().optional(),
});

const txSchema = z.object({
  hash: hashSchema,
  block: hashSchema,
  block_height: safeIntegerSchema,
  slot: safeIntegerSchema,
  block_time: safeIntegerSchema.max(8_640_000_000_000),
  fees: z.string().regex(/^\d+$/),
  size: safeIntegerSchema,
});

const healthSchema = z.object({
  is_healthy: z.boolean(),
});

const blockSchema = z.object({
  slot: safeIntegerSchema,
});

const genesisSchema = z.object({
  network_magic: safeIntegerSchema,
});

const transactionHashSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/)
  .transform((hash) => hash.toLowerCase());

export interface DemeterBlockfrostProviderOptions {
  baseUrl: string;
  apiKey: string;
  maxRetries?: number;
  pageSize?: number;
  /** Fail closed if a wallet scan exceeds this bound. */
  maxPages?: number;
  axiosInstance?: AxiosInstance;
}

/** Core Cardano provider backed by a Demeter-hosted Blockfrost gateway. */
export class DemeterBlockfrostProvider implements CardanoDataProvider {
  public readonly queries: ChainQueries = new BlockfrostQueries(async (path, params) => {
    const response = await this.request(() => this.client.get(path, { params }), "indexed query");
    return response.data;
  }, this);
  public readonly kind = "demeter" as const;
  public readonly capabilities = new Set([ChainProviderCapability.CORE]);

  private readonly logger = new Logger("services:demeter-blockfrost");
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;
  private readonly pageSize: number;
  private readonly maxPages: number;

  constructor(options: DemeterBlockfrostProviderOptions) {
    const configuredUrl = options.baseUrl;
    let end = configuredUrl?.length ?? 0;
    while (end > 0 && configuredUrl?.charAt(end - 1) === "/") end--;
    const baseUrl = configuredUrl?.slice(0, end);
    if (!baseUrl) {
      throw new Error("DEMETER_BLOCKFROST_URL is required");
    }
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      throw new Error("DEMETER_BLOCKFROST_URL must be a valid absolute URL");
    }
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsedBaseUrl.hostname);
    if (
      parsedBaseUrl.protocol !== "https:" &&
      !(parsedBaseUrl.protocol === "http:" && isLoopback)
    ) {
      throw new Error(
        "DEMETER_BLOCKFROST_URL must use HTTPS (HTTP is allowed only for loopback tests)"
      );
    }
    if (parsedBaseUrl.username || parsedBaseUrl.password) {
      throw new Error("DEMETER_BLOCKFROST_URL must not contain embedded credentials");
    }
    if (parsedBaseUrl.search || parsedBaseUrl.hash) {
      throw new Error("DEMETER_BLOCKFROST_URL must not contain a query or fragment");
    }
    if (!options.apiKey?.trim()) {
      throw new Error("DEMETER_API_KEY is required");
    }

    this.maxRetries = options.maxRetries ?? 2;
    this.pageSize = options.pageSize ?? 100;
    this.maxPages = options.maxPages ?? 1_000;
    if (!Number.isInteger(this.maxPages) || this.maxPages < 1 || this.maxPages > 10_000) {
      throw new Error("Demeter Blockfrost maxPages must be an integer between 1 and 10000");
    }
    if (!Number.isInteger(this.maxRetries) || this.maxRetries < 0 || this.maxRetries > 10) {
      throw new Error("Demeter Blockfrost maxRetries must be an integer between 0 and 10");
    }
    if (!Number.isInteger(this.pageSize) || this.pageSize < 1 || this.pageSize > 100) {
      throw new Error("Demeter Blockfrost pageSize must be an integer between 1 and 100");
    }

    this.client =
      options.axiosInstance ??
      axios.create({
        baseURL: baseUrl,
        timeout: 30_000,
        // Never forward the authentication header to a redirect destination.
        maxRedirects: 0,
        headers: { "dmtr-api-key": options.apiKey.trim() },
      });
  }

  public async checkHealth(): Promise<HealthStatusResponse> {
    try {
      const response = await this.request(() => this.client.get("/health"), "health check");
      const health = this.parseResponse(healthSchema, response.data, "health check");
      return {
        success: health.is_healthy,
        data: {
          status: health.is_healthy ? "healthy" : "unhealthy",
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.warn(`Demeter health check failed: ${this.errorMessage(error)}`);
      return {
        success: false,
        data: { status: "unhealthy", timestamp: new Date().toISOString() },
      };
    }
  }

  public async getBalanceByAddress(
    params: getBalanceByAddressOpts
  ): Promise<BalanceResponse | GroupedBalanceResponse> {
    const response = await this.request(
      () => this.client.get(`/addresses/${encodeURIComponent(params.address)}`),
      `balance for address ${params.address}`
    );
    const data = this.parseResponse(addressSchema, response.data, "address balance");
    if (data.address !== params.address)
      throw new Error("Balance address does not match requested address");
    return this.toBalanceResponse(data.amount, params.groupByPolicy);
  }

  public async getUtxosByAddress(address: string): Promise<UtxoIagonResponse> {
    const utxos: UtxoData[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= this.maxPages; page++) {
      let response: AxiosResponse;
      try {
        response = await this.request(
          () =>
            this.client.get(`/addresses/${encodeURIComponent(address)}/utxos`, {
              params: { count: this.pageSize, page, order: "asc" },
            }),
          `UTxOs for address ${address}`
        );
      } catch (error) {
        if (this.statusCode(error) === 404 && page === 1) {
          return { success: true, data: [] };
        }
        throw error;
      }

      const pageData = this.parseResponse(z.array(utxoSchema), response.data, "address UTxOs");
      if (pageData.length > this.pageSize) throw new Error("UTxO page exceeds requested count");
      for (const utxo of pageData) {
        const id = `${utxo.tx_hash}#${utxo.output_index}`;
        if (seen.has(id)) throw new Error("Duplicate UTxO or repeated page; scan is incomplete");
        if (utxo.address !== address)
          throw new Error("UTxO address does not match requested address");
        seen.add(id);
      }
      utxos.push(...pageData.map((utxo) => this.toUtxo(utxo)));
      if (pageData.length < this.pageSize) return { success: true, data: utxos };
    }
    throw new Error("UTxO scan exceeded maxPages; refusing incomplete wallet state");
  }

  public async getCurrentSlot(): Promise<number> {
    const response = await this.request(() => this.client.get("/blocks/latest"), "latest block");
    return this.parseResponse(blockSchema, response.data, "latest block").slot;
  }

  /** Unlike /health, this exposes the chain tip time so callers can check freshness. */
  public async getChainTip(): Promise<{
    slot: number;
    height: number;
    time: number;
    hash: string;
  }> {
    const response = await this.request(() => this.client.get("/blocks/latest"), "chain tip");
    return this.parseResponse(
      z.object({
        slot: safeIntegerSchema,
        height: safeIntegerSchema,
        time: safeIntegerSchema,
        hash: hashSchema,
      }),
      response.data,
      "chain tip"
    );
  }

  /** Read the Cardano network identifier from the provider's genesis data. */
  public async getNetworkMagic(): Promise<number> {
    const response = await this.request(() => this.client.get("/genesis"), "genesis");
    return this.parseResponse(genesisSchema, response.data, "genesis").network_magic;
  }

  /** No long-lived cache: fetch a new snapshot for each build, including network identity. */
  public async getProtocolParameters(): Promise<ProtocolParameterSnapshot> {
    const [networkMagic, response] = await Promise.all([
      this.getNetworkMagic(),
      this.request(() => this.client.get("/epochs/latest/parameters"), "protocol parameters"),
    ]);
    const data = this.parseResponse(
      z.object({
        epoch: safeIntegerSchema,
        min_fee_a: safeIntegerSchema,
        min_fee_b: safeIntegerSchema,
        max_tx_size: safeIntegerSchema.positive(),
        coins_per_utxo_size: z.string().regex(/^\d+$/),
        key_deposit: z.string().regex(/^\d+$/),
        pool_deposit: z.string().regex(/^\d+$/),
      }),
      response.data,
      "protocol parameters"
    );
    const coinsPerUtxoByte = this.safeQuantity(data.coins_per_utxo_size, "coins per UTxO byte");
    if (coinsPerUtxoByte === 0) throw new Error("UTxO byte cost must be positive");
    return {
      networkMagic,
      fetchedAt: Date.now(),
      epoch: data.epoch,
      minFeeA: data.min_fee_a,
      minFeeB: data.min_fee_b,
      maxTxSize: data.max_tx_size,
      coinsPerUtxoByte,
      keyDeposit: this.safeQuantity(data.key_deposit, "key deposit"),
      poolDeposit: this.safeQuantity(data.pool_deposit, "pool deposit"),
    };
  }

  public async submitTransfer(tx: string): Promise<TransferResponse> {
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(tx)) {
      throw new Error("Signed transaction must be non-empty hexadecimal CBOR");
    }
    const response = await this.request(
      () =>
        this.client.post("/tx/submit", Buffer.from(tx, "hex"), {
          headers: { "Content-Type": "application/cbor" },
        }),
      "transaction submission",
      false
    );
    const txHash = this.parseResponse(
      transactionHashSchema,
      response.data,
      "transaction submission"
    );
    return { success: true, data: { txHash } };
  }

  public async getTransactionDetails(hash: string): Promise<TransactionDetailsResponse | null> {
    const requestedHash = this.parseResponse(hashSchema, hash, "requested transaction hash");
    try {
      const response = await this.request(
        () => this.client.get(`/txs/${encodeURIComponent(hash)}`),
        `transaction ${hash}`
      );
      const tx = this.parseResponse(txSchema, response.data, "transaction details");
      if (tx.hash !== requestedHash)
        throw new Error("Transaction hash does not match requested hash");
      const data: DetailedTransaction = {
        tx_hash: tx.hash,
        block_hash: tx.block,
        slot_no: tx.slot,
        block_no: tx.block_height,
        block_time: new Date(tx.block_time * 1000).toISOString(),
        fee: this.safeQuantity(tx.fees, "transaction fee"),
        size: tx.size,
        inputs: [],
        outputs: [],
        utxosComplete: false,
      };
      return { success: true, data };
    } catch (error) {
      if (this.statusCode(error) === 404) return null;
      throw error;
    }
  }

  /** Fetch real inputs and outputs. A missing/pruned UTxO response is an error, not an empty success. */
  public async getFullTransactionDetails(hash: string): Promise<TransactionDetailsResponse | null> {
    const details = await this.getTransactionDetails(hash);
    if (!details) return null;
    const response = await this.request(
      () => this.client.get(`/txs/${encodeURIComponent(hash)}/utxos`),
      "transaction UTxOs"
    );
    const valueSchema = z.object({
      address: z.string().min(1),
      output_index: safeIntegerSchema,
      amount: z.array(amountSchema),
      collateral: z.boolean(),
      reference: z.boolean().optional(),
    });
    const data = this.parseResponse(
      z.object({
        hash: hashSchema,
        inputs: z.array(valueSchema.extend({ tx_hash: hashSchema })).min(1),
        outputs: z.array(valueSchema).min(1),
      }),
      response.data,
      "transaction UTxOs"
    );
    if (data.hash !== details.data.tx_hash) throw new Error("Transaction UTxO hash mismatch");
    const inputIds = data.inputs.map((input) => `${input.tx_hash}#${input.output_index}`);
    const outputIds = data.outputs.map((output) => output.output_index);
    if (
      new Set(inputIds).size !== inputIds.length ||
      new Set(outputIds).size !== outputIds.length
    ) {
      throw new Error("Duplicate transaction input or output");
    }
    return {
      success: true,
      data: {
        ...details.data,
        utxosComplete: true,
        inputs: data.inputs.map((input) => ({
          tx_hash: input.tx_hash,
          output_index: input.output_index,
          address: input.address,
          value: (this.toBalanceResponse(input.amount, false) as BalanceResponse).data,
          collateral: input.collateral,
          reference: input.reference,
        })),
        outputs: data.outputs.map((output) => ({
          output_index: output.output_index,
          address: output.address,
          value: (this.toBalanceResponse(output.amount, false) as BalanceResponse).data,
          collateral: output.collateral,
        })),
      },
    };
  }

  private toBalanceResponse(
    amounts: z.infer<typeof amountSchema>[],
    groupByPolicy: boolean
  ): BalanceResponse | GroupedBalanceResponse {
    let lovelace = 0;
    const flatAssets: Record<string, number> = {};
    const groupedAssets: Record<string, Record<string, number>> = {};
    const seen = new Set<string>();

    for (const amount of amounts) {
      const normalizedUnit = amount.unit.toLowerCase();
      if (seen.has(normalizedUnit)) throw new Error("Duplicate Blockfrost amount unit");
      seen.add(normalizedUnit);
      const quantity = this.safeQuantity(amount.quantity, `asset ${amount.unit}`);
      if (amount.unit === "lovelace") {
        lovelace = quantity;
        continue;
      }
      const { policyId, assetName, internalUnit } = this.assetParts(amount.unit);
      flatAssets[internalUnit] = quantity;
      groupedAssets[policyId] ??= {};
      groupedAssets[policyId][assetName] = quantity;
    }

    return {
      success: true,
      data: { lovelace, assets: groupByPolicy ? groupedAssets : flatAssets },
    } as BalanceResponse | GroupedBalanceResponse;
  }

  private toUtxo(utxo: z.infer<typeof utxoSchema>): UtxoData {
    const balance = this.toBalanceResponse(utxo.amount, false) as BalanceResponse;
    return {
      transaction_id: utxo.tx_hash,
      output_index: utxo.output_index,
      address: utxo.address,
      value: balance.data,
      datum_hash: utxo.data_hash ?? null,
      script_hash: utxo.reference_script_hash ?? null,
      created_at: utxo.block ? { header_hash: utxo.block } : undefined,
    };
  }

  private assetParts(unit: string): {
    policyId: string;
    assetName: string;
    internalUnit: string;
  } {
    if (
      unit.length < 56 ||
      unit.length > 120 ||
      unit.length % 2 !== 0 ||
      !/^[0-9a-fA-F]+$/.test(unit)
    ) {
      throw new Error("Invalid Blockfrost asset unit");
    }
    const policyId = unit.slice(0, 56).toLowerCase();
    const assetName = unit.slice(56).toLowerCase();
    return { policyId, assetName, internalUnit: `${policyId}.${assetName}` };
  }

  private safeQuantity(value: string, context: string): number {
    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error(`Unsafe numeric quantity for ${context}: ${value}`);
    }
    return quantity;
  }

  private parseResponse<T>(schema: z.ZodType<T>, value: unknown, context: string): T {
    const result = schema.safeParse(value);
    if (result.success) return result.data;

    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
      .join("; ");
    throw new SdkApiError(
      `Invalid Demeter Blockfrost ${context} response: ${issues}`,
      502,
      "InvalidProviderResponse",
      undefined,
      "DemeterBlockfrostProvider"
    );
  }

  private async request<T>(
    operation: () => Promise<AxiosResponse<T>>,
    context: string,
    retry = true
  ) {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!retry || !this.isRetryable(error) || attempt === this.maxRetries) break;
        const retryAfter = Number((error as AxiosError).response?.headers?.["retry-after"]);
        const delayMs = Number.isFinite(retryAfter)
          ? Math.max(0, Math.min(retryAfter * 1000, 5_000))
          : Math.min(250 * 3 ** attempt, 5_000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    const status = this.statusCode(lastError);
    throw new SdkApiError(
      `Demeter Blockfrost ${context} failed (HTTP ${status ?? "unavailable"})`,
      status,
      undefined,
      undefined,
      "DemeterBlockfrostProvider"
    );
  }

  private isRetryable(error: unknown): boolean {
    const status = this.statusCode(error);
    return status === undefined || [425, 429, 500, 502, 503, 504].includes(status);
  }

  private statusCode(error: unknown): number | undefined {
    if (error instanceof SdkApiError) return error.statusCode;
    return (error as AxiosError | undefined)?.response?.status;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
