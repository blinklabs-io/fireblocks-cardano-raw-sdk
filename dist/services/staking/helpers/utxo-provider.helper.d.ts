/**
 * UTXO Provider Helper
 * Handles UTXO finding and selection logic
 */
import { Logger } from "../../../utils/index.js";
import { FireblocksService, IagonApiService } from "../../index.js";
import { INetworkConfiguration, IUtxoProvider, AddressWithUtxo } from "../types/staking.interfaces.js";
export declare class UtxoProvider implements IUtxoProvider {
    private readonly fireblocksService;
    private readonly iagonApiService;
    private readonly networkConfig;
    private readonly logger;
    constructor(fireblocksService: FireblocksService, iagonApiService: IagonApiService, networkConfig: INetworkConfiguration, logger: Logger);
    findAddressWithSuitableUtxo(vaultAccountId: string, minAmount: number): Promise<AddressWithUtxo>;
    private getVaultAddresses;
    private findUtxoForAddress;
    private createInsufficientFundsError;
}
//# sourceMappingURL=utxo-provider.helper.d.ts.map