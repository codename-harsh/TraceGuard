import { runPython } from './py-runner.mjs';

console.log('[TraceGuard] Seeding initial tracker rules and domain catalogs...');
const child = runPython(['database/seeds/demo_seed.py']);

child.on('close', (code) => {
  if (code === 0) {
    console.log('[TraceGuard] Database seed completed successfully.');
  } else {
    console.error(`[TraceGuard] Database seed failed with code ${code}`);
    process.exit(code || 1);
  }
});
