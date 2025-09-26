import '@testing-library/jest-dom';

// Mock Next.js environment
global.Request = global.Request || class Request {};
global.Response = global.Response || class Response {};
global.fetch = global.fetch || jest.fn();

// Mock environment variables for tests
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
}
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
process.env.USE_MOCK_DB = process.env.USE_MOCK_DB || 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest-tests';