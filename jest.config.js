export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        diagnostics: { ignoreCodes: [151002] },
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!(cbor2)/)"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/app.ts",
    "!src/server.ts",
    "!src/api/router.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 42,
      functions: 48,
      lines: 49,
      statements: 50,
    },
  },
  coverageReporters: ["text-summary", "lcov", "html"],
  testTimeout: 10000,
};
