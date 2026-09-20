import type { Fireblocks } from "@fireblocks/ts-sdk";
import { TransactionStateEnum } from "@fireblocks/ts-sdk";
import { getTxStatus } from "../../utils/fireblocks.js";
import { Logger, LogLevel } from "../../utils/logger.js";

const response = (status: TransactionStateEnum, subStatus?: string) => ({
  data: { id: "transaction-1", status, subStatus },
});

describe("getTxStatus", () => {
  const originalLogLevel = Logger.getLogLevel();

  beforeAll(() => Logger.setLogLevel(LogLevel.NONE));
  afterAll(() => Logger.setLogLevel(originalLogLevel));
  afterEach(() => jest.useRealTimers());

  it("returns immediately for a completed transaction", async () => {
    const getTransaction = jest.fn().mockResolvedValue(response(TransactionStateEnum.Completed));
    const fireblocks = { transactions: { getTransaction } } as unknown as Fireblocks;

    await expect(getTxStatus("transaction-1", fireblocks, 0)).resolves.toMatchObject({
      id: "transaction-1",
      status: TransactionStateEnum.Completed,
    });
    expect(getTransaction).toHaveBeenCalledTimes(1);
  });

  it("polls transient states until broadcasting", async () => {
    const getTransaction = jest
      .fn()
      .mockResolvedValueOnce(response(TransactionStateEnum.Submitted))
      .mockResolvedValueOnce(response(TransactionStateEnum.PendingSignature))
      .mockResolvedValueOnce(response(TransactionStateEnum.Broadcasting));
    const fireblocks = { transactions: { getTransaction } } as unknown as Fireblocks;

    await expect(getTxStatus("transaction-1", fireblocks, 0)).resolves.toMatchObject({
      status: TransactionStateEnum.Broadcasting,
    });
    expect(getTransaction).toHaveBeenCalledTimes(3);
  });

  it.each([
    TransactionStateEnum.Blocked,
    TransactionStateEnum.Cancelled,
    TransactionStateEnum.Failed,
    TransactionStateEnum.Rejected,
  ])("rejects terminal failure state %s", async (terminalState) => {
    const getTransaction = jest
      .fn()
      .mockResolvedValueOnce(response(TransactionStateEnum.Submitted))
      .mockResolvedValueOnce(response(terminalState, "fixture-sub-status"));
    const fireblocks = { transactions: { getTransaction } } as unknown as Fireblocks;

    await expect(getTxStatus("transaction-1", fireblocks, 0)).rejects.toThrow(
      `failed with status: ${terminalState}`
    );
  });

  it("times out transactions that never reach a terminal state", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const getTransaction = jest
      .fn()
      .mockResolvedValue(response(TransactionStateEnum.PendingSignature));
    const fireblocks = { transactions: { getTransaction } } as unknown as Fireblocks;

    const polling = getTxStatus("transaction-1", fireblocks, 100, 50);
    const assertion = expect(polling).rejects.toThrow("polling timed out after 0.05s");
    await jest.advanceTimersByTimeAsync(101);
    await assertion;
  });

  it("preserves provider lookup failures", async () => {
    const getTransaction = jest.fn().mockRejectedValue(new Error("provider unavailable"));
    const fireblocks = { transactions: { getTransaction } } as unknown as Fireblocks;

    await expect(getTxStatus("transaction-1", fireblocks, 0)).rejects.toThrow(
      "provider unavailable"
    );
  });
});
