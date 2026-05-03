import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { NotchConfig } from '../utils/notch-config';
import { loadNotchConfig, withNotchPolicyVersion } from '../utils/notch-config';
import { BasePage } from './BasePage';

/** Automation Audit Guardrails chip row ids (see `applyGuardrailChip`). */
export type GuardrailFieldId =
  | 'emailPatternsToUnassign'
  | 'subjects'
  | 'wordsInUserMessage'
  | 'wordsInAssistantReply';

/**
 * Config → Automation → Guardrails: email patterns, subjects, user-message words,
 * assistant-reply words (chip/tag inputs + Deploy).
 */
export class GuardrailsPage extends BasePage {
  constructor(
    page: Page,
    private readonly guardrailsPath: string,
  ) {
    super(page);
  }

  rootPath(): string {
    return this.guardrailsPath.startsWith('/') ? this.guardrailsPath : `/${this.guardrailsPath}`;
  }

  /**
   * Deep links often redirect to Inbox without the full Config shell — fall back via Config → Guardrails.
   */
  async open(): Promise<void> {
    const config = loadNotchConfig();
    const target = withNotchPolicyVersion(config, this.rootPath());
    await this.page.goto(target, { waitUntil: 'domcontentloaded' });

    const emailsHeading = this.page.getByText(/Emails patterns to unassign|email patterns to unassign/i).first();
    const inboxRoute = /\/conversations\/inbox/i.test(new URL(this.page.url()).pathname);
    const shellOk = await emailsHeading.isVisible({ timeout: 12_000 }).catch(() => false);

    if (inboxRoute || !shellOk) {
      await this.openViaConfigNavigation(config);
    }

    await expect(this.page.getByText(/Emails patterns to unassign|email patterns to unassign/i).first()).toBeVisible({
      timeout: 60_000,
    });
  }

  private async openViaConfigNavigation(config: NotchConfig): Promise<void> {
    await this.page.goto(withNotchPolicyVersion(config, '/config'), { waitUntil: 'domcontentloaded' });
    const sidebar = this.page.locator('div').filter({ has: this.page.getByText(/^Config$/).first() });
    const automationToggle = sidebar.getByRole('button', { name: /^Automation$/i }).first();
    await automationToggle.click();

    const candidates = ['/config/guardrails', '/config/automation/guardrails', '/automations/guardrails'];
    const guardrailsLink = this.page.getByRole('link', { name: /Guardrails/i }).first();
    if (await guardrailsLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await guardrailsLink.click({ timeout: 45_000 });
    } else {
      for (const path of candidates) {
        await this.page.goto(withNotchPolicyVersion(config, path), { waitUntil: 'domcontentloaded' });
        const ok = await this.page
          .getByText(/Emails patterns to unassign|email patterns to unassign/i)
          .first()
          .isVisible({ timeout: 6000 })
          .catch(() => false);
        if (ok) return;
      }
      throw new Error(
        'Could not reach Guardrails (no sidebar link and candidate URLs did not show email-pattern section).',
      );
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Chip rows use a **textbox**; hint copy is often a sibling generic, not `placeholder`.
   * Titles are anchored so we do not hit Spam Filter’s “Email Patterns to Block”.
   */
  private chipTextboxForSection(sectionTitle: RegExp): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(sectionTitle).first() })
      .filter({ has: this.page.getByRole('textbox') })
      .first()
      .getByRole('textbox')
      .first();
  }

  async addEmailPatternToUnassign(pattern: string): Promise<void> {
    const input = this.chipTextboxForSection(/^Emails patterns to unassign$/i);
    await input.scrollIntoViewIfNeeded();
    await input.fill(pattern);
    await input.press('Enter');
  }

  async addSubjectKeyword(keyword: string): Promise<void> {
    const input = this.chipTextboxForSection(/^Subjects$/i);
    await input.scrollIntoViewIfNeeded();
    await input.fill(keyword);
    await input.press('Enter');
  }

  async addUserMessageWord(word: string): Promise<void> {
    const input = this.chipTextboxForSection(/^Words in User Message$/i);
    await input.scrollIntoViewIfNeeded();
    await input.fill(word);
    await input.press('Enter');
  }

  async addAssistantReplyWord(word: string): Promise<void> {
    const input = this.chipTextboxForSection(/Words in Assistant'?s Reply/i);
    await input.scrollIntoViewIfNeeded();
    await input.fill(word);
    await input.press('Enter');
  }

  async applyGuardrailChip(field: GuardrailFieldId, token: string): Promise<void> {
    switch (field) {
      case 'emailPatternsToUnassign':
        await this.addEmailPatternToUnassign(token);
        return;
      case 'subjects':
        await this.addSubjectKeyword(token);
        return;
      case 'wordsInUserMessage':
        await this.addUserMessageWord(token);
        return;
      case 'wordsInAssistantReply':
        await this.addAssistantReplyWord(token);
        return;
      default: {
        const _exhaustive: never = field;
        throw new Error(`Unknown guardrail field: ${_exhaustive}`);
      }
    }
  }

  /**
   * Add chips for each non-empty list. Order matches stable product behavior (user words before email patterns).
   */
  async applyGuardrailsChips(config: Partial<Record<GuardrailFieldId, string[]>>): Promise<void> {
    const order: GuardrailFieldId[] = [
      'wordsInUserMessage',
      'subjects',
      'wordsInAssistantReply',
      'emailPatternsToUnassign',
    ];
    for (const field of order) {
      const tokens = config[field];
      if (!tokens?.length) continue;
      for (const token of tokens) {
        await this.applyGuardrailChip(field, token);
      }
    }
  }

  /** Guardrails drafts often use **Deploy** in the page **banner** (not the left-nav Deploy link). */
  async deployOrSave(): Promise<void> {
    const bannerDeploy = this.page.getByRole('banner').getByRole('button', { name: /^deploy$/i }).first();
    const floatingDeploy = this.page.getByRole('button', { name: /^deploy$/i }).first();
    const save = this.page.getByRole('button', { name: /^save$/i }).first();
    if (await bannerDeploy.isVisible({ timeout: 6000 }).catch(() => false)) {
      await bannerDeploy.click();
    } else if (await floatingDeploy.isVisible({ timeout: 3000 }).catch(() => false)) {
      await floatingDeploy.click();
    } else if (await save.isVisible({ timeout: 3000 }).catch(() => false)) {
      await save.click();
    }
    await this.page.waitForLoadState('domcontentloaded');
    // Draft deploy propagation — playground evaluates shortly after.
    await this.page.waitForTimeout(2500);
  }
}
