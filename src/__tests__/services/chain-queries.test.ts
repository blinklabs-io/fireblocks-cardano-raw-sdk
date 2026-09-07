jest.mock("cbor2", () => ({ encode: jest.fn(), decode: jest.fn() }));
jest.mock("jose", () => ({ createRemoteJWKSet: jest.fn(), compactVerify: jest.fn() }));

import http, { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { bech32 } from "bech32";
import { blake2b } from "blakejs";
import { DemeterBlockfrostProvider } from "../../services/demeter-blockfrost.provider.js";
import { IagonApiService } from "../../services/iagon.api.service.js";
import { FireblocksCardanoRawSDK } from "../../FireblocksCardanoRawSDK.js";
import type { FireblocksService } from "../../services/fireblocks.service.js";
import { Networks, ChainProviderCapability, ChainReadUnsupportedError } from "../../types/index.js";
import { Logger, LogLevel } from "../../utils/logger.js";
import { collectChainPages } from "../../utils/chain-queries.js";

const encode = (prefix: string, hex: string) =>
  bech32.encode(prefix, bech32.toWords(Buffer.from(hex, "hex")));
const address = encode("addr_test", "60" + "a".repeat(56));
const stake = encode("stake_test", "e0" + "b".repeat(56));
const pool = encode("pool", "c".repeat(56));
const unit = "d".repeat(56) + "00";
const fingerprint = bech32.encode(
  "asset",
  bech32.toWords(blake2b(Buffer.from(unit, "hex"), undefined, 20))
);
const hash = "a".repeat(64);
const block = "b".repeat(64);
const supply = "900719925474099300000";
const envelope = (data: unknown, total = 1) => ({ success: true, data, pagination: { total } });
const blockTime = "2023-11-14T22:13:20.000Z";
const detailed = {
  tx_hash: hash,
  block_hash: block,
  block_no: 10,
  slot_no: 20,
  block_time: blockTime,
  fee: 170000,
  size: 300,
  inputs: [{ tx_hash: "c".repeat(64), output_index: 0, address, value: { lovelace: 3000000 } }],
  outputs: [{ output_index: 0, address, value: { lovelace: 2830000 } }],
};

describe("public SDK indexed-query contracts", () => {
  let server: http.Server;
  let baseUrl: string;
  let handler: (req: IncomingMessage, res: ServerResponse) => void;
  const requests: string[] = [];
  const json = (res: ServerResponse, data: unknown, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };
  beforeAll(async () => {
    Logger.setLogLevel(LogLevel.NONE);
    server = http.createServer((req, res) => {
      requests.push(req.url!);
      handler(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  beforeEach(() => {
    requests.length = 0;
  });

  const sdkFor = (kind: "demeter" | "iagon") => {
    const provider =
      kind === "demeter"
        ? new DemeterBlockfrostProvider({ baseUrl, apiKey: "fixture-key" })
        : new IagonApiService("fixture-key", Networks.PREVIEW);
    if (kind === "iagon") Object.defineProperty(provider, "iagonBaseUrl", { value: baseUrl });
    const fireblocks = new Proxy(
      {},
      {
        get: () => {
          throw new Error("Unexpected custody call during indexed read");
        },
      }
    ) as FireblocksService;
    return {
      provider,
      sdk: new FireblocksCardanoRawSDK({
        chainProvider: provider,
        fireblocksService: fireblocks,
        vaultAccountId: "unused",
        network: Networks.PREVIEW,
        logger: new Logger("query-test"),
      }),
    };
  };

  it.each(["wrong-unit", "wrong-fingerprint", "negative-supply", "missing-metadata"])(
    "rejects %s asset responses",
    async (mutation) => {
      const raw: Record<string, unknown> = {
        asset: unit,
        policy_id: unit.slice(0, 56),
        asset_name: "00",
        fingerprint,
        quantity: supply,
        initial_mint_tx_hash: hash,
        mint_or_burn_count: 1,
        onchain_metadata: null,
        metadata: null,
      };
      if (mutation === "wrong-unit") raw.asset = "e".repeat(56);
      if (mutation === "wrong-fingerprint") raw.fingerprint = "asset1invalid";
      if (mutation === "negative-supply") raw.quantity = "-1";
      if (mutation === "missing-metadata") delete raw.metadata;
      handler = (_req, res) => json(res, raw);
      await expect(sdkFor("demeter").sdk.getChainQueries().assetDetails(unit)).rejects.toThrow();
    }
  );

  it("supports valid empty asset names with an unknown initial mint hash", async () => {
    const emptyUnit = unit.slice(0, 56);
    const expectedFingerprint = bech32.encode(
      "asset",
      bech32.toWords(blake2b(Buffer.from(emptyUnit, "hex"), undefined, 20))
    );
    handler = (_req, res) =>
      json(res, {
        asset: emptyUnit,
        policy_id: emptyUnit,
        asset_name: null,
        fingerprint: expectedFingerprint,
        quantity: "0",
        initial_mint_tx_hash: "",
        mint_or_burn_count: 0,
        onchain_metadata: null,
        metadata: null,
      });
    await expect(
      sdkFor("demeter").sdk.getChainQueries().assetDetails(emptyUnit)
    ).resolves.toMatchObject({ assetNameHex: "", firstMintTx: null });
  });

  it("rejects provider history ordering and range violations", async () => {
    const item = { tx_hash: hash, tx_index: 0, block_height: 10, block_time: 1700000000 };
    handler = (_req, res) =>
      json(res, [item, { ...item, tx_hash: "b".repeat(64), block_height: 11 }]);
    const queries = sdkFor("demeter").sdk.getChainQueries();
    await expect(queries.addressHistory(address)).rejects.toThrow("ordering");
    handler = (_req, res) => json(res, [item]);
    await expect(queries.addressHistory(address, { fromBlock: 11 })).rejects.toThrow("filter");
  });

  it("rejects wrong stake and pool identities", async () => {
    const queries = sdkFor("demeter").sdk.getChainQueries();
    handler = (_req, res) =>
      json(res, {
        stake_address: "other",
        active: false,
        active_epoch: null,
        controlled_amount: "1",
        rewards_sum: "0",
        withdrawals_sum: "0",
        withdrawable_amount: "0",
        pool_id: null,
      });
    await expect(queries.stakeAccount(stake)).rejects.toThrow("identity");
    handler = (_req, res) =>
      json(res, {
        pool_id: "a".repeat(56),
        name: null,
        ticker: null,
        description: null,
        homepage: null,
      });
    await expect(queries.poolMetadata(pool)).rejects.toThrow("identity");
  });

  it("does not echo malformed response contents or accept contradictory IAGON totals", async () => {
    handler = (_req, res) => json(res, { credential: "must-not-leak", amount: {} });
    await expect(sdkFor("demeter").sdk.getChainQueries().stakeRewards(stake)).rejects.not.toThrow(
      "must-not-leak"
    );
    handler = (_req, res) => json(res, envelope([{ address }], 2));
    await expect(sdkFor("iagon").sdk.getChainQueries().stakeAddresses(stake)).rejects.toThrow(
      "contradicts"
    );
  });

  it.each(["demeter", "iagon"] as const)(
    "%s preserves supply precision and metadata provenance",
    async (kind) => {
      handler = (req, res) => {
        expect(req.headers[kind === "demeter" ? "dmtr-api-key" : "authorization"]).toBe(
          kind === "demeter" ? "fixture-key" : "Bearer fixture-key"
        );
        expect(req.url).toBe(
          kind === "demeter" ? `/assets/${unit}` : `/v1/assets/${unit.slice(0, 56)}.00`
        );
        json(
          res,
          kind === "demeter"
            ? {
                asset: unit,
                policy_id: unit.slice(0, 56),
                asset_name: "00",
                fingerprint,
                quantity: supply,
                initial_mint_tx_hash: hash,
                mint_or_burn_count: 3,
                onchain_metadata: { name: "fixture" },
                metadata: null,
              }
            : envelope({
                policy_id: unit.slice(0, 56),
                asset_name: "00",
                fingerprint,
                total_supply: supply,
                first_mint_tx: hash,
                mint_count: 2,
                burn_count: 1,
                metadata: { name: "fixture" },
                metadata_source: "unclassified",
              })
        );
      };
      const info = await sdkFor(kind).sdk.getChainQueries().assetDetails(unit);
      expect(info.supply).toBe(supply);
      expect(info.mintOrBurnCount).toBe(kind === "demeter" ? 3 : null);
      expect(info.mintCount).toBe(kind === "iagon" ? 2 : null);
      expect(info.registryMetadata).toBeNull();
      expect(info.onchainMetadata).toEqual(kind === "demeter" ? { name: "fixture" } : null);
    }
  );

  it.each(["demeter", "iagon"] as const)(
    "%s maps page 2 correctly without invented history totals",
    async (kind) => {
      handler = (req, res) => {
        const url = new URL(req.url!, baseUrl);
        expect(url.searchParams.get(kind === "demeter" ? "page" : "offset")).toBe(
          kind === "demeter" ? "2" : "1"
        );
        expect(url.searchParams.get(kind === "demeter" ? "count" : "limit")).toBe("1");
        json(
          res,
          kind === "demeter"
            ? [{ tx_hash: hash, block_height: 10, tx_index: 0, block_time: 1700000000 }]
            : envelope([detailed], 2)
        );
      };
      const result = await sdkFor(kind)
        .sdk.getChainQueries()
        .addressHistory(address, { page: 2, count: 1 });
      expect(result.items[0].txHash).toBe(hash);
      expect(result.total).toBe(kind === "demeter" ? null : 2);
      expect(result.nextPage).toBe(kind === "demeter" ? 3 : null);
      expect(result.coverage).toBe("provider-retained");
    }
  );

  it("maps block filters to Blockfrost block heights, never slots", async () => {
    handler = (req, res) => {
      const url = new URL(req.url!, baseUrl);
      expect(url.searchParams.get("from")).toBe("10");
      expect(url.searchParams.get("to")).toBe("12");
      json(res, [{ tx_hash: hash, tx_index: 0, block_height: 10, block_time: 1700000000 }]);
    };
    await sdkFor("demeter")
      .sdk.getChainQueries()
      .addressHistory(address, { fromBlock: 10, toBlock: 12 });
    await expect(
      sdkFor("iagon").sdk.getChainQueries().addressHistory(address, { fromBlock: 10 })
    ).rejects.toBeInstanceOf(ChainReadUnsupportedError);
    expect(requests).toHaveLength(1);
  });

  it.each(["demeter", "iagon"] as const)(
    "%s full history returns actual detail data",
    async (kind) => {
      handler = (req, res) => {
        if (kind === "iagon") return json(res, envelope([detailed]));
        if (req.url?.includes("/transactions"))
          return json(res, [
            { tx_hash: hash, tx_index: 0, block_height: 10, block_time: 1700000000 },
          ]);
        if (req.url?.endsWith("/utxos"))
          return json(res, {
            hash,
            inputs: [
              {
                tx_hash: "c".repeat(64),
                output_index: 0,
                address,
                amount: [{ unit: "lovelace", quantity: "3000000" }],
                collateral: false,
                reference: false,
              },
            ],
            outputs: [
              {
                output_index: 0,
                address,
                amount: [{ unit: "lovelace", quantity: "2830000" }],
                collateral: false,
              },
            ],
          });
        json(res, {
          hash,
          block,
          block_height: 10,
          slot: 20,
          block_time: 1700000000,
          fees: "170000",
          size: 300,
        });
      };
      const result = await sdkFor(kind)
        .sdk.getChainQueries()
        .addressHistory(address, { count: 1, details: "full" });
      expect(result.items[0].details).toMatchObject({
        utxosComplete: true,
        inputs: [{ value: { lovelace: 3000000 } }],
      });
      expect(requests).toHaveLength(kind === "demeter" ? 3 : 1);
    }
  );

  it.each(["demeter", "iagon"] as const)(
    "%s separates controlled and active stake",
    async (kind) => {
      handler = (_req, res) =>
        json(
          res,
          kind === "demeter"
            ? {
                stake_address: stake,
                active: false,
                active_epoch: null,
                controlled_amount: supply,
                rewards_sum: "12",
                withdrawals_sum: "3",
                withdrawable_amount: "9",
                pool_id: null,
              }
            : envelope({
                stake_address: stake,
                active: false,
                active_epoch: null,
                active_stake: "8",
                rewards_sum: "12",
                withdrawn_rewards: "3",
                available_rewards: "9",
                pool_id: null,
                drep_id: null,
              })
        );
      const result = await sdkFor(kind).sdk.getChainQueries().stakeAccount(stake);
      expect(result.availableRewards).toBe("9");
      expect(result.registered).toBeNull();
      expect(result.activeStake).toBe(kind === "demeter" ? null : "8");
      expect(result.controlledAmount).toBe(kind === "demeter" ? supply : null);
    }
  );

  it.each(["demeter", "iagon"] as const)(
    "%s reads nonempty reward/address pages and individual pool data",
    async (kind) => {
      handler = (req, res) => {
        const url = new URL(req.url!, baseUrl);
        let data: unknown;
        if (url.pathname.endsWith("/rewards"))
          data = [
            {
              epoch: 10,
              amount: supply,
              pool_id: pool,
              ...(kind === "demeter" ? { type: "member" } : { reward_type: "member" }),
            },
          ];
        else if (url.pathname.endsWith("/addresses")) data = [{ address }];
        else if (url.pathname.endsWith("/metadata"))
          data = {
            pool_id: pool,
            name: "fixture",
            ticker: null,
            description: null,
            homepage: "https://untrusted.invalid",
          };
        else
          data =
            kind === "demeter"
              ? [{ address: stake, live_stake: supply }]
              : {
                  pool_id: pool,
                  delegators: [{ stake_address: stake, amount: supply, active_epoch_no: 10 }],
                };
        json(res, kind === "demeter" ? data : envelope(data));
      };
      const { sdk, provider } = sdkFor(kind);
      const queries = sdk.getChainQueries();
      expect((await queries.stakeRewards(stake)).items[0]).toMatchObject({
        amount: supply,
        type: "member",
        epoch: 10,
      });
      expect((await queries.stakeAddresses(stake)).items).toEqual([address]);
      expect((await queries.poolMetadata("c".repeat(56))).poolId).toBe(pool);
      expect((await queries.poolDelegators(pool)).items[0].activeEpoch).toBe(
        kind === "demeter" ? null : 10
      );
      expect(requests).toHaveLength(4); // No metadata URL fetch or extra custody calls.
      if (kind === "demeter") {
        expect(provider.capabilities).toEqual(new Set([ChainProviderCapability.CORE]));
        await expect(sdk.getPoolInfo(pool)).rejects.toThrow("does not support");
      }
    }
  );

  it("fails closed for malformed options, credentials and duplicate pages", async () => {
    const queries = sdkFor("demeter").sdk.getChainQueries();
    for (const options of [
      { count: 101 },
      { page: 0 },
      { page: 1001 },
      { fromSlot: 10 },
      { fromBlock: 20, toBlock: 10 },
      { details: "full", count: 26 },
    ]) {
      await expect(queries.addressHistory(address, options as never)).rejects.toThrow();
    }
    await expect(queries.stakeAccount(address)).rejects.toThrow("stake");
    await expect(queries.poolMetadata("not-pool")).rejects.toThrow("pool");
    expect(requests).toHaveLength(0);
    handler = (_req, res) => json(res, [{ address }, { address }]);
    await expect(queries.stakeAddresses(stake)).rejects.toThrow("duplicate");
  });

  it("returns empty pages but does not reinterpret HTTP errors as empty success", async () => {
    const queries = sdkFor("demeter").sdk.getChainQueries();
    handler = (_req, res) => json(res, []);
    expect(await queries.stakeRewards(stake)).toMatchObject({
      items: [],
      nextPage: null,
      total: null,
    });
    handler = (_req, res) => json(res, {}, 404);
    await expect(queries.stakeAddresses(stake)).rejects.toMatchObject({ statusCode: 404 });
    requests.length = 0;
    handler = (_req, res) => json(res, {}, 501);
    await expect(queries.poolMetadata(pool)).rejects.toMatchObject({ statusCode: 501 });
    expect(requests).toHaveLength(1);
  });

  it("does not return partial full history when source data is pruned", async () => {
    handler = (req, res) =>
      req.url?.includes("/transactions")
        ? json(res, [{ tx_hash: hash, tx_index: 0, block_height: 10, block_time: 1700000000 }])
        : json(res, {}, 404);
    await expect(
      sdkFor("demeter").sdk.getChainQueries().addressHistory(address, { count: 1, details: "full" })
    ).rejects.toThrow("Incomplete");
  });

  it("bounds all-page collection and rejects shifted/repeated results", async () => {
    const queries = sdkFor("demeter").sdk.getChainQueries();
    handler = (req, res) =>
      json(res, new URL(req.url!, baseUrl).searchParams.get("page") === "1" ? [{ address }] : []);
    expect(
      await collectChainPages(
        (opts) => queries.stakeAddresses(stake, opts),
        (item) => item,
        { count: 1 }
      )
    ).toEqual([address]);
    handler = (_req, res) => json(res, [{ address }]);
    await expect(
      collectChainPages(
        (opts) => queries.stakeAddresses(stake, opts),
        (item) => item,
        { count: 1 }
      )
    ).rejects.toThrow("Duplicate");
    await expect(
      collectChainPages(
        (opts) => queries.stakeAddresses(stake, opts),
        (item) => item,
        { count: 1, maxPages: 1 }
      )
    ).rejects.toThrow("maxPages");
  });
});
