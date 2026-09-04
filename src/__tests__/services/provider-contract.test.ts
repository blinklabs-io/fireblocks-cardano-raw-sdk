import { IagonApiService } from "../../services/iagon.api.service.js";
import {
  CardanoDataProvider,
  ChainProviderCapability,
  Networks,
  ProviderCapabilityError,
} from "../../types/index.js";

describe("chain provider contract", () => {
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
});
