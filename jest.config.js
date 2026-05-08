module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts', '**/*Tests.ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/src/test/routerTests/',
    ],
    moduleFileExtensions: ['ts', 'js'],
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
    testTimeout: 15000,
    // Run tests sequentially to avoid database locking issues
    maxWorkers: 1,
    // Clean up after each test
    restoreMocks: true,
    clearMocks: true
};
