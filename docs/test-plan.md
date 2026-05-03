# Notch QA Test Plan — Automation Audit Customization (Escalation)

## 1. Document control


| Field         | Value                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature URL   | `https://guardio.app.getnotch.dev/settings/customization/escalation` (canonical values: repo root `notch.config.json` — `baseUrl` + `featurePath`; used by Playwright and `npm run auth:save`) |
| Product scope | Automation Audit: **Email patterns**, **Subject**, **Words in user message**, **Words in assistant reply**                                                                                     |
| Goal          | Prove configuration correctness, evaluation correctness (no false positives/negatives), safe UX, and stable non-functional behavior under realistic and adversarial data.                      |


## 2. Scope pillars → coverage map (traceability)

Each pillar must be covered by **smoke**, **functional**, **negative/boundary**, **data-driven**, **cross-pillar combination**, and **non-functional** (where applicable).


| Pillar                       | Smoke | Functional | Negative / boundary | Data-driven | E2E / workflow | NFR (a11y/perf/sec) |
| ---------------------------- | ----- | ---------- | ------------------- | ----------- | -------------- | ------------------- |
| Email patterns               | ✓     | ✓          | ✓                   | ✓           | ✓              | ✓                   |
| Subject                      | ✓     | ✓          | ✓                   | ✓           | ✓              | ✓                   |
| User message words           | ✓     | ✓          | ✓                   | ✓           | ✓              | ✓                   |
| Assistant reply words        | ✓     | ✓          | ✓                   | ✓           | ✓              | ✓                   |
| Save / load / auth / routing | ✓     | ✓          | ✓                   | —           | ✓              | ✓                   |


## 3. Test types used in this plan


| Type                         | Purpose                                                                 | How executed (typical)                              |
| ---------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| **Smoke**                    | Fast gate: page loads, critical controls visible, save path not broken  | Automated + manual                                  |
| **Functional**               | Happy paths per field and per business rule                             | Automated + manual                                  |
| **Integration**              | UI + API + persistence; rule read back after save                       | Automated                                           |
| **End-to-end**               | Real conversation/ticket triggers evaluation end-to-end                 | Automated or staging manual                         |
| **Regression**               | No unintended change after releases/refactors                           | Automated suite                                     |
| **Negative / validation**    | Invalid input, server errors, auth failures                             | Automated + manual                                  |
| **Boundary**                 | Min/max length, empty, max list size, unicode limits                    | Data-driven automated                               |
| **Equivalence / partition**  | Group inputs into classes (email class A vs B)                          | Data-driven tables                                  |
| **Pairwise / combinatorial** | Reduce explosion while covering interactions (e.g. subject × user word) | Test design tool or matrix                          |
| **Data-driven**              | Same steps, many inputs (tables below)                                  | `test.describe` + `test.each` / CSV / JSON fixtures |
| **Security**                 | XSS/injection, IDOR on save, role bypass                                | Manual + targeted automated                         |
| **Performance**              | Large keyword lists, save latency, re-render                            | Manual or k6/lighthouse where relevant              |
| **Accessibility**            | Keyboard, labels, focus order, contrast                                 | axe or manual                                       |
| **Localization / i18n**      | RTL, accents, locale-specific punctuation in subjects                   | Data-driven                                         |
| **Compatibility**            | Chrome, Safari, Firefox; responsive breakpoints                         | Matrix                                              |
| **Exploratory**              | Time-boxed charter-based sessions                                       | Manual                                              |
| **Chaos / resilience**       | Offline save, 429/503 from API                                          | Manual or automated with mocks                      |


## 4. Assumptions (to confirm with product)

Document these once confirmed; tests are written against explicit expected behavior.

1. **Match semantics**: substring vs whole word vs regex per field.
2. **Case sensitivity**: default insensitive unless stated.
3. **Combination logic**: AND vs OR across pillars; order of precedence if mixed.
4. **Evaluation context**: live conversations only vs historical replay; email channel vs chat.
5. **Limits**: max patterns per field, max characters per token, max total payload size.

---

## 5. Smoke suite (PR gate)


