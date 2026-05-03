import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { loadNotchConfig, withNotchPolicyVersion } from '../utils/notch-config';

/**
 * Base page object: shared navigation, auth-shell checks, and shared locators for Notch CSR.
 */
export abstract class BasePage {

  protected readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  /** Shared document root — getter avoids TS2729 (`page` used before ctor parameter init vs field initializers). */
  protected get body(): Locator {
    return this.page.locator('body');
  }

  /** Path under `use.baseURL` (must start with `/`). */
  abstract rootPath(): string;

  /** Normalize pathname for comparison (trailing slashes). */
  protected normalizePathname(pathname: string): string {
    const trimmed = pathname.replace(/\/+$/, '');
    return trimmed.length === 0 ? '/' : trimmed;
  }

  /** Assert `goto` landed on this surface (pathname matches `rootPath()`, allowing subpaths). */
  protected async assertOpenedAtRootPath(): Promise<void> {
    const raw = this.rootPath().startsWith('/') ? this.rootPath() : `/${this.rootPath()}`;
    const pathOnly = this.normalizePathname(raw.split('?')[0]);

    await expect(this.page).toHaveURL((url: URL) => {
      const actual = this.normalizePathname(url.pathname);
      return actual === pathOnly || actual.startsWith(`${pathOnly}/`);
    }, { timeout: 30_000 });
  }

  async open(): Promise<void> {
    // `networkidle` often never settles on live SPAs (analytics, websockets).
    const config = loadNotchConfig();
    const target = withNotchPolicyVersion(config, this.rootPath());
    await this.page.goto(target, { waitUntil: 'domcontentloaded' });
    await this.assertOpenedAtRootPath();
  }

  /** After opening a deep link, user must not be sent back to the login screen. */
  async assertNotOnLoginWall(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login([?#/]|$)/);
  }

  currentUrl(): string {
    return this.page.url();
  }
}
