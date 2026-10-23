import type { Lang } from '../i18n'

export type Mode = 'vulnerable' | 'fixed'
export type LabStatus = 'not_started' | 'vulnerability_found' | 'completed'

export interface LabProgress {
  status: LabStatus
  exploited: boolean
  defended: boolean
  fix_verified: boolean
  completed: boolean
  hints_used: number
  verification_runs: number
  checks_run: number
  checks_passed: number
}

export interface LabSummary {
  id: string
  title: string
  summary: string
  difficulty: 'easy' | 'medium' | 'hard'
  available: boolean
  owasp: string
  owasp_name: string
  progress: LabProgress
}

export interface Preset {
  label: string
  method: string
  path: string
  headers: Record<string, string>
  body: string | null
}

export interface LabDetail extends LabSummary {
  cwe: string[]
  task: string
  root_cause: string
  fix: string
  hint_count: number
  revealed_hints: Record<string, string>
  presets: Preset[]
  references: { label: string; url: string }[]
}

export interface CodeRow {
  left: { n: number; text: string; kind: 'same' | 'del' } | null
  right: { n: number; text: string; kind: 'same' | 'add' } | null
}

export interface CodePayload {
  file: string
  language: string
  vulnerable: string
  fixed: string
  rows: CodeRow[]
  unified: string
}

export interface Check {
  id: string
  title: string
  mode: Mode
  kind: 'functional' | 'attack' | 'defense'
  passed: boolean
  evidence: string
}

export interface VerifyResult {
  vulnerability_confirmed: boolean
  fix_confirmed: boolean
  exploited_by_you: boolean
  defended_by_you: boolean
  completed: boolean
  completed_now: boolean
  passed: number
  total: number
  checks: Check[]
  progress: LabProgress
}

export interface ProgressData {
  labs_available: number
  labs_planned: number
  completed: number
  exploited: number
  defended: number
  hints_used: number
  checks_run: number
  checks_passed: number
  achievements: { id: string; title: string; description: string; unlocked: boolean }[]
  history: { lab_id: string; lab_title: string; kind: string; detail: Record<string, unknown>; at: string }[]
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init)
  if (!response.ok) throw new ApiError(response.status, (await response.text()).slice(0, 300))
  return response.json() as Promise<T>
}

const post = { method: 'POST' }

export const api = {
  labs: (lang: Lang) => request<{ labs_online: boolean; labs: LabSummary[] }>(`/labs?lang=${lang}`),
  lab: (id: string, lang: Lang) => request<LabDetail>(`/labs/${id}?lang=${lang}`),
  status: (id: string) => request<LabProgress>(`/labs/${id}/status`),
  hint: (id: string, level: number, lang: Lang) =>
    request<{ level: number; text: string; hints_used: number }>(`/labs/${id}/hints/${level}?lang=${lang}`, post),
  code: (id: string) => request<CodePayload>(`/labs/${id}/code`),
  verify: (id: string, lang: Lang) => request<VerifyResult>(`/labs/${id}/verify?lang=${lang}`, post),
  progress: (lang: Lang) => request<ProgressData>(`/progress?lang=${lang}`),
  resetProgress: () => request<{ reset: boolean }>('/progress/reset', post),
}

/** Origin of the isolated lab service, used for the sandboxed XSS preview. */
export const LABS_ORIGIN: string =
  import.meta.env.VITE_LABS_ORIGIN ?? `${window.location.protocol}//${window.location.hostname}:8081`

export interface LabRequest {
  method: string
  path: string
  headers?: Record<string, string>
  body?: string
}

export interface LabResponse {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
  ms: number
}

export function labUrl(labId: string, mode: Mode, path: string): string {
  return `/api/labs/${labId}/${mode}/${path.replace(/^\/+/, '')}`
}

/** Sends a request to a lab through the platform API (the Attack Playground proxy). */
export async function labRequest(labId: string, mode: Mode, req: LabRequest): Promise<LabResponse> {
  const started = performance.now()
  const hasBody = !['GET', 'HEAD'].includes(req.method) && req.body !== undefined && req.body !== ''
  const response = await fetch(labUrl(labId, mode, req.path), {
    method: req.method,
    headers: req.headers,
    body: hasBody ? req.body : undefined,
  })
  const body = await response.text()
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body,
    ms: Math.round(performance.now() - started),
  }
}

export function tryJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
