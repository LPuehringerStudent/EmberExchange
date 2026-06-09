import { RateLimiter } from "../../backend/websocket/rate-limiter";

describe("WebSocket RateLimiter", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(0);
  });

  it("allows the initial token bucket and then rate limits", () => {
    const limiter = new RateLimiter();

    expect(limiter.checkLimit("ip:1")).toBe(true);
    for (let i = 0; i < 19; i++) {
      expect(limiter.checkLimit("ip:1")).toBe(true);
    }

    expect(limiter.checkLimit("ip:1")).toBe(false);
  });

  it("refills tokens over time", () => {
    const limiter = new RateLimiter();

    for (let i = 0; i < 20; i++) {
      expect(limiter.checkLimit("ip:1")).toBe(true);
    }
    expect(limiter.checkLimit("ip:1")).toBe(false);

    jest.spyOn(Date, "now").mockReturnValue(100);

    expect(limiter.checkLimit("ip:1")).toBe(true);
    expect(limiter.checkLimit("ip:1")).toBe(false);
  });

  it("removes a bucket so a client starts fresh", () => {
    const limiter = new RateLimiter();

    for (let i = 0; i < 20; i++) {
      limiter.checkLimit("ip:1");
    }
    expect(limiter.checkLimit("ip:1")).toBe(false);

    limiter.remove("ip:1");

    expect(limiter.checkLimit("ip:1")).toBe(true);
  });
});
