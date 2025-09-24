/** Minimal Jest config. If your project already has one, delete this file. */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mjs'],
  moduleNameMapper: {
    // Allow mocking ESM-like imports that end in .js from TS context
    '^(.*)\\.js$': '$1',
  },
}