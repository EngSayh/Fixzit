This repository's unit tests for ProductPage (Next.js server component) are written with Jest + @testing-library/react conventions.

If the project uses Vitest:

- Replace jest.fn/resetAllMocks with vi.fn/resetAllMocks.
- Ensure the test environment is set to jsdom.

Key points:

- We mock global.fetch to drive server data responses.
- We await the server component (async function) to obtain JSX and then render it.
- We mock next/link to a plain anchor tag for testing.
- Scenarios covered: Not found, happy path, attributes slicing to 6, stock vs backorder, lead days, environment-based fetch URL, missing buyBox.
