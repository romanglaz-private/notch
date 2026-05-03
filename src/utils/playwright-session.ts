import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './paths';

export function playwrightAuthStorageStatePath(): string {
  return path.join(REPO_ROOT, 'playwright', '.auth', 'storage-state.json');
}

/** @deprecated Prefer checking `resolvePlaywrightStorageState()` directly. */
export function hasPlaywrightAuthSession(): boolean {
  return resolvePlaywrightStorageState() !== undefined;
}

/** Path for `storageState`, or `undefined` if none (unauthenticated runs). */
export function resolvePlaywrightStorageState(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_STORAGE_STATE;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const defaultPath = playwrightAuthStorageStatePath();
  return fs.existsSync(defaultPath) ? defaultPath : undefined;
}
