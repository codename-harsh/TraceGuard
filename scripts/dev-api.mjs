import { runPython } from './py-runner.mjs';

console.log('[TraceGuard] Starting FastAPI backend on http://127.0.0.1:8000...');
const child = runPython([
  '-m',
  'uvicorn',
  'app.main:app',
  '--reload',
  '--host',
  '127.0.0.1',
  '--port',
  '8000',
], {
  cwd: 'apps/api',
});

child.on('close', (code) => {
  process.exit(code || 0);
});
