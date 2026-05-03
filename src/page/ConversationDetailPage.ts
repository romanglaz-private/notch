import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Opened conversation thread — E2E-01 downstream assertions (ticket / thread work surface).
 */
export class ConversationDetailPage extends BasePage {
  private static readonly CONVERSATION_THREAD_URL_PATTERN = /\/conversations\/inbox\/.+/;

  private static readonly DOWNSTREAM_WORK_SURFACE_PATTERN =
    /Reply|Send|Summary|Details|Metrics|Timeline|User Information|Chat Information/i;

  /** Set by {@link gotoConversation} before {@link BasePage.open}. */
  private navigationPath = '';

  constructor(page: Page) {
    super(page);
  }

  rootPath(): string {
    return this.navigationPath;
  }

  /** Navigate to a thread path under `use.baseURL` (leading slash normalized). */
  async gotoConversation(conversationPath: string): Promise<void> {
    this.navigationPath = conversationPath.startsWith('/')
      ? conversationPath
      : `/${conversationPath}`;
    await this.open();
  }

  /** Assert downstream work surface for whatever conversation URL is currently loaded. */
  async assertDownstreamFromCurrentUrl(): Promise<void> {
    await this.assertDownstreamWorkSurface();
  }

  /** Not the bare inbox list: URL must include a conversation id segment. */
  async assertConversationRoute(): Promise<void> {
    await expect
      .poll(
        () =>
          ConversationDetailPage.CONVERSATION_THREAD_URL_PATTERN.test(this.page.url()),
        { timeout: 30_000 },
      )
      .toBe(true);
  }

  /**
   * E2E-01 end state: work surface elements present (aligns with test plan “downstream action” UI evidence).
   */
  async assertDownstreamWorkSurface(): Promise<void> {
    await this.verifyDownstreamConversationWorkSurface();
  }

  private async verifyDownstreamConversationWorkSurface(): Promise<void> {
    await expect.poll(
      async () => {
        const hrefOk = ConversationDetailPage.CONVERSATION_THREAD_URL_PATTERN.test(
          this.page.url(),
        );
        const text = await this.body.innerText();
        const copyOk = ConversationDetailPage.DOWNSTREAM_WORK_SURFACE_PATTERN.test(text);
        return hrefOk && copyOk;
      },
      { timeout: 25_000 },
    ).toBe(true);
  }
}
