import WebSocket from "ws";
import { connectionManager } from "../../backend/websocket/connection-manager";

function mockSocket() {
  return {
    readyState: WebSocket.OPEN,
    send: jest.fn(),
    terminate: jest.fn(),
  } as unknown as WebSocket & { send: jest.Mock; terminate: jest.Mock };
}

describe("WebSocket connection manager", () => {
  afterEach(() => {
    connectionManager.clearAll();
  });

  it("registers sockets and broadcasts to a room except excluded sockets", () => {
    const socketA = mockSocket();
    const socketB = mockSocket();
    const socketC = mockSocket();

    connectionManager.register("ws-a", socketA, 1);
    connectionManager.register("ws-b", socketB, 2);
    connectionManager.register("ws-c", socketC, 3);
    connectionManager.joinRoom("ws-a", "room-1");
    connectionManager.joinRoom("ws-b", "room-1");
    connectionManager.joinRoom("ws-c", "room-2");

    connectionManager.broadcastToRoom(
      "room-1",
      { type: "player_joined", payload: { playerId: 9 } },
      "ws-a"
    );

    expect(socketA.send).not.toHaveBeenCalled();
    expect(socketB.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "player_joined", payload: { playerId: 9 } })
    );
    expect(socketC.send).not.toHaveBeenCalled();
  });

  it("moves a socket when it joins a different room", () => {
    const socket = mockSocket();
    connectionManager.register("ws-a", socket, 1);

    connectionManager.joinRoom("ws-a", "room-1");
    connectionManager.joinRoom("ws-a", "room-2");

    expect(connectionManager.getSocketIdsInRoom("room-1")).toEqual([]);
    expect(connectionManager.getSocketIdsInRoom("room-2")).toEqual(["ws-a"]);
    expect(connectionManager.getMeta("ws-a")?.roomId).toBe("room-2");
  });

  it("finds an open socket for a player in a room", () => {
    const socket = mockSocket();
    connectionManager.register("ws-a", socket, 42);
    connectionManager.joinRoom("ws-a", "room-1");

    expect(connectionManager.getSocketIdForPlayer("room-1", 42)).toBe("ws-a");
    expect(connectionManager.getSocketIdForPlayer("room-1", 99)).toBeUndefined();
  });

  it("tracks duplicate sequence numbers per socket", () => {
    const socket = mockSocket();
    connectionManager.register("ws-a", socket, 1);

    expect(connectionManager.isDuplicate("ws-a", 10)).toBe(false);
    expect(connectionManager.isDuplicate("ws-a", 10)).toBe(true);
    expect(connectionManager.isDuplicate("ws-a", 11)).toBe(false);
  });

  it("disconnect removes socket metadata and room membership", () => {
    const socket = mockSocket();
    connectionManager.register("ws-a", socket, 1);
    connectionManager.joinRoom("ws-a", "room-1");

    connectionManager.disconnect("ws-a");

    expect(connectionManager.getMeta("ws-a")).toBeUndefined();
    expect(connectionManager.getSocketIdsInRoom("room-1")).toEqual([]);
  });
});
