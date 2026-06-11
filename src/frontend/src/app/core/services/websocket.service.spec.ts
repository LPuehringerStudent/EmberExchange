import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

class FakeWebSocket {
  static readonly OPEN = 1;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(
    public readonly url: string,
    public readonly protocol: string
  ) {
    FakeWebSocket.instances.push(this);
  }

  send(message: string): void {
    this.sent.push(message);
  }

  close(): void {
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
}

describe('WebSocketService', () => {
  let authService: {
    getSessionId: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
    patchCurrentUserCoins: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    authService = {
      getSessionId: vi.fn().mockReturnValue('session-1'),
      getCurrentUser: vi.fn().mockReturnValue({ playerId: 1, coins: 1000 }),
      patchCurrentUserCoins: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function connectOpen(service: WebSocketService): FakeWebSocket {
    service.connect();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    return socket;
  }

  it('opens a socket using the current session id as the subprotocol', () => {
    const service = TestBed.inject(WebSocketService);

    service.connect();

    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
    expect(socket.protocol).toBe('session-1');
    expect(service.connectionState()).toBe('connecting');

    socket.onopen?.();
    expect(service.connectionState()).toBe('open');
    expect(service.lastError()).toBeNull();
  });

  it('does not connect when there is no session id', () => {
    authService.getSessionId.mockReturnValue(null);
    const service = TestBed.inject(WebSocketService);

    service.connect();

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(service.connectionState()).toBe('closed');
  });

  it('sends room and gameplay messages with increasing sequence numbers', () => {
    const service = TestBed.inject(WebSocketService);
    const socket = connectOpen(service);

    service.joinRoom('room-1');
    service.sendStartGame();
    service.sendAction('hit', { handIndex: 0 });
    service.requestSync();
    service.leaveRoom();

    const messages = socket.sent.map(msg => JSON.parse(msg));
    expect(messages.map(msg => msg.type)).toEqual([
      'join_room',
      'start_game',
      'player_action',
      'request_sync',
      'leave_room',
    ]);
    expect(messages.map(msg => msg.sequenceNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(messages[2].payload).toEqual({
      roomId: 'room-1',
      actionType: 'hit',
      actionData: { handIndex: 0 },
      expectedVersion: 0,
    });
  });

  it('updates local state and header coins from state_update messages', () => {
    const service = TestBed.inject(WebSocketService);
    const socket = connectOpen(service);

    socket.onmessage?.({
      data: JSON.stringify({
        type: 'state_update',
        payload: {
          version: 9,
          stateBlob: {
            players: [
              { playerId: 1, username: 'Alice', stack: 850, seatIndex: 0, connectionState: 'connected' },
              { playerId: 2, username: 'Bob', stack: 1200, seatIndex: 1, connectionState: 'connected' },
            ],
          },
        },
      }),
    } as MessageEvent<string>);

    expect(service.currentVersion()).toBe(9);
    expect(service.playersInRoom()).toHaveLength(2);
    expect(authService.patchCurrentUserCoins).toHaveBeenCalledWith(850);
  });

  it('does not patch header coins directly from roulette state updates', () => {
    const service = TestBed.inject(WebSocketService);
    const socket = connectOpen(service);

    socket.onmessage?.({
      data: JSON.stringify({
        type: 'state_update',
        payload: {
          version: 10,
          stateBlob: {
            phase: 'settled',
            winningNumber: 17,
            winningColor: 'black',
            bets: [{ playerId: 1, betType: 'black', amount: 50 }],
            players: [
              { playerId: 1, username: 'Alice', stack: 1050, bets: [], result: 'won' },
            ],
          },
        },
      }),
    } as MessageEvent<string>);

    expect(service.currentVersion()).toBe(10);
    expect(service.playersInRoom()).toHaveLength(1);
    expect(authService.patchCurrentUserCoins).not.toHaveBeenCalled();
  });

  it('stores errors, chat messages, and trade offer updates from server messages', () => {
    const service = TestBed.inject(WebSocketService);
    const socket = connectOpen(service);

    socket.onmessage?.({ data: JSON.stringify({ type: 'error', payload: { code: 'RATE_LIMITED', message: 'Too many messages' } }) } as MessageEvent<string>);
    socket.onmessage?.({ data: JSON.stringify({ type: 'chat_message', payload: { messageId: 5, content: 'hello' } }) } as MessageEvent<string>);
    socket.onmessage?.({ data: JSON.stringify({ type: 'trade_offer_update', payload: { messageId: 7, status: 'accepted' } }) } as MessageEvent<string>);

    expect(service.lastError()).toEqual({ code: 'RATE_LIMITED', message: 'Too many messages' });
    expect(service.incomingChatMessage()).toEqual({ messageId: 5, content: 'hello' });
    expect(service.incomingTradeUpdate()).toEqual({ messageId: 7, status: 'accepted' });
  });
});
