import axios, { AxiosInstance, AxiosResponse } from "axios";
import { DemeterBlockfrostProvider } from "../../services/demeter-blockfrost.provider.js";

const hash = "a".repeat(64);
const header = {
  hash,
  block: "b".repeat(64),
  block_height: 10,
  slot: 30,
  block_time: 1_700_000_000,
  fees: "170000",
  size: 300,
};
const value = {
  address: "addr_test1fixture",
  output_index: 0,
  amount: [{ unit: "lovelace", quantity: "3000000" }],
  collateral: false,
  reference: false,
};
const utxo = { ...value, tx_hash: hash };
const ok = (data: unknown) => Promise.resolve({ data } as AxiosResponse);
const failure = (status: number) =>
  Promise.reject({ response: { status, headers: { "retry-after": "0" } } });

describe("Demeter safety regressions", () => {
  const get = jest.fn();
  const post = jest.fn();
  const provider = (options = {}) =>
    new DemeterBlockfrostProvider({
      baseUrl: "https://example.invalid/api/v0",
      apiKey: "fixture-key",
      axiosInstance: { get, post } as unknown as AxiosInstance,
      ...options,
    });
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("fetches network-bound current protocol parameters without stale caching", async () => {
    let epoch = 1413;
    get.mockImplementation((path: string) =>
      ok(
        path === "/genesis"
          ? { network_magic: 2 }
          : {
              epoch,
              min_fee_a: 44,
              min_fee_b: 155381,
              coins_per_utxo_size: "4310",
              max_tx_size: 16384,
              key_deposit: "2000000",
              pool_deposit: "500000000",
            }
      )
    );
    const instance = provider();
    await expect(instance.getProtocolParameters()).resolves.toMatchObject({
      epoch: 1413,
      networkMagic: 2,
      coinsPerUtxoByte: 4310,
    });
    epoch++;
    await expect(instance.getProtocolParameters()).resolves.toMatchObject({ epoch: 1414 });
    expect(get).toHaveBeenCalledTimes(4);
    get.mockImplementation((path: string) =>
      ok(path === "/genesis" ? { network_magic: 2 } : { epoch })
    );
    await expect(instance.getProtocolParameters()).rejects.toThrow("Invalid");
  });

  it("does not silently discard earlier UTxOs when a later page is missing", async () => {
    get.mockImplementationOnce(() => ok([utxo])).mockImplementationOnce(() => failure(404));
    await expect(provider({ pageSize: 1 }).getUtxosByAddress(value.address)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(get).toHaveBeenCalledTimes(2);
  });
  it("rejects repeated pages and exhausted scan budgets", async () => {
    get.mockImplementation(() => ok([utxo]));
    await expect(provider({ pageSize: 1 }).getUtxosByAddress(value.address)).rejects.toThrow(
      "Duplicate UTxO"
    );
    expect(get).toHaveBeenCalledTimes(2);
    await expect(
      provider({ pageSize: 1, maxPages: 1 }).getUtxosByAddress(value.address)
    ).rejects.toThrow("maxPages");
  });
  it("rejects cross-address results", async () => {
    get.mockImplementation(() => ok([utxo]));
    await expect(provider().getUtxosByAddress("other")).rejects.toThrow("does not match");
  });
  it.each(["a".repeat(57), "a".repeat(122), "g".repeat(56)])(
    "rejects malformed unit %s",
    async (unit) => {
      get.mockImplementation(() => ok({ ...value, amount: [{ unit, quantity: "1" }] }));
      await expect(
        provider().getBalanceByAddress({ address: value.address, groupByPolicy: false })
      ).rejects.toThrow("Invalid Blockfrost asset unit");
    }
  );
  it("preserves empty names and normalizes case", async () => {
    get.mockImplementation(() =>
      ok({ ...value, amount: [{ unit: "A".repeat(56), quantity: "1" }] })
    );
    await expect(
      provider().getBalanceByAddress({ address: value.address, groupByPolicy: false })
    ).resolves.toMatchObject({ data: { assets: { [`${"a".repeat(56)}.`]: 1 } } });
  });
  it.each(["lovelace", "a".repeat(56)])("rejects duplicate quantities: %s", async (unit) => {
    get.mockImplementation(() =>
      ok({
        ...value,
        amount: [
          { unit, quantity: "1" },
          { unit, quantity: "2" },
        ],
      })
    );
    await expect(
      provider().getBalanceByAddress({ address: value.address, groupByPolicy: false })
    ).rejects.toThrow("Duplicate");
  });
  it.each([401, 403, 404, 409, 501])("does not retry permanent HTTP %s", async (status) => {
    get.mockImplementation(() => failure(status));
    await expect(provider().getCurrentSlot()).rejects.toMatchObject({ statusCode: status });
    expect(get).toHaveBeenCalledTimes(1);
  });
  it.each([429, 503])("retries transient HTTP %s within budget", async (status) => {
    get
      .mockImplementationOnce(() => failure(status))
      .mockImplementationOnce(() => ok({ slot: 123 }));
    await expect(provider().getCurrentSlot()).resolves.toBe(123);
    expect(get).toHaveBeenCalledTimes(2);
  });
  it("never automatically repeats a submission", async () => {
    post.mockImplementation(() => failure(503));
    await expect(provider().submitTransfer("00a1")).rejects.toMatchObject({ statusCode: 503 });
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("does not echo transport error secrets", async () => {
    get.mockRejectedValue(new Error("secret-fixture-key"));
    await expect(provider({ maxRetries: 0 }).getCurrentSlot()).rejects.not.toThrow(
      "secret-fixture-key"
    );
  });
  it("rejects invalid identifiers, response identity and unsafe integers", async () => {
    await expect(provider().getTransactionDetails("invalid")).rejects.toThrow("Invalid");
    expect(get).not.toHaveBeenCalled();
    get.mockImplementation(() => ok({ ...header, hash: "c".repeat(64) }));
    await expect(provider().getTransactionDetails(hash)).rejects.toThrow("does not match");
    get.mockImplementation(() => ok({ ...header, slot: Number.MAX_SAFE_INTEGER + 1 }));
    await expect(provider().getTransactionDetails(hash)).rejects.toThrow("Invalid");
  });
  it("disables redirects on the default authenticated client", () => {
    const create = jest.spyOn(axios, "create");
    new DemeterBlockfrostProvider({ baseUrl: "https://example.invalid", apiKey: "fixture-key" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ maxRedirects: 0 }));
    create.mockRestore();
  });
  it("distinguishes header-only lookup from hydrated inputs and outputs", async () => {
    get.mockImplementation((path: string) =>
      ok(path.endsWith("/utxos") ? { hash, inputs: [utxo], outputs: [value] } : header)
    );
    await expect(provider().getTransactionDetails(hash)).resolves.toMatchObject({
      data: { utxosComplete: false },
    });
    await expect(provider().getFullTransactionDetails(hash)).resolves.toMatchObject({
      data: {
        utxosComplete: true,
        inputs: [{ tx_hash: hash, reference: false, value: { lovelace: 3000000 } }],
        outputs: [{ collateral: false, value: { lovelace: 3000000 } }],
      },
    });
  });
  it("does not claim complete evidence for pruned or missing inputs", async () => {
    get.mockImplementation((path: string) => (path.endsWith("/utxos") ? failure(404) : ok(header)));
    await expect(provider().getFullTransactionDetails(hash)).rejects.toMatchObject({
      statusCode: 404,
    });
    get.mockImplementation((path: string) =>
      ok(path.endsWith("/utxos") ? { hash, inputs: [], outputs: [value] } : header)
    );
    await expect(provider().getFullTransactionDetails(hash)).rejects.toThrow("Invalid");
  });
  it("rejects mismatched UTxO hashes and duplicate output indexes", async () => {
    get.mockImplementation((path: string) =>
      ok(
        path.endsWith("/utxos")
          ? { hash: "f".repeat(64), inputs: [utxo], outputs: [value] }
          : header
      )
    );
    await expect(provider().getFullTransactionDetails(hash)).rejects.toThrow("hash mismatch");
    get.mockImplementation((path: string) =>
      ok(path.endsWith("/utxos") ? { hash, inputs: [utxo], outputs: [value, value] } : header)
    );
    await expect(provider().getFullTransactionDetails(hash)).rejects.toThrow("Duplicate");
  });
});
