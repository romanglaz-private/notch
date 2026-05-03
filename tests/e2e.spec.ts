import {
  loadNotchConfig,
  resolvedGuardrailsPlaygroundMatrixPath,
} from '../src/utils/notch-config';
import {
  chipConfigFromScenario,
  chipConfigsEqual,
  chipCount,
  loadGuardrailsMatrixFile,
} from './data/guardrail-playground-matrix';
import { hasUsablePlaywrightStorageState } from './utils/playwright-session';
import { test } from './fixtures';

const dataFilePath = resolvedGuardrailsPlaygroundMatrixPath(loadNotchConfig());
const matrix = loadGuardrailsMatrixFile(dataFilePath);

test.describe('Guardrails → Playground', () => {

  test.beforeEach(() => {
    test.skip(
      !hasUsablePlaywrightStorageState(),
      'Save session (npm run auth:save) or set PLAYWRIGHT_STORAGE_STATE.',
    );
  });

  matrix.scenarios.forEach((row, index) => {
    const testTitle = `[${row.testCaseId}] ${row.id}`;
    const chips = chipConfigFromScenario(row);
    const prevChips = index > 0 ? chipConfigFromScenario(matrix.scenarios[index - 1]!) : null;
    const needConfigure = index === 0 || prevChips === null || !chipConfigsEqual(chips, prevChips);

    test(testTitle, async ({ guardrailsPage, playgroundPage }) => {
      if (needConfigure && chipCount(chips) > 0) {
        await test.step('Part 1 — Apply matrix chips (emailPatternsToUnassign, subjectToUnassign, wordsInUserMessage, wordsInAIReply) + Deploy', async () => {
          await guardrailsPage.open();
          await guardrailsPage.assertNotOnLoginWall();
          await guardrailsPage.applyGuardrailsChips(chips);
          await guardrailsPage.deployOrSave();
        });
      }

      await test.step('Part 2 — Playground: userEmail + userChannel + usersMessage; assert expectedResult', async () => {
        await playgroundPage.sendScenario({
          email: row.userEmail,
          message: row.usersMessage,
          subject: row.userSubject ?? undefined,
          channel: row.userChannel,
        });
        if (row.expectedResult) {
          await playgroundPage.assertPlaygroundAssistantAnswered();
        } else {
          await playgroundPage.assertBlockedNoAssistantAnswer();
        }
      });
    });
  });
});