| ID     | Objective                 | Preconditions            | Steps                   | Expected                                                                           |
| ------ | ------------------------- | ------------------------ | ----------------------- | ---------------------------------------------------------------------------------- |
| SMK-01 | Reach customization page  | User with feature access | Navigate to feature URL | URL path is escalation customization; no unhandled error boundary                  |
| SMK-02 | All four sections visible | Same                     | Scroll / tab through UI | Distinct UI for email patterns, subject, user message words, assistant reply words |
| SMK-03 | Save enabled when dirty   | Same                     | Change one field        | Save enabled; disabled when pristine (if product behaves so)                       |
| SMK-04 | Save succeeds             | Valid minimal config     | Save                    | Success toast/banner; network 2xx                                                  |
| SMK-05 | Reload preserves          | After SMK-04             | Hard refresh            | Values match last saved                                                            |
| SMK-06 | Auth gate                 | User without access      | Open deep link          | Redirect or 403 consistent with policy                                             |


---

## 6. Functional suite — per pillar (detailed)

### 6.A Email patterns


| ID       | Scenario                          | Steps                                | Expected                                       |
| -------- | --------------------------------- | ------------------------------------ | ---------------------------------------------- |
| FUN-E-01 | Add single literal email          | Add `agent@company.com`, save        | Persisted; evaluation matches that sender only |
| FUN-E-02 | Domain wildcard                   | Add `*@vendor.com`, save             | Any user `@vendor.com` matches                 |
| FUN-E-03 | Plus-address normalization        | Add `team+alerts@x.com`              | Behavior per spec (treat + tag or exact)       |
| FUN-E-04 | Edit pattern                      | Change pattern, save                 | Old rule inactive; new active                  |
| FUN-E-05 | Delete pattern                    | Remove row, save                     | No match for removed pattern                   |
| FUN-E-06 | Multiple patterns OR              | Two disjoint patterns                | Match if either matches (if OR semantics)      |
| FUN-E-07 | Evaluation in inbox/email preview | Trigger message from matching sender | Escalation / audit flag appears per product    |


### 6.B Subject


| ID       | Scenario                       | Steps                           | Expected                                     |
| -------- | ------------------------------ | ------------------------------- | -------------------------------------------- |
| FUN-S-01 | Single keyword                 | Subject contains `urgent`, save | Matches when substring present               |
| FUN-S-02 | Multi-keyword list             | `refund`, `chargeback`          | Match any in list (confirm OR vs AND)        |
| FUN-S-03 | Phrase with spaces             | `cancel subscription`           | Whole phrase vs token match per spec         |
| FUN-S-04 | Case variants                  | `REFUND` vs `refund`            | Consistent with case policy                  |
| FUN-S-05 | Special punctuation in subject | `Re: [Ticket#123] Refund!!!`    | Still matches keyword if substring semantics |


### 6.C Words in user message


| ID       | Scenario                    | Steps                          | Expected                                 |
| -------- | --------------------------- | ------------------------------ | ---------------------------------------- |
| FUN-U-01 | Single token                | Message body contains `angry`  | Match                                    |
| FUN-U-02 | Word boundary               | `scangry` vs `angry`           | No false positive if whole-word only     |
| FUN-U-03 | Multiline / HTML email body | HTML with keyword in text node | Match only in visible text if applicable |
| FUN-U-04 | Emoji-adjacent text         | `angry😡`                      | Match per tokenization rules             |
| FUN-U-05 | Very long message           | 50k chars with keyword at end  | Still matches; performance acceptable    |


### 6.D Words in assistant reply


| ID       | Scenario                      | Steps                                     | Expected                                 |
| -------- | ----------------------------- | ----------------------------------------- | ---------------------------------------- |
| FUN-A-01 | Policy phrase                 | Assistant says `per policy we cannot`     | Match                                    |
| FUN-A-02 | Distinguish user vs assistant | Same word only in user bubble             | Assistant rule does not fire incorrectly |
| FUN-A-03 | Thread order                  | Latest assistant message contains keyword | Only latest or any message per spec      |


### 6.E Cross-pillar combination (critical)


| ID       | Scenario            | Steps                                                                  | Expected                                     |
| -------- | ------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| FUN-X-01 | All four match      | Construct fixture where email + subject + user + assistant all satisfy | Escalation outcome per AND/OR spec           |
| FUN-X-02 | Three of four match | Vary which pillar fails                                                | Correct negative when AND required           |
| FUN-X-03 | Priority / ordering | Overlapping rules                                                      | Deterministic winner if multiple rules exist |


---

## 7. Negative, validation, and boundary suite


