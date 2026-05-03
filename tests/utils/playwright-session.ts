import { resolvePlaywrightStorageState } from '../../src/utils/playwright-session';

/** Same predicate Playwright uses for `use.storageState` via config — honors `PLAYWRIGHT_STORAGE_STATE`. */
export function hasUsablePlaywrightStorageState(): boolean {
  return resolvePlaywrightStorageState() !== undefined;
}
