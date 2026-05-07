
export interface MockStatement<T = any> {
    all: jest.Mock<Promise<T[]>, []>;
    get: jest.Mock<Promise<T | undefined>, []>;
    run: jest.Mock<Promise<{ changes: number }>, []>;
}

export class MockUnit {
    prepare = jest.fn<any, [string, any?]>();
    getLastRowId = jest.fn().mockResolvedValue(1);
    complete = jest.fn().mockResolvedValue(undefined);

    createMockStatement<T>(overrides: Partial<MockStatement<T>> = {}): MockStatement<T> {
        return {
            all: jest.fn().mockResolvedValue([]),
            get: jest.fn().mockResolvedValue(undefined),
            run: jest.fn().mockResolvedValue({ changes: 1 }),
            ...overrides
        };
    }
}

// Factory function
export const createMockUnit = (): MockUnit => new MockUnit();
