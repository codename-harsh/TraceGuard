import { runPython } from './py-runner.mjs';

console.log('[TraceGuard] Running FastAPI backend test suite (pytest)...');
const child = runPython(['-m', 'pytest', 'tests/api', '-v']);

child.on('close', (code) => {
  if (code === 0) {
    console.log('[TraceGuard] Pytest suite completed successfully!');
  } else {
    console.error(`[TraceGuard] Pytest suite failed with code ${code}`);
    process.exit(code || 1);
  }
});
