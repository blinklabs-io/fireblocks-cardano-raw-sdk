import { z } from "zod";
import { ChainReadUnsupportedError } from "../types/chain-queries.js";
import { SdkApiError } from "../types/errors.js";
import type {
  ChainQueries,
  ChainReadOperation,
  ChainHistoryOptions,
  ChainPageOptions,
  ChainAssetDetails,
  ChainStakeAccount,
  CardanoDataProvider,
} from "../types/index.js";
import {
  hash,
  integer,
  quantity,
  metadata,
  parse,
  parseInput,
  pageOptions,
  historyOptions,
  paymentAddress,
  stakeAddress,
  poolId,
  unitSchema,
  fingerprint,
  isoTime,
  pageResult,
} from "./chain-query.validation.js";

type GetJson = (path: string, params?: Record<string, string | number>) => Promise<unknown>;
const segment = encodeURIComponent;

/** Indexed reads only. No pool validation, certificate creation or signing is implied. */
export class BlockfrostQueries implements ChainQueries {
  readonly supportedOperations: ReadonlySet<ChainReadOperation> = new Set([
    "address-history",
    "asset-details",
    "stake-account",
    "stake-addresses",
    "stake-rewards",
    "pool-metadata",
    "pool-delegators",
    "history-block-range",
  ]);
  constructor(
    private readonly get: GetJson,
    private readonly provider: Pick<CardanoDataProvider, "getFullTransactionDetails">
  ) {}

  private async read(
    operation: ChainReadOperation,
    path: string,
    params?: Record<string, string | number>
  ) {
    try {
      return await this.get(path, params);
    } catch (error) {
      if (error instanceof SdkApiError && error.statusCode === 501)
        throw new ChainReadUnsupportedError("demeter", operation, 501);
      if (error instanceof SdkApiError)
        throw new SdkApiError(
          `Demeter ${operation} read failed (HTTP ${error.statusCode ?? "unavailable"})`,
          error.statusCode,
          "ChainQueryFailed"
        );
      throw error;
    }
  }

  async addressHistory(address: string, options: ChainHistoryOptions = {}) {
    paymentAddress(address);
    const opts = parseInput(historyOptions, options, "history options");
    const params: Record<string, string | number> = {
      page: opts.page,
      count: opts.count,
      order: "desc",
    };
    if (opts.fromBlock !== undefined) params.from = opts.fromBlock;
    if (opts.toBlock !== undefined) params.to = opts.toBlock;
    const raw = parse(
      z.array(
        z.object({ tx_hash: hash, tx_index: integer, block_height: integer, block_time: integer })
      ),
      await this.read("address-history", `/addresses/${segment(address)}/transactions`, params),
      "address history"
    );
    for (let i = 0; i < raw.length; i++) {
      if (
        (opts.fromBlock !== undefined && raw[i].block_height < opts.fromBlock) ||
        (opts.toBlock !== undefined && raw[i].block_height > opts.toBlock) ||
        (i > 0 &&
          (raw[i].block_height > raw[i - 1].block_height ||
            (raw[i].block_height === raw[i - 1].block_height &&
              raw[i].tx_index >= raw[i - 1].tx_index)))
      ) {
        throw new Error("History ordering or block filter was not respected");
      }
    }
    const result = pageResult(
      raw.map((item) => ({
        txHash: item.tx_hash,
        blockHeight: item.block_height,
        transactionIndex: item.tx_index,
        blockTime: isoTime(item.block_time),
      })),
      opts,
      (item) => item.txHash,
      null,
      "desc"
    );
    if (opts.details === "none") return result;
    // Bounded sequential hydration: at most 25 transactions, no unbounded fan-out.
    const items = [];
    for (const item of result.items) {
      const response = await this.provider.getFullTransactionDetails?.(item.txHash);
      if (
        !response?.success ||
        response.data.tx_hash !== item.txHash ||
        response.data.utxosComplete !== true ||
        response.data.block_no !== item.blockHeight ||
        response.data.block_time !== item.blockTime
      ) {
        throw new Error("Incomplete or inconsistent retained transaction history");
      }
      items.push({ ...item, details: response.data });
    }
    return { ...result, items };
  }

