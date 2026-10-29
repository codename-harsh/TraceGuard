import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export function getPythonPath() {
  const root = process.cwd();
  const winVenv = path.join(root, 'apps', 'api', '.venv', 'Scripts', 'python.exe');
  const unixVenv = path.join(root, 'apps', 'api', '.venv', 'bin', 'python');

  if (fs.existsSync(winVenv)) return winVenv;
  if (fs.existsSync(unixVenv)) return unixVenv;

  return process.platform === 'win32' ? 'python' : 'python3';
}

export function runPython(args, options = {}) {
  const pythonBin = getPythonPath();
  return spawn(pythonBin, args, {
    stdio: 'inherit',
    cwd: options.cwd || process.cwd(),
    ...options,
  });
}
