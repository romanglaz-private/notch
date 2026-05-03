import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { NotchConfig } from '../utils/notch-config';
import { loadNotchConfig, withNotchPolicyVersion } from '../utils/notch-config';
import { BasePage } from './BasePage';

/**
 * Tests → Playground: set customer email / channel / subject (when shown), compose message,
 * **Send as customer**, then observe blocked assistant (Reasoning failure / banner).
 */
export class PlaygroundPage extends BasePage {
  constructor(
    page: Page,
    private readonly playgroundPath: string,
  ) {
    super(page);
  }

  rootPath(): string {
    return this.playgroundPath.startsWith('/') ? this.playgroundPath : `/${this.playgroundPath}`;
  }

  /** “Customer Email / Phone Number” is an `h2`; the field is a textbox named from hint copy, not `aria-labelledby`. */
  private customerIdentityTextbox(): Locator {
    return this.page.getByRole('textbox', {
      name: /mark@meta\.com|empty to test as a lead|lead/i,
    });
  }

  async open(): Promise<void> {
    const config = loadNotchConfig();
    const target = withNotchPolicyVersion(config, this.rootPath());
    await this.page.goto(target, { waitUntil: 'domcontentloaded' });

    const identity = this.customerIdentityTextbox();
    const inboxRoute = /\/conversations\/inbox/i.test(new URL(this.page.url()).pathname);
    const playgroundShell = await identity.isVisible({ timeout: 12_000 }).catch(() => false);

    if (inboxRoute || !playgroundShell) {
      await this.openViaTestsNavigation(config);
    }

    await expect(this.page.getByRole('heading', { name: /Test Taylor/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(this.customerIdentityTextbox()).toBeVisible({ timeout: 60_000 });
  }

  private async openViaTestsNavigation(config: NotchConfig): Promise<void> {
    await this.page.goto(withNotchPolicyVersion(config, '/tests'), { waitUntil: 'domcontentloaded' });
    await this.page.getByRole('link', { name: /^Playground$/i }).first().click({ timeout: 45_000 });
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Playground defaults can evaluate an older numeric policy (e.g. Chat Information shows 107.x)
   * while Guardrails edits target `policyVersion` draft — select it on **Test Taylor** before sending.
   */
  async ensureDraftPolicyVersionFromConfig(): Promise<void> {
    const ver = loadNotchConfig().policyVersion?.trim();
    if (!ver) return;

    await this.page.getByRole('heading', { name: /^Test Taylor$/i }).first().scrollIntoViewIfNeeded();
    const combo = this.page.getByRole('combobox', { name: /Search Policy Version/i }).first();
    await combo.click();
    await combo.fill(ver);
    const esc = ver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page.getByRole('option', { name: new RegExp(esc, 'i') }).first().click({ timeout: 20_000 });
  }

  async selectChannel(label: string): Promise<void> {
    const channelHeading = this.page.getByRole('heading', { name: /^Channel$/i }).first();
    const combo = this.page.locator('div').filter({ has: channelHeading }).getByRole('combobox').first();
    await combo.click();
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page.getByRole('option', { name: new RegExp(`^${esc}$`, 'i') }).click();
  }

  async fillCustomerEmail(email: string): Promise<void> {
    await this.customerIdentityTextbox().fill(email);
  }

  /** Subject appears as plain “Subject” label + textbox (not an `h2`) when Channel is Email. */
  async fillSubjectIfVisible(subject: string): Promise<boolean> {
    const row = this.page
      .locator('div')
      .filter({ has: this.page.getByText(/^Subject$/).first() })
      .filter({ has: this.page.getByRole('textbox') })
      .first();
    const visible = await row.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!visible) return false;
    await row.getByRole('textbox').first().fill(subject);
    return true;
  }

  async fillComposerMessage(text: string): Promise<void> {
    const editor = this.page.locator('.ql-editor').filter({ visible: true }).first();
    await editor.click();
    await editor.fill(text);
  }

  async sendAsCustomer(): Promise<void> {
    await this.page.getByRole('button', { name: /Send as customer/i }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async sendScenario(opts: {
    email: string;
    message: string;
    channel?: string;
    subject?: string;
  }): Promise<void> {
    await this.open();
    await this.ensureDraftPolicyVersionFromConfig();
    if (opts.channel) await this.selectChannel(opts.channel);
    await this.fillCustomerEmail(opts.email);
    if (opts.subject !== undefined) {
      const ok = await this.fillSubjectIfVisible(opts.subject);
      if (!ok && opts.subject.length > 0) {
        throw new Error(
          'Subject field not visible — switch Channel to Email (or equivalent) so subject guardrails can be exercised.',
        );
      }
    }
    await this.fillComposerMessage(opts.message);
    await this.sendAsCustomer();
  }

  /**
   * Instruction pass signal: assistant did not ship a normal reply — banner and/or Action Selector failure.
   * Reasoning row often shows a red ✕ (asserted indirectly via failure copy).
   */
  async assertBlockedNoAssistantAnswer(): Promise<void> {
    const banner = this.page.getByText(/Failed to process message/i);
    const selectorFail = this.page.getByText(/no relevant actions for the Action Selector/i);
    await expect(banner.or(selectorFail)).toBeVisible({ timeout: 90_000 });
  }

  /**
   * Negative control: guardrail did **not** fire — no Action Selector failure banner, and a normal assistant
   * reply appears (copy varies by tenant). Do not rely on `role="paragraph"`; many threads render replies in divs.
   */
  async assertPlaygroundAssistantAnswered(): Promise<void> {
    const blocked = this.page
      .getByText(/Failed to process message/i)
      .or(this.page.getByText(/no relevant actions for the Action Selector/i));
    /** Match common Taylor / Playground assistant copy (including qualification follow-ups). */
    const assistantReplyPhrases =
      /Thanks for|Of course|What would you like to know|glad to help|I['\u2019]?m here to|here to answer|happy to help|Feel free to ask|assist with any Guardio|reach(?:ing)? out|questions you have about Guardio|know about Guardio|Could you let me know|Could you share|Let me know|assist you(?: better)?|here to help|How can I help|help you (?:with|today)|specific question|furry friend|Hey[,!]?\s|having trouble accessing|requesting a refund|something else\?/i;
    const thread = this.page.locator('main');
    await expect.poll(
      async () => {
        if (await blocked.isVisible().catch(() => false)) return false;
        const candidates = thread.getByText(assistantReplyPhrases);
        const count = await candidates.count();
        for (let i = 0; i < count; i++) {
          if (await candidates.nth(i).isVisible().catch(() => false)) return true;
        }
        return false;
      },
      { timeout: 90_000 },
    ).toBeTruthy();
  }
}
