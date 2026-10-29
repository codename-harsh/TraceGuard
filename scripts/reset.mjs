import fs from 'node:fs';
import path from 'node:path';
import { runPython } from './py-runner.mjs';

console.log('[TraceGuard] Resetting development database...');

const devDbPath = path.join(process.cwd(), 'traceguard_dev.db');
if (fs.existsSync(devDbPath)) {
  try {
    fs.unlinkSync(devDbPath);
    console.log('[TraceGuard] Removed existing traceguard_dev.db');
  } catch (err) {
    console.warn('[TraceGuard] Notice: could not remove traceguard_dev.db (may be locked), proceeding.');
  }
}

console.log('[TraceGuard] Applying migrations...');
const migrateProcess = runPython(['-m', 'alembic', 'upgrade', 'head']);

migrateProcess.on('close', (migrateCode) => {
  if (migrateCode !== 0) {
    console.error(`[TraceGuard] Migration failed during reset (code ${migrateCode})`);
    process.exit(migrateCode || 1);
  }

  console.log('[TraceGuard] Seeding fresh demo data...');
  const seedProcess = runPython(['database/seeds/demo_seed.py']);

  seedProcess.on('close', (seedCode) => {
    if (seedCode === 0) {
      console.log('[TraceGuard] Reset & demo seed completed successfully!');
    } else {
      console.error(`[TraceGuard] Seeding failed during reset (code ${seedCode})`);
      process.exit(seedCode || 1);
    }
  });
});
