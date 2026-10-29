import { spawn } from 'node:child_process';
import { runPython } from './py-runner.mjs';

console.log('================================================================');
console.log('TraceGuard Development Servers (FastAPI :8000 + Next.js :3000)');
console.log('================================================================\n');

// 1. Start FastAPI backend
console.log('[Dev] Starting FastAPI Backend on http://localhost:8000...');
const apiProcess = runPython([
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

// 2. Start Dashboard
console.log('[Dev] Starting Next.js Dashboard on http://localhost:3000...');
const isWin = process.platform === 'win32';
const dashboardProcess = isWin
  ? spawn('cmd.exe', ['/c', 'pnpm.cmd', '--filter', '@traceguard/dashboard', 'dev'], { stdio: 'inherit', cwd: process.cwd() })
  : spawn('pnpm', ['--filter', '@traceguard/dashboard', 'dev'], { stdio: 'inherit', cwd: process.cwd() });

function cleanup() {
  console.log('\n[TraceGuard] Shutting down development servers...');
  try {
    apiProcess.kill();
  } catch {
    // ignore
  }
  try {
    dashboardProcess.kill();
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
