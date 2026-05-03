import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Conversations inbox when customization route is gated (`SMK-06` / environment note in test plan).
 * Provides a concrete user interaction when escalation UI is not reachable.
 */
export class InboxPage extends BasePage {
  private static readonly INBOX_URL_PATTERN = /\/conversations\/inbox/;

  private static readonly INBOX_HEADING_PATTERN = /Inbox|Conversations/i;

  private static readonly CONVERSATION_THREAD_URL_PATTERN = /\/conversations\/inbox\/.+/;

  private static readonly TIME_ROW_NAME_PATTERN =
    /\d+\s*(second|minute|hour|day|week|month|year)s?\s+ago/i;

  private static readonly RELATIVE_TIME_FRAGMENT_PATTERN =
    /ago|minute|hour|day|week|month|year/i;

  private readonly userFilterInput = this.page.getByPlaceholder('Select user...');

  private readonly conversationTimeRowButtons = this.page.getByRole('button', {
    name: InboxPage.TIME_ROW_NAME_PATTERN,
  });

  /** Prefer accessible role + visible copy over raw anchor CSS. */
  private readonly inboxThreadLinks = this.page
    .getByRole('link')
    .filter({ hasText: InboxPage.RELATIVE_TIME_FRAGMENT_PATTERN })
    .and(this.page.locator('[href*="/conversations/inbox/"]'));

  constructor(page: Page) {
    super(page);
  }

  rootPath(): string {
    return '/conversations/inbox';
  }

  async expectLoaded(): Promise<void> {
    await expect.poll(
      async () => {
        const href = this.page.url();
        const text = await this.body.innerText();
        return (
          InboxPage.INBOX_URL_PATTERN.test(href) &&
          InboxPage.INBOX_HEADING_PATTERN.test(text)
        );
      },
      { timeout: 30_000 },
    ).toBe(true);
  }

  /**
   * E2E interaction: use the "Select user..." filter control when present (inbox shell smoke).
   */
  async interactWithUserFilter(): Promise<void> {
    await this.userFilterInput.click({ timeout: 15_000 });
    await this.userFilterInput.fill('te');
    await this.userFilterInput.clear();
    await this.verifyUserFilterReset();
  }

  private async verifyUserFilterReset(): Promise<void> {
    await expect.poll(async () => (await this.userFilterInput.inputValue()) === '', {
      timeout: 15_000,
    }).toBe(true);
  }

  private async verifyConversationThreadOpened(): Promise<void> {
    await expect
      .poll(() => InboxPage.CONVERSATION_THREAD_URL_PATTERN.test(this.page.url()), {
        timeout: 30_000,
      })
      .toBe(true);
  }

  /**
   * E2E-01 — open first inbound thread from the list when no `fixtureConversationPath` is configured.
   */
  async openFirstConversationFromList(): Promise<void> {
    await this.expectLoaded();

    if ((await this.conversationTimeRowButtons.count()) > 0) {
      await this.conversationTimeRowButtons.first().click({ timeout: 30_000 });
      await this.page.waitForLoadState('domcontentloaded');
      await this.verifyConversationThreadOpened();
      return;
    }

    await this.inboxThreadLinks.first().click({ timeout: 30_000 });
    await this.page.waitForLoadState('domcontentloaded');
    await this.verifyConversationThreadOpened();
  }
}
