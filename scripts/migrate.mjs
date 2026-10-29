import { runPython } from './py-runner.mjs';

console.log('[TraceGuard] Running database migrations (alembic upgrade head)...');
const child = runPython(['-m', 'alembic', 'upgrade', 'head']);

child.on('close', (code) => {
  if (code === 0) {
    console.log('[TraceGuard] Migrations completed successfully.');
  } else {
    console.error(`[TraceGuard] Migrations failed with code ${code}`);
    process.exit(code || 1);
  }
});
