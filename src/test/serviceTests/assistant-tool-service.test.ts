import { AssistantToolService } from '../../backend/services/assistant-tool-service';
import { AssistantLlmService } from '../../backend/services/assistant-llm-service';
import { Unit } from '../../backend/utils/unit';

jest.mock('../../backend/services/assistant-llm-service');

describe('AssistantToolService', () => {
  it('navigate_to returns route mapping', () => {
    const service = new AssistantToolService({} as AssistantLlmService, {} as Unit, { playerId: 1, isAdmin: false });
    expect(service.handle('navigate_to', { route: 'blackjack' })).toEqual({ route: '/games/blackjack/lobby' });
  });
});
