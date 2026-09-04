import { BalanceResponse, GroupedBalanceResponse } from "./iagon/assets.js";
import { HealthStatusResponse, getBalanceByAddressOpts } from "./iagon/general.js";
import { TransactionDetailsResponse, TransferResponse } from "./iagon/transactions.js";
import { UtxoIagonResponse } from "./iagon/UTXOs.js";

export type ChainProviderKind = "iagon" | "demeter";

export enum ChainProviderCapability {
  CORE = "core",
  IAGON_COMPATIBILITY = "iagon-compatibility",
  ACCOUNT_QUERIES = "credential-and-stake-queries",
  HISTORY = "history",
  STAKING = "staking",
  GOVERNANCE = "governance",
  POOLS = "pools",
  ASSET_METADATA = "asset-metadata",
}

/**
 * Provider-neutral surface required by balance, UTxO selection, transaction
 * submission, and confirmation. IAGON implements the extended SDK surface;
 * the Demeter POC intentionally implements only this core contract.
 */
export interface CardanoDataProvider {
  readonly kind: ChainProviderKind;
  readonly capabilities: ReadonlySet<ChainProviderCapability>;
  checkHealth(): Promise<HealthStatusResponse>;
  getUtxosByAddress(address: string): Promise<UtxoIagonResponse>;
  getBalanceByAddress(
    params: getBalanceByAddressOpts
  ): Promise<BalanceResponse | GroupedBalanceResponse>;
  getCurrentSlot(): Promise<number>;
  submitTransfer(tx: string, skipValidation?: boolean): Promise<TransferResponse>;
  getTransactionDetails(hash: string): Promise<TransactionDetailsResponse | null>;
}

export type ChainProviderConfig =
  | {
      type: "iagon";
      apiKey: string;
      assetCacheTTL?: number;
      disableSslVerification?: boolean;
    }
  | {
      type: "demeter";
      baseUrl: string;
      apiKey: string;
      maxRetries?: number;
      pageSize?: number;
    };

export class ProviderCapabilityError extends Error {
  constructor(
    public readonly provider: ChainProviderKind,
    public readonly capability: ChainProviderCapability
  ) {
    super(`Provider '${provider}' does not support the '${capability}' capability`);
    this.name = "ProviderCapabilityError";
  }
}
