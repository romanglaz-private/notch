# Notch QA assignment

Playwright automation for **Guardrails → Playground**: guardrail chips are applied from JSON, then the Playground is exercised and outcomes are asserted against the test plan.

---

## Key documents

| Document | Path |
| --- | --- |
| **Test plan** (scope, cases, matrix semantics, §9.A automation mapping) | [`docs/test-plan.md`](docs/test-plan.md) |
| **Written QA / role answers** (homework-style narrative responses) | [`docs/qa-role-answers.md`](docs/qa-role-answers.md) |

The matrix format and `expectedResult` behavior are documented in **§9.A** of the test plan (`docs/test-plan.md`).

---

## What this repo contains

- **Matrix-driven E2E** — One spec file: [`tests/e2e.spec.ts`](tests/e2e.spec.ts) (`playwright.config.ts` limits runs via `testMatch: **/e2e.spec.ts`).
- **Data** — Scenarios in [`tests/data/guardrails-playground-matrix.json`](tests/data/guardrails-playground-matrix.json); loader/types in [`tests/data/guardrail-playground-matrix.ts`](tests/data/guardrail-playground-matrix.ts).
- **Page objects** — Under [`src/page/`](src/page/) (POM). Shared fixtures: [`tests/fixtures.ts`](tests/fixtures.ts).
- **Config** — App URLs and optional matrix path: [`notch.config.json`](notch.config.json) (see [`src/utils/notch-config.ts`](src/utils/notch-config.ts)).

Each matrix row defines chip arrays (`emailPatternsToUnassign`, `subjectToUnassign`, `wordsInUserMessage`, `wordsInAIReply`), Playground fields (`userEmail`, `userChannel`, optional `userSubject`, `usersMessage`), and `expectedResult` (`true` = assistant answers, `false` = blocked / failure UI). Use `{{RUN_ID}}` in strings for per-run uniqueness.

---

## Configuration

| What | Where |
| --- | --- |
| Base URL and routes | `notch.config.json` → `baseUrl`, `featurePath`, `e2e.guardrailsPath`, `e2e.testsPlaygroundPath` |
| Matrix file override | `notch.config.json` → `e2e.guardrailsPlaygroundMatrixPath` (default: `tests/data/guardrails-playground-matrix.json`) |
| Playwright base URL | Resolved from `notch.config.json` in `playwright.config.ts` |

---

## Commands

### Save Google login (once per machine)

Session is stored for reuse by Playwright (cookies + storage for the app origins).

1. Run:

   ```bash
   npm run auth:save
   ```

2. Complete Google sign-in in the opened browser until you are inside Notch.

3. Return to the terminal and press **Enter**.

4. State is written to `playwright/.auth/storage-state.json` (gitignored).

5. Run tests:

   ```bash
   npm test
   ```

Override storage state path:

```bash
PLAYWRIGHT_STORAGE_STATE=/path/to/storage-state.json npm test
```

Run headed (debugging):

```bash
npx playwright test tests/e2e.spec.ts --headed
```

`auth:save` runs [`scripts/save-auth-session.ts`](scripts/save-auth-session.ts) (via `tsx`).

---

## Notes

- Google auth is manual; automation only persists the resulting browser state.
- Do **not** commit `playwright/.auth/storage-state.json` (listed in `.gitignore`).
- Some tenants may redirect certain settings routes depending on role or feature flags; the suite is written to tolerate navigation to the intended Guardrails / Playground surfaces.

---

## Assessment context

Typical Notch QA homework expects written answers, a test plan, and automation traceable to that plan—the paths above are the written and planning deliverables linked to [`tests/e2e.spec.ts`](tests/e2e.spec.ts).
