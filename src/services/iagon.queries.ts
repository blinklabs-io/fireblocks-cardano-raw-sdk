import { z } from "zod";
import type { IagonApiService } from "./iagon.api.service.js";
import { ChainReadUnsupportedError } from "../types/chain-queries.js";
import type {
  ChainQueries,
  ChainReadOperation,
  ChainHistoryOptions,
  ChainPageOptions,
  ChainAssetDetails,
  ChainStakeAccount,
} from "../types/chain-queries.js";
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
  pageResult,
} from "./chain-query.validation.js";

const envelope = <T>(schema: z.ZodType<T>, value: unknown, context: string): T =>
  parse(z.object({ success: z.literal(true), data: schema }), value, context).data;
const total = (value: unknown) =>
  parse(z.object({ pagination: z.object({ total: integer }) }), value, "IAGON pagination")
    .pagination.total;
const dateTime = z.string().refine((s) => Number.isFinite(Date.parse(s)), "Invalid timestamp");

/** Translation only: existing IAGON methods and response types are left unchanged. */
export class IagonQueries implements ChainQueries {
  readonly supportedOperations: ReadonlySet<ChainReadOperation> = new Set([
    "address-history",
    "asset-details",
    "stake-account",
    "stake-addresses",
    "stake-rewards",
    "pool-metadata",
    "pool-delegators",
  ]);
  constructor(private readonly provider: IagonApiService) {}

  async addressHistory(address: string, options: ChainHistoryOptions = {}) {
    paymentAddress(address);
    const opts = parseInput(historyOptions, options, "history options");
    if (opts.fromBlock !== undefined || opts.toBlock !== undefined)
      throw new ChainReadUnsupportedError("iagon", "history-block-range");
    const params = { address, limit: opts.count, offset: (opts.page - 1) * opts.count };
    const response =
      opts.details === "full"
        ? await this.provider.getDetailedTxHistory(params)
        : await this.provider.getTransactionHistory(params);
    const raw = envelope(
      z.array(z.object({ tx_hash: hash, block_no: integer, block_time: dateTime })),
      response,
      "IAGON history"
    );
    const result = pageResult(
      raw.map((item) => ({
        txHash: item.tx_hash,
        blockHeight: item.block_no,
        blockTime: new Date(item.block_time).toISOString(),
        transactionIndex: null,
      })),
      opts,
      (item) => item.txHash,
      total(response)
    );
    if (opts.details === "none") return result;
    const value = z.object({ lovelace: integer, assets: z.record(z.string(), integer).optional() });
    const detailed = envelope(
      z.array(
        z.object({
          tx_hash: hash,
          block_hash: hash,
          block_no: integer,
          slot_no: integer,
          block_time: dateTime,
          fee: integer,
          size: integer,
          inputs: z
            .array(z.object({ tx_hash: hash, output_index: integer, address: z.string(), value }))
            .min(1),
          outputs: z.array(z.object({ output_index: integer, address: z.string(), value })).min(1),
        })
      ),
      response,
      "IAGON full history"
    );
    return {
      ...result,
      items: result.items.map((item, i) => ({
        ...item,
        details: { ...detailed[i], utxosComplete: true },
      })),
    };
  }

  async assetDetails(inputUnit: string): Promise<ChainAssetDetails> {
    const unit = parseInput(unitSchema, inputUnit, "asset unit");
    const raw = envelope(
      z.object({
        policy_id: z.string(),
        asset_name: z.string(),
        fingerprint: z.string(),
        total_supply: quantity,
        first_mint_tx: hash,
        mint_count: integer,
        burn_count: integer,
        metadata,
        metadata_source: z.string().nullable(),
      }),
      await this.provider.getAssetInfo(unit.slice(0, 56), unit.slice(56), true),
      "IAGON asset details"
    );
    if (
      (raw.policy_id + raw.asset_name).toLowerCase() !== unit ||
      raw.fingerprint !== fingerprint(unit)
    )
      throw new Error("Asset identity or fingerprint mismatch");
    return {
      unit,
      policyId: unit.slice(0, 56),
      assetNameHex: unit.slice(56),
      fingerprint: raw.fingerprint,
      supply: raw.total_supply,
      firstMintTx: raw.first_mint_tx,
      mintOrBurnCount: null,
      mintCount: raw.mint_count,
      burnCount: raw.burn_count,
      onchainMetadata: null,
      registryMetadata: null,
      providerMetadata: raw.metadata,
      providerMetadataSource: raw.metadata_source,
    };
  }

