import { behaviorGuard } from "../../backend/middleware/behavior-guard";

function makeToken(overrides: Record<string, unknown> = {}) {
  const snapshot = {
    mm: 6,
    md: 150,
    ks: { email: 2, password: 2 },
    fc: 2,
    bl: 2,
    it: 6000,
    fs: ["email", "password"],
    ts: Date.now() - 1000,
    ...overrides,
  };

  return Buffer.from(JSON.stringify(snapshot), "utf-8").toString("base64");
}

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe("behaviorGuard", () => {
  const now = new Date("2026-06-09T12:00:00.000Z").getTime();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(now);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("allows realistic interaction tokens", () => {
    const req = { body: { behaviorToken: makeToken() }, method: "POST", path: "/api/auth/register" } as any;
    const res = mockResponse() as any;
    const next = jest.fn();

    behaviorGuard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects missing and malformed tokens with a generic error", () => {
    const res = mockResponse() as any;
    const next = jest.fn();

    behaviorGuard({ body: {}, method: "POST", path: "/api/auth/register" } as any, res, next);
    behaviorGuard({ body: { behaviorToken: "not-json" }, method: "POST", path: "/api/auth/register" } as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("rejects bot-like interaction snapshots", () => {
    const req = {
      body: { behaviorToken: makeToken({ mm: 0, ks: { email: 1 }, fs: ["email"] }) },
      method: "POST",
      path: "/api/auth/register",
    } as any;
    const res = mockResponse() as any;
    const next = jest.fn();

    behaviorGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("rejects stale or future-dated tokens", () => {
    const res = mockResponse() as any;
    const next = jest.fn();
    const staleReq = {
      body: { behaviorToken: makeToken({ ts: now - 301000 }) },
      method: "POST",
      path: "/api/auth/register",
    } as any;
    const futureReq = {
      body: { behaviorToken: makeToken({ ts: now + 1 }) },
      method: "POST",
      path: "/api/auth/register",
    } as any;

    behaviorGuard(staleReq, res, next);
    behaviorGuard(futureReq, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });
});
