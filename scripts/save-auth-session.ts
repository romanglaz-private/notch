/**
 * Manual Google login → persist session for Playwright.
 * Run from repo root: npm run auth:save
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';
import { buildNotchLoginRedirectUrl, loadNotchConfig } from '../src/utils/notch-config';
import { playwrightAuthStorageStatePath } from '../src/utils/playwright-session';

const AUTH_PROFILE_DIR = path.resolve(process.cwd(), '.auth-playwright-chrome');

async function main() {
  const config = loadNotchConfig();
  const loginUrl = buildNotchLoginRedirectUrl(config);
  const storagePath = playwrightAuthStorageStatePath();

  await fs.mkdir(path.dirname(storagePath), { recursive: true });

  console.log('\n--- Manual Google login (Notch) ---\n');
  console.log('A headed Chrome window will open.');
  console.log('Steps:');
  console.log('  1) Complete Google sign-in until you are inside the Notch app.');
  console.log('  2) Optionally navigate anywhere you need (inbox is fine).');
  console.log('  3) Come back to this terminal and press Enter.\n');
  console.log(`Session file: ${storagePath}\n`);

  const context = await chromium.launchPersistentContext(AUTH_PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1600, height: 1000 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

  const rl = readline.createInterface({ input, output });
  await rl.question('Press Enter here after you are logged into Notch... ');
  rl.close();

  await context.storageState({ path: storagePath });

  console.log(`\nSaved storage state to:\n  ${storagePath}\n`);
  console.log('Run tests: npm test\n');

  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
