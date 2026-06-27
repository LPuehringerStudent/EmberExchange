import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/require-auth';
import { Unit } from '../utils/unit';
import { AssistantUsageService } from '../services/assistant-usage-service';
import { AssistantLlmService } from '../services/assistant-llm-service';
import { AssistantToolService } from '../services/assistant-tool-service';
import { sanitizeAssistantOutput, containsSensitivePattern } from '../services/assistant-sanitizer';
import { logSecurityEvent } from '../services/security-event-service';
import { PlayerService } from '../services/player-service';
import OpenAI from 'openai';

export const assistantRouter = express.Router();
const DAILY_CAP = parseInt(process.env.ASSISTANT_DAILY_CAP ?? '20', 10);
const llm = new AssistantLlmService();

assistantRouter.post('/chat', requireAuth, async (req: Request, res: Response) => {
  const unit = await Unit.create(false);
  try {
    const playerId = req.playerId!;
    const playerService = new PlayerService(unit);
    const player = await playerService.getInfoByID(playerId);
    const isAdmin = player?.isAdmin ?? false;

    const usageService = new AssistantUsageService(unit);
    const usage = await usageService.recordUsage(playerId, DAILY_CAP, isAdmin);

    if (usage.remaining !== null && usage.remaining <= 0) {
      res.status(429).json({ error: 'Daily assistant limit reached. Try again tomorrow.' });
      return;
    }

    const messages = (req.body.messages ?? []) as OpenAI.Chat.ChatCompletionMessageParam[];
    const toolService = new AssistantToolService(llm, unit, { playerId, isAdmin });

    let response = await llm.chat(messages);

    if (response.toolCalls && response.toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: response.content,
        tool_calls: response.toolCalls,
      });

      for (const call of response.toolCalls) {
        if (call.type !== 'function') continue;
        const args = JSON.parse(call.function.arguments);
        const result = await toolService.handle(call.function.name, args);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      response = await llm.chat(messages);
    }

    const finalText = response.content || '';
    if (containsSensitivePattern(finalText)) {
      logSecurityEvent({
        ipAddress: req.ip ?? '',
        userAgent: req.headers['user-agent'] as string | undefined,
        eventType: 'assistant_sanitizer_block',
        path: req.path,
        method: req.method,
        details: 'Blocked assistant output containing sensitive pattern.',
      });
      res.json({
        message: { role: 'assistant', content: sanitizeAssistantOutput(finalText), suggestions: [] },
        remainingChats: usage.remaining,
      });
      return;
    }

    res.json({
      message: { role: 'assistant', content: finalText, suggestions: [] },
      remainingChats: usage.remaining,
    });
  } catch (err) {
    console.error('[assistant] chat error', err);
    res.status(500).json({ error: 'The assistant is having trouble. Please try again.' });
  } finally {
    await unit.complete(true);
  }
});
