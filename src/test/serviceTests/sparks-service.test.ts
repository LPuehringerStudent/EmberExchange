import { SparksService } from '../../backend/services/sparks-service';
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
    const unit = {
        prepare: jest.fn().mockImplementation(() => {
            const stmt = stmts[Math.min(callIndex, stmts.length - 1)];
            callIndex++;
            return stmt;
        }),
        getLastRowId: jest.fn().mockResolvedValue(1),
    };
    return unit as unknown as Unit;
}

describe('SparksService', () => {
    it('cleans marketplace history before deleting a salvaged stove', async () => {
        const reusableRunStmt = mockStmt();
        const unit = mockUnitSequence([
            mockStmt({
                stoveId: 55,
                typeId: 7,
                currentOwnerId: 1,
                name: 'Test Stove',
                rarity: 'rare',
                heatLevel: 0.5,
            }),
            mockStmt({ count: 0 }),
            mockStmt({ playerId: 1, username: 'Player', sparks: 20 }),
            mockStmt({ tableName: null }),
            reusableRunStmt,
        ]);
        const service = new SparksService(unit);

        const result = await service.salvageStove(1, 55);
        const sqlCalls = (unit.prepare as jest.Mock).mock.calls.map(([sql]) => String(sql));

        expect(result.success).toBe(true);
        expect(sqlCalls).toContain("SELECT to_regclass('public.pinnedstove') AS tableName");
        expect(sqlCalls).not.toContain('DELETE FROM PinnedStove WHERE stoveId = @stoveId');

        const tradeCleanupIndex = sqlCalls.findIndex(sql => sql.includes('DELETE FROM Trade WHERE listingId IN'));
        const listingCleanupIndex = sqlCalls.findIndex(sql => sql === 'DELETE FROM Listing WHERE stoveId = @stoveId');
        const stoveDeleteIndex = sqlCalls.findIndex(sql => sql === 'DELETE FROM Stove WHERE stoveId = @stoveId');

        expect(tradeCleanupIndex).toBeGreaterThan(-1);
        expect(listingCleanupIndex).toBeGreaterThan(tradeCleanupIndex);
        expect(stoveDeleteIndex).toBeGreaterThan(listingCleanupIndex);
        expect(sqlCalls).not.toContain("DELETE FROM Listing WHERE stoveId = @stoveId AND status = 'cancelled'");
    });
});
