import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';
const { compilerOptions } = JSON.parse(readFileSync('./tsconfig.json', 'utf8'));

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
