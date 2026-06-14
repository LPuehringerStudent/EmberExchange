import { TradeOfferService } from "../../backend/services/trade-offer-service";
import { Unit } from "../../backend/utils/unit";

function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnitSequence(stmts: ReturnType<typeof mockStmt>[]) {
  let callIndex = 0;
  return {
    prepare: jest.fn().mockImplementation(() => {
      const stmt = stmts[Math.min(callIndex, stmts.length - 1)];
      callIndex++;
      return stmt;
    }),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

describe("Trade offer integration flow", () => {
  const message = {
    messageId: 100,
    senderId: 2,
    receiverId: 1,
    content: "Trade offer",
    messageType: "trade_offer",
    data: { itemType: "stove", itemId: 44, price: 250, status: "pending" },
  };

  test("accepting a stove trade transfers coins, transfers ownership, logs both coin transactions, and accepts the message", async () => {
    const deductBuyerStmt = mockStmt(null, [], { changes: 1 });
    const creditSellerStmt = mockStmt(null, [], { changes: 1 });
    const getStoveTypeStmt = mockStmt({ typeId: 9 });
    const updateStoveOwnerStmt = mockStmt(null, [], { changes: 1 });
    const insertOwnershipStmt = mockStmt(null, [], { changes: 1 });
    const insertCollectionStmt = mockStmt(null, [], { changes: 1 });
    const buyerCoinTransactionStmt = mockStmt(null, [], { changes: 1 });
    const sellerCoinTransactionStmt = mockStmt(null, [], { changes: 1 });
    const updateMessageStmt = mockStmt(null, [], { changes: 1 });
    const unit = mockUnitSequence([
      mockStmt(message),
      mockStmt({ currentOwnerId: 2 }),
      mockStmt({ count: 0 }),
      mockStmt({ playerId: 1, username: "buyer", coins: 1000 }),
      mockStmt({ playerId: 2, username: "seller", coins: 50 }),
      deductBuyerStmt,
      creditSellerStmt,
      getStoveTypeStmt,
      updateStoveOwnerStmt,
      insertOwnershipStmt,
      insertCollectionStmt,
      buyerCoinTransactionStmt,
      sellerCoinTransactionStmt,
      updateMessageStmt,
    ]);

    const result = await new TradeOfferService(unit).acceptTradeOffer(100, 1);

    expect(result).toEqual({ success: true, senderId: 2 });
    expect(deductBuyerStmt.run).toHaveBeenCalledTimes(1);
    expect(creditSellerStmt.run).toHaveBeenCalledTimes(1);
    expect(getStoveTypeStmt.get).toHaveBeenCalledTimes(1);
    expect(updateStoveOwnerStmt.run).toHaveBeenCalledTimes(1);
    expect(insertOwnershipStmt.run).toHaveBeenCalledTimes(1);
    expect(insertCollectionStmt.run).toHaveBeenCalledTimes(1);
    expect(buyerCoinTransactionStmt.run).toHaveBeenCalledTimes(1);
    expect(sellerCoinTransactionStmt.run).toHaveBeenCalledTimes(1);
    expect(updateMessageStmt.run).toHaveBeenCalledTimes(1);
    expect(unit.prepare).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE ChatMessage SET data"),
      { messageId: 100 }
    );
  });

  test("an active marketplace listing blocks the trade before money moves", async () => {
    const deductBuyerStmt = mockStmt(null, [], { changes: 1 });
    const unit = mockUnitSequence([
      mockStmt(message),
      mockStmt({ currentOwnerId: 2 }),
      mockStmt({ count: 1 }),
      deductBuyerStmt,
    ]);

    const result = await new TradeOfferService(unit).acceptTradeOffer(100, 1);

    expect(result).toEqual({
      success: false,
      error: "Item is currently listed for sale",
    });
    expect(deductBuyerStmt.run).not.toHaveBeenCalled();
  });
});
