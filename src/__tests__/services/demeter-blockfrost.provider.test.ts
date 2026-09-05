import { AddressInfo } from "node:net";
import http, { IncomingMessage, ServerResponse } from "node:http";
import { DemeterBlockfrostProvider } from "../../services/demeter-blockfrost.provider.js";
import { ChainProviderCapability, SdkApiError } from "../../types/index.js";

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

const json = (response: ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

describe("DemeterBlockfrostProvider", () => {
  let server: http.Server;
  let baseUrl: string;
  let handler: Handler;

  beforeAll(async () => {
    server = http.createServer((request, response) => handler(request, response));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  const provider = (options: { pageSize?: number; maxRetries?: number } = {}) =>
    new DemeterBlockfrostProvider({
      baseUrl: `${baseUrl}/`,
      apiKey: "demeter-test-key",
      ...options,
    });

  it("validates configuration and advertises only core capability", () => {
    expect(() => new DemeterBlockfrostProvider({ baseUrl: "", apiKey: "key" })).toThrow(
      "DEMETER_BLOCKFROST_URL"
    );
    expect(() => new DemeterBlockfrostProvider({ baseUrl, apiKey: "" })).toThrow("DEMETER_API_KEY");
    expect(
      () =>
        new DemeterBlockfrostProvider({
          baseUrl: "http://cardano-preview.example.com",
          apiKey: "key",
        })
    ).toThrow("must use HTTPS");
    expect(
      () =>
        new DemeterBlockfrostProvider({
          baseUrl: "https://user:password@cardano-preview.example.com",
          apiKey: "key",
        })
    ).toThrow("must not contain embedded credentials");
    expect(() => provider({ maxRetries: -1 })).toThrow("maxRetries");
    expect(() => provider({ maxRetries: 11 })).toThrow("maxRetries");
    expect(() => provider({ pageSize: 0 })).toThrow("pageSize");
    expect(provider().capabilities).toEqual(new Set([ChainProviderCapability.CORE]));
  });

  it("authenticates health, network, and latest-slot requests with dmtr-api-key", async () => {
    const requests: string[] = [];
    handler = (request, response) => {
      expect(request.headers["dmtr-api-key"]).toBe("demeter-test-key");
      requests.push(request.url || "");
      if (request.url === "/health") return json(response, 200, { is_healthy: true });
      if (request.url === "/genesis") return json(response, 200, { network_magic: 2 });
      return json(response, 200, { slot: 123456 });
    };

    await expect(provider().checkHealth()).resolves.toMatchObject({ success: true });
    await expect(provider().getNetworkMagic()).resolves.toBe(2);
    await expect(provider().getCurrentSlot()).resolves.toBe(123456);
    expect(requests).toEqual(["/health", "/genesis", "/blocks/latest"]);
  });

  it("normalizes flat and policy-grouped balances", async () => {
    const policy = "a".repeat(56);
    handler = (_request, response) =>
      json(response, 200, {
        address: "addr_test1example",
        amount: [
          { unit: "lovelace", quantity: "4200000" },
          { unit: `${policy}4e4654`, quantity: "7" },
        ],
      });

    await expect(
      provider().getBalanceByAddress({ address: "addr_test1example", groupByPolicy: false })
    ).resolves.toEqual({
      success: true,
      data: { lovelace: 4200000, assets: { [`${policy}.4e4654`]: 7 } },
    });
    await expect(
      provider().getBalanceByAddress({ address: "addr_test1example", groupByPolicy: true })
    ).resolves.toEqual({
      success: true,
      data: { lovelace: 4200000, assets: { [policy]: { "4e4654": 7 } } },
    });
  });

  it("paginates and normalizes multi-asset UTxOs", async () => {
    const policy = "b".repeat(56);
    const pages: number[] = [];
    handler = (request, response) => {
      expect(request.headers["dmtr-api-key"]).toBe("demeter-test-key");
      const url = new URL(request.url || "", baseUrl);
      expect(url.pathname).toBe("/addresses/addr_test1example/utxos");
      expect(url.searchParams.get("count")).toBe("2");
      expect(url.searchParams.get("order")).toBe("asc");
      const page = Number(url.searchParams.get("page"));
      pages.push(page);
      const count = page === 1 ? 2 : 1;
      json(
        response,
        200,
        Array.from({ length: count }, (_, index) => ({
          tx_hash: `${page}${index}`.padEnd(64, "0"),
          output_index: index,
          address: "addr_test1example",
          amount: [
            { unit: "lovelace", quantity: "3000000" },
            { unit: `${policy}00`, quantity: "2" },
          ],
          block: "c".repeat(64),
          data_hash: null,
          reference_script_hash: null,
        }))
      );
    };

    const result = await provider({ pageSize: 2 }).getUtxosByAddress("addr_test1example");
    expect(pages).toEqual([1, 2]);
    expect(result.data).toHaveLength(3);
    expect(result.data?.[0]).toMatchObject({
      value: { lovelace: 3000000, assets: { [`${policy}.00`]: 2 } },
      created_at: { header_hash: "c".repeat(64) },
    });
  });

  it("normalizes a 404 UTxO lookup to an empty successful response", async () => {
    handler = (_request, response) => json(response, 404, { message: "not found" });
    await expect(provider().getUtxosByAddress("addr_test1empty")).resolves.toEqual({
      success: true,
      data: [],
    });
  });

  it("rejects malformed assets and unsafe numeric quantities", async () => {
    handler = (_request, response) =>
      json(response, 200, {
        address: "addr_test1example",
        amount: [{ unit: "lovelace", quantity: "9007199254740992" }],
      });
    await expect(
      provider().getBalanceByAddress({ address: "addr_test1example", groupByPolicy: false })
    ).rejects.toThrow("Unsafe numeric quantity");

    handler = (_request, response) =>
      json(response, 200, {
        address: "addr_test1example",
        amount: [{ unit: "too-short", quantity: "1" }],
      });
    await expect(
      provider().getBalanceByAddress({ address: "addr_test1example", groupByPolicy: false })
    ).rejects.toThrow("Invalid Blockfrost asset unit");

    handler = (_request, response) =>
      json(response, 200, {
        address: "addr_test1example",
        amount: [{ unit: `${"g".repeat(56)}00`, quantity: "1" }],
      });
    await expect(
      provider().getBalanceByAddress({ address: "addr_test1example", groupByPolicy: false })
    ).rejects.toThrow("Invalid Blockfrost asset unit");
  });

  it("normalizes malformed provider payloads without echoing response data", async () => {
    handler = (_request, response) =>
      json(response, 200, {
        address: "addr_test1example",
        amount: "not-an-array",
        credential: "must-not-appear-in-errors",
      });

    const operation = provider().getBalanceByAddress({
      address: "addr_test1example",
      groupByPolicy: false,
    });
    await expect(operation).rejects.toMatchObject({
      name: "SdkApiError",
      statusCode: 502,
      errorType: "InvalidProviderResponse",
      service: "DemeterBlockfrostProvider",
    } satisfies Partial<SdkApiError>);
    await expect(operation).rejects.not.toThrow("must-not-appear-in-errors");
  });

  it("retries rate limits and normalizes final transport errors", async () => {
    let attempts = 0;
    handler = (_request, response) => {
      attempts++;
      if (attempts === 1) {
        response.setHeader("retry-after", "0");
        return json(response, 429, { message: "slow down" });
      }
      return json(response, 200, { slot: 9 });
    };
    await expect(provider({ maxRetries: 1 }).getCurrentSlot()).resolves.toBe(9);
    expect(attempts).toBe(2);

    handler = (_request, response) => json(response, 500, { message: "down" });
    await expect(provider({ maxRetries: 0 }).getCurrentSlot()).rejects.toMatchObject({
      name: "SdkApiError",
      statusCode: 500,
      service: "DemeterBlockfrostProvider",
    } satisfies Partial<SdkApiError>);
  });

  it("submits binary CBOR and normalizes the returned transaction hash", async () => {
    let receivedBody = Buffer.alloc(0);
    handler = (request, response) => {
      expect(request.method).toBe("POST");
      expect(request.url).toBe("/tx/submit");
      expect(request.headers["content-type"]).toBe("application/cbor");
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        receivedBody = Buffer.concat(chunks);
        json(response, 200, "D".repeat(64));
      });
    };

    await expect(provider().submitTransfer("00a1")).resolves.toEqual({
      success: true,
      data: { txHash: "d".repeat(64) },
    });
    expect(receivedBody).toEqual(Buffer.from("00a1", "hex"));
    await expect(provider().submitTransfer("not-cbor")).rejects.toThrow("hexadecimal CBOR");

    handler = (_request, response) => json(response, 200, "not-a-transaction-hash");
    await expect(provider().submitTransfer("00a1")).rejects.toMatchObject({
      name: "SdkApiError",
      statusCode: 502,
      errorType: "InvalidProviderResponse",
    });
  });

  it("maps transaction confirmation and returns null while absent", async () => {
    handler = (_request, response) => json(response, 404, { message: "not found" });
    await expect(provider().getTransactionDetails("pending")).resolves.toBeNull();

    handler = (_request, response) =>
      json(response, 200, {
        hash: "e".repeat(64),
        block: "f".repeat(64),
        block_height: 20,
        slot: 30,
        block_time: 1_700_000_000,
        fees: "170000",
        size: 200,
      });
    await expect(provider().getTransactionDetails("confirmed")).resolves.toMatchObject({
      success: true,
      data: {
        tx_hash: "e".repeat(64),
        block_hash: "f".repeat(64),
        fee: 170000,
        inputs: [],
        outputs: [],
      },
    });
  });
});
