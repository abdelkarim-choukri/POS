import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        types: ['jest', 'node'],
      },
    }],
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/*.d.ts', '!main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};

export default config;