  async assetDetails(inputUnit: string): Promise<ChainAssetDetails> {
    const unit = parseInput(unitSchema, inputUnit, "asset unit");
    const raw = parse(
      z.object({
        asset: unitSchema,
        policy_id: z.string(),
        asset_name: z.string().nullable(),
        fingerprint: z.string(),
        quantity,
        initial_mint_tx_hash: z.union([hash, z.literal("")]),
        mint_or_burn_count: integer,
        onchain_metadata: metadata,
        metadata,
      }),
      await this.read("asset-details", `/assets/${segment(unit)}`),
      "asset details"
    );
    if (
      raw.asset !== unit ||
      raw.policy_id.toLowerCase() !== unit.slice(0, 56) ||
      (raw.asset_name ?? "").toLowerCase() !== unit.slice(56) ||
      raw.fingerprint !== fingerprint(unit)
    ) {
      throw new Error("Asset identity or fingerprint mismatch");
    }
    return {
      unit,
      policyId: unit.slice(0, 56),
      assetNameHex: unit.slice(56),
      fingerprint: raw.fingerprint,
      supply: raw.quantity,
      firstMintTx: raw.initial_mint_tx_hash || null,
      mintOrBurnCount: raw.mint_or_burn_count,
      mintCount: null,
      burnCount: null,
      onchainMetadata: raw.onchain_metadata,
      registryMetadata: raw.metadata,
      providerMetadata: null,
      providerMetadataSource: null,
    };
  }

  async stakeAccount(input: string): Promise<ChainStakeAccount> {
    const address = stakeAddress(input);
    const raw = parse(
      z.object({
        stake_address: z.string(),
        active: z.boolean(),
        registered: z.boolean().optional(),
        active_epoch: integer.nullable(),
        controlled_amount: quantity,
        rewards_sum: quantity,
        withdrawals_sum: quantity,
        withdrawable_amount: quantity,
        pool_id: z.string().nullable(),
        drep_id: z.string().nullable().optional(),
      }),
      await this.read("stake-account", `/accounts/${segment(address)}`),
      "stake account"
    );
    if (raw.stake_address !== address) throw new Error("Stake account identity mismatch");
    return {
      stakeAddress: address,
      active: raw.active,
      registered: raw.registered ?? null,
      activeEpoch: raw.active_epoch,
      controlledAmount: raw.controlled_amount,
      activeStake: null,
      rewardsSum: raw.rewards_sum,
      withdrawnRewards: raw.withdrawals_sum,
      availableRewards: raw.withdrawable_amount,
      poolId: raw.pool_id === null ? null : poolId(raw.pool_id),
      drepId: raw.drep_id ?? null,
    };
  }

  async stakeAddresses(input: string, options: ChainPageOptions = {}) {
    const address = stakeAddress(input);
    const opts = parseInput(pageOptions, options, "page options");
    const raw = parse(
      z.array(z.object({ address: z.string() })),
      await this.read("stake-addresses", `/accounts/${segment(address)}/addresses`, opts),
      "stake addresses"
    );
    return pageResult(
      raw.map((item) => paymentAddress(item.address)),
      opts,
      (item) => item
    );
  }

  async stakeRewards(input: string, options: ChainPageOptions = {}) {
    const address = stakeAddress(input);
    const opts = parseInput(pageOptions, options, "page options");
    const raw = parse(
      z.array(
        z.object({ epoch: integer, amount: quantity, pool_id: z.string(), type: z.string().min(1) })
      ),
      await this.read("stake-rewards", `/accounts/${segment(address)}/rewards`, opts),
      "stake rewards"
    );
    const items = raw.map((item) => ({
      epoch: item.epoch,
      amount: item.amount,
      poolId: poolId(item.pool_id),
      type: item.type,
    }));
    return pageResult(items, opts, (item) => `${item.epoch}:${item.poolId}:${item.type}`);
  }

  async poolMetadata(input: string) {
    const id = poolId(input);
    const raw = parse(
      z.object({
        pool_id: z.string(),
        name: z.string().nullable(),
        ticker: z.string().nullable(),
        description: z.string().nullable(),
        homepage: z.string().nullable(),
      }),
      await this.read("pool-metadata", `/pools/${segment(id)}/metadata`),
      "pool metadata"
    );
    if (poolId(raw.pool_id) !== id) throw new Error("Pool metadata identity mismatch");
    return {
      poolId: id,
      name: raw.name,
      ticker: raw.ticker,
      description: raw.description,
      homepage: raw.homepage,
    };
  }

  async poolDelegators(input: string, options: ChainPageOptions = {}) {
    const id = poolId(input);
    const opts = parseInput(pageOptions, options, "page options");
    const raw = parse(
      z.array(z.object({ address: z.string(), live_stake: quantity })),
      await this.read("pool-delegators", `/pools/${segment(id)}/delegators`, opts),
      "pool delegators"
    );
    return pageResult(
      raw.map((item) => ({
        stakeAddress: stakeAddress(item.address),
        amount: item.live_stake,
        amountKind: "live-stake" as const,
        activeEpoch: null,
      })),
      opts,
      (item) => item.stakeAddress
    );
  }
}