| ID     | Category                    | Scenario                               | Expected                                      |
| ------ | --------------------------- | -------------------------------------- | --------------------------------------------- |
| NEG-01 | Email invalid               | `not-an-email`, `@@@`, empty token     | Inline error; save blocked or row rejected    |
| NEG-02 | Email duplicate             | Same pattern twice                     | Dedup or validation error                     |
| NEG-03 | Subject empty row           | Whitespace-only                        | Trim or reject                                |
| NEG-04 | SQL-like payload in keyword | `'; DROP--`                            | Stored safely; no server error leakage        |
| NEG-05 | XSS-like payload            | `<script>alert(1)</script>` in keyword | Escaped in UI; not executed                   |
| NEG-06 | Oversized list              | Exceed max rows if product defines     | Graceful limit message                        |
| NEG-07 | Unicode edge                | Zero-width chars, RTL marks in subject | No crash; match behavior documented           |
| NEG-08 | Network failure on save     | Simulate 500/timeout                   | Error UI; no partial silent loss              |
| NEG-09 | Concurrent edit             | Two tabs save different configs        | Last-write-wins or conflict handling per spec |


### Boundary table (data-driven candidates)


| Field           | Min    | Max           | Empty                | Single char | Unicode        |
| --------------- | ------ | ------------- | -------------------- | ----------- | -------------- |
| Email pattern   | N/A    | max chars     | reject / allow clear | `a@b.co`    | IDN `用户@例え.jp` |
| Subject keyword | 1 char | max per token | reject               | `x`         | `café`         |
| User word       | 1      | max           | clear config         | `a`         | mixed scripts  |
| Assistant word  | 1      | max           | clear config         | `a`         | mixed scripts  |


---

## 8. Data-driven test matrices (parametrized automation design)

Use one parameterized test per matrix (Playwright: `test.describe` + array of cases, or CSV fixture).

### 8.1 Email pattern — equivalence classes


| `#` | pattern            | sample_sender          | should_match    |
| --- | ------------------ | ---------------------- | --------------- |
| E1  | `*@acme.com`       | `u@acme.com`           | true            |
| E2  | `*@acme.com`       | `u@other.com`          | false           |
| E3  | `support@acme.com` | `support@acme.com`     | true            |
| E4  | `support@acme.com` | `support+tag@acme.com` | per spec        |
| E5  | empty              | any                    | false / blocked |


### 8.2 Subject keyword — substring vs word (clarify spec then lock expected)


| `#` | keywords | subject_line         | expected                                     |
| --- | -------- | -------------------- | -------------------------------------------- |
| S1  | `refund` | `Request for refund` | match                                        |
| S2  | `refund` | `refundability`      | match only if substring; false if whole-word |
| S3  | `urgent` | `URGENT help`        | match if case-insensitive                    |


### 8.3 User message words


| `#` | words         | body_snippet         | expected               |
| --- | ------------- | -------------------- | ---------------------- |
| U1  | `cancel`      | `I want to cancel`   | match                  |
| U2  | `cancel`      | `scancel`            | per word-boundary spec |
| U3  | `charge back` | `charge back please` | phrase vs two tokens   |


### 8.4 Assistant reply words


| `#` | words    | assistant_text                      | expected                      |
| --- | -------- | ----------------------------------- | ----------------------------- |
| A1  | `policy` | `Per company policy...`             | match                         |
| A2  | `policy` | user-only message contains `policy` | false for assistant-only rule |


### 8.5 Pairwise sample (subject × user word × email) — reduce suite size

Pick representative pairs (tools: PICT, ACTS, or manual 10–15 rows) so each value of each factor appears with varied partners.

---

## 9. Integration and E2E


| ID     | Type                        | Flow                                              | Pass criteria                                                                                                                                                                                                                    |
| ------ | --------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INT-01 | UI + API                    | Save → GET settings → compare JSON                | Field-for-field equality                                                                                                                                                                                                         |
| INT-02 | UI + worker                 | Save → process test conversation                  | Audit/escalation flag matches config                                                                                                                                                                                             |
| E2E-01 | Full journey (legacy inbox) | Escalation customization → inbound fixture thread | **Automated:** open customization + best-effort marker save when UI reachable → `e2e.fixtureConversationPath` or first inbox thread → assert downstream work surface (Reply/Send/Summary/…). Not the Guardrails Playground flow. |
| E2E-02 | Rollback                    | Change rules mid-flight                           | Old conversations not retroactively broken unless product says so                                                                                                                                                                |


### 9.A Guardrails + Tests → Playground (instruction-aligned)

**Navigation:** Config → Automation → **Guardrails** (four chip fields). Validate behavior under **Tests → Playground**: set **Customer Email / Phone**, optional **Channel** (use **Email** when exercising **Subjects**), compose message, **Send as customer**.

