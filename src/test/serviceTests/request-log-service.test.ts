const mockStmt = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

const mockUnit = {
  prepare: jest.fn().mockReturnValue(mockStmt),
  complete: jest.fn(),
};

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn(),
  },
}));

import { Unit } from '../../backend/utils/unit';
import { logRequest, purgeOldRequestLogs, queryRequestLogs } from '../../backend/services/request-log-service';

describe('request-log-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStmt.all.mockResolvedValue([]);
    mockStmt.run.mockResolvedValue({ changes: 2 });
    mockUnit.complete.mockResolvedValue(undefined);
    (Unit.create as jest.Mock).mockResolvedValue(mockUnit);
  });

  it('logs request data and commits the unit', async () => {
    await logRequest({
      ipAddress: '1.2.3.4',
      method: 'GET',
      path: '/api/test',
      statusCode: 200,
      durationMs: 12,
    });

    expect(Unit.create).toHaveBeenCalledWith(true);
    expect(mockUnit.prepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO RequestLog'),
      expect.objectContaining({ userAgent: null, playerId: null })
    );
    expect(mockUnit.complete).toHaveBeenCalledWith(true);
  });

  it('queries request logs with filters and capped limit', async () => {
    mockStmt.all.mockResolvedValue([{ logId: 1 }]);

    const result = await queryRequestLogs(mockUnit as any, {
      playerId: 1,
      ipAddress: '1.2.3.4',
      path: '/api',
      since: '2026-01-01',
      until: '2026-01-02',
      limit: 5000,
    });

    expect(result).toEqual([{ logId: 1 }]);
    expect(mockUnit.prepare).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 1000'),
      expect.objectContaining({ path: '%/api%' })
    );
  });

  it('purges old request logs and returns deleted count', async () => {
    const result = await purgeOldRequestLogs(12);

    expect(Unit.create).toHaveBeenCalledWith(false);
    expect(result).toBe(2);
    expect(mockUnit.complete).toHaveBeenCalledWith(true);
  });
});
