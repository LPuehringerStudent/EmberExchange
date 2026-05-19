import { NotificationService } from '../../backend/services/notification-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
    return {
        get: jest.fn().mockResolvedValue(getResult),
        all: jest.fn().mockResolvedValue(allResult),
        run: jest.fn().mockResolvedValue(runResult),
    };
}

function mockUnit(stmt = mockStmt()) {
    return {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(1),
    } as unknown as Unit;
}

describe('NotificationService', () => {
    describe('getByPlayerId', () => {
        it('returns notifications for a player', async () => {
            const mockNotifications = [
                {
                    notificationId: 1,
                    playerId: 1,
                    type: 'system',
                    title: 'Welcome',
                    message: 'Hello',
                    data: '{}',
                    isRead: 0,
                    createdAt: '2024-01-01'
                }
            ];
            const unit = mockUnit(mockStmt(null, mockNotifications));
            const service = new NotificationService(unit);

            const result = await service.getByPlayerId(1);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Welcome');
        });
    });

    describe('getUnreadCount', () => {
        it('returns unread count', async () => {
            const unit = mockUnit(mockStmt({ count: 5 }));
            const service = new NotificationService(unit);

            const result = await service.getUnreadCount(1);
            expect(result).toBe(5);
        });

        it('returns 0 when no unread notifications', async () => {
            const unit = mockUnit(mockStmt({ count: 0 }));
            const service = new NotificationService(unit);

            const result = await service.getUnreadCount(1);
            expect(result).toBe(0);
        });
    });

    describe('create', () => {
        it('creates a system notification regardless of settings', async () => {
            const unit = mockUnit();
            const service = new NotificationService(unit);

            const [success, id] = await service.create(1, 'system', 'Title', 'Message');
            expect(success).toBe(true);
            expect(id).toBe(1);
        });

        it('skips chat_message notification when notifyChatMessages is disabled', async () => {
            const settingsStmt = mockStmt({
                playerid: 1,
                notifyfriendrequests: 1,
                notifychatmessages: 0,
                notifytradeoffers: 1,
                notifydailyreward: 1
            });
            const insertStmt = mockStmt();
            let callCount = 0;
            const unit = mockUnit();
            (unit.prepare as jest.Mock).mockImplementation(() => {
                callCount++;
                if (callCount === 1) return settingsStmt;
                return insertStmt;
            });

            const service = new NotificationService(unit);
            const [success, id] = await service.create(1, 'chat_message', 'Title', 'Message');
            expect(success).toBe(false);
            expect(id).toBe(0);
        });

        it('creates chat_message notification when notifyChatMessages is enabled', async () => {
            const settingsStmt = mockStmt({
                playerid: 1,
                notifyfriendrequests: 1,
                notifychatmessages: 1,
                notifytradeoffers: 1,
                notifydailyreward: 1
            });
            const insertStmt = mockStmt();
            let callCount = 0;
            const unit = mockUnit();
            (unit.prepare as jest.Mock).mockImplementation(() => {
                callCount++;
                if (callCount === 1) return settingsStmt;
                return insertStmt;
            });

            const service = new NotificationService(unit);
            const [success, id] = await service.create(1, 'chat_message', 'Title', 'Message');
            expect(success).toBe(true);
            expect(id).toBe(1);
        });
    });

    describe('markAsRead', () => {
        it('marks a notification as read', async () => {
            const unit = mockUnit();
            const service = new NotificationService(unit);

            const result = await service.markAsRead(1);
            expect(result).toBe(true);
        });
    });

    describe('markAllAsRead', () => {
        it('marks all notifications as read', async () => {
            const unit = mockUnit(mockStmt(null, [], { changes: 3 }));
            const service = new NotificationService(unit);

            const result = await service.markAllAsRead(1);
            expect(result).toBe(3);
        });
    });

    describe('delete', () => {
        it('deletes a notification', async () => {
            const unit = mockUnit();
            const service = new NotificationService(unit);

            const result = await service.delete(1);
            expect(result).toBe(true);
        });
    });
});
