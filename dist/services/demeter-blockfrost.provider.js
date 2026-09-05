import axios from "axios";
import { z } from "zod";
import { ChainProviderCapability, SdkApiError, } from "../types/index.js";
import { Logger } from "../utils/logger.js";
const amountSchema = z.object({
    unit: z.string().min(1),
    quantity: z.string().regex(/^\d+$/),
});
const addressSchema = z.object({
    address: z.string(),
    amount: z.array(amountSchema),
});
const utxoSchema = z.object({
    tx_hash: z.string(),
    output_index: z.number().int().nonnegative(),
    address: z.string(),
    amount: z.array(amountSchema),
    block: z.string().optional(),
    data_hash: z.string().nullable().optional(),
    reference_script_hash: z.string().nullable().optional(),
});
const txSchema = z.object({
    hash: z.string(),
    block: z.string(),
    block_height: z.number().int(),
    slot: z.number().int(),
    block_time: z.number().int(),
    fees: z.string().regex(/^\d+$/),
    size: z.number().int(),
});
const healthSchema = z.object({
    is_healthy: z.boolean(),
});
const blockSchema = z.object({
    slot: z.number().int().nonnegative(),
});
const genesisSchema = z.object({
    network_magic: z.number().int().nonnegative(),
});
const transactionHashSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/)
    .transform((hash) => hash.toLowerCase());
