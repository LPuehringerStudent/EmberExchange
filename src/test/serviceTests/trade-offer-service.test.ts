import { TradeOfferService } from '../../backend/services/trade-offer-service';
import { Unit } from '../../backend/utils/unit';

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

describe('TradeOfferService', () => {
    const senderId = 1;
    const accepterId = 2;

    describe('acceptTradeOffer', () => {
        it('accepts a pending stove trade offer successfully', async () => {
            const message = {
                messageId: 10,
                senderId,
                receiverId: accepterId,
                messageType: 'trade_offer',
                data: { itemType: 'stove', itemId: 5, price: 1000, status: 'pending' },
            };
            const unit = mockUnitSequence([
                mockStmt(message), // getById
                mockStmt({ currentOwnerId: senderId }), // stove ownership
                mockStmt({ playerId: accepterId, username: 'buyer', coins: 2000 }), // accepter
                mockStmt({ playerId: senderId, username: 'seller', coins: 500 }), // sender
                mockStmt(null, [], { changes: 1 }), // deduct accepter coins
                mockStmt(null, [], { changes: 1 }), // add sender coins
                mockStmt(null, [], { changes: 1 }), // transfer stove
                mockStmt(null, [], { changes: 1 }), // insert ownership
                mockStmt(null, [], { changes: 1 }), // coin tx accepter
                mockStmt(null, [], { changes: 1 }), // coin tx sender
                mockStmt(null, [], { changes: 1 }), // update message status
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(10, accepterId);

            expect(result.success).toBe(true);
        });

        it('accepts a pending lootbox trade offer successfully', async () => {
            const message = {
                messageId: 11,
                senderId,
                receiverId: accepterId,
                messageType: 'trade_offer',
                data: { itemType: 'lootbox', itemId: 7, price: 500, status: 'pending' },
            };
            const unit = mockUnitSequence([
                mockStmt(message),
                mockStmt({ playerId: senderId }), // lootbox ownership
                mockStmt({ playerId: accepterId, username: 'buyer', coins: 1000 }),
                mockStmt({ playerId: senderId, username: 'seller', coins: 300 }),
                mockStmt(null, [], { changes: 1 }),
                mockStmt(null, [], { changes: 1 }),
                mockStmt(null, [], { changes: 1 }), // transfer lootbox
                mockStmt(null, [], { changes: 1 }),
                mockStmt(null, [], { changes: 1 }),
                mockStmt(null, [], { changes: 1 }),
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(11, accepterId);

            expect(result.success).toBe(true);
        });

        it('rejects when message not found', async () => {
            const unit = mockUnitSequence([mockStmt(null)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(999, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer not found');
        });

        it('rejects when message is not a trade offer', async () => {
            const message = { messageId: 10, senderId, receiverId: accepterId, messageType: 'text', data: {} };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(10, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Not a trade offer');
        });

        it('rejects when accepter is not the recipient', async () => {
            const message = { messageId: 10, senderId, receiverId: 3, messageType: 'trade_offer', data: { itemType: 'stove', itemId: 5, price: 100, status: 'pending' } };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(10, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('You are not the recipient of this offer');
        });

        it('rejects when offer already responded to', async () => {
            const message = { messageId: 10, senderId, receiverId: accepterId, messageType: 'trade_offer', data: { itemType: 'stove', itemId: 5, price: 100, status: 'accepted' } };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(10, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer has already been responded to');
        });

        it('rejects when sender no longer owns the item', async () => {
            const message = { messageId: 10, senderId, receiverId: accepterId, messageType: 'trade_offer', data: { itemType: 'stove', itemId: 5, price: 100, status: 'pending' } };
            const unit = mockUnitSequence([
                mockStmt(message),
                mockStmt({ currentOwnerId: 99 }), // different owner
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(10, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Sender no longer owns this item');
        });

        it('rejects when accepter has insufficient coins', async () => {
            const message = { messageId: 10, senderId, receiverId: accepterId, messageType: 'trade_offer', data: { itemType: 'stove', itemId: 5, price: 1000, status: 'pending' } };
            const unit = mockUnitSequence([
                mockStmt(message),
                mockStmt({ currentOwnerId: senderId }),
                mockStmt({ playerId: accepterId, username: 'buyer', coins: 500 }), // not enough
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(10, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient coins');
        });
    });

    describe('declineTradeOffer', () => {
        it('declines a pending trade offer', async () => {
            const message = { messageId: 10, senderId, receiverId: accepterId, messageType: 'trade_offer', data: { status: 'pending' } };
            const unit = mockUnitSequence([
                mockStmt(message),
                mockStmt(null, [], { changes: 1 }),
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.declineTradeOffer(10, accepterId);

            expect(result.success).toBe(true);
        });

        it('rejects when message not found', async () => {
            const unit = mockUnitSequence([mockStmt(null)]);
            const service = new TradeOfferService(unit);

            const result = await service.declineTradeOffer(999, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer not found');
        });

        it('rejects when already responded to', async () => {
            const message = { messageId: 10, senderId, receiverId: accepterId, messageType: 'trade_offer', data: { status: 'declined' } };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.declineTradeOffer(10, accepterId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer has already been responded to');
        });
    });
});
