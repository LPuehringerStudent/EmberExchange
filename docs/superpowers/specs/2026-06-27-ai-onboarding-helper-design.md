# AI Onboarding Helper — Design Spec

> **Status:** Design draft awaiting review.

**Goal:** Add a login-gated, floating AI chat assistant to EmberExchange that answers onboarding questions, navigates users, highlights UI elements, triggers simple actions, and summarizes player stats — without leaking sensitive project or user data.

**Architecture:** A backend `/api/assistant/chat` endpoint orchestrates Kimi K2.7 with native tool calling. The model decides when to call tools (navigate, highlight, trigger, summarize, divine intervention). Tool results are returned to the model, then a final sanitized answer is sent to the frontend. Kimi Code 2.7 is used only for the optional `divine_intervention` escalation and future theme generation.

**Tech Stack:** Angular 21 (signals), Node.js/Express, PostgreSQL, Kimi K2.7 API (OpenAI-compatible tool calling), Kimi Code 2.7 API.

---

## LLM API configuration

Environment variables (no defaults; required in production):

| Variable | Purpose |
|---|---|
| `KIMI_API_KEY` | API key for the main assistant (Kimi K2.7). |
| `KIMI_BASE_URL` | Base URL for Kimi K2.7 (default: `https://api.moonshot.ai/v1`). |
| `KIMI_MODEL` | Model id for onboarding assistant (default: `kimi-k2.7`). |
| `KIMI_CODE_API_KEY` | API key for `divine_intervention` / theme generation (Kimi Code 2.7 subscription). |
| `KIMI_CODE_BASE_URL` | Base URL for Kimi Code 2.7 (default: `https://api.moonshot.ai/v1`). |
| `KIMI_CODE_MODEL` | Model id for Kimi Code 2.7 subscription (default: `kimi-for-coding`). |

Both endpoints are OpenAI-compatible, so the backend can use a single HTTP client (e.g., the `openai` package) instantiated twice with different base URLs/keys/model IDs.

**`divine_intervention` context policy:** `divine_intervention` receives only the user's question plus the same curated feature docs used by Kimi K2.7. It does **not** read raw source files, file paths, SQL schemas, or environment values. This keeps answers safe and prevents accidental leakage of honeypots, security config, or internal architecture.

---

## User-visible behavior

- A floating assistant button appears on the bottom-right of every authenticated page.
- Clicking it opens a chat drawer.
- Users can ask natural-language questions like:
  - "Where can I gain money?"
  - "How do I sell a stove?"
  - "Take me to Blackjack."
  - "Show me where to claim dailies."
  - "What quests do I have ready?"
- The assistant answers conversationally and can offer clickable/actionable suggestions.
- Normal users are limited to 20 chats per day (configurable). Admins have no limit.

---

## Security and privacy hardening

The assistant must never:
- Leak source code, file paths, or implementation details.
- Mention honeypots, anti-bot config, rate-limit internals, admin routes, or security middleware.
- Expose `.env` values, secrets, credentials, or database connection details.
- Return other users' data or database rows not owned by the current user.
- Reveal internal API endpoints, debug routes, or Swagger admin URLs.

### Defense-in-depth measures

1. **Curated context only**
   - The system prompt contains a manually maintained feature map (route + description) and a short FAQ.
   - No raw source code, SQL schemas, or environment values are ever sent to the LLM.
   - `divine_intervention` forwards only the user's question plus the same curated feature docs used by K2.7. Raw source files, file paths, and internal implementation details are never passed to Kimi Code 2.7.

2. **Output sanitizer**
   - All assistant text is run through a sanitizer before being sent to the frontend.
   - Blocked patterns include: `process.env`, `DATABASE_URL`, `SESSION_SECRET`, `honeypot`, `__proto__`, `constructor`, SQL connection strings, file paths with `src/backend`, private keys, IP bans, admin panel references, and internal endpoint paths (`/api/db-test`, `/admin`, etc.).
   - If a blocked pattern is detected, the response is replaced with a generic safe message and a security event is logged.

3. **Tool-level authorization**
   - `get_player_summary` returns only data belonging to the authenticated user.
   - `trigger_action` is limited to safe, idempotent UI actions; destructive operations are not exposed.
   - `divine_intervention` is only allowed to answer questions about EmberExchange features; it cannot generate code for the user to run or reveal architecture details.

4. **No raw database access**
   - The assistant never runs arbitrary SQL or reads tables directly.
   - All data comes from existing service methods that enforce ownership and authorization.

5. **Audit logging**
   - Every assistant request and any sanitizer block is logged to `SecurityEvent` with 90-day retention.

---

## Frontend components

### `AiHelperButtonComponent`
- Fixed position bottom-right with safe margins (`right: 24px; bottom: 24px`).
- Z-index above main content but below modals/toasts.
- Only rendered when the user is authenticated.
- Animated open/close state.

