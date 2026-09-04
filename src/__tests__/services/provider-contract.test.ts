import { AddressInfo } from "node:net";
import http, { IncomingMessage, ServerResponse } from "node:http";
import { IagonApiService } from "../../services/iagon.api.service.js";
import {
  CardanoDataProvider,
  ChainProviderCapability,
  Networks,
  ProviderCapabilityError,
} from "../../types/index.js";

describe("chain provider contract", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer((request: IncomingMessage, response: ServerResponse) => {
      expect(request.headers.authorization).toBe("Bearer iagon-test-key");
      const url = new URL(request.url || "", baseUrl);
      response.setHeader("content-type", "application/json");

      const send = (body: unknown): void => {
        response.end(JSON.stringify(body));
      };
      if (url.pathname === "/v1/health") {
        return send({
          success: true,
          data: { status: "healthy", timestamp: "2026-01-01T00:00:00.000Z" },
        });
      }
      if (url.pathname === "/v1/assets/balance/address/addr_test1contract") {
        expect(url.searchParams.get("groupByPolicy")).toBe("false");
        return send({ success: true, data: { lovelace: 3_000_000, assets: {} } });
      }
      if (url.pathname === "/v1/utxos/address/addr_test1contract") {
        return send({
          success: true,
          data: [
            {
              transaction_id: "a".repeat(64),
              output_index: 0,
              address: "addr_test1contract",
              value: { lovelace: 3_000_000, assets: {} },
              datum_hash: null,
              script_hash: null,
              created_at: { slot_no: 1, header_hash: "b".repeat(64) },
            },
          ],
        });
      }
      if (url.pathname === "/v1/epochs/latest") {
        return send({ success: true, data: { tip: { slot: 1234 } } });
      }
      if (url.pathname === "/v1/tx/hash/confirmed") {
        return send({ success: true, data: { tx_hash: "c".repeat(64) } });
      }
      if (url.pathname === "/v1/tx/submit" && request.method === "POST") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => {
          expect(JSON.parse(Buffer.concat(chunks).toString("utf8"))).toEqual({
            tx: "00a1",
            skipValidation: false,
          });
          send({ success: true, data: { txHash: "d".repeat(64) } });
        });
        return;
      }

      response.statusCode = 404;
      send({ message: "not found" });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it("keeps IAGON as a full-capability provider", () => {
    const provider: CardanoDataProvider = new IagonApiService("iagon-test-key", Networks.PREVIEW);
    expect(provider.kind).toBe("iagon");
    expect(provider.capabilities).toEqual(new Set(Object.values(ChainProviderCapability)));
  });

  it("returns a typed error for unsupported provider capabilities", () => {
    const error = new ProviderCapabilityError("demeter", ChainProviderCapability.STAKING);
    expect(error).toMatchObject({
      name: "ProviderCapabilityError",
      provider: "demeter",
      capability: ChainProviderCapability.STAKING,
    });
    expect(error.message).toContain("does not support");
  });

  it("keeps IAGON compatible with the provider-neutral core contract", async () => {
    const provider: CardanoDataProvider = new IagonApiService("iagon-test-key", Networks.PREVIEW);
    Object.defineProperty(provider, "iagonBaseUrl", { value: baseUrl });

    await expect(provider.checkHealth()).resolves.toMatchObject({ success: true });
    await expect(
      provider.getBalanceByAddress({ address: "addr_test1contract", groupByPolicy: false })
    ).resolves.toEqual({ success: true, data: { lovelace: 3_000_000, assets: {} } });
    await expect(provider.getUtxosByAddress("addr_test1contract")).resolves.toMatchObject({
      success: true,
      data: [{ transaction_id: "a".repeat(64), output_index: 0 }],
    });
    await expect(provider.getCurrentSlot()).resolves.toBe(1234);
    await expect(provider.getTransactionDetails("confirmed")).resolves.toMatchObject({
      success: true,
      data: { tx_hash: "c".repeat(64) },
    });
    await expect(provider.submitTransfer("00a1")).resolves.toEqual({
      success: true,
      data: { txHash: "d".repeat(64) },
    });
  });
});