/** Core Cardano provider backed by a Demeter-hosted Blockfrost gateway. */
export class DemeterBlockfrostProvider {
    kind = "demeter";
    capabilities = new Set([ChainProviderCapability.CORE]);
    logger = new Logger("services:demeter-blockfrost");
    client;
    maxRetries;
    pageSize;
    constructor(options) {
        const baseUrl = options.baseUrl?.replace(/\/+$/, "");
        if (!baseUrl) {
            throw new Error("DEMETER_BLOCKFROST_URL is required");
        }
        let parsedBaseUrl;
        try {
            parsedBaseUrl = new URL(baseUrl);
        }
        catch {
            throw new Error("DEMETER_BLOCKFROST_URL must be a valid absolute URL");
        }
        const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(parsedBaseUrl.hostname);
        if (parsedBaseUrl.protocol !== "https:" &&
            !(parsedBaseUrl.protocol === "http:" && isLoopback)) {
            throw new Error("DEMETER_BLOCKFROST_URL must use HTTPS (HTTP is allowed only for loopback tests)");
        }
        if (parsedBaseUrl.username || parsedBaseUrl.password) {
            throw new Error("DEMETER_BLOCKFROST_URL must not contain embedded credentials");
        }
        if (!options.apiKey?.trim()) {
            throw new Error("DEMETER_API_KEY is required");
        }
        this.maxRetries = options.maxRetries ?? 2;
        this.pageSize = options.pageSize ?? 100;
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
                    headers: { "dmtr-api-key": options.apiKey.trim() },
                });
    }
    async checkHealth() {
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
        }
        catch (error) {
            this.logger.warn(`Demeter health check failed: ${this.errorMessage(error)}`);
            return {
                success: false,
                data: { status: "unhealthy", timestamp: new Date().toISOString() },
            };
        }
    }
    async getBalanceByAddress(params) {
        const response = await this.request(() => this.client.get(`/addresses/${encodeURIComponent(params.address)}`), `balance for address ${params.address}`);
        const data = this.parseResponse(addressSchema, response.data, "address balance");
        return this.toBalanceResponse(data.amount, params.groupByPolicy);
    }
    async getUtxosByAddress(address) {
        const utxos = [];
        for (let page = 1;; page++) {
            let response;
            try {
                response = await this.request(() => this.client.get(`/addresses/${encodeURIComponent(address)}/utxos`, {
                    params: { count: this.pageSize, page, order: "asc" },
                }), `UTxOs for address ${address}`);
            }
            catch (error) {
                if (this.statusCode(error) === 404) {
                    return { success: true, data: [] };
                }
                throw error;
            }
            const pageData = this.parseResponse(z.array(utxoSchema), response.data, "address UTxOs");
            utxos.push(...pageData.map((utxo) => this.toUtxo(utxo)));
            if (pageData.length < this.pageSize)
                break;
        }
        return { success: true, data: utxos };
    }
    async getCurrentSlot() {
        const response = await this.request(() => this.client.get("/blocks/latest"), "latest block");
        return this.parseResponse(blockSchema, response.data, "latest block").slot;
    }
    /** Read the Cardano network identifier from the provider's genesis data. */
    async getNetworkMagic() {
        const response = await this.request(() => this.client.get("/genesis"), "genesis");
        return this.parseResponse(genesisSchema, response.data, "genesis").network_magic;
    }
    async submitTransfer(tx) {
        if (!/^(?:[0-9a-fA-F]{2})+$/.test(tx)) {
            throw new Error("Signed transaction must be non-empty hexadecimal CBOR");
        }
        const response = await this.request(() => this.client.post("/tx/submit", Buffer.from(tx, "hex"), {
            headers: { "Content-Type": "application/cbor" },
        }), "transaction submission");
        const txHash = this.parseResponse(transactionHashSchema, response.data, "transaction submission");
        return { success: true, data: { txHash } };
    }
    async getTransactionDetails(hash) {
        try {
            const response = await this.request(() => this.client.get(`/txs/${encodeURIComponent(hash)}`), `transaction ${hash}`);
            const tx = this.parseResponse(txSchema, response.data, "transaction details");
            const data = {
                tx_hash: tx.hash,
                block_hash: tx.block,
                slot_no: tx.slot,
                block_no: tx.block_height,
                block_time: new Date(tx.block_time * 1000).toISOString(),
                fee: this.safeQuantity(tx.fees, "transaction fee"),
                size: tx.size,
                inputs: [],
                outputs: [],
            };
            return { success: true, data };
        }
        catch (error) {
            if (this.statusCode(error) === 404)
                return null;
            throw error;
        }
    }
    toBalanceResponse(amounts, groupByPolicy) {
        let lovelace = 0;
        const flatAssets = {};
        const groupedAssets = {};
        for (const amount of amounts) {
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
        };
    }
    toUtxo(utxo) {
        const balance = this.toBalanceResponse(utxo.amount, false);
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
    assetParts(unit) {
        if (unit.length < 56 || !/^[0-9a-fA-F]+$/.test(unit)) {
            throw new Error(`Invalid Blockfrost asset unit '${unit}'`);
        }
        const policyId = unit.slice(0, 56);
        const assetName = unit.slice(56);
        return { policyId, assetName, internalUnit: `${policyId}.${assetName}` };
    }
    safeQuantity(value, context) {
        const quantity = Number(value);
        if (!Number.isSafeInteger(quantity) || quantity < 0) {
            throw new Error(`Unsafe numeric quantity for ${context}: ${value}`);
        }
        return quantity;
    }
    parseResponse(schema, value, context) {
        const result = schema.safeParse(value);
        if (result.success)
            return result.data;
        const issues = result.error.issues
            .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
            .join("; ");
        throw new SdkApiError(`Invalid Demeter Blockfrost ${context} response: ${issues}`, 502, "InvalidProviderResponse", undefined, "DemeterBlockfrostProvider");
    }
    async request(operation, context) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (!this.isRetryable(error) || attempt === this.maxRetries)
                    break;
                const retryAfter = Number(error.response?.headers?.["retry-after"]);
                const delayMs = Number.isFinite(retryAfter)
                    ? Math.min(retryAfter * 1000, 5_000)
                    : 250 * 3 ** attempt;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
        const status = this.statusCode(lastError);
        throw new SdkApiError(`Demeter Blockfrost ${context} failed: ${this.errorMessage(lastError)}`, status, undefined, undefined, "DemeterBlockfrostProvider");
    }
    isRetryable(error) {
        const status = this.statusCode(error);
        return status === undefined || status === 425 || status === 429 || status >= 500;
    }
    statusCode(error) {
        if (error instanceof SdkApiError)
            return error.statusCode;
        return error?.response?.status;
    }
    errorMessage(error) {
        if (error instanceof Error)
            return error.message;
        return String(error);
    }
}
//# sourceMappingURL=demeter-blockfrost.provider.js.map