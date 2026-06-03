import { SupportService } from '../../backend/services/support-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(undefined),
    all: jest.fn().mockResolvedValue([]),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

describe('SupportService', () => {
  describe('create', () => {
    it('returns [true, id] when a support ticket is created', async () => {
      const stmt = mockStmt({ changes: 1 });
      const unit = mockUnit(stmt);
      const service = new SupportService(unit);

      const result = await service.create(1, 'Bug', 'Something broke', 'bug', 'high');

      expect(result).toEqual([true, 1]);
      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO SupportTicket'),
        {
          reporterId: 1,
          title: 'Bug',
          description: 'Something broke',
          type: 'bug',
          priority: 'high',
        }
      );
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt({ changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new SupportService(unit);

      const result = await service.create(1, 'Bug', 'Something broke', 'bug', 'high');

      expect(result).toEqual([false, 0]);
    });
  });
});
