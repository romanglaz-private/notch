import { test as base } from '@playwright/test';
import { GuardrailsPage } from '../src/page/GuardrailsPage';
import { PlaygroundPage } from '../src/page/PlaygroundPage';
import { loadNotchConfig, normalizedGuardrailsPath, normalizedTestsPlaygroundPath } from '../src/utils/notch-config';

type PomFixtures = {
  guardrailsPage: GuardrailsPage;
  playgroundPage: PlaygroundPage;
};

export const test = base.extend<PomFixtures>({
  guardrailsPage: async ({ page }, use) => {
    const path = normalizedGuardrailsPath(loadNotchConfig());
    await use(new GuardrailsPage(page, path));
  },
  playgroundPage: async ({ page }, use, testInfo) => {
    const path = normalizedTestsPlaygroundPath(loadNotchConfig());
    if (!path) {
      testInfo.skip(true, 'Set notch.config.json → e2e.testsPlaygroundPath (Tests → Playground).');
      await use(new PlaygroundPage(page, '/'));
      return;
    }
    await use(new PlaygroundPage(page, path));
  },
});

export { expect } from '@playwright/test';
