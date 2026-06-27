import { ServiceBase } from './service-base';
import { Unit } from '../utils/unit';

export interface UsageResult {
  remaining: number | null;
  wasIncremented: boolean;
}

export class AssistantUsageService extends ServiceBase {
  constructor(unit: Unit) {
    super(unit);
  }

  async recordUsage(playerId: number, dailyCap: number, isAdmin = false): Promise<UsageResult> {
    if (isAdmin) {
      return { remaining: null, wasIncremented: false };
    }

    await this.ensureReset(playerId);

    const update = this.unit.prepare<{ chat_count: number }>(
      `UPDATE AssistantUsage SET chat_count = chat_count + 1 WHERE playerId = @playerId RETURNING chat_count`,
      { playerId }
    );
    const row = await update.get();
    const count = row?.chat_count ?? 0;
    const remaining = Math.max(0, dailyCap - count);
    return { remaining, wasIncremented: true };
  }

  async getRemaining(playerId: number, dailyCap: number, isAdmin = false): Promise<number | null> {
    if (isAdmin) return null;
    await this.ensureReset(playerId);
    const stmt = this.unit.prepare<{ chat_count: number }>(
      `SELECT chat_count FROM AssistantUsage WHERE playerId = @playerId`,
      { playerId }
    );
    const row = await stmt.get();
    const count = row?.chat_count ?? 0;
    return Math.max(0, dailyCap - count);
  }

  private async ensureReset(playerId: number): Promise<void> {
    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);

    const upsert = this.unit.prepare<unknown>(
      `INSERT INTO AssistantUsage (playerId, chat_count, reset_at)
       VALUES (@playerId, 0, @midnight)
       ON CONFLICT (playerId)
       DO UPDATE SET
         chat_count = CASE WHEN AssistantUsage.reset_at < @midnight THEN 0 ELSE AssistantUsage.chat_count END,
         reset_at = CASE WHEN AssistantUsage.reset_at < @midnight THEN @midnight ELSE AssistantUsage.reset_at END`,
      { playerId, midnight }
    );
    await upsert.run();
  }
}
