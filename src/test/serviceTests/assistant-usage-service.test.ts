import 'dotenv/config';
import { AssistantUsageService } from '../../backend/services/assistant-usage-service';
import { Unit } from '../../backend/utils/unit';

describe('AssistantUsageService', () => {
  it('increments usage and returns remaining', async () => {
    const unit = await Unit.create(false);
    try {
      const service = new AssistantUsageService(unit);
      const first = await service.recordUsage(1, 20);
      expect(first.remaining).toBe(19);
      const second = await service.recordUsage(1, 20);
      expect(second.remaining).toBe(18);
    } finally {
      await unit.complete(false);
    }
  });

  it('admins bypass the cap', async () => {
    const unit = await Unit.create(false);
    try {
      const service = new AssistantUsageService(unit);
      const result = await service.recordUsage(1, 20, true);
      expect(result.remaining).toBeNull();
      expect(result.wasIncremented).toBe(false);
    } finally {
      await unit.complete(false);
    }
  });
});
