# Notch QA Assignment

## Assessment alignment (written deliverables)

Typical Notch QA homework asks for **written answers**, a **test plan**, and **one** Playwright automation traceable to that plan. This repo’s automation is **Guardrails → Playground**: each row in **`tests/data/guardrails-playground-matrix.json`** defines chip arrays (**`emailPatternsToUnassign`**, **`subjectToUnassign`**, **`wordsInUserMessage`**, **`wordsInAIReply`**), customer **`userEmail`** / **`userChannel`** / optional **`userSubject`**, **`usersMessage`**, and **`expectedResult`** (`true`/`false`); see **`docs/test-plan.md` §9.A** matrix table. We cannot replay your instruction video from Google Drive here (access is sign-in gated); if the video adds extra requirements, paste those bullets and we can extend the spec.

## Artifacts
- Written answers (PDF questions — role, professional, culture, dilemmas): `docs/qa-role-answers.md`
- Test plan: `docs/test-plan.md`
- **Single** Playwright automation: **`tests/e2e.spec.ts`** (one `test(...)`, **POM** under `src/page/`, fixtures in **`tests/fixtures.ts`**). `npm test` runs only this file (`playwright.config.ts` **`testMatch`: `**/e2e.spec.ts`**).

## App URLs (single source)
- Edit **`notch.config.json`**: `baseUrl` and `featurePath`.
- Scenario JSON default: **`tests/data/guardrails-playground-matrix.json`** (override with `e2e.guardrailsPlaygroundMatrixPath` in **`notch.config.json`**). Use `{{RUN_ID}}` in strings for unique tokens per run.
- **`src/utils/`**: `notch-config.ts`, `playwright-session.ts`, `paths.ts`. **`tests/utils/`**: `hasUsablePlaywrightStorageState`. Loader: **`tests/data/guardrail-playground-matrix.ts`**.
- **`playwright.config.ts`** sets `use.baseURL` from `baseUrl`.
- **`npm run auth:save`** runs `scripts/save-auth-session.ts` (via `tsx`) and uses the same helpers for the login `redirectTo` URL.

## Commands

### Save Google login for tests (manual once, then reuse)

1. Run:

   ```bash
   npm run auth:save
   ```

2. When the Chrome window opens, **complete Google sign-in** until you are inside Notch (inbox or any page is fine).

3. Return to the terminal and **press Enter**.

4. Session is written to **`playwright/.auth/storage-state.json`** (gitignored). That file is Playwright’s **storage state**: cookies plus **localStorage** and **sessionStorage** for each origin the app used — this is how automated tests reuse your login without embedding passwords.

5. Run tests as usual:

   ```bash
   npm test
   ```

`playwright.config.ts` loads that file automatically when it exists. Override path:

```bash
PLAYWRIGHT_STORAGE_STATE=/path/to/storage-state.json npm test
```

- Run the assignment test headed:

  ```bash
  npx playwright test tests/e2e.spec.ts --headed
  ```

## Notes

- Google auth is manual; automation only **stores** the resulting browser state for replay.
- `playwright/.auth/` is listed in `.gitignore` — do not commit `storage-state.json`.
- Current environment may redirect the customization route to inbox due to role/feature gating; the implemented test accounts for that.
