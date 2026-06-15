import type { Config } from "jest";
import nextJest from "next/jest.js";

process.env.NEXT_PUBLIC_API_BASE_URL ??= "http://localhost:3001";
process.env.NEXT_PUBLIC_DEMO_BUSINESS_SLUG ??= "kopi-senja-umkm";
process.env.NEXT_PUBLIC_API_MOCKING ??= "disabled";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  clearMocks: true,
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFiles: ["<rootDir>/jest.polyfills.cjs"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/e2e/"],
};

export default createJestConfig(config);