**Pass signal (blocked assistant):** UI shows failure such as **Failed to process message** / **no relevant actions for the Action Selector**, and **Reasoning** often shows a red ✕ when the assistant did not ship a normal reply because a guardrail fired (confirm visually on tenant; screenshot reference: workspace assets under `.cursor/projects/.../assets/Screen_Shot_*.png`).

**Pass signal (negative control — guardrail must *not* fire):** same Playground surface, but customer identity / subject / body is chosen so **no** rule matches; assistant produces a normal reply (e.g. helpful paragraph), and the failure banner / Action Selector error does **not** appear. *Example (manual narrative):* configure **Emails patterns to unassign** for `roman@gmail.com` (or a substring that only that address contains); in Playground, `**roman@yahoo.com`** should get an AI answer; `**roman@gmail.com**` should be blocked with Reasoning ✕ / failure copy — automation uses unique `roman-pw-<ts>@…` / `other-user-<ts>@yahoo…` tokens for isolation.


| ID      | Field(s) under test        | Negative control (no match)                                                                                  | Positive (match → blocked)                                                                                                                                       |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-E-01 | Email patterns to unassign | Playground **Email**; sender **does not** contain pattern → assistant answers (**automated**)                | `**PG-E-02` `fixme`:** sender **contains** pattern → failure banner / Reasoning ✕ (enable when Playground honors Automation Audit email patterns on your tenant) |
| PG-S-01 | Subjects                   | Chip smoke: keyword added + Deploy (Playground subject pair tracked for future / `fixme` where tenant flaky) | Playground **Email**; subject contains keyword → blocked signal                                                                                                  |
| PG-U-01 | Words in user message      | Playground message **without** forbidden word → assistant answers (**automated**)                            | Message **contains** forbidden word → blocked signal (**automated**)                                                                                             |
| PG-A-01 | Words in assistant's reply | —                                                                                                            | Forbidden token only in model reply path — `**fixme`** until wording is deterministic                                                                            |
| PG-X-01 | Email + user (sequence)    | Chip smoke: both chips + Deploy                                                                              | Full Playground combo → `**fixme**` where subject/email evaluation order varies                                                                                  |
| PG-X-02 | Subject + user (sequence)  | —                                                                                                            | `**fixme**` — subject-only hit on Playground varies by tenant                                                                                                    |


**Playwright data matrix** (`tests/data/guardrails-playground-matrix.json`): root is **`scenarios[]`** only. Each object is one automated test and must include:

| JSON property | Meaning |
| --- | --- |
| **`testCaseId`** | §9.A table **`ID`** (e.g. **`PG-U-01`**, **`PG-E-01`**) — echoed in the Playwright title. |
| **`id`** | Human-readable description for the title. |
| **`emailPatternsToUnassign`** | String array → **Emails patterns to unassign** chips. |
| **`subjectToUnassign`** | String array → **Subjects** keyword chips (matrix name mirrors “…ToUnassign” wording used for email patterns). |
| **`wordsInUserMessage`** | String array → **Words in User Message** chips. |
| **`wordsInAIReply`** | String array → **Words in Assistant's Reply** chips. |
| **`userEmail`** | Playground customer identity (email). |
| **`userSubject`** | Playground subject when **`userChannel`** is **Email** (use `null` if not used). |
| **`userChannel`** | **`Chat`** or **`Email`**. |
| **`usersMessage`** | Composer body (**Send as customer**). |
| **`expectedResult`** | **`true`** = negative control (assistant answers); **`false`** = positive match (blocked / failure UI). |

The default file runs **two** rows for **`PG-U-01`**: **`expectedResult` `true`** then **`false`**, matching the same §9.A row’s two columns. Re-run **Part 1** (chips + Deploy) when a row’s four chip arrays differ from the previous row; if they are identical, only **Part 2** runs. Add more rows for other **`testCaseId`** values as needed; respect **Automation order** below when mixing **Chat** / **Email** / pattern cases.

**Config:** `notch.config.json` → `e2e.guardrailsPath` (Guardrails URL), `e2e.testsPlaygroundPath` (Playground URL). If `guardrailsPath` is omitted, automation falls back to `featurePath` (may be escalation, not Guardrails — set explicitly when routes differ).

**Automation order:** run `**PG-U-01` before `PG-E-01`** in the same suite: deploying email-pattern changes first can leave Playground in a state where benign **Chat** turns also hit policy/Action Selector failures, which invalidates the user-word **negative control**.

---

## 10. Regression checklist (release)

- Golden fixtures: 5 canned conversations (email + chat) with expected match/no-match.
- Snapshot or contract test on API response shape for settings GET/PUT.
- Visual baseline optional for settings page layout.

