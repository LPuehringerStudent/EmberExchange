import { ErrorCode } from "../../shared/model";

const sendToSocket = jest.fn();
const isDuplicate = jest.fn();
const checkLimit = jest.fn();
const handleJoinRoom = jest.fn();
const handleLeaveRoom = jest.fn();
const handlePlayerAction = jest.fn();
const handleRequestSync = jest.fn();
const handleStartGame = jest.fn();
const handleChatMessage = jest.fn();

jest.mock("../../backend/websocket/connection-manager", () => ({
  connectionManager: {
    sendToSocket,
    isDuplicate,
  },
}));

jest.mock("../../backend/websocket/rate-limiter", () => ({
  rateLimiter: {
    checkLimit,
  },
}));

jest.mock("../../backend/websocket/handlers/join-room", () => ({
  handleJoinRoom,
}));

jest.mock("../../backend/websocket/handlers/leave-room", () => ({
  handleLeaveRoom,
}));

jest.mock("../../backend/websocket/handlers/player-action", () => ({
  handlePlayerAction,
}));

jest.mock("../../backend/websocket/handlers/request-sync", () => ({
  handleRequestSync,
}));

jest.mock("../../backend/websocket/handlers/start-game", () => ({
  handleStartGame,
}));

jest.mock("../../backend/websocket/handlers/chat-message", () => ({
  handleChatMessage,
}));

import { handleMessage } from "../../backend/websocket/message-handler";

describe("WebSocket message handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkLimit.mockReturnValue(true);
    isDuplicate.mockReturnValue(false);
  });

  it("rejects messages without a type", async () => {
    await handleMessage("socket-1", "127.0.0.1", { sequenceNumber: 1 });

    expect(sendToSocket).toHaveBeenCalledWith("socket-1", {
      type: "error",
      payload: {
        code: ErrorCode.INVALID_STATE,
        message: "Missing message type",
        recoverable: true,
      },
    });
  });

  it("rejects messages without a sequence number", async () => {
    await handleMessage("socket-1", "127.0.0.1", { type: "join_room" });

    expect(sendToSocket).toHaveBeenCalledWith("socket-1", {
      type: "error",
      payload: {
        code: ErrorCode.INVALID_STATE,
        message: "Missing sequenceNumber",
        recoverable: true,
      },
    });
  });

  it("rate limits by client IP before dispatching", async () => {
    checkLimit.mockReturnValue(false);

    await handleMessage("socket-1", "10.0.0.5", {
      type: "join_room",
      sequenceNumber: 1,
      payload: { roomId: "room-1" },
    });

    expect(checkLimit).toHaveBeenCalledWith("10.0.0.5");
    expect(handleJoinRoom).not.toHaveBeenCalled();
    expect(sendToSocket).toHaveBeenCalledWith("socket-1", {
      type: "error",
      payload: {
        code: ErrorCode.RATE_LIMITED,
        message: "Too many messages",
        recoverable: true,
      },
    });
  });

  it("drops duplicate sequence numbers without dispatching or sending an error", async () => {
    isDuplicate.mockReturnValue(true);

    await handleMessage("socket-1", "127.0.0.1", {
      type: "player_action",
      sequenceNumber: 7,
      payload: { roomId: "room-1", actionType: "stand" },
    });

    expect(isDuplicate).toHaveBeenCalledWith("socket-1", 7);
    expect(handlePlayerAction).not.toHaveBeenCalled();
    expect(sendToSocket).not.toHaveBeenCalled();
  });

  it("supports snake_case sequence numbers and dispatches known message types", async () => {
    const payload = { roomId: "room-1" };

    await handleMessage("socket-1", "127.0.0.1", {
      type: "join_room",
      sequence_number: 12,
      payload,
    });

    expect(isDuplicate).toHaveBeenCalledWith("socket-1", 12);
    expect(handleJoinRoom).toHaveBeenCalledWith("socket-1", payload);
  });

  it("dispatches leave, action, sync, start, and chat messages", async () => {
    await handleMessage("socket-1", "127.0.0.1", { type: "leave_room", sequenceNumber: 1, payload: { roomId: "r" } });
    await handleMessage("socket-1", "127.0.0.1", { type: "player_action", sequenceNumber: 2, payload: { actionType: "hit" } });
    await handleMessage("socket-1", "127.0.0.1", { type: "request_sync", sequenceNumber: 3, payload: { roomId: "r" } });
    await handleMessage("socket-1", "127.0.0.1", { type: "start_game", sequenceNumber: 4, payload: { roomId: "r" } });
    await handleMessage("socket-1", "127.0.0.1", { type: "chat_message", sequenceNumber: 5, payload: { content: "hello" } });

    expect(handleLeaveRoom).toHaveBeenCalledTimes(1);
    expect(handlePlayerAction).toHaveBeenCalledTimes(1);
    expect(handleRequestSync).toHaveBeenCalledTimes(1);
    expect(handleStartGame).toHaveBeenCalledTimes(1);
    expect(handleChatMessage).toHaveBeenCalledTimes(1);
  });

  it("returns an error for unknown message types", async () => {
    await handleMessage("socket-1", "127.0.0.1", {
      type: "dance",
      sequenceNumber: 1,
      payload: {},
    });

    expect(sendToSocket).toHaveBeenCalledWith("socket-1", {
      type: "error",
      payload: {
        code: ErrorCode.INVALID_STATE,
        message: "Unknown message type: dance",
        recoverable: true,
      },
    });
  });
});
