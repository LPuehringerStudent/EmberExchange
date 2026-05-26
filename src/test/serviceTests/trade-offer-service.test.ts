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
        getLastRowId: jest.fn().mockResolvedValue(42),
    } as unknown as Unit;
}

describe('TradeOfferService', () => {
    describe('acceptTradeOffer', () => {
        it('accepts a valid stove trade offer', async () => {
            const message = {
                messageId: 1,
                senderId: 2,
                receiverId: 1,
                messageType: 'trade_offer',
                data: { itemType: 'stove', itemId: 10, price: 500, status: 'pending' },
            };
            const unit = mockUnitSequence([
                mockStmt(message), // getById
                mockStmt({ currentOwnerId: 2 }), // stove ownership
                mockStmt({ playerId: 1, username: 'buyer', coins: 1000 }), // accepter
                mockStmt({ playerId: 2, username: 'seller', coins: 500 }), // sender
                mockStmt(), // update accepter coins
                mockStmt(), // update sender coins
                mockStmt(), // update stove owner
                mockStmt(), // insert ownership
                mockStmt(), // coin tx buyer
                mockStmt(), // coin tx seller
                mockStmt(), // update message status
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(1, 1);

            expect(result.success).toBe(true);
        });

        it('accepts a valid lootbox trade offer', async () => {
            const message = {
                messageId: 2,
                senderId: 2,
                receiverId: 1,
                messageType: 'trade_offer',
                data: { itemType: 'lootbox', itemId: 5, price: 200, status: 'pending' },
            };
            const unit = mockUnitSequence([
                mockStmt(message), // getById
                mockStmt({ playerId: 5 }), // lootbox ownership (sender owns it via playerId=5? No, the query checks playerId field)
                mockStmt({ playerId: 1, username: 'buyer', coins: 500 }), // accepter
                mockStmt({ playerId: 2, username: 'seller', coins: 100 }), // sender
                mockStmt(), // update accepter coins
                mockStmt(), // update sender coins
                mockStmt(), // update lootbox owner
                mockStmt(), // coin tx buyer
                mockStmt(), // coin tx seller
                mockStmt(), // update message status
            ]);
            const service = new TradeOfferService(unit);

            // Fix: lootbox ownership check returns { playerId: 2 } for sender
            const unit2 = mockUnitSequence([
                mockStmt(message),
                mockStmt({ playerId: 2 }), // sender owns lootbox
                mockStmt({ playerId: 1, username: 'buyer', coins: 500 }),
                mockStmt({ playerId: 2, username: 'seller', coins: 100 }),
                mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt(),
            ]);
            const service2 = new TradeOfferService(unit2);
            const result = await service2.acceptTradeOffer(2, 1);

            expect(result.success).toBe(true);
        });

        it('rejects when trade offer not found', async () => {
            const unit = mockUnitSequence([mockStmt(null)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(999, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer not found');
        });

        it('rejects when message is not a trade offer', async () => {
            const message = { messageId: 1, senderId: 2, receiverId: 1, messageType: 'text', data: {} };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(1, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Not a trade offer');
        });

        it('rejects when user is not the recipient', async () => {
            const message = {
                messageId: 1, senderId: 2, receiverId: 3,
                messageType: 'trade_offer',
                data: { itemType: 'stove', itemId: 10, price: 500, status: 'pending' },
            };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(1, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('You are not the recipient of this offer');
        });

        it('rejects when offer already responded to', async () => {
            const message = {
                messageId: 1, senderId: 2, receiverId: 1,
                messageType: 'trade_offer',
                data: { itemType: 'stove', itemId: 10, price: 500, status: 'accepted' },
            };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(1, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer has already been responded to');
        });

        it('rejects when sender no longer owns the item', async () => {
            const message = {
                messageId: 1, senderId: 2, receiverId: 1,
                messageType: 'trade_offer',
                data: { itemType: 'stove', itemId: 10, price: 500, status: 'pending' },
            };
            const unit = mockUnitSequence([
                mockStmt(message),
                mockStmt({ currentOwnerId: 3 }), // someone else owns it now
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(1, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Sender no longer owns this item');
        });

        it('rejects when accepter has insufficient coins', async () => {
            const message = {
                messageId: 1, senderId: 2, receiverId: 1,
                messageType: 'trade_offer',
                data: { itemType: 'stove', itemId: 10, price: 500, status: 'pending' },
            };
            const unit = mockUnitSequence([
                mockStmt(message),
                mockStmt({ currentOwnerId: 2 }),
                mockStmt({ playerId: 1, username: 'buyer', coins: 100 }), // not enough
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.acceptTradeOffer(1, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient coins');
        });
    });

    describe('declineTradeOffer', () => {
        it('declines a pending trade offer', async () => {
            const message = {
                messageId: 1, senderId: 2, receiverId: 1,
                messageType: 'trade_offer',
                data: { itemType: 'stove', itemId: 10, price: 500, status: 'pending' },
            };
            const unit = mockUnitSequence([
                mockStmt(message),
                mockStmt(), // update status
            ]);
            const service = new TradeOfferService(unit);

            const result = await service.declineTradeOffer(1, 1);

            expect(result.success).toBe(true);
        });

        it('rejects when trade offer not found', async () => {
            const unit = mockUnitSequence([mockStmt(null)]);
            const service = new TradeOfferService(unit);

            const result = await service.declineTradeOffer(999, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer not found');
        });

        it('rejects when user is not the recipient', async () => {
            const message = {
                messageId: 1, senderId: 2, receiverId: 3,
                messageType: 'trade_offer',
                data: { status: 'pending' },
            };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.declineTradeOffer(1, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('You are not the recipient of this offer');
        });

        it('rejects when offer already responded to', async () => {
            const message = {
                messageId: 1, senderId: 2, receiverId: 1,
                messageType: 'trade_offer',
                data: { status: 'declined' },
            };
            const unit = mockUnitSequence([mockStmt(message)]);
            const service = new TradeOfferService(unit);

            const result = await service.declineTradeOffer(1, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Trade offer has already been responded to');
        });
    });
});