  async stakeAccount(input: string): Promise<ChainStakeAccount> {
    const address = stakeAddress(input);
    const raw = envelope(
      z.object({
        stake_address: z.string(),
        active: z.boolean(),
        active_epoch: integer.nullable(),
        active_stake: quantity,
        rewards_sum: quantity,
        withdrawn_rewards: quantity,
        available_rewards: quantity,
        pool_id: z.string().nullable(),
        drep_id: z.string().nullable(),
      }),
      await this.provider.getStakeAccountInfo(address),
      "IAGON stake account"
    );
    if (raw.stake_address !== address) throw new Error("Stake account identity mismatch");
    return {
      stakeAddress: address,
      active: raw.active,
      registered: null,
      activeEpoch: raw.active_epoch,
      controlledAmount: null,
      activeStake: raw.active_stake,
      rewardsSum: raw.rewards_sum,
      withdrawnRewards: raw.withdrawn_rewards,
      availableRewards: raw.available_rewards,
      poolId: raw.pool_id === null ? null : poolId(raw.pool_id),
      drepId: raw.drep_id,
    };
  }

  async stakeAddresses(input: string, options: ChainPageOptions = {}) {
    const address = stakeAddress(input);
    const opts = parseInput(pageOptions, options, "page options");
    const response = await this.provider.getPaymentAddresses(
      address,
      opts.count,
      (opts.page - 1) * opts.count
    );
    const raw = envelope(
      z.array(z.object({ address: z.string() })),
      response,
      "IAGON stake addresses"
    );
    return pageResult(
      raw.map((item) => paymentAddress(item.address)),
      opts,
      (item) => item,
      total(response)
    );
  }

  async stakeRewards(input: string, options: ChainPageOptions = {}) {
    const address = stakeAddress(input);
    const opts = parseInput(pageOptions, options, "page options");
    const response = await this.provider.getStakeAccountRewards(
      address,
      (opts.page - 1) * opts.count,
      opts.count
    );
    const raw = envelope(
      z.array(
        z.object({
          epoch: integer,
          amount: quantity,
          pool_id: z.string(),
          reward_type: z.string().min(1),
        })
      ),
      response,
      "IAGON rewards"
    );
    return pageResult(
      raw.map((item) => ({
        epoch: item.epoch,
        amount: item.amount,
        poolId: poolId(item.pool_id),
        type: item.reward_type,
      })),
      opts,
      (item) => `${item.epoch}:${item.poolId}:${item.type}`,
      total(response)
    );
  }

  async poolMetadata(input: string) {
    const id = poolId(input);
    const raw = envelope(
      z.object({
        pool_id: z.string(),
        name: z.string().nullable(),
        ticker: z.string().nullable(),
        description: z.string().nullable(),
        homepage: z.string().nullable(),
      }),
      await this.provider.getPoolMetadata(id),
      "IAGON pool metadata"
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
    const response = await this.provider.getPoolDelegatorsList(
      id,
      opts.count,
      (opts.page - 1) * opts.count
    );
    const raw = envelope(
      z.object({
        pool_id: z.string(),
        delegators: z.array(
          z.object({ stake_address: z.string(), amount: quantity, active_epoch_no: integer })
        ),
      }),
      response,
      "IAGON delegators"
    );
    if (poolId(raw.pool_id) !== id) throw new Error("Pool delegator identity mismatch");
    return pageResult(
      raw.delegators.map((item) => ({
        stakeAddress: stakeAddress(item.stake_address),
        amount: item.amount,
        amountKind: "provider-reported" as const,
        activeEpoch: item.active_epoch_no,
      })),
      opts,
      (item) => item.stakeAddress,
      total(response)
    );
  }
}
