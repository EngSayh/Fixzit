const BASE_ENV = { ...process.env };

const resetTestEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in BASE_ENV)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(BASE_ENV)) {
    process.env[key] = value;
  }
};

export const resetTestMocks = () => {
  resetTestEnv();
};
