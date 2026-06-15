export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^framer-motion$': '<rootDir>/__mocks__/framer-motion.js',
  },
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  coverageThreshold: {
    global: {
      lines: 72,
      statements: 71,
      branches: 60,
      functions: 68,
    },
  },
  // CI coverage rozeti `coverage-summary.json` okur; json-summary olmadan 0% (kırmızı) çıkar.
  coverageReporters: ['json', 'json-summary', 'text', 'lcov', 'clover'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'backend/services/**/*.js',
    'backend/controllers/**/*.js',
    'backend/handlers/**/*.js',
    'backend/repositories/**/*.js',
    'backend/middleware/**/*.js',
    'backend/utils/**/*.js',
    '!**/*.d.ts',
    '!**/*.legacy.js',
  ],
};
