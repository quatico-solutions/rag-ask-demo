/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  cache: false,
  // Use project-local cache directory to avoid permission issues
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  // Only run test files ending with .test.ts
  testRegex: '\\.(test)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};