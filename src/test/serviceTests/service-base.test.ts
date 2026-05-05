import { ServiceBase } from '../../backend/services/service-base';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';

class TestService extends ServiceBase {
    constructor(unit: any) {
        super(unit);
    }

    public testExecute(stmt: any): [boolean, number] {
        return this.executeStmt(stmt);
    }
}

describe('ServiceBase', () => {
    let mockUnit: MockUnit;
    let service: TestService;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new TestService(mockUnit as any);
    });

    describe('executeStmt', () => {
        it('should return success true and correct ID when changes equals 1', async () => {
            const mockStmt = {
                run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 })
            };

            const [success, id] = service.testExecute(mockStmt);

            expect(success).toBe(true);
            expect(id).toBe(42);
        });

        it('should return success false when changes equals 0', async () => {
            const mockStmt = {
                run: jest.fn().mockReturnValue({ changes: 0, lastInsertRowid: 99 })
            };

            const [success, id] = service.testExecute(mockStmt);

            expect(success).toBe(false);
            expect(id).toBe(99);
        });

        it('should handle bigint lastInsertRowid by converting to number', async () => {
            const mockStmt = {
                run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: BigInt(123) })
            };

            const [success, id] = service.testExecute(mockStmt);

            expect(success).toBe(true);
            expect(id).toBe(123);
            expect(typeof id).toBe('number');
        });

        it('should handle large bigint values correctly', async () => {
            const largeId = BigInt(Number.MAX_SAFE_INTEGER);
            const mockStmt = {
                run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: largeId })
            };

            const [success, id] = service.testExecute(mockStmt);

            expect(success).toBe(true);
            expect(id).toBe(Number.MAX_SAFE_INTEGER);
        });
    });
});