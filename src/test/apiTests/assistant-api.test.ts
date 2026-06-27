import request from 'supertest';

process.env.KIMI_API_KEY = 'test-api-key';
process.env.KIMI_CODE_API_KEY = 'test-code-key';

const { app } = require('../../backend/app');

describe('POST /api/assistant/chat', () => {
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
});
