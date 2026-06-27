import { AssistantToolService, ToolContext } from '../../backend/services/assistant-tool-service';
import { AssistantLlmService } from '../../backend/services/assistant-llm-service';
import { Unit } from '../../backend/utils/unit';

jest.mock('../../backend/services/assistant-llm-service');

function mockStmt(getResult: unknown = null) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue([]),
    run: jest.fn().mockResolvedValue({ changes: 1 }),
  };
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

describe('AssistantToolService', () => {
  const ctx: ToolContext = { playerId: 42, isAdmin: false };

  it('navigate_to returns route mapping', async () => {
    const service = new AssistantToolService({} as AssistantLlmService, mockUnit(), ctx);
    const result = await service.handle('navigate_to', { route: 'blackjack' });
    expect(result).toEqual({ route: '/games/blackjack/lobby' });
  });

  it('highlight_element returns selector', async () => {
    const service = new AssistantToolService({} as AssistantLlmService, mockUnit(), ctx);
    const result = await service.handle('highlight_element', { target: 'marketplace' });
    expect(result).toEqual({ target: 'marketplace', selector: '[data-tour="marketplace"]' });
  });

  it('trigger_action acknowledges', async () => {
    const service = new AssistantToolService({} as AssistantLlmService, mockUnit(), ctx);
    const result = await service.handle('trigger_action', { action: 'open_quests' });
    expect(result).toEqual({ action: 'open_quests', acknowledged: true });
  });

  it('get_player_summary queries the database', async () => {
    const stmt = mockStmt({ coins: 1234, sparks: 56 });
    const unit = mockUnit(stmt);
    const service = new AssistantToolService({} as AssistantLlmService, unit, ctx);
    const result = await service.handle('get_player_summary', {});
    expect(result).toEqual({ coins: 1234, sparks: 56 });
    expect(unit.prepare).toHaveBeenCalledWith(
      expect.stringContaining('SELECT coins, sparks FROM Player WHERE playerId = @playerId'),
      { playerId: 42 }
    );
  });

  it('divine_intervention delegates to the LLM service', async () => {
    const llm = { divineIntervention: jest.fn().mockResolvedValue('Code answer') } as unknown as AssistantLlmService;
    const service = new AssistantToolService(llm, mockUnit(), ctx);
    const result = await service.handle('divine_intervention', { question: 'How do lootboxes work?' });
    expect(result).toEqual({ answer: 'Code answer' });
    expect(llm.divineIntervention).toHaveBeenCalledWith('How do lootboxes work?');
  });

  it('returns error for unknown tools', async () => {
    const service = new AssistantToolService({} as AssistantLlmService, mockUnit(), ctx);
    const result = await service.handle('unknown_tool', {});
    expect(result).toEqual({ error: 'Unknown tool' });
  });
});
