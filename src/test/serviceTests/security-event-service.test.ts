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
import { logSecurityEvent, purgeOldSecurityEvents } from '../../backend/services/security-event-service';

describe('security-event-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStmt.run.mockResolvedValue({ changes: 4 });
    mockUnit.complete.mockResolvedValue(undefined);
    (Unit.create as jest.Mock).mockResolvedValue(mockUnit);
  });

  it('logs security event data and commits the unit', async () => {
    await logSecurityEvent({
      ipAddress: '1.2.3.4',
      eventType: 'failed_login',
      path: '/login',
      method: 'POST',
    });

    expect(Unit.create).toHaveBeenCalledWith(true);
    expect(mockUnit.prepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO SecurityEvent'),
      expect.objectContaining({
        ipAddress: '1.2.3.4',
        eventType: 'failed_login',
        userAgent: null,
        playerId: null,
        details: null,
      })
    );
    expect(mockUnit.complete).toHaveBeenCalledWith(true);
  });

  it('purges old events and returns deleted count', async () => {
    const result = await purgeOldSecurityEvents(30);

    expect(Unit.create).toHaveBeenCalledWith(false);
    expect(result).toBe(4);
    expect(mockUnit.complete).toHaveBeenCalledWith(true);
  });
});
