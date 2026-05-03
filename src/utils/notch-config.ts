import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './paths';

export type NotchE2eConfig = {
  /** Path under baseUrl to a known conversation thread (legacy inbox smoke). Optional: omit to pick first thread from inbox. */
  fixtureConversationPath?: string;
  /**
   * Guardrails editor (Config → Automation → Guardrails). Defaults to `featurePath` when omitted.
   */
  guardrailsPath?: string;
  /** Tests → Playground simulator path (customer email/message, Send as customer). */
  testsPlaygroundPath?: string;
  /**
   * Repo-relative (or absolute) path to Guardrails × Playground JSON (`guardrails` + `scenarios[]`).
   * Default: `tests/data/guardrails-playground-matrix.json`.
   */
  guardrailsPlaygroundMatrixPath?: string;
};

export type NotchConfig = {
  baseUrl: string;
  featurePath: string;
  /**
   * Policy / rollout version query (`?version=…`) — required for deep links; without it Notch often redirects to Inbox.
   */
  policyVersion?: string;
  e2e?: NotchE2eConfig;
};

export function notchConfigFilePath(): string {
  return path.join(REPO_ROOT, 'notch.config.json');
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function loadNotchConfig(): NotchConfig {
  const filePath = notchConfigFilePath();
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`Invalid JSON in ${filePath}`, { cause });
  }
  if (!isRecord(parsed)) {
    throw new Error(`${filePath}: root value must be a JSON object`);
  }

  const baseUrl = parsed.baseUrl;
  const featurePath = parsed.featurePath;
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    throw new Error(`${filePath}: baseUrl must be a non-empty string`);
  }
  if (typeof featurePath !== 'string' || !featurePath.trim()) {
    throw new Error(`${filePath}: featurePath must be a non-empty string`);
  }

  const policyVersion = parsed.policyVersion;
  if (policyVersion !== undefined && typeof policyVersion !== 'string') {
    throw new Error(`${filePath}: policyVersion must be a string`);
  }

  let e2e: NotchE2eConfig | undefined;
  if (parsed.e2e !== undefined) {
    if (!isRecord(parsed.e2e)) {
      throw new Error(`${filePath}: e2e must be a JSON object`);
    }
    const fixtureConversationPath = parsed.e2e.fixtureConversationPath;
    if (
      fixtureConversationPath !== undefined &&
      typeof fixtureConversationPath !== 'string'
    ) {
      throw new Error(`${filePath}: e2e.fixtureConversationPath must be a string`);
    }
    const guardrailsPath = parsed.e2e.guardrailsPath;
    if (guardrailsPath !== undefined && typeof guardrailsPath !== 'string') {
      throw new Error(`${filePath}: e2e.guardrailsPath must be a string`);
    }
    const testsPlaygroundPath = parsed.e2e.testsPlaygroundPath;
    if (
      testsPlaygroundPath !== undefined &&
      typeof testsPlaygroundPath !== 'string'
    ) {
      throw new Error(`${filePath}: e2e.testsPlaygroundPath must be a string`);
    }
    const guardrailsPlaygroundMatrixPath = parsed.e2e.guardrailsPlaygroundMatrixPath;
    if (
      guardrailsPlaygroundMatrixPath !== undefined &&
      typeof guardrailsPlaygroundMatrixPath !== 'string'
    ) {
      throw new Error(`${filePath}: e2e.guardrailsPlaygroundMatrixPath must be a string`);
    }
    if (
      fixtureConversationPath !== undefined ||
      guardrailsPath !== undefined ||
      testsPlaygroundPath !== undefined ||
      guardrailsPlaygroundMatrixPath !== undefined
    ) {
      e2e = {
        ...(fixtureConversationPath !== undefined ? { fixtureConversationPath } : {}),
        ...(guardrailsPath !== undefined ? { guardrailsPath } : {}),
        ...(testsPlaygroundPath !== undefined ? { testsPlaygroundPath } : {}),
        ...(guardrailsPlaygroundMatrixPath !== undefined
          ? { guardrailsPlaygroundMatrixPath }
          : {}),
      };
    }
  }

  const config: NotchConfig = {
    baseUrl: baseUrl.trim(),
    featurePath: featurePath.trim(),
    ...(policyVersion !== undefined && policyVersion.trim()
      ? { policyVersion: policyVersion.trim() }
      : {}),
    ...(e2e !== undefined ? { e2e } : {}),
  };
  return config;
}

/** Append `version` query param when `policyVersion` is set (matches in-app navigation). */
export function withNotchPolicyVersion(config: NotchConfig, path: string): string {
  const base = path.startsWith('/') ? path : `/${path}`;
  const ver = config.policyVersion?.trim();
  if (!ver) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}version=${encodeURIComponent(ver)}`;
}

/** Path segment for `page.goto` with `use.baseURL` set (leading slash). */
export function normalizedFeaturePath(config: NotchConfig): string {
  return config.featurePath.startsWith('/') ? config.featurePath : `/${config.featurePath}`;
}

/** Login entry URL that redirects back to the feature after Google auth. */
export function buildNotchLoginRedirectUrl(config: NotchConfig): string {
  const base = config.baseUrl.replace(/\/$/, '');
  const fp = normalizedFeaturePath(config);
  return `${base}/login?redirectTo=${encodeURIComponent(fp)}`;
}

/** Resolved path for `page.goto` when `e2e.fixtureConversationPath` is set. */
export function normalizedE2eFixtureConversationPath(config: NotchConfig): string | undefined {
  const raw = config.e2e?.fixtureConversationPath?.trim();
  if (!raw) return undefined;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/** Guardrails UI path; falls back to `featurePath` when `e2e.guardrailsPath` unset. */
export function normalizedGuardrailsPath(config: NotchConfig): string {
  const raw = config.e2e?.guardrailsPath?.trim();
  if (raw) return raw.startsWith('/') ? raw : `/${raw}`;
  return normalizedFeaturePath(config);
}

/** Tests → Playground — required for Guardrails playground automation; undefined if unset. */
export function normalizedTestsPlaygroundPath(config: NotchConfig): string | undefined {
  const raw = config.e2e?.testsPlaygroundPath?.trim();
  if (!raw) return undefined;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/** Absolute path to Guardrails Playground scenario JSON (default: `tests/data/guardrails-playground-matrix.json`). */
export function resolvedGuardrailsPlaygroundMatrixPath(config: NotchConfig): string {
  const raw = config.e2e?.guardrailsPlaygroundMatrixPath?.trim();
  const fallback = path.join(REPO_ROOT, 'tests', 'data', 'guardrails-playground-matrix.json');
  if (!raw) return fallback;
  return path.isAbsolute(raw) ? raw : path.join(REPO_ROOT, raw);
}
