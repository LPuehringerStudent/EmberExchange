import { ChatMessageService } from '../../backend/services/chat-message-service';
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

describe('ChatMessageService', () => {
    describe('getConversation', () => {
        it('returns messages between two players', async () => {
            const messages = [
                { messageId: 1, senderId: 1, receiverId: 2, content: 'Hello', sentAt: '2026-01-01', isRead: 0, messageType: 'text', data: '{}' },
                { messageId: 2, senderId: 2, receiverId: 1, content: 'Hi!', sentAt: '2026-01-02', isRead: 0, messageType: 'text', data: '{}' },
            ];
            const unit = mockUnitSequence([mockStmt(null, messages)]);
            const service = new ChatMessageService(unit);

            const result = await service.getConversation(1, 2);

            expect(result).toHaveLength(2);
            expect(result[0].messageId).toBe(1);
        });

        it('returns empty array when no messages exist', async () => {
            const unit = mockUnitSequence([mockStmt(null, [])]);
            const service = new ChatMessageService(unit);

            const result = await service.getConversation(1, 2);

            expect(result).toEqual([]);
        });
    });

    describe('getConversationPaginated', () => {
        it('returns paginated messages in ascending order', async () => {
            const messages = [
                { messageId: 3, senderId: 1, receiverId: 2, content: 'Third', sentAt: '2026-01-03', isRead: 0, messageType: 'text', data: '{}' },
                { messageId: 2, senderId: 2, receiverId: 1, content: 'Second', sentAt: '2026-01-02', isRead: 0, messageType: 'text', data: '{}' },
            ];
            const unit = mockUnitSequence([mockStmt(null, messages)]);
            const service = new ChatMessageService(unit);

            const result = await service.getConversationPaginated(1, 2, 20, 0);

            expect(result).toHaveLength(2);
            expect(result[0].messageId).toBe(2); // reversed back to ascending
            expect(result[1].messageId).toBe(3);
        });
    });

    describe('create', () => {
        it('creates a text message successfully', async () => {
            const unit = mockUnitSequence([mockStmt(null, [], { changes: 1 })]);
            const service = new ChatMessageService(unit);

            const [success, id] = await service.create(1, 2, 'Hello there');

            expect(success).toBe(true);
            expect(id).toBe(42);
        });

        it('creates a trade offer message with data', async () => {
            const unit = mockUnitSequence([mockStmt(null, [], { changes: 1 })]);
            const service = new ChatMessageService(unit);

            const data = { itemType: 'stove', itemId: 5, price: 1000, status: 'pending' };
            const [success, id] = await service.create(1, 2, 'Trade offer', 'trade_offer', data);

            expect(success).toBe(true);
            expect(id).toBe(42);
        });

        it('creates a global message when receiverId is null', async () => {
            const unit = mockUnitSequence([mockStmt(null, [], { changes: 1 })]);
            const service = new ChatMessageService(unit);

            const [success, id] = await service.create(1, null, 'Global hello');

            expect(success).toBe(true);
            expect(id).toBe(42);
        });
    });

    describe('markAsRead', () => {
        it('marks a message as read', async () => {
            const unit = mockUnitSequence([mockStmt(null, [], { changes: 1 })]);
            const service = new ChatMessageService(unit);

            const result = await service.markAsRead(5);

            expect(result).toBe(true);
        });

        it('returns false when message not found', async () => {
            const unit = mockUnitSequence([mockStmt(null, [], { changes: 0 })]);
            const service = new ChatMessageService(unit);

            const result = await service.markAsRead(999);

            expect(result).toBe(false);
        });
    });

    describe('markConversationAsRead', () => {
        it('marks all unread messages as read', async () => {
            const unit = mockUnitSequence([mockStmt(null, [], { changes: 3 })]);
            const service = new ChatMessageService(unit);

            const count = await service.markConversationAsRead(1, 2);

            expect(count).toBe(3);
        });
    });

    describe('getUnreadByReceiver', () => {
        it('returns unread messages for a player', async () => {
            const messages = [
                { messageId: 1, senderId: 2, receiverId: 1, content: 'Hey', isRead: 0 },
            ];
            const unit = mockUnitSequence([mockStmt(null, messages)]);
            const service = new ChatMessageService(unit);

            const result = await service.getUnreadByReceiver(1);

            expect(result).toHaveLength(1);
            expect(result[0].messageId).toBe(1);
        });
    });

    describe('countUnread', () => {
        it('returns the unread count', async () => {
            const unit = mockUnitSequence([mockStmt({ count: 7 })]);
            const service = new ChatMessageService(unit);

            const result = await service.countUnread(1);

            expect(result).toBe(7);
        });

        it('returns 0 when no unread messages', async () => {
            const unit = mockUnitSequence([mockStmt({ count: 0 })]);
            const service = new ChatMessageService(unit);

            const result = await service.countUnread(1);

            expect(result).toBe(0);
        });
    });

    describe('delete', () => {
        it('deletes a message', async () => {
            const unit = mockUnitSequence([mockStmt(null, [], { changes: 1 })]);
            const service = new ChatMessageService(unit);

            const result = await service.delete(5);

            expect(result).toBe(true);
        });
    });

    describe('getById', () => {
        it('returns a message by id', async () => {
            const msg = { messageId: 5, senderId: 1, receiverId: 2, content: 'Test' };
            const unit = mockUnitSequence([mockStmt(msg)]);
            const service = new ChatMessageService(unit);

            const result = await service.getById(5);

            expect(result).not.toBeNull();
            expect(result!.messageId).toBe(5);
        });

        it('returns null for missing message', async () => {
            const unit = mockUnitSequence([mockStmt(null)]);
            const service = new ChatMessageService(unit);

            const result = await service.getById(999);

            expect(result).toBeNull();
        });
    });
});
