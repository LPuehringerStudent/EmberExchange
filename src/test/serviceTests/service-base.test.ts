import { ServiceBase } from '../../backend/services/service-base';
import { ITypedStatement, Unit } from '../../backend/utils/unit';

// ---------------------------------------------------------------------------
// Concrete subclass to expose the protected executeStmt method for testing
// ---------------------------------------------------------------------------

class TestService extends ServiceBase {
  constructor(unit: Unit) {
    super(unit);
  }

  async callExecuteStmt(stmt: ITypedStatement): Promise<[boolean, number]> {
    return this.executeStmt(stmt);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockStmt(changes: number) {
  return {
    run: jest.fn().mockResolvedValue({ changes }),
    get: jest.fn(),
    all: jest.fn(),
  } as unknown as ITypedStatement;
}

function mockUnit(lastRowId: number) {
  return {
    prepare: jest.fn(),
    getLastRowId: jest.fn().mockResolvedValue(lastRowId),
  } as unknown as Unit;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServiceBase', () => {

  describe('executeStmt', () => {

    it('returns [true, id] when exactly one row is changed', async () => {
      const stmt = mockStmt(1);
      const unit = mockUnit(42);
      const service = new TestService(unit);

      const [success, id] = await service.callExecuteStmt(stmt);

      expect(success).toBe(true);
      expect(id).toBe(42);
    });

    it('returns [false, id] when zero rows are changed', async () => {
      const stmt = mockStmt(0);
      const unit = mockUnit(0);
      const service = new TestService(unit);

      const [success, id] = await service.callExecuteStmt(stmt);

      expect(success).toBe(false);
      expect(id).toBe(0);
    });

    it('returns [false, id] when more than one row is changed', async () => {
      const stmt = mockStmt(3);
      const unit = mockUnit(7);
      const service = new TestService(unit);

      const [success, id] = await service.callExecuteStmt(stmt);

      expect(success).toBe(false);
      expect(id).toBe(7);
    });

    it('calls stmt.run() exactly once', async () => {
      const stmt = mockStmt(1);
      const unit = mockUnit(1);
      const service = new TestService(unit);

      await service.callExecuteStmt(stmt);

      expect(stmt.run).toHaveBeenCalledTimes(1);
    });

    it('calls unit.getLastRowId() exactly once after stmt.run()', async () => {
      const stmt = mockStmt(1);
      const unit = mockUnit(1);
      const service = new TestService(unit);

      await service.callExecuteStmt(stmt);

      expect(unit.getLastRowId).toHaveBeenCalledTimes(1);
    });

    it('returns the id from getLastRowId even when success is false', async () => {
      const stmt = mockStmt(0);
      const unit = mockUnit(99);
      const service = new TestService(unit);

      const [success, id] = await service.callExecuteStmt(stmt);

      expect(success).toBe(false);
      expect(id).toBe(99);
    });
  });
});