### `AiHelperDrawerComponent`
- Chat drawer anchored to the right side of the viewport.
- Header with title, close button, and daily-usage indicator.
- Scrollable message list.
- Input field with send button.
- Renders message types:
  - `text` — plain assistant text (Markdown-lite supported).
  - `action` — clickable suggestion chips (e.g., "Go to Blackjack", "Highlight Shop").
  - `loading` — typing indicator.

### `AiHelperService`
- Manages drawer open/close state.
- Stores conversation history in memory (no persistence).
- Sends messages to `/api/assistant/chat`.
- Executes UI actions returned by the backend:
  - `navigate_to` → `Router.navigate`.
  - `highlight_element` → add a temporary CSS class to the target element (via `data-tour` or selector) and scroll it into view.
  - `trigger_action` → dispatch a named event or call a registered handler.

---

## Backend API

### `POST /api/assistant/chat`

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "Where can I gain money?" }
  ]
}
```

**Headers:** session cookie (auth required).

**Response body:**
```json
{
  "message": {
    "role": "assistant",
    "content": "You can earn coins by playing games, selling items, or claiming dailies. Want me to take you to Blackjack?",
    "suggestions": [
      { "label": "Play Blackjack", "action": { "type": "navigate_to", "route": "/games/blackjack/lobby" } },
      { "label": "Show dailies path", "action": { "type": "highlight_element", "target": "shop" } }
    ]
  },
  "remainingChats": 12
}
```

**Rate limiting:**
- Normal users: daily cap (configurable, default 20).
- Admins: unlimited.
- Returns `429` when cap exceeded.

### Implementation flow

1. Authenticate session (`requireAuth`).
2. Check daily usage cap in `AssistantUsageService`.
3. Build system prompt with curated context + current route (sent by frontend in `metadata`).
4. Call Kimi K2.7 with tools.
5. If tool calls are returned, execute each handler locally.
6. Send tool results back to K2.7 for final answer.
7. Sanitize final answer.
8. Record usage and return response.

---

## Tools exposed to Kimi K2.7

### `navigate_to`
- **Description:** Navigate the user to a page.
- **Parameters:**
  - `route` (string, enum of known routes)
  - `params` (object, optional)

### `highlight_element`
- **Description:** Visually highlight a UI element and scroll it into view.
- **Parameters:**
  - `target` (string, enum of registered `data-tour` keys: `lootboxes`, `marketplace`, `games`, `shop`, `quests`, `inventory`, `profile`, etc.)

### `trigger_action`
- **Description:** Trigger a safe UI action.
- **Parameters:**
  - `action` (string, enum: `open_first_lootbox`, `claim_daily_reward`, `open_quests`)

### `get_player_summary`
- **Description:** Get a short summary of the current player's relevant state.
- **Parameters:** none (uses session).
- **Returns:**
  ```json
  {
    "coins": 204742,
    "sparks": 119,
    "readyQuests": 2,
    "inventoryStoves": 14,
    "activeListings": 1
  }
  ```

### `divine_intervention`
- **Description:** Escalate a focused technical or codebase-related question to Kimi Code 2.7.
- **Parameters:**
  - `question` (string)
- **Backend behavior:**
  - Forwards the question to Kimi Code 2.7 with a small, sanitized context bundle (e.g., relevant route/feature docs, not raw source).
  - Receives the answer and runs it through the same output sanitizer.
  - Returns the sanitized answer to K2.7.
- **Restrictions:** cannot generate executable code, cannot output file paths or secrets.

---

## Database

### Table: `AssistantUsage`
```sql
CREATE TABLE IF NOT EXISTS assistant_usage (
  player_id INTEGER PRIMARY KEY REFERENCES player(id) ON DELETE CASCADE,
  chat_count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

Service resets `chat_count` to 0 when `reset_at` is before the current UTC midnight.

---

## Context document

A maintained Markdown file loaded at runtime (`src/backend/ai/context.md`) containing:
- Short project description.
- Feature list with routes and one-line descriptions.
- FAQ for common onboarding questions.
- Tone guidelines.
- Explicit security instructions (do not reveal secrets, code, or other users' data).

This file is the only context source for K2.7 except tool results.

---

## Rate limiting and quotas

- Per-user daily cap stored in `AssistantUsage`.
- Reset at UTC midnight.
- Admin bypass via `isAdmin` flag on session.
- Optional: global per-minute rate limit on the endpoint to prevent bursts.

---

## Error handling

- LLM timeout/failure → return a friendly fallback message.
- Rate limit exceeded → `429` with `Retry-After` header.
- Sanitizer block → return generic safe message and log security event.
- Invalid tool arguments → ignore the tool call and ask the user to rephrase.

---

## Testing strategy

- Unit tests for output sanitizer against a block list.
- Unit tests for `AssistantUsageService` reset logic.
- Unit tests for each tool handler (navigation, highlight, summary, divine intervention).
- Integration tests for the `/api/assistant/chat` endpoint with mocked LLM client.
- Frontend tests for `AiHelperService` and drawer component.

---

## Open questions / future work

- Whether to persist conversation history server-side per player.
- Whether to allow image/file uploads later.
- Theme-from-prompt feature (future, uses Kimi Code 2.7 directly).
