/** Auto-generated minimal Jest config for TS tests. Adjust to your repo as needed. */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts','tsx','js','jsx','json','node'],
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
};