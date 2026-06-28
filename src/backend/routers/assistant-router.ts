import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth } from "../middleware/require-auth";
import { assistantBurstLimiter } from "../middleware/rate-limiter";
import { Unit } from "../utils/unit";
import { AssistantUsageService } from "../services/assistant-usage-service";
import { AssistantLlmService } from "../services/assistant-llm-service";
import { AssistantToolService } from "../services/assistant-tool-service";
import { sanitizeAssistantOutput, containsSensitivePattern } from "../services/assistant-sanitizer";
import { logSecurityEvent } from "../services/security-event-service";
import { PlayerService } from "../services/player-service";
import { getClientIp } from "../utils/bot-trap";
import OpenAI from "openai";

export const assistantRouter = express.Router();
const DAILY_CAP = parseInt(process.env.ASSISTANT_DAILY_CAP ?? "20", 10);
const llm = new AssistantLlmService();

function pushSuggestion(
    suggestions: Array<{ label: string; action: { type: string; [key: string]: unknown } }>,
    toolName: string,
    result: Record<string, unknown>
): void {
    // Backend already executed claim_daily_reward, so don't offer it again as a chip.
    if (toolName === "trigger_action" && result.action === "claim_daily_reward") {
        return;
    }
    if (toolName === "navigate_to" && typeof result.route === "string") {
        const name = result.route.split("/").pop() || result.route;
        suggestions.push({
            label: `Take me to ${name.replace(/-/g, " ")}`,
            action: { type: "navigate_to", route: result.route },
        });
    } else if (toolName === "highlight_element" && typeof result.target === "string") {
        suggestions.push({
            label: `Show me ${result.target}`,
            action: { type: "highlight_element", target: result.target },
        });
    } else if (toolName === "trigger_action" && typeof result.action === "string") {
        suggestions.push({
            label: String(result.action),
            action: { type: "trigger_action", action: result.action },
        });
    }
}

function validateMessages(body: unknown): OpenAI.Chat.ChatCompletionMessageParam[] {
    if (!body || typeof body !== "object") {
        throw new Error("Invalid request body.");
    }
    const { messages } = body as { messages?: unknown };
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
        throw new Error("Invalid messages format.");
    }
    const normalized: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    for (const msg of messages) {
        if (!msg || typeof msg !== "object") {
            throw new Error("Invalid message format.");
        }
        const { role, content } = msg as Record<string, unknown>;
        if (typeof role !== "string" || !["user", "assistant"].includes(role)) {
            throw new Error("Invalid message role.");
        }
        if (typeof content !== "string") {
            throw new Error("Invalid message content.");
        }
        normalized.push({ role, content } as OpenAI.Chat.ChatCompletionMessageParam);
    }
    return normalized;
}

assistantRouter.post("/chat", assistantBurstLimiter.middleware(), requireAuth, async (req: Request, res: Response) => {
    // eslint-disable-next-line no-console
    console.log("[assistant] /chat request from player", req.playerId);
    let messages: OpenAI.Chat.ChatCompletionMessageParam[];
    try {
        messages = validateMessages(req.body);
    } catch (err) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: (err as Error).message });
        return;
    }

    const unit = await Unit.create(false);
    let committed = false;
    try {
        const playerId = req.playerId!;
        const playerService = new PlayerService(unit);
        const player = await playerService.getInfoByID(playerId);
        const isAdmin = player?.isAdmin ?? false;

        const usageService = new AssistantUsageService(unit);
        const usage = await usageService.recordUsage(playerId, DAILY_CAP, isAdmin);

        if (usage.remaining !== null && usage.remaining <= 0) {
            res.status(StatusCodes.TOO_MANY_REQUESTS).json({ error: "Daily assistant limit reached. Try again tomorrow." });
            committed = true;
            return;
        }

        const toolService = new AssistantToolService(llm, unit, { playerId, isAdmin });

        // eslint-disable-next-line no-console
        console.log("[assistant] calling LLM", { model: process.env.KIMI_MODEL ?? "default", messageCount: messages.length });
        let response = await llm.chat(messages);
        // eslint-disable-next-line no-console
        console.log("[assistant] LLM response", { contentLength: response.content.length, toolCalls: response.toolCalls?.length ?? 0 });

        const suggestions: Array<{ label: string; action: { type: string; [key: string]: unknown } }> = [];

        if (response.toolCalls && response.toolCalls.length > 0) {
            messages.push({
                role: "assistant",
                content: response.content,
                tool_calls: response.toolCalls,
            });

            for (const call of response.toolCalls) {
                if (call.type !== "function") continue;
                let result: unknown;
                try {
                    const args = JSON.parse(call.function.arguments);
                    result = await toolService.handle(call.function.name, args);
                } catch (parseErr) {
                    result = { error: "Invalid tool arguments" };
                }
                messages.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result),
                });
                pushSuggestion(suggestions, call.function.name, result as Record<string, unknown>);
            }

            response = await llm.chat(messages);
        }

        const finalText = response.content || "";
        if (containsSensitivePattern(finalText)) {
            await logSecurityEvent({
                ipAddress: getClientIp(req),
                userAgent: req.headers["user-agent"] as string | undefined,
                eventType: "assistant_sanitizer_block",
                path: req.path,
                method: req.method,
                details: "Blocked assistant output containing sensitive pattern.",
            });
            res.json({
                message: { role: "assistant", content: sanitizeAssistantOutput(finalText), suggestions },
                remainingChats: usage.remaining,
            });
            committed = true;
            return;
        }

        res.json({
            message: { role: "assistant", content: finalText, suggestions },
            remainingChats: usage.remaining,
        });
        committed = true;
    } catch (err) {
        console.error("[assistant] chat error", err);
        if (!res.headersSent) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "The assistant is having trouble. Please try again." });
        }
    } finally {
        try {
            await unit.complete(committed);
        } catch (completeErr) {
            console.error("[assistant] unit complete failed", completeErr);
        }
    }
});
