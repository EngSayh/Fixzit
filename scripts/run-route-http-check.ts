import { spawn } from 'child_process';

const BASE_URL = process.env.ROUTE_VERIFY_BASE || 'http://127.0.0.1:4010';
const PORT = new URL(BASE_URL).port || '4010';

function runCommand(command: string, args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...options.env },
      shell: process.platform === 'win32',
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function waitForServer(url: string, attempts = 60, delay = 2000) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status === 404) return;
    } catch {
      // ignore until next retry
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error(`Server never responded at ${url}`);
}

async function main() {
  const buildFlags =
    process.env.ROUTE_VERIFY_BUILD_FLAGS?.split(' ').filter(Boolean) ?? ['--no-lint'];
  const sharedEnv = {
    ...process.env,
    ALLOW_LOCAL_MONGODB: 'true',
    DISABLE_MONGODB_FOR_BUILD: 'true',
  };

  console.log('🏗️  Building Next.js app before route verification...');
  await runCommand('pnpm', ['run', 'build', ...buildFlags], { env: sharedEnv });

  console.log(`🚀 Starting Next.js server on ${BASE_URL}...`);
  const server = spawn(
    'pnpm',
    ['run', 'start', '-p', PORT, '-H', '127.0.0.1'],
    { stdio: 'inherit', env: sharedEnv, shell: process.platform === 'win32' }
  );

  try {
    await waitForServer(`${BASE_URL}/`);
    console.log('✅ Server is up, running HTTP route verification...');
    await runCommand('pnpm', ['exec', 'tsx', 'scripts/verify-routes.ts'], {
      env: { ...sharedEnv, ROUTE_VERIFY_BASE: BASE_URL },
    });
  } finally {
    console.log('🧹 Shutting down Next.js server...');
    server.kill();
  }
}

main().catch((error) => {
  console.error('❌ Route HTTP verification failed:', error);
  process.exit(1);
});
