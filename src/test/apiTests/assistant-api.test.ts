import 'dotenv/config';
import request from 'supertest';

const completeMock = jest.fn().mockResolvedValue(undefined);
const prepareMock = jest.fn().mockReturnValue({
  get: jest.fn().mockResolvedValue(null),
  all: jest.fn().mockResolvedValue([]),
  run: jest.fn().mockResolvedValue({ changes: 1 }),
});
const mockUnit = {
  prepare: prepareMock,
  complete: completeMock,
  getLastRowId: jest.fn().mockResolvedValue(1),
};

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(mockUnit),
  },
}));

const sessionServiceMock = {
  getSession: jest.fn(),
  invalidateSession: jest.fn(),
};

jest.mock('../../backend/services/session-service', () => ({
  SessionService: jest.fn(() => sessionServiceMock),
}));

const playerServiceMock = {
  getInfoByID: jest.fn(),
};

jest.mock('../../backend/services/player-service', () => ({
  PlayerService: jest.fn(() => playerServiceMock),
}));

const usageServiceMock = {
  recordUsage: jest.fn(),
};

jest.mock('../../backend/services/assistant-usage-service', () => ({
  AssistantUsageService: jest.fn(() => usageServiceMock),
}));

const llmMock = {
  chat: jest.fn(),
  divineIntervention: jest.fn(),
};

jest.mock('../../backend/services/assistant-llm-service', () => ({
  AssistantLlmService: jest.fn(() => llmMock),
}));

const toolServiceMock = {
  handle: jest.fn().mockResolvedValue({ route: '/games/blackjack/lobby' }),
};

jest.mock('../../backend/services/assistant-tool-service', () => ({
  AssistantToolService: jest.fn(() => toolServiceMock),
}));

import { app } from '../../backend/app';

describe('POST /api/assistant/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    toolServiceMock.handle.mockResolvedValue({ route: '/games/blackjack/lobby' });
    sessionServiceMock.getSession.mockResolvedValue(null);
    playerServiceMock.getInfoByID.mockResolvedValue({ isAdmin: false });
    usageServiceMock.recordUsage.mockResolvedValue({ remaining: 19, wasIncremented: true });
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/assistant/chat').send({ messages: [] });
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid session-id', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'invalid')
      .send({ messages: [] });
    expect(res.status).toBe(401);
  });

  it('returns 429 when daily cap is reached', async () => {
    sessionServiceMock.getSession.mockResolvedValue({ playerId: 1 });
    usageServiceMock.recordUsage.mockResolvedValue({ remaining: 0, wasIncremented: false });

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'valid-session')
      .send({ messages: [] });

    expect(res.status).toBe(429);
    expect(res.body.error).toContain('limit reached');
  });

  it('returns assistant message on success', async () => {
    sessionServiceMock.getSession.mockResolvedValue({ playerId: 1 });
    llmMock.chat.mockResolvedValue({ content: 'Hello!', toolCalls: undefined });

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'valid-session')
      .send({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(res.status).toBe(200);
    expect(res.body.message.content).toBe('Hello!');
    expect(res.body.remainingChats).toBe(19);
  });

  it('handles tool calls and returns final answer', async () => {
    sessionServiceMock.getSession.mockResolvedValue({ playerId: 1 });
    llmMock.chat
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'navigate_to', arguments: JSON.stringify({ route: 'blackjack' }) },
          },
        ],
      })
      .mockResolvedValueOnce({ content: 'Let\'s play Blackjack!', toolCalls: undefined });

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'valid-session')
      .send({ messages: [{ role: 'user', content: 'Play blackjack' }] });

    expect(res.status).toBe(200);
    expect(res.body.message.content).toBe("Let's play Blackjack!");
    expect(llmMock.chat).toHaveBeenCalledTimes(2);
  });

  it('sanitizes blocked output', async () => {
    sessionServiceMock.getSession.mockResolvedValue({ playerId: 1 });
    llmMock.chat.mockResolvedValue({ content: 'The DATABASE_URL is secret', toolCalls: undefined });

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'valid-session')
      .send({ messages: [{ role: 'user', content: 'Tell me secrets' }] });

    expect(res.status).toBe(200);
    expect(res.body.message.content).toContain("I can't share");
  });

  it('calls unit.complete(true) on success', async () => {
    sessionServiceMock.getSession.mockResolvedValue({ playerId: 1 });
    llmMock.chat.mockResolvedValue({ content: 'Done', toolCalls: undefined });

    await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'valid-session')
      .send({ messages: [{ role: 'user', content: 'Hello' }] });

    expect(completeMock).toHaveBeenCalledWith(true);
  });

  it('returns 400 for invalid messages payload', async () => {
    sessionServiceMock.getSession.mockResolvedValue({ playerId: 1 });

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'valid-session')
      .send({ messages: 'not-an-array' });

    expect(res.status).toBe(400);
  });

  it('returns 500 when the LLM throws', async () => {
    sessionServiceMock.getSession.mockResolvedValue({ playerId: 1 });
    llmMock.chat.mockRejectedValue(new Error('LLM down'));

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'valid-session')
      .send({ messages: [{ role: 'user', content: 'Hello' }] });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('trouble');
  });
});