---

## 11. Non-functional


| ID        | Area          | Scenario                            | Tool / method         |
| --------- | ------------- | ----------------------------------- | --------------------- |
| NFR-P-01  | Performance   | Save with 200 keywords              | measure p95 save time |
| NFR-P-02  | Performance   | Open page with large config         | TTI acceptable        |
| NFR-A-11y | Accessibility | Tab order through all four sections | keyboard-only pass    |
| NFR-A-11y | Labels        | Every input has accessible name     | axe                   |
| NFR-S-01  | Security      | IDOR: another tenant/user ID in API | 403                   |
| NFR-C-01  | Compatibility | Chrome, Safari, Firefox latest      | matrix                |


---

## 12. Exploratory test charters (time-boxed)


| Charter | Focus           | Session goal                                           |
| ------- | --------------- | ------------------------------------------------------ |
| CH-01   | False positives | Find benign emails that trigger escalation incorrectly |
| CH-02   | False negatives | Find obvious escalation cases missed by rules          |
| CH-03   | Confusing UX    | Ambiguous AND/OR copy; misleading placeholders         |
| CH-04   | Edge locales    | Non-English subjects and bodies                        |


---

## 13. Automation strategy (data-driven in code)

1. **fixtures/rules.json**: arrays of `{ emailPatterns, subjectWords, userWords, assistantWords }`.
2. **fixtures/conversations.json**: `{ id, headers, subject, userBody, assistantBodies[], expectedMatch }`.
3. One **parametrized** test loop over conversations against a frozen rule set (CI-stable).
4. Separate **API-level** tests if evaluation endpoint exists (faster than UI).
5. Tag tests: `@smoke`, `@rules`, `@nfr` for selective CI.

Implemented in repo: `**tests/e2e.spec.ts`** — one test, two steps: (1) apply `**guardrails**` chip lists from `**tests/data/guardrails-playground-matrix.json**`, (2) `**playground**` send + `**expectPass**` assertion (`GuardrailsPage`, `PlaygroundPage`). Loader `**tests/data/guardrail-playground-matrix.ts**`; helpers `**src/utils/**`, `**tests/utils/**`. `**notch.config.json**`: `policyVersion`, `e2e.guardrailsPath`, `e2e.testsPlaygroundPath`, `e2e.guardrailsPlaygroundMatrixPath`, etc. `**testMatch`: `**/e2e.spec.ts**`.

---

## 14. Prioritization (risk-based)


| Tier | Includes                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------- |
| P0   | SMK-01..05, FUN-X-01, FUN-E-01, FUN-S-01, FUN-U-01, FUN-A-01, NEG-01, NEG-08, INT-01, SEC/auth gate |
| P1   | All remaining FUN-* per pillar, NEG-02..07, FUN-X-02..03, E2E-01                                    |
| P2   | Pairwise matrix, NFR-*, exploratory charters, CH-*                                                  |


---

## 15. Exit criteria

- Every scope pillar has at least **P0** automated or documented manual evidence.
- Data-driven matrices **E1–E5, S1–S3, U1–U3, A1–A2** executed at least once per release candidate.
- No open **P0** defects for save, auth, or evaluation correctness.
- Traceability: each critical user story links to at least one test ID in this document.

---

## 16. Environment note (current)

Authenticated navigation to the feature URL may redirect to **Inbox** if the account lacks feature access. Tests marked **requires_feature_access** should run in a tenant/user with Automation Audit customization enabled; gating tests remain valid in restricted environments.

## 17. Manual Google login and saved session (automation)

Google OAuth cannot be scripted safely in CI; use a **one-time manual login**, then persist state for Playwright.


| Step | Action                                                                         |
| ---- | ------------------------------------------------------------------------------ |
| 1    | Run `npm run auth:save`                                                        |
| 2    | Complete Google sign-in in the opened Chrome window until you are inside Notch |
| 3    | In the terminal, press **Enter** when finished                                 |
| 4    | File created: `playwright/.auth/storage-state.json` (gitignored)               |


**What is stored:** Playwright `storageState` is a JSON file containing **cookies** and, per **origin**, **localStorage** and **sessionStorage** entries the app set — not a separate hand-written “localStorage” file, but the same data Playwright needs to restore your session.

**How tests use it:** `playwright.config.ts` sets `use.storageState` when `playwright/.auth/storage-state.json` exists (or use `PLAYWRIGHT_STORAGE_STATE` for a custom path).

**Security:** Never commit `storage-state.json`; rotate by deleting the file and running `npm run auth:save` again.