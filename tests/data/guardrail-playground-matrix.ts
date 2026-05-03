/**
 * Loads **`guardrails-playground-matrix.json`**: **`scenarios[]`** only.
 * Each row is one Playwright test: §9.A **`testCaseId`**, four chip arrays, **`user*`** + **`usersMessage`**, **`expectedResult`**.
 * `{{RUN_ID}}` is substituted once per file load.
 *
 * Field map to Automation Audit UI:
 * - **`subjectToUnassign`** → **Subjects** chip list (same shape as email “…ToUnassign” in the matrix file).
 * - **`wordsInAIReply`** → **Words in Assistant's Reply** chips.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { GuardrailFieldId } from '../../src/page/GuardrailsPage';
import { REPO_ROOT } from '../../src/utils/paths';

export type PlaygroundChannel = 'Email' | 'Chat';

export type GuardrailsChipConfig = Partial<Record<GuardrailFieldId, string[]>>;

/** One row of the matrix + one Playground send (see `docs/test-plan.md` §9.A matrix schema). */
export type GuardrailsMatrixScenario = {
  testCaseId: string;
  id: string;
  emailPatternsToUnassign: string[];
  /** Maps to Guardrails **Subjects** (keyword chips). */
  subjectToUnassign: string[];
  wordsInUserMessage: string[];
  /** Maps to **Words in Assistant's Reply**. */
  wordsInAIReply: string[];
  userEmail: string;
  userSubject: string | null;
  userChannel: PlaygroundChannel;
  usersMessage: string;
  /** `true` = expect assistant reply; `false` = expect blocked / failure UI. */
  expectedResult: boolean;
};

export type GuardrailsMatrixFile = {
  scenarios: GuardrailsMatrixScenario[];
};

const CHANNELS = new Set<PlaygroundChannel>(['Email', 'Chat']);

export const DEFAULT_GUARDDRAILS_JSON = path.join(REPO_ROOT, 'tests', 'data', 'guardrails-playground-matrix.json');

const CHIP_FIELD_ORDER: GuardrailFieldId[] = [
  'wordsInUserMessage',
  'subjects',
  'wordsInAssistantReply',
  'emailPatternsToUnassign',
];

function substituteRunId(s: string, runId: string): string {
  return s.split('{{RUN_ID}}').join(runId);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseStringArray(raw: unknown, filePath: string, label: string): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new Error(`${filePath}: "${label}" must be an array of strings`);
  }
  for (const item of raw) {
    if (typeof item !== 'string') {
      throw new Error(`${filePath}: "${label}" must contain only strings`);
    }
  }
  return raw as string[];
}

function subArr(arr: string[], runId: string): string[] {
  return arr.map((s) => substituteRunId(s, runId));
}

/** Maps matrix row → `GuardrailsPage.applyGuardrailsChips` input. */
export function chipConfigFromScenario(row: GuardrailsMatrixScenario): GuardrailsChipConfig {
  const c: GuardrailsChipConfig = {};
  if (row.emailPatternsToUnassign.length > 0) {
    c.emailPatternsToUnassign = row.emailPatternsToUnassign;
  }
  if (row.subjectToUnassign.length > 0) {
    c.subjects = row.subjectToUnassign;
  }
  if (row.wordsInUserMessage.length > 0) {
    c.wordsInUserMessage = row.wordsInUserMessage;
  }
  if (row.wordsInAIReply.length > 0) {
    c.wordsInAssistantReply = row.wordsInAIReply;
  }
  return c;
}

export function chipCount(config: GuardrailsChipConfig): number {
  return CHIP_FIELD_ORDER.reduce((n, k) => n + (config[k]?.length ?? 0), 0);
}

export function chipConfigsEqual(a: GuardrailsChipConfig, b: GuardrailsChipConfig): boolean {
  for (const k of CHIP_FIELD_ORDER) {
    const x = a[k] ?? [];
    const y = b[k] ?? [];
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) {
      if (x[i] !== y[i]) return false;
    }
  }
  return true;
}

