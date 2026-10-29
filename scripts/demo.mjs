import { runPython } from './py-runner.mjs';

console.log('[TraceGuard] Seeding demo database (demo@traceguard.local + 4 scans)...');
const child = runPython(['database/seeds/demo_seed.py']);

child.on('close', (code) => {
  if (code === 0) {
    console.log('[TraceGuard] Demo seeding completed successfully.');
  } else {
    console.error(`[TraceGuard] Demo seeding exited with code ${code}`);
    process.exit(code || 1);
  }
});
