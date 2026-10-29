import { spawn } from 'node:child_process';
import { runPython } from './py-runner.mjs';

console.log('================================================================');
console.log('TraceGuard Comprehensive Test Suite (Vitest + Pytest)');
console.log('================================================================\n');

console.log('[1/2] Running TypeScript Vitest test suite...');
const isWin = process.platform === 'win32';
const vitestProcess = isWin
  ? spawn('cmd.exe', ['/c', 'pnpm.cmd', 'test'], { stdio: 'inherit', cwd: process.cwd() })
  : spawn('pnpm', ['test'], { stdio: 'inherit', cwd: process.cwd() });

vitestProcess.on('close', (vCode) => {
  if (vCode !== 0) {
    console.error(`\n[TraceGuard] Vitest tests failed with exit code ${vCode}`);
    process.exit(vCode || 1);
  }

  console.log('\n[2/2] Running Python FastAPI Pytest test suite...');
  const pytestProcess = runPython(['-m', 'pytest', 'tests/api', '-v']);

  pytestProcess.on('close', (pCode) => {
    if (pCode === 0) {
      console.log('\n================================================================');
      console.log('All TraceGuard test suites PASSED (Vitest + Pytest)');
      console.log('================================================================\n');
    } else {
      console.error(`\n[TraceGuard] Pytest tests failed with exit code ${pCode}`);
      process.exit(pCode || 1);
    }
  });
});