function parseScenarioRow(raw: unknown, runId: string, filePath: string, index: number): GuardrailsMatrixScenario {
  if (!isRecord(raw)) {
    throw new Error(`${filePath}: scenarios[${index}] must be an object`);
  }

  const testCaseId = raw.testCaseId;
  if (typeof testCaseId !== 'string' || !testCaseId.trim()) {
    throw new Error(`${filePath}: scenarios[${index}].testCaseId must be a non-empty string`);
  }
  const id = raw.id;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(`${filePath}: scenarios[${index}].id must be a non-empty string`);
  }

  const emailPatternsToUnassign = subArr(
    parseStringArray(raw.emailPatternsToUnassign, filePath, `scenarios[${index}].emailPatternsToUnassign`),
    runId,
  );
  const subjectToUnassign = subArr(
    parseStringArray(raw.subjectToUnassign, filePath, `scenarios[${index}].subjectToUnassign`),
    runId,
  );
  const wordsInUserMessage = subArr(
    parseStringArray(raw.wordsInUserMessage, filePath, `scenarios[${index}].wordsInUserMessage`),
    runId,
  );
  const wordsInAIReply = subArr(
    parseStringArray(raw.wordsInAIReply, filePath, `scenarios[${index}].wordsInAIReply`),
    runId,
  );

  const userEmail = raw.userEmail;
  if (typeof userEmail !== 'string' || !userEmail.trim()) {
    throw new Error(`${filePath}: scenarios[${index}].userEmail must be a non-empty string`);
  }

  let userSubject: string | null = null;
  if (raw.userSubject !== undefined && raw.userSubject !== null) {
    if (typeof raw.userSubject !== 'string') {
      throw new Error(`${filePath}: scenarios[${index}].userSubject must be string or null`);
    }
    userSubject = substituteRunId(raw.userSubject, runId);
  }

  const ch = raw.userChannel;
  if (typeof ch !== 'string' || !CHANNELS.has(ch as PlaygroundChannel)) {
    throw new Error(`${filePath}: scenarios[${index}].userChannel must be "Email" or "Chat"`);
  }

  const usersMessage = raw.usersMessage;
  if (typeof usersMessage !== 'string' || !usersMessage.trim()) {
    throw new Error(`${filePath}: scenarios[${index}].usersMessage must be a non-empty string`);
  }

  const expectedResult = raw.expectedResult;
  if (typeof expectedResult !== 'boolean') {
    throw new Error(`${filePath}: scenarios[${index}].expectedResult must be boolean`);
  }

  return {
    testCaseId: substituteRunId(testCaseId.trim(), runId),
    id: id.trim(),
    emailPatternsToUnassign,
    subjectToUnassign,
    wordsInUserMessage,
    wordsInAIReply,
    userEmail: substituteRunId(userEmail.trim(), runId),
    userSubject,
    userChannel: ch as PlaygroundChannel,
    usersMessage: substituteRunId(usersMessage, runId),
    expectedResult,
  };
}

export function loadGuardrailsMatrixFile(
  jsonPath: string = DEFAULT_GUARDDRAILS_JSON,
  runId: string = String(Date.now()),
): GuardrailsMatrixFile {
  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (cause) {
    throw new Error(`Invalid JSON in ${jsonPath}`, { cause });
  }
  if (!isRecord(parsed)) {
    throw new Error(`${jsonPath}: root must be a JSON object`);
  }

  const scenariosRaw = parsed.scenarios;
  if (!Array.isArray(scenariosRaw) || scenariosRaw.length === 0) {
    throw new Error(`${jsonPath}: "scenarios" must be a non-empty array`);
  }

  return {
    scenarios: scenariosRaw.map((s, i) => parseScenarioRow(s, runId, jsonPath, i)),
  };
}
